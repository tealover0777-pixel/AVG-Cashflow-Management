import { createContext, useContext, useEffect, useState } from "react";
import { auth, db, functions } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { DEFAULT_ROLE_PERMISSIONS } from "./permissions";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setLoading(true);
            try {
                if (u) {
                    setUser(u);
                    // 1. Check custom claims first (fastest, but might not be set immediately)
                    const idToken = await u.getIdTokenResult();
                    let role = idToken.claims.role || "tenant_user";
                    let tenantId = idToken.claims.tenantId || "";

                    // 2. Fetch authoritative mapping from global global_users collection
                    let globalData = {};
                    try {
                        const globalRoleDoc = await getDoc(doc(db, `global_users`, u.uid));
                        if (globalRoleDoc.exists()) {
                            globalData = globalRoleDoc.data();
                            role = globalData.role || role;
                            tenantId = globalData.tenantId || globalData.tenant_id || globalData.Tenant_ID || tenantId;
                        }
                    } catch (err) {
                        console.error("Failed to fetch global_users:", err);
                    }

                    // 2.5 SPECIAL CASE: kyuahn@yahoo.com is ALWAYS L2 Admin
                    if (u.email && u.email.toLowerCase() === "kyuahn@yahoo.com") {
                        role = "L2 Admin";
                    }

                    let fetchedProfile = { ...globalData, role, tenantId, status: globalData.status || "Pending" };

                    // 3. Fetch extra profile info from tenant collection
                    // Docs are now named by user_id (U10001), so we query by auth_uid field
                    if (tenantId) {
                        try {
                            const q = query(
                                collection(db, `tenants/${tenantId}/users`),
                                where("auth_uid", "==", u.uid)
                            );
                            const snap = await getDocs(q);
                            if (!snap.empty) {
                                fetchedProfile = { ...fetchedProfile, ...snap.docs[0].data() };
                            } else {
                                // Fallback: try direct fetch by uid (legacy docs stored with auth uid as doc id)
                                const profDoc = await getDoc(doc(db, `tenants/${tenantId}/users`, u.uid));
                                if (profDoc.exists()) {
                                    fetchedProfile = { ...fetchedProfile, ...profDoc.data() };
                                }
                            }
                        } catch (err) {
                            console.error("Failed to fetch tenant profile:", err);
                        }
                    }

                    // 4. Determine applied permissions
                    let userPermissions = [];
                    // Role definitions are stored in the global 'role_types' collection
                    if (role) {
                        try {
                            // 4a. Check global roles first (e.g. "R10004")
                            const globalRoleDoc = await getDoc(doc(db, "role_types", role));

                            // 4b. Fallback: Check tenant-specific roles just in case
                            let roleData = null;
                            if (globalRoleDoc.exists()) {
                                roleData = globalRoleDoc.data();
                            } else if (tenantId) {
                                const tenantRoleDoc = await getDoc(doc(db, `tenants/${tenantId}/roles`, role));
                                if (tenantRoleDoc.exists()) {
                                    roleData = tenantRoleDoc.data();
                                }
                            }

                            if (roleData) {
                                // Store the display name of the role
                                fetchedProfile.roleName = roleData.role_name || roleData.name || fetchedProfile.role_name || role;

                                // Check if role has global access (IsGlobal flag in role_types)
                                if (roleData.IsGlobal === true) {
                                    fetchedProfile.isGlobalRole = true;
                                }

                                // UNIFIED PARSING: handle string or array from both legacy and new fields
                                const rawPerms = roleData.Permissions || roleData.Permission || roleData.permissions || [];
                                if (Array.isArray(rawPerms)) {
                                    userPermissions = rawPerms;
                                } else if (typeof rawPerms === "string") {
                                    userPermissions = rawPerms.split(",").map(p => p.trim()).filter(Boolean);
                                }
                            } else {
                                // 4c. Fallback to hardcoded defaults in permissions.js
                                userPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
                                fetchedProfile.roleName = fetchedProfile.role_name || role;
                            }
                        } catch (err) {
                            console.error("Failed to fetch custom role profile:", err);
                            userPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
                            fetchedProfile.roleName = fetchedProfile.role_name || role;
                        }
                    }

                    // 4d. Special: L2 Admin gets full access if derived from email (Hidden Super Admin)
                    if (role === "L2 Admin") {
                        userPermissions = [...DEFAULT_ROLE_PERMISSIONS["L2 Admin"]];
                        fetchedProfile.roleName = "L2 Admin";
                        fetchedProfile.isGlobalRole = true;
                    }

                    // 5. Auto-activate "Pending" users on first login
                    if (!fetchedProfile.status || fetchedProfile.status === "Pending") {
                        console.log("[AuthContext] User status is Pending/missing, calling activateUser...");
                        try {
                            const activateFn = httpsCallable(functions, "activateUser");
                            await activateFn();
                            fetchedProfile.status = "Active";
                            console.log("[AuthContext] User activated successfully.");
                        } catch (err) {
                            console.error("[AuthContext] activateUser failed:", err.code, err.message);
                        }
                    }

                    setProfile(fetchedProfile);
                    setPermissions(userPermissions);
                } else {
                    setUser(null);
                    setProfile(null);
                    setPermissions([]);
                }
            } catch (err) {
                console.error("Auth state change error:", err);
                setUser(null);
                setProfile(null);
                setPermissions([]);
            } finally {
                setLoading(false);
            }
        });
        return unsub;
    }, []);

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);

    const hasPermission = (perm) => permissions.includes(perm);

    const value = {
        user,
        profile,
        permissions,
        hasPermission,
        loading,
        login,
        logout,
        isSuperAdmin: (user?.email?.toLowerCase() === "kyuahn@yahoo.com") || profile?.role === "Super Admin" || profile?.role === "Platform Admin" || profile?.role === "company_super_admin_read_write" || profile?.role === "L2 Admin",
        isTenantAdmin: profile?.role === "Tenant Admin" || profile?.role === "Tenant Owner" || profile?.role === "tenant_admin_super_user" || profile?.role === "tenant_admin_read_write",
        isGlobalRole: profile?.isGlobalRole === true,
        tenantId: profile?.tenantId || ""
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
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

                    // 2. Fetch authoritative mapping from global user_roles collection
                    try {
                        const globalRoleDoc = await getDoc(doc(db, `user_roles`, u.uid));
                        if (globalRoleDoc.exists()) {
                            const data = globalRoleDoc.data();
                            role = data.role || role;
                            tenantId = data.tenantId || data.tenant_id || data.Tenant_ID || tenantId;
                        }
                    } catch (err) {
                        console.error("Failed to fetch global user_roles:", err);
                    }

                    // 2.5 SPECIAL CASE: kyuahn@yahoo.com is ALWAYS L2 Admin
                    if (u.email && u.email.toLowerCase() === "kyuahn@yahoo.com") {
                        role = "L2 Admin";
                    }

                    let fetchedProfile = { role, tenantId };

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
                    // Check if role exists in DB overrides (tenants/{tenant}/roles)
                    if (tenantId && role) {
                        try {
                            // Check precise match first (e.g. "R10004")
                            const exactRoleDoc = await getDoc(doc(db, `tenants/${tenantId}/roles`, role));

                            if (exactRoleDoc.exists()) {
                                const roleData = exactRoleDoc.data();
                                // UNIFIED PARSING: handle string or array
                                if (Array.isArray(roleData.permissions)) {
                                    userPermissions = roleData.permissions;
                                } else if (Array.isArray(roleData.Permission)) {
                                    userPermissions = roleData.Permission;
                                } else if (typeof roleData.Permission === "string") {
                                    userPermissions = roleData.Permission.split(",").map(p => p.trim()).filter(Boolean);
                                } else if (typeof roleData.permissions === "string") {
                                    userPermissions = roleData.permissions.split(",").map(p => p.trim()).filter(Boolean);
                                }
                            } else {
                                // Fallback to hardcoded defaults
                                userPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
                            }
                        } catch (err) {
                            console.error("Failed to fetch custom role profile:", err);
                            userPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
                        }
                    } else if (role) {
                        userPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
                    }

                    // Special: L2 Admin gets full access if derived from email
                    if (role === "L2 Admin") {
                        userPermissions = [...DEFAULT_ROLE_PERMISSIONS["L2 Admin"]];
                    }

                    // 5. Auto-activate "Pending" users on first login
                    if (fetchedProfile.status === "Pending") {
                        try {
                            const updateData = { status: "Active", last_login: serverTimestamp() };
                            // Update global profile
                            await updateDoc(doc(db, "user_roles", u.uid), updateData);
                            // Update tenant profile
                            if (tenantId && fetchedProfile.user_id) {
                                await updateDoc(doc(db, `tenants/${tenantId}/users`, fetchedProfile.user_id), updateData);
                            } else if (tenantId && !fetchedProfile.user_id) {
                                // Fallback if doc ID is the UID
                                await updateDoc(doc(db, `tenants/${tenantId}/users`, u.uid), updateData).catch(() => { });
                            }
                            fetchedProfile.status = "Active";
                        } catch (err) {
                            console.error("Failed to auto-activate user:", err);
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
        tenantId: profile?.tenantId || ""
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

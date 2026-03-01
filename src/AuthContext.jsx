import { createContext, useContext, useEffect, useState } from "react";
import { auth, db, functions } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where, serverTimestamp, onSnapshot } from "firebase/firestore";
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
        let profileUnsub = null;
        let tenantUnsub = null;

        const authUnsub = onAuthStateChanged(auth, async (u) => {
            if (profileUnsub) profileUnsub();
            if (tenantUnsub) tenantUnsub();

            if (!u) {
                setUser(null);
                setProfile(null);
                setPermissions([]);
                setLoading(false);
                return;
            }

            setUser(u);
            setLoading(true);

            try {
                // 1. Force token refresh to pick up latest custom claims
                await u.getIdToken(true);
                const idToken = await u.getIdTokenResult();
                let initialRole = idToken.claims.role || "tenant_user";
                let initialTenantId = idToken.claims.tenantId || "";

                // 2. Setup real-time listener for global_users profile
                profileUnsub = onSnapshot(doc(db, "global_users", u.uid), async (snap) => {
                    let fetchedProfile = { auth_uid: u.uid, email: u.email, role: initialRole, tenantId: initialTenantId };
                    let globalData = {};

                    if (snap.exists()) {
                        globalData = snap.data();
                        fetchedProfile = { ...fetchedProfile, ...globalData };
                        if (globalData.isGlobal) fetchedProfile.isGlobalRole = true;
                    }

                    // Kyuahn is always Super Admin
                    if (u.email && u.email.toLowerCase() === "kyuahn@yahoo.com") {
                        fetchedProfile.role = "L2 Admin";
                    }

                    const role = fetchedProfile.role;
                    const tenantId = fetchedProfile.tenantId || fetchedProfile.tenant_id || "";

                    // Fetch role permissions and display name
                    let userPermissions = [];
                    try {
                        const roleDoc = await getDoc(doc(db, "role_types", role));
                        let roleData = roleDoc.exists() ? roleDoc.data() : null;

                        if (!roleData && tenantId) {
                            const tRoleDoc = await getDoc(doc(db, `tenants/${tenantId}/roles`, role));
                            if (tRoleDoc.exists()) roleData = tRoleDoc.data();
                        }

                        if (roleData) {
                            fetchedProfile.roleName = roleData.role_name || roleData.name || role;
                            if (roleData.IsGlobal) fetchedProfile.isGlobalRole = true;
                            const rawPerms = roleData.Permissions || roleData.Permission || roleData.permissions || [];
                            userPermissions = Array.isArray(rawPerms) ? rawPerms : (typeof rawPerms === "string" ? rawPerms.split(",").map(p => p.trim()).filter(Boolean) : []);
                        } else {
                            userPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
                            fetchedProfile.roleName = role;
                        }
                    } catch (err) {
                        console.error("Role fetch error:", err);
                        userPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
                    }

                    if (role === "L2 Admin") {
                        userPermissions = [...DEFAULT_ROLE_PERMISSIONS["L2 Admin"]];
                        fetchedProfile.roleName = role;
                        fetchedProfile.isGlobalRole = true;
                    }

                    // Auto-activate if pending
                    if (fetchedProfile.status === "Pending" || !fetchedProfile.status) {
                        try {
                            const activateFn = httpsCallable(functions, "activateUser");
                            await activateFn();
                            fetchedProfile.status = "Active";
                        } catch (e) { console.error("Activation error:", e); }
                    }

                    // Sync with tenant-specific profile if it exists
                    if (tenantId && !tenantUnsub) {
                        const q = query(collection(db, `tenants/${tenantId}/users`), where("auth_uid", "==", u.uid));
                        tenantUnsub = onSnapshot(q, (tSnap) => {
                            if (!tSnap.empty) {
                                setProfile(prev => ({ ...prev, ...tSnap.docs[0].data() }));
                            }
                        });
                    }

                    setProfile(fetchedProfile);
                    setPermissions(userPermissions);
                    setLoading(false);
                });

            } catch (err) {
                console.error("Auth initialization error:", err);
                setLoading(false);
            }
        });

        return () => {
            authUnsub();
            if (profileUnsub) profileUnsub();
            if (tenantUnsub) tenantUnsub();
        };
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
        isSuperAdmin: (user?.email?.toLowerCase() === "kyuahn@yahoo.com") || profile?.role === "Super Admin" || profile?.role === "Platform Admin" || profile?.role === "company_super_admin_read_write" || profile?.role === "L2 Admin" || profile?.isGlobalRole === true || profile?.isGlobal === true,
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

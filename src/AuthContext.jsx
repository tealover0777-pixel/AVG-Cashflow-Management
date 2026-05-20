import React, { createContext, useContext, useEffect, useState } from "react";
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
                        const qUsers = query(collection(db, `tenants/${tenantId}/users`), where("auth_uid", "==", u.uid));
                        const qContacts = query(collection(db, `tenants/${tenantId}/contacts`), where("auth_uid", "==", u.uid));

                        const unsubUsers = onSnapshot(qUsers, (tSnap) => {
                            if (!tSnap.empty) {
                                setProfile(prev => {
                                    const tenantData = tSnap.docs[0].data();
                                    return {
                                        ...prev,
                                        ...tenantData, // tenant-scoped profile details take precedence for tenant-scoped users
                                        role: prev?.role || tenantData?.role_id || tenantData?.role || "",
                                        tenantId: prev?.tenantId || tenantData?.tenantId || "",
                                        isContact: false
                                    };
                                });
                            }
                        });

                        const unsubContacts = onSnapshot(qContacts, (cSnap) => {
                            if (!cSnap.empty) {
                                setProfile(prev => {
                                    const contactData = cSnap.docs[0].data();
                                    let fName = contactData.first_name || "";
                                    let lName = contactData.last_name || "";
                                    if (!fName && contactData.name) {
                                        const parts = contactData.name.trim().split(/\s+/);
                                        fName = parts[0] || "";
                                        lName = parts.slice(1).join(" ") || "";
                                    }
                                    return {
                                        ...prev,
                                        ...contactData,
                                        first_name: fName,
                                        last_name: lName,
                                        address1: contactData.address1 || contactData.street1 || "",
                                        address2: contactData.address2 || contactData.street2 || "",
                                        role: prev?.role || contactData?.role_id || contactData?.role || "",
                                        tenantId: prev?.tenantId || contactData?.tenantId || "",
                                        isContact: true
                                    };
                                });
                            }
                        });

                        tenantUnsub = () => {
                            unsubUsers();
                            unsubContacts();
                        };
                    }

                    if (!fetchedProfile && u.email?.toLowerCase() === "kyuahn@yahoo.com") {
                        const fallback = {
                            email: u.email,
                            first_name: "Kyu",
                            last_name: "Ahn",
                            role: "R10010",
                            tenantId: "GLOBAL",
                            isGlobal: true,
                            status: "Active"
                        };
                        setProfile(fallback);
                    } else {
                        setProfile(fetchedProfile);
                    }
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

    const hasPermission = (perm) => {
        if (!perm) return false;

        // Bidirectional mapping for backward compatibility and centralized gating
        // 1. If checking high-level parent-tier permission, map to granular permissions
        if (perm === "PlatformAdmin_view") {
            const keys = ["PlatformAdmin_view", "PLATFORM_USER_VIEW", "PLATFORM_TENANT_VIEW", "PLATFORM_USER_CREATE", "PLATFORM_TENANT_CREATE", "DIMENTION_VIEW", "DIMENSION_VIEW"];
            if (permissions.some(p => keys.includes(p))) return true;
        }
        if (perm === "PlatformAdmin_create") {
            const keys = ["PlatformAdmin_create", "PLATFORM_USER_CREATE", "PLATFORM_TENANT_CREATE"];
            if (permissions.some(p => keys.includes(p))) return true;
        }
        if (perm === "PlatformAdmin_update") {
            const keys = ["PlatformAdmin_update", "PLATFORM_USER_UPDATE", "PLATFORM_TENANT_UPDATE"];
            if (permissions.some(p => keys.includes(p))) return true;
        }
        if (perm === "PlatformAdmin_delete") {
            const keys = ["PlatformAdmin_delete", "PLATFORM_USER_DELETE", "PLATFORM_TENANT_DELETE"];
            if (permissions.some(p => keys.includes(p))) return true;
        }

        if (perm === "Administration_view") {
            const keys = ["Administration_view", "INVESTMENT_VIEW", "PAYMENT_SCHEDULE_VIEW", "USER_PROFILE_VIEW", "ROLE_TYPE_VIEW", "TENANT_VIEW", "INVESTMENT_CREATE", "PAYMENT_SCHEDULE_CREATE", "USER_PROFILE_CREATE"];
            if (permissions.some(p => keys.includes(p))) return true;
        }
        if (perm === "Administration_create") {
            const keys = ["Administration_create", "INVESTMENT_CREATE", "PAYMENT_SCHEDULE_CREATE", "USER_PROFILE_CREATE"];
            if (permissions.some(p => keys.includes(p))) return true;
        }
        if (perm === "Administration_update") {
            const keys = ["Administration_update", "INVESTMENT_UPDATE", "PAYMENT_SCHEDULE_UPDATE", "USER_PROFILE_UPDATE"];
            if (permissions.some(p => keys.includes(p))) return true;
        }
        if (perm === "Administration_delete") {
            const keys = ["Administration_delete", "INVESTMENT_DELETE", "PAYMENT_SCHEDULE_DELETE", "USER_PROFILE_DELETE"];
            if (permissions.some(p => keys.includes(p))) return true;
        }

        // 2. If checking granular permissions, map to parent-tier permissions
        if (["PLATFORM_USER_VIEW", "PLATFORM_TENANT_VIEW", "DIMENTION_VIEW", "DIMENSION_VIEW"].includes(perm)) {
            if (permissions.includes("PlatformAdmin_view")) return true;
        }
        if (["PLATFORM_USER_CREATE", "PLATFORM_TENANT_CREATE"].includes(perm)) {
            if (permissions.includes("PlatformAdmin_create")) return true;
        }
        if (["PLATFORM_USER_UPDATE", "PLATFORM_TENANT_UPDATE"].includes(perm)) {
            if (permissions.includes("PlatformAdmin_update")) return true;
        }
        if (["PLATFORM_USER_DELETE", "PLATFORM_TENANT_DELETE"].includes(perm)) {
            if (permissions.includes("PlatformAdmin_delete")) return true;
        }

        if (["INVESTMENT_VIEW", "PAYMENT_SCHEDULE_VIEW", "USER_PROFILE_VIEW", "ROLE_TYPE_VIEW", "TENANT_VIEW"].includes(perm)) {
            if (permissions.includes("Administration_view")) return true;
        }
        if (["INVESTMENT_CREATE", "PAYMENT_SCHEDULE_CREATE", "USER_PROFILE_CREATE"].includes(perm)) {
            if (permissions.includes("Administration_create")) return true;
        }
        if (["INVESTMENT_UPDATE", "PAYMENT_SCHEDULE_UPDATE", "USER_PROFILE_UPDATE"].includes(perm)) {
            if (permissions.includes("Administration_update")) return true;
        }
        if (["INVESTMENT_DELETE", "PAYMENT_SCHEDULE_DELETE", "USER_PROFILE_DELETE"].includes(perm)) {
            if (permissions.includes("Administration_delete")) return true;
        }

        if (perm.endsWith("*")) {
            const prefix = perm.slice(0, -1);
            if (["ROLE_TYPE_", "USER_PROFILE_", "INVESTMENT_", "PAYMENT_SCHEDULE_", "USER_", "MEMBER_", "REPORT_"].includes(prefix)) {
                if (permissions.includes("Administration_view") || permissions.includes("Administration_update") || permissions.includes("Administration_create") || permissions.includes("Administration_delete")) return true;
            }
            if (["PLATFORM_USER_", "PLATFORM_TENANT_", "DIMENTION_", "DIMENSION_"].includes(prefix)) {
                if (permissions.includes("PlatformAdmin_view") || permissions.includes("PlatformAdmin_update") || permissions.includes("PlatformAdmin_create") || permissions.includes("PlatformAdmin_delete")) return true;
            }
            return permissions.some(p => p.startsWith(prefix));
        }
        return permissions.includes(perm);
    };

    const value = {
        user,
        profile,
        permissions,
        hasPermission,
        loading,
        login,
        logout,
        isMember: (() => {
            const role = (profile?.role || "").toLowerCase();
            const roleName = (profile?.roleName || "").toLowerCase();
            return role === "r10001" || roleName.includes("member");
        })(),
        isSuperAdmin: (() => {
            if (user?.email?.toLowerCase() === "kyuahn@yahoo.com" || user?.uid === "kyuahn" || user?.uid === "sNvFmqQss8OhjFAffVijbnMaGRC2") return true;
            const role = (profile?.role || "").toLowerCase();
            const roleName = (profile?.roleName || "").toLowerCase();
            if (role === "r10001" || roleName.includes("member")) return false; // Members are never super admins
            return ["super admin", "platform admin", "company_super_admin_read_write", "l2 admin", "r10003", "r10009", "r10010"].includes(role);
        })(),
        isTenantAdmin: (() => {
            const role = (profile?.role || "");
            const isT = role.includes("Tenant") || role.includes("tenant") || role.includes("Admin") || role === "R10004" || ["tenant_admin_super_user", "tenant_admin_read_write"].includes(role);
            return isT && !(profile?.isGlobalRole === true || profile?.isGlobal === true);
        })(),
        isGlobalRole: profile?.isGlobalRole === true || profile?.isGlobal === true,
        isR10010: (() => {
            const role = (profile?.role || "").toUpperCase();
            // R10010 legacy role OR any role with PLATFORM_USER_VIEW permission
            return role === "R10010" || user?.email?.toLowerCase() === "kyuahn@yahoo.com" || permissions.includes("PLATFORM_USER_VIEW");
        })(),
        tenantId: profile?.tenantId || ""
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

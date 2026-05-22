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

        const getPermissionsAndRoleName = async (roleVal, tId) => {
            let userPermissions = [];
            let roleName = roleVal || "";
            let isGlobalRole = false;

            if (!roleVal) {
                return { userPermissions, roleName, isGlobalRole };
            }

            try {
                const roleDoc = await getDoc(doc(db, "role_types", roleVal));
                let roleData = roleDoc.exists() ? roleDoc.data() : null;

                if (!roleData && tId && tId !== "GLOBAL") {
                    const tRoleDoc = await getDoc(doc(db, `tenants/${tId}/roles`, roleVal));
                    if (tRoleDoc.exists()) roleData = tRoleDoc.data();
                }

                if (roleData) {
                    roleName = roleData.role_name || roleData.name || roleVal;
                    if (roleData.IsGlobal || roleData.isGlobal) isGlobalRole = true;
                    const rawPerms = roleData.Permissions || roleData.Permission || roleData.permissions || [];
                    userPermissions = Array.isArray(rawPerms) ? rawPerms : (typeof rawPerms === "string" ? rawPerms.split(",").map(p => p.trim()).filter(Boolean) : []);
                } else {
                    const matchedKey = Object.keys(DEFAULT_ROLE_PERMISSIONS).find(k => k.toLowerCase() === roleVal.toLowerCase());
                    userPermissions = matchedKey ? DEFAULT_ROLE_PERMISSIONS[matchedKey] : [];
                    roleName = matchedKey || roleVal;
                }
            } catch (err) {
                console.error("Role fetch error:", err);
                const matchedKey = Object.keys(DEFAULT_ROLE_PERMISSIONS).find(k => k.toLowerCase() === roleVal.toLowerCase());
                userPermissions = matchedKey ? DEFAULT_ROLE_PERMISSIONS[matchedKey] : [];
                roleName = matchedKey || roleVal;
            }

            if (roleVal.toLowerCase() === "l2 admin") {
                userPermissions = [...DEFAULT_ROLE_PERMISSIONS["L2 Admin"]];
                roleName = "L2 Admin";
                isGlobalRole = true;
            }

            return { userPermissions, roleName, isGlobalRole };
        };

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
                    const { userPermissions, roleName, isGlobalRole } = await getPermissionsAndRoleName(role, tenantId);
                    fetchedProfile.roleName = roleName;
                    if (isGlobalRole) fetchedProfile.isGlobalRole = true;

                    // Auto-activate if pending
                    if (fetchedProfile.status === "Pending" || !fetchedProfile.status) {
                        try {
                            const activateFn = httpsCallable(functions, "activateUser");
                            await activateFn();
                            fetchedProfile.status = "Active";
                        } catch (e) { console.error("Activation error:", e); }
                    }

                    const roleUpper = (role || "").toUpperCase();

                    // Sync with tenant-specific profile if it exists
                    if (tenantUnsub) {
                        tenantUnsub();
                        tenantUnsub = null;
                    }

                    if (tenantId && tenantId !== "GLOBAL") {
                        if (roleUpper === "R10001") {
                            // Listen ONLY to contacts
                            const qContacts = query(collection(db, `tenants/${tenantId}/contacts`), where("auth_uid", "==", u.uid));
                            const unsubContacts = onSnapshot(qContacts, async (cSnap) => {
                                if (!cSnap.empty) {
                                    const contactData = cSnap.docs[0].data();
                                    let fName = contactData.first_name || "";
                                    let lName = contactData.last_name || "";
                                    if (!fName && contactData.name) {
                                        const parts = contactData.name.trim().split(/\s+/);
                                        fName = parts[0] || "";
                                        lName = parts.slice(1).join(" ") || "";
                                    }
                                    const resolvedRole = contactData?.role_id || contactData?.role || fetchedProfile.role || "";
                                    const resolvedTenantId = contactData?.tenantId || tenantId || "";

                                    const { userPermissions: cPerms, roleName: cRoleName, isGlobalRole: cIsGlobal } = 
                                        await getPermissionsAndRoleName(resolvedRole, resolvedTenantId);

                                    setProfile(prev => {
                                        return {
                                            ...prev,
                                            ...contactData,
                                            first_name: fName,
                                            last_name: lName,
                                            address1: contactData.address1 || contactData.street1 || "",
                                            address2: contactData.address2 || contactData.street2 || "",
                                            role: resolvedRole,
                                            tenantId: resolvedTenantId,
                                            roleName: cRoleName,
                                            isGlobalRole: cIsGlobal || prev?.isGlobalRole,
                                            isContact: true,
                                            isMember: true
                                        };
                                    });
                                    setPermissions(cPerms);
                                }
                            });
                            tenantUnsub = unsubContacts;
                        } else if (["R10002", "R10003", "R10004", "R10005"].includes(roleUpper)) {
                            // Listen ONLY to users
                            const qUsers = query(collection(db, `tenants/${tenantId}/users`), where("auth_uid", "==", u.uid));
                            const unsubUsers = onSnapshot(qUsers, async (tSnap) => {
                                if (!tSnap.empty) {
                                    const tenantData = tSnap.docs[0].data();
                                    const resolvedRole = tenantData?.role_id || tenantData?.role || fetchedProfile.role || "";
                                    const resolvedTenantId = tenantData?.tenantId || tenantId || "";
                                    
                                    const { userPermissions: tPerms, roleName: tRoleName, isGlobalRole: tIsGlobal } = 
                                        await getPermissionsAndRoleName(resolvedRole, resolvedTenantId);

                                    setProfile(prev => {
                                        return {
                                            ...prev,
                                            ...tenantData,
                                            role: resolvedRole,
                                            tenantId: resolvedTenantId,
                                            roleName: tRoleName,
                                            isGlobalRole: tIsGlobal || prev?.isGlobalRole,
                                            isContact: false,
                                            isMember: false
                                        };
                                    });
                                    setPermissions(tPerms);
                                }
                            });
                            tenantUnsub = unsubUsers;
                        }
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

        // Helper to check case-insensitive presence in user permissions
        const has = (p) => permissions.some(x => x.toUpperCase() === p.toUpperCase());

        // 1. Parent-tier view/create/update/delete mappings
        if (["PLATFORMADMIN_VIEW", "PLATFORM_ADMIN_VIEW"].includes(perm.toUpperCase())) {
            const keys = ["PLATFORMADMIN_VIEW", "PlatformAdmin_view", "PLATFORM_USER_VIEW", "PLATFORM_TENANT_VIEW", "DIMENTION_VIEW", "DIMENSION_VIEW"];
            if (keys.some(k => has(k))) return true;
        }
        if (["PLATFORMADMIN_CREATE", "PLATFORM_ADMIN_CREATE"].includes(perm.toUpperCase())) {
            const keys = ["PLATFORMADMIN_CREATE", "PlatformAdmin_create", "PLATFORM_USER_CREATE", "PLATFORM_TENANT_CREATE"];
            if (keys.some(k => has(k))) return true;
        }
        if (["PLATFORMADMIN_UPDATE", "PLATFORM_ADMIN_UPDATE"].includes(perm.toUpperCase())) {
            const keys = ["PLATFORMADMIN_UPDATE", "PlatformAdmin_update", "PLATFORM_USER_UPDATE", "PLATFORM_TENANT_UPDATE"];
            if (keys.some(k => has(k))) return true;
        }
        if (["PLATFORMADMIN_DELETE", "PLATFORM_ADMIN_DELETE"].includes(perm.toUpperCase())) {
            const keys = ["PLATFORMADMIN_DELETE", "PlatformAdmin_delete", "PLATFORM_USER_DELETE", "PLATFORM_TENANT_DELETE"];
            if (keys.some(k => has(k))) return true;
        }

        if (["ADMINISTRATION_VIEW", "ADMIN_VIEW"].includes(perm.toUpperCase())) {
            const keys = ["ADMINISTRATION_VIEW", "Administration_view", "INVESTMENT_VIEW", "PAYMENT_SCHEDULE_VIEW", "USER_PROFILE_VIEW", "ROLE_TYPE_VIEW", "TENANT_VIEW", "INVESTMENT_CREATE", "PAYMENT_SCHEDULE_CREATE", "USER_PROFILE_CREATE"];
            if (keys.some(k => has(k))) return true;
        }
        if (["ADMINISTRATION_CREATE", "ADMIN_CREATE"].includes(perm.toUpperCase())) {
            const keys = ["ADMINISTRATION_CREATE", "Administration_create", "INVESTMENT_CREATE", "PAYMENT_SCHEDULE_CREATE", "USER_PROFILE_CREATE"];
            if (keys.some(k => has(k))) return true;
        }
        if (["ADMINISTRATION_UPDATE", "ADMIN_UPDATE"].includes(perm.toUpperCase())) {
            const keys = ["ADMINISTRATION_UPDATE", "Administration_update", "INVESTMENT_UPDATE", "PAYMENT_SCHEDULE_UPDATE", "USER_PROFILE_UPDATE"];
            if (keys.some(k => has(k))) return true;
        }
        if (["ADMINISTRATION_DELETE", "ADMIN_DELETE"].includes(perm.toUpperCase())) {
            const keys = ["ADMINISTRATION_DELETE", "Administration_delete", "INVESTMENT_DELETE", "PAYMENT_SCHEDULE_DELETE", "USER_PROFILE_DELETE"];
            if (keys.some(k => has(k))) return true;
        }

        if (perm.toUpperCase() === "SETTINGS_VIEW") {
            const keys = ["SETTINGS_VIEW", "Settings_view", "FEE_VIEW"];
            if (keys.some(k => has(k))) return true;
        }
        if (perm.toUpperCase() === "SETTINGS_CREATE") {
            const keys = ["SETTINGS_CREATE", "Settings_create", "FEE_CREATE"];
            if (keys.some(k => has(k))) return true;
        }
        if (perm.toUpperCase() === "SETTINGS_UPDATE") {
            const keys = ["SETTINGS_UPDATE", "Settings_update", "FEE_UPDATE"];
            if (keys.some(k => has(k))) return true;
        }
        if (perm.toUpperCase() === "SETTINGS_DELETE") {
            const keys = ["SETTINGS_DELETE", "Settings_delete", "FEE_DELETE"];
            if (keys.some(k => has(k))) return true;
        }

        // 2. If checking granular permissions, map to parent-tier permissions
        if (["PLATFORM_USER_VIEW", "PLATFORM_TENANT_VIEW", "DIMENTION_VIEW", "DIMENSION_VIEW"].includes(perm.toUpperCase())) {
            if (has("PlatformAdmin_view") || has("PLATFORMADMIN_VIEW")) return true;
        }
        if (["PLATFORM_USER_CREATE", "PLATFORM_TENANT_CREATE"].includes(perm.toUpperCase())) {
            if (has("PlatformAdmin_create") || has("PLATFORMADMIN_CREATE")) return true;
        }
        if (["PLATFORM_USER_UPDATE", "PLATFORM_TENANT_UPDATE"].includes(perm.toUpperCase())) {
            if (has("PlatformAdmin_update") || has("PLATFORMADMIN_UPDATE")) return true;
        }
        if (["PLATFORM_USER_DELETE", "PLATFORM_TENANT_DELETE"].includes(perm.toUpperCase())) {
            if (has("PlatformAdmin_delete") || has("PLATFORMADMIN_DELETE")) return true;
        }

        if (["INVESTMENT_VIEW", "PAYMENT_SCHEDULE_VIEW", "USER_PROFILE_VIEW", "ROLE_TYPE_VIEW", "TENANT_VIEW"].includes(perm.toUpperCase())) {
            if (has("Administration_view") || has("ADMINISTRATION_VIEW")) return true;
        }
        if (["INVESTMENT_CREATE", "PAYMENT_SCHEDULE_CREATE", "USER_PROFILE_CREATE"].includes(perm.toUpperCase())) {
            if (has("Administration_create") || has("ADMINISTRATION_CREATE")) return true;
        }
        if (["INVESTMENT_UPDATE", "PAYMENT_SCHEDULE_UPDATE", "USER_PROFILE_UPDATE"].includes(perm.toUpperCase())) {
            if (has("Administration_update") || has("ADMINISTRATION_UPDATE")) return true;
        }
        if (["INVESTMENT_DELETE", "PAYMENT_SCHEDULE_DELETE", "USER_PROFILE_DELETE"].includes(perm.toUpperCase())) {
            if (has("Administration_delete") || has("ADMINISTRATION_DELETE")) return true;
        }

        // 3. Section specific parents mapping
        if (perm.toUpperCase() === "DEAL_VIEW") {
            if (has("DEAL_VIEW") || has("INVESTORPORTAL_VIEW") || has("INVESTOR_PORTAL_VIEW")) return true;
        }
        if (["INVESTORPORTAL_VIEW", "INVESTOR_PORTAL_VIEW"].includes(perm.toUpperCase())) {
            if (has("DEAL_VIEW") || has("INVESTORPORTAL_VIEW") || has("INVESTOR_PORTAL_VIEW")) return true;
        }

        // CRM / Contacts
        if (["CONTACT_CREATE", "CRM_CREATE"].includes(perm.toUpperCase())) {
            if (has("CONTACT_CREATE") || has("CRM_CREATE")) return true;
        }
        if (["CONTACT_VIEW", "CRM_VIEW"].includes(perm.toUpperCase())) {
            if (has("CONTACT_VIEW") || has("CRM_VIEW")) return true;
        }
        if (["CONTACT_UPDATE", "CRM_UPDATE"].includes(perm.toUpperCase())) {
            if (has("CONTACT_UPDATE") || has("CRM_UPDATE")) return true;
        }
        if (["CONTACT_DELETE", "CRM_DELETE"].includes(perm.toUpperCase())) {
            if (has("CONTACT_DELETE") || has("CRM_DELETE")) return true;
        }

        // Banking / Payments
        if (["PAYMENT_CREATE", "BANKING_CREATE"].includes(perm.toUpperCase())) {
            if (has("PAYMENT_CREATE") || has("BANKING_CREATE")) return true;
        }
        if (["PAYMENT_VIEW", "BANKING_VIEW"].includes(perm.toUpperCase())) {
            if (has("PAYMENT_VIEW") || has("BANKING_VIEW")) return true;
        }
        if (["PAYMENT_UPDATE", "BANKING_UPDATE"].includes(perm.toUpperCase())) {
            if (has("PAYMENT_UPDATE") || has("BANKING_UPDATE")) return true;
        }
        if (["PAYMENT_DELETE", "BANKING_DELETE"].includes(perm.toUpperCase())) {
            if (has("PAYMENT_DELETE") || has("BANKING_DELETE")) return true;
        }

        // Settings / Fees
        if (["FEE_CREATE", "SETTINGS_CREATE", "Settings_create"].includes(perm.toUpperCase())) {
            if (has("FEE_CREATE") || has("Settings_create") || has("SETTINGS_CREATE")) return true;
        }
        if (["FEE_VIEW", "SETTINGS_VIEW", "Settings_view"].includes(perm.toUpperCase())) {
            if (has("FEE_VIEW") || has("Settings_view") || has("SETTINGS_VIEW")) return true;
        }
        if (["FEE_UPDATE", "SETTINGS_UPDATE", "Settings_update"].includes(perm.toUpperCase())) {
            if (has("FEE_UPDATE") || has("Settings_update") || has("SETTINGS_UPDATE")) return true;
        }
        if (["FEE_DELETE", "SETTINGS_DELETE", "Settings_delete"].includes(perm.toUpperCase())) {
            if (has("FEE_DELETE") || has("Settings_delete") || has("SETTINGS_DELETE")) return true;
        }

        // Dimension / Dimention
        if (["DIMENTION_CREATE", "DIMENSION_CREATE"].includes(perm.toUpperCase())) {
            if (has("DIMENTION_CREATE") || has("DIMENSION_CREATE")) return true;
        }
        if (["DIMENTION_VIEW", "DIMENSION_VIEW"].includes(perm.toUpperCase())) {
            if (has("DIMENTION_VIEW") || has("DIMENSION_VIEW")) return true;
        }
        if (["DIMENTION_UPDATE", "DIMENSION_UPDATE"].includes(perm.toUpperCase())) {
            if (has("DIMENTION_UPDATE") || has("DIMENSION_UPDATE")) return true;
        }
        if (["DIMENTION_DELETE", "DIMENSION_DELETE"].includes(perm.toUpperCase())) {
            if (has("DIMENTION_DELETE") || has("DIMENSION_DELETE")) return true;
        }

        if (perm.endsWith("*")) {
            const prefix = perm.slice(0, -1).toUpperCase();
            if (["ROLE_TYPE_", "USER_PROFILE_", "INVESTMENT_", "PAYMENT_SCHEDULE_", "USER_", "MEMBER_", "REPORT_"].includes(prefix)) {
                if (has("Administration_view") || has("ADMINISTRATION_VIEW") ||
                    has("Administration_update") || has("ADMINISTRATION_UPDATE") ||
                    has("Administration_create") || has("ADMINISTRATION_CREATE") ||
                    has("Administration_delete") || has("ADMINISTRATION_DELETE")) return true;
            }
            if (["PLATFORM_USER_", "PLATFORM_TENANT_", "DIMENTION_", "DIMENSION_"].includes(prefix)) {
                if (has("PlatformAdmin_view") || has("PLATFORMADMIN_VIEW") ||
                    has("PlatformAdmin_update") || has("PLATFORMADMIN_UPDATE") ||
                    has("PlatformAdmin_create") || has("PLATFORMADMIN_CREATE") ||
                    has("PlatformAdmin_delete") || has("PLATFORMADMIN_DELETE")) return true;
            }
            if (prefix === "SETTINGS_" || prefix === "FEE_") {
                if (has("Settings_view") || has("SETTINGS_VIEW") ||
                    has("Settings_update") || has("SETTINGS_UPDATE") ||
                    has("Settings_create") || has("SETTINGS_CREATE") ||
                    has("Settings_delete") || has("SETTINGS_DELETE") ||
                    has("FEE_VIEW") || has("FEE_CREATE") || has("FEE_UPDATE") || has("FEE_DELETE")) return true;
            }
            return permissions.some(p => p.toUpperCase().startsWith(prefix));
        }

        return has(perm);
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
        isR10010: hasPermission("PLATFORM_USER_VIEW"),
        tenantId: profile?.tenantId || ""
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

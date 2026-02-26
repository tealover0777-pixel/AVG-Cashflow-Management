import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
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
                            tenantId = data.tenantId || tenantId;
                        }
                    } catch (err) {
                        console.error("Failed to fetch global user_roles:", err);
                    }

                    let fetchedProfile = { role, tenantId };

                    // 3. Optional: fetch extra profile info from tenant collection
                    if (tenantId) {
                        try {
                            const profDoc = await getDoc(doc(db, `tenants/${tenantId}/users`, u.uid));
                            if (profDoc.exists()) {
                                fetchedProfile = { ...fetchedProfile, ...profDoc.data() };
                            }
                        } catch (err) {
                            console.error("Failed to fetch tenant profile:", err);
                        }
                    }

                    setProfile(fetchedProfile);
                } else {
                    setUser(null);
                    setProfile(null);
                }
            } catch (err) {
                console.error("Auth state change error:", err);
                setUser(null);
                setProfile(null);
            } finally {
                setLoading(false);
            }
        });
        return unsub;
    }, []);

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);

    const value = {
        user,
        profile,
        loading,
        login,
        logout,
        isSuperAdmin: profile?.role === "company_super_admin_read_write" || profile?.role === "secret_admin_read_write",
        isTenantAdmin: profile?.role === "tenant_admin_super_user" || profile?.role === "tenant_admin_read_write",
        tenantId: profile?.tenantId || ""
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

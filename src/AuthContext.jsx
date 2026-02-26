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
                    // Check for custom claims first (most efficient)
                    const idToken = await u.getIdTokenResult();
                    const role = idToken.claims.role || "tenant_user";
                    const tenantId = idToken.claims.tenantId || "";

                    let fetchedProfile = { role, tenantId };

                    // If we have a tenantId, try to fetch the profile from Firestore
                    if (tenantId) {
                        try {
                            const profDoc = await getDoc(doc(db, `tenants/${tenantId}/users`, u.uid));
                            if (profDoc.exists()) {
                                fetchedProfile = { ...fetchedProfile, ...profDoc.data() };
                            }
                        } catch (err) {
                            console.error("Failed to fetch user profile document:", err);
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

import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "../AuthContext";
import { FF, FIn } from "../components";

export default function PageProfile({ t, isDark, setIsDark, ROLES = [], collectionPath = "" }) {
    const { user, profile, tenantId, isSuperAdmin } = useAuth();
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState({
        name: profile?.user_name || profile?.name || user?.displayName || "",
        email: user?.email || "",
        phone: profile?.phone || "",
    });
    const [tenantData, setTenantData] = useState({ name: "", logo: "" });

    const canEditTenant = isSuperAdmin ||
        (profile?.role || "").toLowerCase().includes("super_user") ||
        (profile?.roleName || "").toLowerCase().includes("super user") ||
        (profile?.role || "").toLowerCase().includes("owner") ||
        (profile?.roleName || "").toLowerCase().includes("owner");

    // Update form data if profile updates in background
    useEffect(() => {
        if (profile) {
            setData({
                name: profile.user_name || profile.name || user?.displayName || "",
                email: user?.email || "",
                phone: profile.phone || "",
            });
        }
    }, [profile, user]);

    // Fetch tenant data if allowed
    useEffect(() => {
        if (canEditTenant && tenantId) {
            getDoc(doc(db, "tenants", tenantId)).then(snap => {
                if (snap.exists()) {
                    const d = snap.data();
                    setTenantData({ name: d.tenant_name || "", logo: d.tenant_logo || "" });
                }
            }).catch(e => console.error("Error fetching tenant for profile:", e));
        }
    }, [canEditTenant, tenantId]);

    const roleId = profile?.role_id || profile?.role || "";
    const roleName = (() => {
        if (profile?.roleName) return profile.roleName;
        const found = ROLES.find(r => (r.id || r.role_id) === roleId);
        return found ? (found.role_name || found.name || roleId) : roleId;
    })();
    const roleDisplay = roleId && roleName && roleName !== roleId ? `${roleId} — ${roleName}` : (roleName || roleId || "—");

    const [resetting, setResetting] = useState(false);
    const handleChangePassword = async () => {
        if (!user?.email) return;
        setResetting(true);
        try {
            await sendPasswordResetEmail(auth, user.email);
            alert("Password reset email sent to " + user.email + ". Check your inbox.");
        } catch (err) {
            console.error("Password reset error:", err);
            alert("Failed to send reset email: " + (err.message || "Unknown error"));
        } finally {
            setResetting(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert("File is too large! Please choose an image under 1MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setTenantData(prev => ({ ...prev, logo: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const uid = user?.uid;
            if (!uid) return;

            // 1. Update global_users record (Primary for all users)
            await setDoc(doc(db, "global_users", uid), {
                user_name: data.name || "",
                phone: data.phone || "",
                last_updated: serverTimestamp(),
            }, { merge: true });

            // 2. Update tenant-specific user doc (Sync if exists)
            const path = collectionPath || (tenantId ? `tenants/${tenantId}/users` : null);
            if (path) {
                const q = query(collection(db, path), where("auth_uid", "==", uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    await updateDoc(snap.docs[0].ref, {
                        user_name: data.name || "",
                        phone: data.phone || "",
                        updated_at: serverTimestamp(),
                    });
                }
            }

            // 3. Update tenant logo if allowed
            if (canEditTenant && tenantId) {
                await updateDoc(doc(db, "tenants", tenantId), {
                    tenant_logo: tenantData.logo || "",
                    updated_at: serverTimestamp()
                });
            }

            alert("Profile updated successfully.");
        } catch (err) {
            console.error("Save profile error:", err);
            alert("Save failed: " + (err.message || "Unknown error"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>My Profile</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage your account settings</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: canEditTenant ? "1fr 1fr" : "1fr", gap: 32, alignItems: "start" }}>
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: t.logoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", boxShadow: t.logoShadow }}>
                            {(data.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? "#fff" : "#1C1917" }}>{data.name}</div>
                            <div style={{ fontFamily: t.mono, fontSize: 12, color: t.textMuted, marginTop: 4 }}>{roleDisplay}</div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gap: 20 }}>
                        <FF label="Theme Preference" t={t}>
                            <div style={{ display: "flex", gap: 8 }}>
                                {[
                                    { id: "light", label: "☀️ Light Mode", val: false },
                                    { id: "dark", label: "🌙 Dark Mode", val: true }
                                ].map(m => {
                                    const active = isDark === m.val;
                                    return (
                                        <div key={m.id} onClick={() => setIsDark(m.val)} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: active ? t.accentGrad : (isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1"), border: `1px solid ${active ? t.accent : t.border}`, color: active ? "#fff" : t.textSecondary, fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}>
                                            {m.label}
                                        </div>
                                    );
                                })}
                            </div>
                        </FF>

                        <FF label="Full Name" t={t}><FIn value={data.name} onChange={e => setData(s => ({ ...s, name: e.target.value }))} t={t} /></FF>
                        <FF label="Email Address" t={t}><FIn value={data.email} disabled t={t} /></FF>
                        <FF label="Phone Number" t={t}><FIn value={data.phone} onChange={e => setData(s => ({ ...s, phone: e.target.value }))} t={t} /></FF>
                        <FF label="Role" t={t}>
                            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{roleDisplay}</div>
                        </FF>

                        <button onClick={handleSave} disabled={saving} className="primary-btn" style={{ background: t.accentGrad, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: `0 4px 16px ${t.accentShadow}`, marginTop: 4 }}>
                            {saving ? "Saving..." : "Save Changes"}
                        </button>

                        <div style={{ marginTop: 12, padding: "16px 20px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Account Security</div>
                            <button onClick={handleChangePassword} disabled={resetting} className="primary-btn" style={{ background: t.chipBg, color: t.textSecondary, border: `1px solid ${t.chipBorder}`, padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: resetting ? "default" : "pointer", opacity: resetting ? 0.6 : 1 }}>{resetting ? "Sending..." : "Change Password"}</button>
                        </div>
                    </div>
                </div>

                {canEditTenant && (
                    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
                        <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontFamily: t.titleFont, fontSize: 16, color: isDark ? "#fff" : "#1C1917", marginBottom: 4 }}>Tenant Branding</h3>
                            <p style={{ fontSize: 12, color: t.textMuted }}>As a {roleName}, you can manage the brand identity for {tenantData.name || tenantId}.</p>
                        </div>

                        <div style={{ display: "grid", gap: 24 }}>
                            <FF label="Tenant Name (Read-only)" t={t}>
                                <div style={{ fontSize: 13, color: t.text, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>
                                    {tenantData.name || tenantId}
                                </div>
                            </FF>

                            <FF label="Tenant Logo" t={t}>
                                <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", border: `1px dashed ${t.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                                    {tenantData.logo ? (
                                        <div style={{ position: "relative" }}>
                                            <img src={tenantData.logo} alt="Tenant Logo" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }} />
                                            <button onClick={() => setTenantData(p => ({ ...p, logo: "" }))} style={{ position: "absolute", top: -10, right: -10, background: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>×</button>
                                        </div>
                                    ) : (
                                        <div style={{ width: 80, height: 80, borderRadius: 16, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🏢</div>
                                    )}
                                    <div>
                                        <input type="file" id="tenant-logo-profile" accept="image/*" onChange={handleLogoChange} style={{ display: "none" }} />
                                        <label htmlFor="tenant-logo-profile" style={{ background: t.accentGrad, color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-block", boxShadow: `0 4px 12px ${t.accentShadow}` }}>
                                            {tenantData.logo ? "Change Logo" : "Upload Logo"}
                                        </label>
                                        <p style={{ fontSize: 11, color: t.textMuted, marginTop: 10 }}>Recommended: Square/Wide PNG or JPG. Max 1MB.</p>
                                    </div>
                                </div>
                            </FF>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

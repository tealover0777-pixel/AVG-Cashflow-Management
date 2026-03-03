import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "../AuthContext";
import { FF, FIn } from "../components";

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
        photo_url: profile?.photo_url || profile?.photoURL || "",
    });
    const [tenantData, setTenantData] = useState({ name: "", logo: "" });

    const roleId = profile?.role_id || profile?.role || "";
    const roleName = (() => {
        if (profile?.roleName) return profile.roleName;
        const found = ROLES.find(r => (r.id || r.role_id) === roleId);
        return found ? (found.role_name || found.name || roleId) : roleId;
    })();
    const roleDisplay = roleId && roleName && roleName !== roleId ? `${roleId} — ${roleName}` : (roleName || roleId || "—");

    const canEditTenant = isSuperAdmin ||
        roleId === "R10010" ||
        roleId === "R10007" ||
        roleId === "R10006" ||
        roleName.toLowerCase().includes("super user") ||
        roleName.toLowerCase().includes("owner") ||
        roleName.toLowerCase().includes("tenant owner");

    // Update form data if profile updates in background
    useEffect(() => {
        if (profile) {
            setData({
                name: profile.user_name || profile.name || user?.displayName || "",
                email: user?.email || "",
                phone: profile.phone || "",
                photo_url: profile.photo_url || profile.photoURL || "",
            });
        }
    }, [profile, user]);

    // Fetch tenant data if allowed
    useEffect(() => {
        if (canEditTenant && tenantId) {
            getDoc(doc(db, "tenants", tenantId)).then(snap => {
                if (snap.exists()) {
                    const d = snap.data();
                    setTenantData({ name: d.tenant_name || d.name || "", logo: d.tenant_logo || d.logo || "" });
                }
            }).catch(e => console.error("Error fetching tenant for profile:", e));
        }
    }, [canEditTenant, tenantId]);

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

    const handlePhotoChange = (e, target) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 800 * 1024) {
            alert("File is too large! Please choose an image under 800KB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (target === "profile") {
                setData(s => ({ ...s, photo_url: reader.result }));
            } else {
                setTenantData(s => ({ ...s, logo: reader.result }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const uid = user?.uid;
            if (!uid) return;

            // 1. Update global_users record
            await setDoc(doc(db, "global_users", uid), {
                user_name: data.name || "",
                phone: data.phone || "",
                photo_url: data.photo_url || "",
                last_updated: serverTimestamp(),
            }, { merge: true });

            // 2. Update tenant-specific user doc
            const path = collectionPath || (tenantId ? `tenants/${tenantId}/users` : null);
            if (path) {
                const q = query(collection(db, path), where("auth_uid", "==", uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    await updateDoc(snap.docs[0].ref, {
                        user_name: data.name || "",
                        phone: data.phone || "",
                        photo_url: data.photo_url || "",
                        updated_at: serverTimestamp(),
                    });
                }
            }

            // 3. Update tenant branding if allowed
            if (canEditTenant && tenantId) {
                await updateDoc(doc(db, "tenants", tenantId), {
                    tenant_name: tenantData.name || "",
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

            <div style={{ display: "grid", gridTemplateColumns: canEditTenant ? "1fr 1.1fr" : "1fr", gap: 32, alignItems: "start" }}>
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
                        <div style={{ position: "relative", group: "avatar" }}>
                            <div style={{ width: 80, height: 80, borderRadius: 20, background: t.logoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", boxShadow: t.logoShadow, overflow: "hidden" }}>
                                {data.photo_url ? (
                                    <img src={data.photo_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    (data.name || "?").charAt(0).toUpperCase()
                                )}
                            </div>
                            <input type="file" id="profile-photo-upload" accept="image/*" onChange={e => handlePhotoChange(e, "profile")} style={{ display: "none" }} />
                            <label htmlFor="profile-photo-upload" style={{ position: "absolute", bottom: -6, right: -6, width: 28, height: 28, borderRadius: "50%", background: t.accent, border: `2px solid ${isDark ? "#1C1917" : "#fff"}`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, boxShadow: "0 4px 8px rgba(0,0,0,0.2)", transition: "transform 0.2s ease" }} title="Update Photo">
                                📷
                            </label>
                        </div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 2 }}>{data.name}</div>
                            <div style={{ fontFamily: t.mono, fontSize: 12.5, color: t.textMuted, opacity: 0.8 }}>{roleDisplay}</div>
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

                        <FF label="Full Name" t={t}><FIn value={data.name} onChange={e => setData(s => ({ ...s, name: e.target.value }))} placeholder="Your name" t={t} /></FF>
                        <FF label="Email Address" t={t}><FIn value={data.email} disabled t={t} /></FF>
                        <FF label="Phone Number" t={t}><FIn value={data.phone} onChange={e => setData(s => ({ ...s, phone: e.target.value }))} placeholder="e.g. +1 555 000 0000" t={t} /></FF>
                        <FF label="User Role" t={t}>
                            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{roleDisplay}</div>
                        </FF>

                        <button onClick={handleSave} disabled={saving} className="primary-btn" style={{ background: t.accentGrad, color: "#fff", border: "none", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: `0 4px 16px ${t.accentShadow}`, marginTop: 8 }}>
                            {saving ? "Saving Profile..." : "Save Changes"}
                        </button>

                        <div style={{ marginTop: 12, padding: "16px 20px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Account Security</div>
                            <button onClick={handleChangePassword} disabled={resetting} className="primary-btn" style={{ background: t.chipBg, color: t.textSecondary, border: `1px solid ${t.chipBorder}`, padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: resetting ? "default" : "pointer", opacity: resetting ? 0.6 : 1 }}>{resetting ? "Sending Reset Email..." : "Change Password"}</button>
                        </div>
                    </div>
                </div>

                {canEditTenant && (
                    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
                        <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontFamily: t.titleFont, fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>Tenant Branding</h3>
                            <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>As an administrator, you can manage the corporate identity for your organization.</p>
                        </div>

                        <div style={{ display: "grid", gap: 24 }}>
                            <FF label="Organization Name" t={t}>
                                <FIn value={tenantData.name} onChange={e => setTenantData(p => ({ ...p, name: e.target.value }))} placeholder="Organization Name" t={t} />
                            </FF>

                            <FF label="Organization Logo" t={t}>
                                <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", border: `1px dashed ${t.border}`, borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                                    {tenantData.logo ? (
                                        <div style={{ position: "relative" }}>
                                            <img src={tenantData.logo} alt="Tenant Logo" style={{ maxWidth: "100%", maxHeight: 100, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }} />
                                            <button onClick={() => setTenantData(p => ({ ...p, logo: "" }))} style={{ position: "absolute", top: -12, right: -12, background: "#EF4444", color: "#fff", border: "2px solid #fff", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>×</button>
                                        </div>
                                    ) : (
                                        <div style={{ width: 90, height: 90, borderRadius: 20, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🏢</div>
                                    )}
                                    <div style={{ marginTop: 8 }}>
                                        <input type="file" id="tenant-logo-profile" accept="image/*" onChange={e => handlePhotoChange(e, "tenant")} style={{ display: "none" }} />
                                        <label htmlFor="tenant-logo-profile" style={{ background: t.accentGrad, color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "inline-block", boxShadow: `0 4px 12px ${t.accentShadow}`, transition: "transform 0.15s ease" }}>
                                            {tenantData.logo ? "Replace Logo" : "Upload Logo"}
                                        </label>
                                        <p style={{ fontSize: 11, color: t.textMuted, marginTop: 12, fontWeight: 500 }}>High resolution PNG/JPEG (Max 800KB)</p>
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

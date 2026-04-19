import React, { useState, useEffect, useRef, useMemo } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "../AuthContext";
import { FF, FIn, Modal } from "../components";
import { uploadFile } from "../utils/storageUtils";

export default function PageProfile({ t, isDark, setIsDark, ROLES = [], collectionPath = "", activeTenantId = "" }) {
    const { user, profile, tenantId: authTenantId } = useAuth();
    const tenantId = activeTenantId || authTenantId;
    const [saving, setSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };
    const [data, setData] = useState({
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        email: user?.email || "",
        phone: profile?.phone || "",
        photo_url: profile?.photo_url || profile?.photoURL || "",
        address1: profile?.address1 || "",
        address2: profile?.address2 || "",
        city: profile?.city || "",
        state: profile?.state || "",
        zip: profile?.zip || "",
        country: profile?.country || "",
    });

    const roleId = profile?.role_id || profile?.role || "";
    const roleName = (() => {
        if (profile?.roleName) return profile.roleName;
        const found = ROLES.find(r => (r.id || r.role_id) === roleId);
        return found ? (found.role_name || found.name || roleId) : roleId;
    })();
    const roleDisplay = roleId && roleName && roleName !== roleId ? `${roleId} — ${roleName}` : (roleName || roleId || "—");



    // Update form data if profile updates in background
    useEffect(() => {
        if (profile) {
            setData({
                first_name: profile.first_name || "",
                last_name: profile.last_name || "",
                email: user?.email || "",
                phone: profile.phone || "",
                photo_url: profile.photo_url || profile.photoURL || "",
                address1: profile.address1 || "",
                address2: profile.address2 || "",
                city: profile.city || "",
                state: profile.state || "",
                zip: profile.zip || "",
                country: profile.country || "",
            });
        }
    }, [profile, user]);



    const [resetting, setResetting] = useState(false);
    const handleChangePassword = async () => {
        if (!user?.email) return;
        setResetting(true);
        try {
            await sendPasswordResetEmail(auth, user.email);
            showToast("Password reset email sent to " + user.email + ". Check your inbox.", "success");
        } catch (err) {
            console.error("Password reset error:", err);
            showToast("Failed to send reset email: " + (err.message || "Unknown error"), "error");
        } finally {
            setResetting(false);
        }
    };

    const handlePhotoChange = async (e, target) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation - now 2MB for storage
        if (file.size > 2 * 1024 * 1024) {
            showToast("File is too large! Please choose an image under 2MB for cloud storage.", "error");
            return;
        }

        try {
            let path = "";
            if (target === "profile") {
                path = `users/${user.uid}/profile_${Date.now()}`;
            } else {
                path = `tenants/${tenantId}/branding/logo_${Date.now()}`;
            }

            const url = await uploadFile(file, path);
            
            if (target === "profile") {
                setData(s => ({ ...s, photo_url: url }));
            }
        } catch (err) {
            console.error("Storage upload error:", err);
            showToast("Failed to upload image to storage.", "error");
        }
    };

    const handleSave = () => setShowConfirm(true);

    const executeSave = async () => {
        setSaving(true);
        try {
            const uid = user?.uid;
            if (!uid) return;

            // 1. Update global_users record
            await setDoc(doc(db, "global_users", uid), {
                first_name: data.first_name || "",
                last_name: data.last_name || "",
                phone: data.phone || "",
                photo_url: data.photo_url || "",
                address1: data.address1 || "",
                address2: data.address2 || "",
                city: data.city || "",
                state: data.state || "",
                zip: data.zip || "",
                country: data.country || "",
                last_updated: serverTimestamp(),
            }, { merge: true });

            // 2. Update tenant-specific user doc
            const path = collectionPath || (tenantId ? `tenants/${tenantId}/users` : null);
            if (path) {
                const q = query(collection(db, path), where("auth_uid", "==", uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    await updateDoc(snap.docs[0].ref, {
                        first_name: data.first_name || "",
                        last_name: data.last_name || "",
                        phone: data.phone || "",
                        photo_url: data.photo_url || "",
                        address1: data.address1 || "",
                        address2: data.address2 || "",
                        city: data.city || "",
                        state: data.state || "",
                        zip: data.zip || "",
                        country: data.country || "",
                        updated_at: serverTimestamp(),
                    });
                }
            }



            showToast("Profile updated successfully.", "success");
            setShowConfirm(false);
        } catch (err) {
            console.error("Save profile error:", err);
            showToast("Save failed: " + (err.message || "Unknown error"), "error");
            setShowConfirm(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {toast && (
                <div style={{
                    position: "fixed", bottom: 28, right: 28, zIndex: 10000,
                    background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"),
                    border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`,
                    color: toast.type === "success" ? "#22c55e" : "#ef4444",
                    borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 500,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)", maxWidth: 380, lineHeight: 1.5,
                    display: "flex", alignItems: "center", gap: 10
                }}>
                    <span>{toast.type === "success" ? "✅" : "❌"}</span>
                    <span>{toast.msg}</span>
                    <span onClick={() => setToast(null)} style={{ marginLeft: "auto", cursor: "pointer", opacity: 0.6, fontSize: 16 }}>✕</span>
                </div>
            )}
            <Modal
                open={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Confirm Changes"
                onSave={executeSave}
                saveLabel={saving ? "Saving..." : "Confirm & Save"}
                t={t}
                isDark={isDark}
                loading={saving}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "8px 0" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: isDark ? "rgba(255,255,255,0.05)" : "#F0F9FF", border: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>💾</div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 8 }}>Save profile changes?</div>
                        <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>Are you sure you want to update your profile and organization settings?</div>
                    </div>
                </div>
            </Modal>

            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>My Profile</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage your account settings</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32, alignItems: "start" }}>
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
                        <div style={{ position: "relative", group: "avatar" }}>
                            <div style={{ width: 80, height: 80, borderRadius: 20, background: t.logoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", boxShadow: t.logoShadow, overflow: "hidden" }}>
                                {data.photo_url ? (
                                    <img src={data.photo_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    (data.first_name || data.last_name || "?").charAt(0).toUpperCase()
                                )}
                            </div>
                            <input type="file" id="profile-photo-upload" accept="image/*" onChange={e => handlePhotoChange(e, "profile")} style={{ display: "none" }} />
                            <label htmlFor="profile-photo-upload" style={{ position: "absolute", bottom: -6, right: -6, width: 28, height: 28, borderRadius: "50%", background: t.accent, border: `2px solid ${isDark ? "#1C1917" : "#fff"}`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, boxShadow: "0 4px 8px rgba(0,0,0,0.2)", transition: "transform 0.2s ease" }} title="Update Photo">
                                📷
                            </label>
                        </div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 2 }}>
                                {[data.first_name, data.last_name].filter(Boolean).join(" ") || "—"}
                            </div>
                            <div style={{ fontFamily: t.mono, fontSize: 12.5, color: t.textMuted, opacity: 0.8, marginBottom: 12 }}>{roleDisplay}</div>
                            <button 
                                onClick={() => document.getElementById("profile-photo-upload").click()}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    border: `1px solid ${t.border}`,
                                    background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                                    color: t.accent,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                Update photo
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "grid", gap: 32 }}>
                        {/* Information Section */}
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                                Information
                                <div style={{ flex: 1, height: 1, background: t.border, opacity: 0.5 }} />
                            </div>
                            <div style={{ display: "grid", gap: 20 }}>
                                <FF label="First Name" t={t}><FIn value={data.first_name} onChange={e => setData(s => ({ ...s, first_name: e.target.value }))} placeholder="First name" t={t} /></FF>
                                <FF label="Last Name" t={t}><FIn value={data.last_name} onChange={e => setData(s => ({ ...s, last_name: e.target.value }))} placeholder="Last name" t={t} /></FF>
                                <FF label="User Role" t={t}>
                                    <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{roleDisplay}</div>
                                </FF>
                            </div>
                        </div>

                        {/* Contact Details Section */}
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                                Contact details
                                <div style={{ flex: 1, height: 1, background: t.border, opacity: 0.5 }} />
                            </div>
                            <div style={{ display: "grid", gap: 20 }}>
                                <FF label="Email Address" t={t}><FIn value={data.email} disabled t={t} /></FF>
                                <FF label="Phone Number" t={t}><FIn value={data.phone} onChange={e => setData(s => ({ ...s, phone: e.target.value }))} placeholder="e.g. +1 555 000 0000" t={t} /></FF>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                                Address
                                <div style={{ flex: 1, height: 1, background: t.border, opacity: 0.5 }} />
                            </div>
                            <div style={{ display: "grid", gap: 20 }}>
                                <FF label="Street address line 1" t={t}><FIn value={data.address1} onChange={e => setData(s => ({ ...s, address1: e.target.value }))} placeholder="Address line 1" t={t} /></FF>
                                <FF label="Street address line 2" t={t}><FIn value={data.address2} onChange={e => setData(s => ({ ...s, address2: e.target.value }))} placeholder="Address line 2" t={t} /></FF>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                    <FF label="City" t={t}><FIn value={data.city} onChange={e => setData(s => ({ ...s, city: e.target.value }))} placeholder="City" t={t} /></FF>
                                    <FF label="State" t={t}><FIn value={data.state} onChange={e => setData(s => ({ ...s, state: e.target.value }))} placeholder="State" t={t} /></FF>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                    <FF label="Zip code" t={t}><FIn value={data.zip} onChange={e => setData(s => ({ ...s, zip: e.target.value }))} placeholder="Zip code" t={t} /></FF>
                                    <FF label="Country" t={t}><FIn value={data.country} onChange={e => setData(s => ({ ...s, country: e.target.value }))} placeholder="Country" t={t} /></FF>
                                </div>
                            </div>
                        </div>

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
                    </div>

                        <button onClick={handleSave} disabled={saving} className="primary-btn" style={{ background: t.accentGrad, color: "#fff", border: "none", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: `0 4px 16px ${t.accentShadow}`, marginTop: 8 }}>
                            {saving ? "Saving Profile..." : "Save Changes"}
                        </button>

                        <div style={{ marginTop: 12, padding: "16px 20px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Account Security</div>
                            <button onClick={handleChangePassword} disabled={resetting} className="primary-btn" style={{ background: t.chipBg, color: t.textSecondary, border: `1px solid ${t.chipBorder}`, padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: resetting ? "default" : "pointer", opacity: resetting ? 0.6 : 1 }}>{resetting ? "Sending Reset Email..." : "Change Password"}</button>
                    </div>
                </div>


            </div>
        </>
    );
}

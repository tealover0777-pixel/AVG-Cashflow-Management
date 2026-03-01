import { useState } from "react";
import { db } from "../firebase";
import { updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { FF, FIn } from "../components";

export default function PageProfile({ t, isDark, ROLES = [], collectionPath = "" }) {
    const { user, profile, tenantId } = useAuth();
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState({
        name: profile?.user_name || profile?.name || user?.displayName || "",
        email: user?.email || "",
        phone: profile?.phone || "",
    });

    const roleId = profile?.role_id || profile?.role || "";
    const roleName = (() => {
        if (profile?.roleName) return profile.roleName;
        const found = ROLES.find(r => (r.id || r.role_id) === roleId);
        return found ? (found.role_name || found.name || roleId) : roleId;
    })();
    const roleDisplay = roleId && roleName && roleName !== roleId ? `${roleId} — ${roleName}` : (roleName || roleId || "—");

    const handleSave = async () => {
        setSaving(true);
        try {
            const path = collectionPath || `tenants/${tenantId}/users`;
            const uid = user?.uid;
            if (uid && path) {
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

            <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, maxWidth: 600, backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
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
                        <button className="primary-btn" style={{ background: t.chipBg, color: t.textSecondary, border: `1px solid ${t.chipBorder}`, padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>Change Password</button>
                    </div>
                </div>
            </div>
        </>
    );
}

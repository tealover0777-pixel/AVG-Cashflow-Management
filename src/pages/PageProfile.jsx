import { useState } from "react";
import { useAuth } from "../AuthContext";
import { Bdg, FF, FIn } from "../components";

export default function PageProfile({ t, isDark }) {
    const { user, profile } = useAuth();
    const [data, setData] = useState({
        name: profile?.name || user?.displayName || "",
        email: user?.email || "",
        phone: profile?.phone || "",
        role: profile?.role || "",
        tenantId: profile?.tenantId || ""
    });

    return (
        <>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>My Profile</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage your account settings</p>
            </div>

            <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, maxWidth: 600, backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: t.logoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", boxShadow: t.logoShadow }}>
                        {data.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? "#fff" : "#1C1917" }}>{data.name}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            <Bdg status={profile?.role?.replace(/_/g, " ").toUpperCase()} isDark={isDark} />
                            <span style={{ fontFamily: t.mono, fontSize: 12, color: t.textMuted }}>{data.tenantId}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gap: 20 }}>
                    <FF label="Full Name" t={t}><FIn value={data.name} onChange={e => setData(s => ({ ...s, name: e.target.value }))} t={t} /></FF>
                    <FF label="Email Address" t={t}><FIn value={data.email} disabled t={t} /></FF>
                    <FF label="Phone Number" t={t}><FIn value={data.phone} onChange={e => setData(s => ({ ...s, phone: e.target.value }))} t={t} /></FF>

                    <div style={{ marginTop: 12, padding: "16px 20px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}` }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Account Security</div>
                        <button className="primary-btn" style={{ background: t.chipBg, color: t.textSecondary, border: `1px solid ${t.chipBorder}`, padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>Change Password</button>
                    </div>
                </div>
            </div>
        </>
    );
}

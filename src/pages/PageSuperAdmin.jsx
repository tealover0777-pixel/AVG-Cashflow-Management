import { useState } from "react";

export default function PageSuperAdmin({ t, isDark }) {
    return (
        <>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Super Admin</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Global system management and tenant oversight</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 24 }}>
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Global Settings</h2>
                    <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>Maintenance mode, global announcements, and system-wide configuration.</p>
                </div>

                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Tenant Oversight</h2>
                    <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>View aggregate data across all tenants and troubleshoot issues.</p>
                </div>
            </div>
        </>
    );
}

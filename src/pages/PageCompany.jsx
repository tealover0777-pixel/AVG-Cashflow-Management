import React from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { FF, FIn } from "../components";
import { uploadFile } from "../utils/storageUtils";
import { ChevronDown, Send } from "lucide-react";
import { functions } from "../firebase";
import { httpsCallable } from "firebase/functions";

export default function PageCompany({ t, isDark, activeTenantId = "", USERS = [], CONTACTS = [] }) {
    const { user, profile, tenantId: authTenantId, isSuperAdmin } = useAuth();
    const tenantId = activeTenantId || authTenantId;
    const [saving, setSaving] = React.useState(false);
    const [toast, setToast] = React.useState(null);
    const [showOwnerSearch, setShowOwnerSearch] = React.useState(false);
    const [ownerSearch, setOwnerSearch] = React.useState("");
    const [testingEmail, setTestingEmail] = React.useState(false);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const [data, setData] = React.useState({
        name: "",
        logo: "",
        email: "",
        phone: "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        home_page: "",
        owner: "",
        _origOwner: "",
        emailSetup: {
            method: "ESP",
            common: {
                fromEmail: "",
                fromName: "",
                replyTo: "",
                testEmail: ""
            },
            api: {
                provider: "SendGrid",
                apiKey: "",
                domain: "",
                region: "",
                baseUrl: ""
            },
            smtp: {
                host: "",
                port: "587",
                user: "",
                pass: "",
                secure: true
            }
        },
        achSetup: {
            enabled: false,
            originatorName: "",
            originatorId: "",
            odfiName: "",
            odfiRouting: "",
            accountNumber: "",
            accountType: "Checking",
            immediateOrigin: "",
            immediateDestination: ""
        }
    });

    React.useEffect(() => {
        if (tenantId) {
            getDoc(doc(db, "tenants", tenantId)).then(snap => {
                if (snap.exists()) {
                    const d = snap.data();
                    const e = d.emailSetup || {};
                    // Migration / Defaulting
                    setData({
                        name: d.tenant_name || d.name || "",
                        logo: d.tenant_logo || d.logo || "",
                        email: d.tenant_email || d.email || "",
                        phone: d.tenant_phone || d.phone || "",
                        address1: d.address || d.address1 || "",
                        address2: d.address2 || "",
                        city: d.city || "",
                        state: d.state || "",
                        zip: d.zip || "",
                        country: d.country || "",
                        home_page: d.home_page || "",
                        owner: d.owner || d.owner_id || "",
                        _origOwner: d.owner || d.owner_id || "",
                        emailSetup: {
                            method: e.method || (e.provider === "SMTP" ? "SMTP" : "ESP"),
                            common: e.common || {
                                fromEmail: d.tenant_email || d.email || "",
                                fromName: d.tenant_name || d.name || "",
                                replyTo: "",
                                testEmail: user?.email || ""
                            },
                            api: e.api || {
                                provider: "SendGrid",
                                apiKey: "",
                                domain: "",
                                region: "",
                                baseUrl: ""
                            },
                            smtp: e.smtp || {
                                host: "",
                                port: "587",
                                user: "",
                                pass: "",
                                has2FA: false,
                                secure: true
                            }
                        },
                        achSetup: d.achSetup || {
                            enabled: false,
                            originatorName: d.tenant_name || d.name || "",
                            originatorId: "",
                            odfiName: "",
                            odfiRouting: "",
                            accountNumber: "",
                            accountType: "Checking",
                            immediateOrigin: "",
                            immediateDestination: ""
                        }
                    });
                }
            }).catch(e => console.error("Error fetching tenant data:", e));
        }
    }, [tenantId, user?.email]);

    const resolvedOwnerName = React.useMemo(() => {
        if (!data.owner) return "—";
        const all = [...USERS, ...CONTACTS];
        const found = all.find(u => u.id === data.owner || u.auth_uid === data.owner || u.email === data.owner);
        if (found) {
            return [found.first_name, found.last_name].filter(Boolean).join(" ") || found.name || found.contact_name || found.email || data.owner;
        }
        return data.owner;
    }, [data.owner, USERS, CONTACTS]);

    const filteredOwnerResults = React.useMemo(() => {
        if (!ownerSearch) return [...USERS, ...CONTACTS].slice(0, 50);
        const q = ownerSearch.toLowerCase();
        return [...USERS, ...CONTACTS].filter(u => {
            const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.contact_name || u.email || "";
            return name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q));
        }).slice(0, 50);
    }, [ownerSearch, USERS, CONTACTS]);

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast("File is too large! Please choose an image under 2MB.", "error");
            return;
        }
        try {
            const path = `tenants/${tenantId}/branding/logo_${Date.now()}`;
            const url = await uploadFile(file, path);
            setData(s => ({ ...s, logo: url }));
            showToast("Logo uploaded. Click Save to apply changes.");
        } catch (err) {
            console.error("Logo upload error:", err);
            showToast("Failed to upload logo.", "error");
        }
    };

    const handleSave = async () => {
        if (!tenantId) return;
        setSaving(true);
        try {
            const isNewOwner = data.owner && data.owner !== data._origOwner;
            if (isNewOwner) {
                const iAmOwner = profile?.role_id === "R10005" || profile?.role === "R10005";
                if (!iAmOwner && !isSuperAdmin) {
                    showToast("Only the current Owner or a Super Admin can transfer ownership.", "error");
                    setSaving(false); return;
                }
                const existingOwners = USERS.filter(u => u.role_id === "R10005" && u.id !== data.owner);
                for (const old of existingOwners) {
                    await updateDoc(doc(db, "tenants", tenantId, "users", old.id), { role_id: "R10004", updated_at: serverTimestamp() });
                    await updateDoc(doc(db, "global_users", old.auth_uid || old.id), { role: "R10004", last_updated: serverTimestamp() });
                }
                const newOwnerInTenant = USERS.find(u => u.id === data.owner || u.auth_uid === data.owner);
                if (newOwnerInTenant) {
                    await updateDoc(doc(db, "tenants", tenantId, "users", newOwnerInTenant.id), { role_id: "R10005", updated_at: serverTimestamp() });
                    await updateDoc(doc(db, "global_users", newOwnerInTenant.auth_uid || newOwnerInTenant.id), { role: "R10005", last_updated: serverTimestamp() });
                }
            }
            await updateDoc(doc(db, "tenants", tenantId), {
                tenant_name: data.name,
                tenant_logo: data.logo,
                tenant_email: data.email,
                tenant_phone: data.phone,
                address: data.address1,
                address2: data.address2,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
                home_page: data.home_page,
                owner: data.owner,
                owner_id: data.owner,
                emailSetup: data.emailSetup,
                achSetup: data.achSetup,
                updated_at: serverTimestamp()
            });
            setData(s => ({ ...s, _origOwner: data.owner }));
            const methodLabel = data.emailSetup.method === "SMTP" ? "Custom SMTP" : "Service Provider (API)";
            showToast(`Company settings and ${methodLabel} configuration updated successfully.`);
        } catch (err) {
            console.error("Save company error:", err);
            showToast("Failed to save changes: " + (err.message || "Unknown error"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!tenantId) return;
        const target = data.emailSetup.common.testEmail || user?.email;
        if (!target) {
            showToast("Please provide a Test Email Address first.", "error"); return;
        }
        setTestingEmail(true);
        try {
            const sendFn = httpsCallable(functions, "sendTestEmail");
            await sendFn({
                tenantId,
                recipientEmail: target,
                subject: "Test Configuration - American Vision Group",
                rows: [
                    { type: "paragraph", content: { html: `<h3>Configuration Test Success</h3><p>Your email infrastructure was verified by <b>${user?.displayName || user?.email}</b>.</p><p>Relay: ${data.emailSetup.method === "SMTP" ? data.emailSetup.smtp.host : data.emailSetup.api.provider}</p>` } }
                ]
            });
            showToast(`Test email sent to ${target}. Please check your inbox.`);
        } catch (err) {
            console.error("Test email error:", err);
            showToast("Test failed: " + (err.message || "Connection refused"), "error");
        } finally {
            setTestingEmail(false);
        }
    };

    const updES = (patch) => {
        setData(s => ({
            ...s,
            emailSetup: { ...s.emailSetup, ...patch }
        }));
    };

    const updCommon = (patch) => {
        setData(s => ({
            ...s,
            emailSetup: {
                ...s.emailSetup,
                common: { ...s.emailSetup.common, ...patch }
            }
        }));
    };

    const updAPI = (patch) => {
        setData(s => ({
            ...s,
            emailSetup: {
                ...s.emailSetup,
                api: { ...s.emailSetup.api, ...patch }
            }
        }));
    };

    const updSMTP = (patch) => {
        setData(s => ({
            ...s,
            emailSetup: {
                ...s.emailSetup,
                smtp: { ...s.emailSetup.smtp, ...patch }
            }
        }));
    };

    const updACH = (patch) => {
        setData(s => ({
            ...s,
            achSetup: { ...s.achSetup, ...patch }
        }));
    };

    const PROVIDERS = ["SendGrid", "Mailgun", "Amazon SES", "Other / Custom API"];    const [activeTab, setActiveTab] = React.useState("Branding");
    const TABS = ["Branding", "Info", "Email", "ACH"];

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
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
                    <span onClick={() => setToast(null)} style={{ marginLeft: "auto", cursor: "pointer", opacity: 0.6 }}>✕</span>
                </div>
            )}

            <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Company</h1>
                    <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage your organization's global settings and infrastructure.</p>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={handleSave} disabled={saving} 
                        style={{ background: t.accentGrad, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 20px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                        {saving ? "⏳ Saving..." : "✅ Apply Global Settings"}
                    </button>
                </div>
            </div>

            {/* Tab Bar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 28, borderBottom: `1px solid ${t.border}`, paddingBottom: 0 }}>
                {TABS.map(tab => {
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: "10px 24px",
                                background: "transparent",
                                border: "none",
                                borderBottom: `2px solid ${isActive ? t.accent : "transparent"}`,
                                color: isActive ? t.accent : t.textMuted,
                                fontSize: 14,
                                fontWeight: isActive ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                marginBottom: -1
                            }}
                        >
                            {tab}
                        </button>
                    );
                })}
            </div>

            {activeTab === "Branding" && (
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, boxShadow: t.tableShadow }}>
                        <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>Organization Branding</h3>
                            <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>Set your corporate identity across the platform.</p>
                        </div>
                        <div style={{ display: "grid", gap: 24 }}>
                            <FF label="Organization Name" t={t}><FIn value={data.name} onChange={e => setData(p => ({ ...p, name: e.target.value }))} placeholder="Organization Name" t={t} /></FF>
                            <FF label="Organization Logo" t={t}>
                                <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", border: `1px dashed ${t.border}`, borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                                    {data.logo ? (
                                        <div style={{ position: "relative" }}>
                                            <img src={data.logo} alt="Logo" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }} />
                                            <button onClick={() => setData(p => ({ ...p, logo: "" }))} style={{ position: "absolute", top: -12, right: -12, background: "#EF4444", color: "#fff", border: "2px solid #fff", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>×</button>
                                        </div>
                                    ) : (
                                        <div style={{ width: 90, height: 90, borderRadius: 20, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🏢</div>
                                    )}
                                    <div style={{ marginTop: 8 }}>
                                        <input type="file" id="company-logo-upload" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                                        <label htmlFor="company-logo-upload" style={{ background: t.accentGrad, color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "inline-block" }}>{data.logo ? "Replace Logo" : "Upload Logo"}</label>
                                        <p style={{ fontSize: 11, color: t.textMuted, marginTop: 12, fontWeight: 500 }}>High resolution PNG/JPEG (Max 2MB)</p>
                                    </div>
                                </div>
                            </FF>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "Info" && (
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, boxShadow: t.tableShadow }}>
                        <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>Company Information</h3>
                            <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>Official contact and location details for your organization.</p>
                        </div>
                        <div style={{ display: "grid", gap: 20 }}>
                            <div style={{ display: "grid", gap: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: -4 }}>Contact Details</div>
                                <FF label="Public Email" t={t}><FIn value={data.email} onChange={e => setData(s => ({ ...s, email: e.target.value }))} placeholder="e.g. contact@company.com" t={t} /></FF>
                                <FF label="Public Phone" t={t}><FIn value={data.phone} onChange={e => setData(s => ({ ...s, phone: e.target.value }))} placeholder="e.g. +1 555 000 0000" t={t} /></FF>
                                <FF label="Website / Home Page" t={t}><FIn value={data.home_page} onChange={e => setData(s => ({ ...s, home_page: e.target.value }))} placeholder="https://www.company.com" t={t} /></FF>
                            </div>
                            <div style={{ height: 1, background: t.border, opacity: 0.5, margin: "8px 0" }} />
                            <div style={{ display: "grid", gap: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: -4 }}>Location</div>
                                <FF label="Street Address" t={t}><FIn value={data.address1} onChange={e => setData(s => ({ ...s, address1: e.target.value }))} placeholder="Address line 1" t={t} /></FF>
                                <FF label="Address Line 2" t={t}><FIn value={data.address2} onChange={e => setData(s => ({ ...s, address2: e.target.value }))} placeholder="Suite, floor, etc." t={t} /></FF>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                    <FF label="City" t={t}><FIn value={data.city} onChange={e => setData(s => ({ ...s, city: e.target.value }))} placeholder="City" t={t} /></FF>
                                    <FF label="State" t={t}><FIn value={data.state} onChange={e => setData(s => ({ ...s, state: e.target.value }))} placeholder="State" t={t} /></FF>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                    <FF label="Zip Code" t={t}><FIn value={data.zip} onChange={e => setData(s => ({ ...s, zip: e.target.value }))} placeholder="Zip code" t={t} /></FF>
                                    <FF label="Country" t={t}><FIn value={data.country} onChange={e => setData(s => ({ ...s, country: e.target.value }))} placeholder="Country" t={t} /></FF>
                                </div>
                            </div>
                            <div style={{ height: 1, background: t.border, opacity: 0.5, margin: "8px 0" }} />
                            <FF label="Owner / Principal" t={t}>
                                <div style={{ position: "relative" }}>
                                    <div onClick={() => setShowOwnerSearch(!showOwnerSearch)} style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span>{resolvedOwnerName}</span><span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
                                    </div>
                                    {showOwnerSearch && (
                                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, marginTop: 6, zIndex: 100, boxShadow: "0 12px 32px rgba(0,0,0,0.25)", overflow: "hidden" }}>
                                            <input autoFocus value={ownerSearch} onChange={e => setOwnerSearch(e.target.value)} placeholder="Search directory..." style={{ width: "100%", padding: "12px 16px", border: "none", borderBottom: `1px solid ${t.border}`, background: "transparent", color: t.text, outline: "none" }} />
                                            <div style={{ maxHeight: 240, overflowY: "auto" }}>
                                                {filteredOwnerResults.map(u => {
                                                    const uName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.contact_name || u.email || "—";
                                                    const uId = u.id || u.auth_uid;
                                                    return (
                                                        <div key={uId} onClick={() => { setData(s => ({ ...s, owner: uId })); setShowOwnerSearch(false); setOwnerSearch(""); }}
                                                            style={{ padding: "10px 16px", cursor: "pointer", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}`, background: data.owner === uId ? t.navActive : "transparent" }}
                                                            onMouseEnter={e => e.currentTarget.style.background = t.navHover} onMouseLeave={e => e.currentTarget.style.background = data.owner === uId ? t.navActive : "transparent"}>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{uName}</div>
                                                            <div style={{ fontSize: 11, color: t.textMuted }}>{u.email}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </FF>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "Email" && (
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, boxShadow: t.tableShadow }}>
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>Email Setup</h3>
                        <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>Configure how your marketing and system emails are delivered.</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32, paddingBottom: 32, borderBottom: `1px solid ${t.border}` }}>
                        <div style={{ display: "grid", gap: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Common Fields (Required)</div>
                            <FF label="From Email Address" t={t}><FIn value={data.emailSetup.common.fromEmail} onChange={e => updCommon({ fromEmail: e.target.value })} placeholder="no-reply@yourapp.com" t={t} /></FF>
                            <FF label="From Name" t={t}><FIn value={data.emailSetup.common.fromName} onChange={e => updCommon({ fromName: e.target.value })} placeholder="American Vision Group Notifications" t={t} /></FF>
                        </div>
                        <div style={{ display: "grid", gap: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Optional / Testing</div>
                            <FF label="Reply-To Email" t={t}><FIn value={data.emailSetup.common.replyTo} onChange={e => updCommon({ replyTo: e.target.value })} placeholder="support@yourapp.com" t={t} /></FF>
                            <FF label="Test Email Address" t={t}><FIn value={data.emailSetup.common.testEmail} onChange={e => updCommon({ testEmail: e.target.value })} placeholder="Your testing email" t={t} /></FF>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                        <div>
                            <FF label="Delivery Method" t={t}>
                                <div style={{ display: "flex", gap: 8, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: 4, borderRadius: 10 }}>
                                    <button onClick={() => updES({ method: "ESP" })}
                                        style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: data.emailSetup.method === "ESP" ? t.accentGrad : "transparent", color: data.emailSetup.method === "ESP" ? "#fff" : t.textMuted, position: "relative" }}>
                                        Service Provider (API)
                                        {data.emailSetup.method === "ESP" && <span style={{ position: "absolute", top: -8, right: 4, background: "#34D399", color: "#fff", fontSize: 8, padding: "2px 6px", borderRadius: 6, fontWeight: 800 }}>ACTIVE</span>}
                                    </button>
                                    <button onClick={() => updES({ method: "SMTP" })}
                                        style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: data.emailSetup.method === "SMTP" ? t.accentGrad : "transparent", color: data.emailSetup.method === "SMTP" ? "#fff" : t.textMuted, position: "relative" }}>
                                        Custom SMTP
                                        {data.emailSetup.method === "SMTP" && <span style={{ position: "absolute", top: -8, right: 4, background: "#34D399", color: "#fff", fontSize: 8, padding: "2px 6px", borderRadius: 6, fontWeight: 800 }}>ACTIVE</span>}
                                    </button>
                                </div>
                            </FF>
                            
                            <div style={{ marginTop: 40, padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#34D39933", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                                        <Send size={16} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.text }}>Test Verification</h4>
                                </div>
                                <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 20, lineHeight: 1.5 }}>Verify your credentials by sending a test message to the configured test address.</p>
                                <button 
                                    onClick={handleTestEmail}
                                    disabled={testingEmail || saving}
                                    style={{ width: "100%", padding: "10px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.08)" : "#fff", border: `1px solid ${t.border}`, color: t.text, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.12)" : "#F3F4F6"}
                                    onMouseLeave={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "#fff"}
                                >
                                    {testingEmail ? "Verifying..." : "Send Verification Email"}
                                </button>
                                {data.emailSetup.common.testEmail && (
                                    <p style={{ fontSize: 11, color: t.textMuted, marginTop: 12, textAlign: "center" }}>Target: <b>{data.emailSetup.common.testEmail}</b></p>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "grid", gap: 16 }}>
                            {data.emailSetup.method === "ESP" && (
                                <>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Provider Settings</div>
                                    <FF label="Provider" t={t}>
                                        <div style={{ position: "relative" }}>
                                            <select 
                                                value={data.emailSetup.api.provider} 
                                                onChange={e => updAPI({ provider: e.target.value })}
                                                style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, cursor: "pointer", fontSize: 14, outline: "none", appearance: "none" }}
                                            >
                                                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                                        </div>
                                    </FF>
                                    <FF label="API Key 🔐" t={t}><FIn type="password" value={data.emailSetup.api.apiKey} onChange={e => updAPI({ apiKey: e.target.value })} placeholder="Your API key" t={t} /></FF>
                                    {data.emailSetup.api.provider === "Mailgun" && (
                                        <FF label="Domain" t={t}><FIn value={data.emailSetup.api.domain} onChange={e => updAPI({ domain: e.target.value })} placeholder="mg.yourdomain.com" t={t} /></FF>
                                    )}
                                    {data.emailSetup.api.provider === "Amazon SES" && (
                                        <FF label="Region" t={t}><FIn value={data.emailSetup.api.region} onChange={e => updAPI({ region: e.target.value })} placeholder="us-east-1" t={t} /></FF>
                                    )}
                                    <FF label="API Base URL (Optional)" t={t}><FIn value={data.emailSetup.api.baseUrl} onChange={e => updAPI({ baseUrl: e.target.value })} placeholder="https://api.provider.com" t={t} /></FF>
                                </>
                            )}

                            {data.emailSetup.method === "SMTP" && (
                                <>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>SMTP Relay Configuration</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                                        <FF label="SMTP Host" t={t}><FIn value={data.emailSetup.smtp.host} onChange={e => updSMTP({ host: e.target.value })} placeholder="smtp.provider.com" t={t} /></FF>
                                        <FF label="Port" t={t}><FIn value={data.emailSetup.smtp.port} onChange={e => updSMTP({ port: e.target.value })} placeholder="587" t={t} /></FF>
                                    </div>
                                    <FF label="SMTP Username" t={t}><FIn value={data.emailSetup.smtp.user} onChange={e => updSMTP({ user: e.target.value })} placeholder="username@provider.com" t={t} /></FF>
                                    
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 12 }}>
                                            <input type="checkbox" checked={data.emailSetup.smtp.has2FA} onChange={e => updSMTP({ has2FA: e.target.checked })} style={{ width: 16, height: 16, accentColor: t.accent }} />
                                            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>My account has 2FA enabled (requires App Password)</span>
                                        </label>
                                        
                                        {data.emailSetup.smtp.has2FA ? (
                                            <FF label="App Password 🔐" t={t}>
                                                <FIn type="password" value={data.emailSetup.smtp.pass} onChange={e => updSMTP({ pass: e.target.value })} placeholder="16-character app password" t={t} />
                                                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 8, lineHeight: 1.4 }}>Generate this in your Google Account Security settings. Use it instead of your regular password.</p>
                                            </FF>
                                        ) : (
                                            <FF label="SMTP Password" t={t}><FIn type="password" value={data.emailSetup.smtp.pass} onChange={e => updSMTP({ pass: e.target.value })} placeholder="••••••••" t={t} /></FF>
                                        )}
                                    </div>

                                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 4 }}>
                                        <input type="checkbox" checked={data.emailSetup.smtp.secure} onChange={e => updSMTP({ secure: e.target.checked })} style={{ width: 16, height: 16, accentColor: t.accent }} />
                                        <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>Use TLS / SSL for secure connection</span>
                                    </label>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "ACH" && (
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, boxShadow: t.tableShadow }}>
                    <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>ACH Payment Setup</h3>
                            <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>Configure banking credentials for NACHA file generation and automated payments.</p>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: "8px 16px", borderRadius: 10, border: `1px solid ${data.achSetup.enabled ? t.accent : t.border}` }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: data.achSetup.enabled ? (isDark ? "#34D399" : "#059669") : t.textMuted }}>{data.achSetup.enabled ? "ACH Generation Enabled" : "ACH Generation Disabled"}</span>
                            <input type="checkbox" checked={data.achSetup.enabled} onChange={e => updACH({ enabled: e.target.checked })} style={{ width: 18, height: 18, accentColor: t.accent }} />
                        </label>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, opacity: data.achSetup.enabled ? 1 : 0.6, pointerEvents: data.achSetup.enabled ? "auto" : "none", transition: "opacity 0.2s" }}>
                        <div style={{ display: "grid", gap: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Originator Information</div>
                            <FF label="Originator Name" t={t}><FIn value={data.achSetup.originatorName} onChange={e => updACH({ originatorName: e.target.value })} placeholder="Company Name" t={t} /></FF>
                            <FF label="Originator ID (Company ID)" t={t}><FIn value={data.achSetup.originatorId} onChange={e => updACH({ originatorId: e.target.value })} placeholder="9-digit Tax ID" t={t} /></FF>
                            
                            <div style={{ height: 1, background: t.border, opacity: 0.5, margin: "8px 0" }} />
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Banking Institution (ODFI)</div>
                            <FF label="Bank Name" t={t}><FIn value={data.achSetup.odfiName} onChange={e => updACH({ odfiName: e.target.value })} placeholder="Your Bank Name" t={t} /></FF>
                            <FF label="ODFI Routing Number" t={t}><FIn value={data.achSetup.odfiRouting} onChange={e => updACH({ odfiRouting: e.target.value })} placeholder="9-digit Routing" t={t} /></FF>
                        </div>

                        <div style={{ display: "grid", gap: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Account Details</div>
                            <FF label="Account Number" t={t}><FIn type="password" value={data.achSetup.accountNumber} onChange={e => updACH({ accountNumber: e.target.value })} placeholder="Your Account Number" t={t} /></FF>
                            <FF label="Account Type" t={t}>
                                <div style={{ position: "relative" }}>
                                    <select 
                                        value={data.achSetup.accountType} 
                                        onChange={e => updACH({ accountType: e.target.value })}
                                        style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, cursor: "pointer", fontSize: 14, outline: "none", appearance: "none" }}
                                    >
                                        <option value="Checking">Checking</option>
                                        <option value="Savings">Savings</option>
                                    </select>
                                    <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                                </div>
                            </FF>

                            <div style={{ height: 1, background: t.border, opacity: 0.5, margin: "8px 0" }} />
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>NACHA File Header Metadata</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <FF label="Immediate Origin" t={t}><FIn value={data.achSetup.immediateOrigin} onChange={e => updACH({ immediateOrigin: e.target.value })} placeholder="e.g. TTNNNNNNN" t={t} /></FF>
                                <FF label="Immediate Destination" t={t}><FIn value={data.achSetup.immediateDestination} onChange={e => updACH({ immediateDestination: e.target.value })} placeholder="Bank's Routing" t={t} /></FF>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ height: 100 }} />
        </div>
    );
}

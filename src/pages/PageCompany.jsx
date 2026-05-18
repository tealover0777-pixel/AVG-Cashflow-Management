import React from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { FF, FIn } from "../components";
import { uploadFile, listFiles } from "../utils/storageUtils";
import { ChevronDown, Send } from "lucide-react";
import { functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { resolveTimeZone, US_TIMEZONES } from "../utils/timeZoneUtils";

export default function PageCompany({ t, isDark, activeTenantId = "", USERS = [], GLOBAL_USERS = [], CONTACTS = [], platformConfig = null, isGlobalConsolidated = false }) {
    const { user, profile, tenantId: authTenantId, isSuperAdmin } = useAuth();
    const tenantId = (!isGlobalConsolidated && activeTenantId !== "GLOBAL") ? (activeTenantId || authTenantId) : null;
    const [saving, setSaving] = React.useState(false);
    const [toast, setToast] = React.useState(null);
    const [showOwnerSearch, setShowOwnerSearch] = React.useState(false);
    const [ownerSearch, setOwnerSearch] = React.useState("");
    const [testingEmail, setTestingEmail] = React.useState(false);
    const [existingLogos, setExistingLogos] = React.useState([]);
    const [loadingLogos, setLoadingLogos] = React.useState(false);
    const [logoUploading, setLogoUploading] = React.useState(false);
    const [dragOver, setDragOver] = React.useState(false);
    const [platformEmailSetup, setPlatformEmailSetup] = React.useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const mergedUsers = React.useMemo(() => {
        return (USERS || []).map(u => {
            const gu = (GLOBAL_USERS || []).find(g => g.id === u.auth_uid || g.id === u.id || (u.email && g.email && g.email.toLowerCase() === u.email.toLowerCase()));
            return {
                ...u,
                role_id: u.role_id || gu?.role || "",
                first_name: gu?.first_name || u.first_name || "",
                last_name: gu?.last_name || u.last_name || "",
                email: gu?.email || u.email || ""
            };
        });
    }, [USERS, GLOBAL_USERS]);

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
            usePlatformEmail: false,
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
            },
            timeZone: ""
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
        if (isGlobalConsolidated && platformConfig) {
            const d = platformConfig;
            const e = d.emailSetup || {};
            setData({
                name: d.name || "",
                logo: d.logo || "",
                email: d.email || "",
                phone: d.phone || "",
                address1: d.address1 || d.address || "",
                address2: d.address2 || "",
                city: d.city || "",
                state: d.state || "",
                zip: d.zip || "",
                country: d.country || "",
                home_page: d.home_page || "",
                owner: d.owner || "",
                _origOwner: d.owner || "",
                emailSetup: {
                    method: e.method || "ESP",
                    usePlatformEmail: false,
                    verified: e.verified,
                    common: e.common || { fromEmail: "", fromName: "", replyTo: "", testEmail: user?.email || "" },
                    api: e.api || { provider: "SendGrid", apiKey: "", domain: "", region: "", baseUrl: "" },
                    smtp: e.smtp || { host: "", port: "587", user: "", pass: "", secure: true },
                    timeZone: e.timeZone || ""
                },
                achSetup: d.achSetup || { enabled: false, originatorName: d.name || "", originatorId: "", odfiName: "", odfiRouting: "", accountNumber: "", accountType: "Checking", immediateOrigin: "", immediateDestination: "" }
            });
        }
    }, [isGlobalConsolidated, platformConfig]);

    React.useEffect(() => {
        if (tenantId) {
            getDoc(doc(db, "tenants", tenantId)).then(snap => {
                if (snap.exists()) {
                    const d = snap.data();
                    
                    // Initial owner resolution from doc (will be refined by sync effect)
                    const currentOwner = d.owner || d.owner_id || "";

                    const e = d.emailSetup || {};
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
                        owner: currentOwner,
                        _origOwner: currentOwner,
                        emailSetup: {
                            method: e.method || (e.provider === "SMTP" ? "SMTP" : "ESP"),
                            usePlatformEmail: !!e.usePlatformEmail,
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
                            },
                            timeZone: e.timeZone || ""
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

            // Fetch platform email configuration
            getDoc(doc(db, "platform_config", "company")).then(pSnap => {
                if (pSnap.exists()) {
                    const pd = pSnap.data();
                    setPlatformEmailSetup(pd.emailSetup || null);
                }
            }).catch(() => setPlatformEmailSetup(null));
        }
    }, [tenantId]); // Only run when tenantId changes to avoid overwriting edits

    // Separate effect to sync owner from profiles once USERS are loaded
    React.useEffect(() => {
        if (mergedUsers.length > 0) {
            // Find the user with the Owner role (R10005)
            const found = mergedUsers.find(u => u.role_id === "R10005" || u.role === "R10005");
            if (found) {
                const uId = found.id || found.auth_uid;
                // Auto-sync if current state is empty, or if it matches the DB value but is technically inconsistent with the roles list
                if (uId && (!data.owner || (data.owner === data._origOwner && uId !== data.owner))) {
                    setData(s => ({ ...s, owner: uId, _origOwner: uId }));
                }
            }
        }
    }, [mergedUsers, tenantId, data.owner, data._origOwner]);

    // Auto-resolve TimeZone based on Info folder (State/Zip) and persist to Firestore
    React.useEffect(() => {
        if (!data.emailSetup.timeZone && (data.state || data.zip) && tenantId) {
            const resolved = resolveTimeZone(data.state, data.zip);
            if (resolved) {
                updES({ timeZone: resolved });
                updateDoc(doc(db, "tenants", tenantId), { "emailSetup.timeZone": resolved }).catch(() => {});
            }
        }
    }, [data.state, data.zip, tenantId]);

    React.useEffect(() => {
        if (tenantId) {
            setLoadingLogos(true);
            listFiles(`tenants/${tenantId}/branding`).then(files => {
                setExistingLogos(files);
            }).finally(() => setLoadingLogos(false));
        }
    }, [tenantId]);

    const resolvedOwnerName = React.useMemo(() => {
        if (!data.owner) return "—";
        const found = mergedUsers.find(u => u.id === data.owner || u.auth_uid === data.owner || u.email === data.owner);
        if (found) {
            const name = [found.first_name, found.last_name].filter(Boolean).join(" ") || found.name || found.contact_name;
            if (name && found.email) {
                return `${name} (${found.email})`;
            }
            return name || found.email || data.owner;
        }
        return data.owner;
    }, [data.owner, mergedUsers]);

    const filteredOwnerResults = React.useMemo(() => {
        // Show all users so the admin can pick any of them to be the new owner
        const all = (mergedUsers || []);
        if (!ownerSearch) return all.slice(0, 50);
        const q = ownerSearch.toLowerCase();
        return all.filter(u => {
            const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.contact_name || u.email || "";
            return name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q));
        }).sort((a, b) => {
            const nameA = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.name || a.contact_name || a.email || "";
            const nameB = [b.first_name, b.last_name].filter(Boolean).join(" ") || b.name || b.contact_name || b.email || "";
            return nameA.localeCompare(nameB);
        }).slice(0, 50);
    }, [ownerSearch, mergedUsers]);

    const uploadLogoFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showToast("Please select an image file.", "error");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showToast("File is too large! Please choose an image under 2MB.", "error");
            return;
        }
        setLogoUploading(true);
        try {
            const path = `tenants/${tenantId}/branding/logo_${Date.now()}_${file.name}`;
            const url = await uploadFile(file, path);
            setData(s => ({ ...s, logo: url }));
            if (tenantId) {
                await updateDoc(doc(db, "tenants", tenantId), { tenant_logo: url });
                listFiles(`tenants/${tenantId}/branding`).then(setExistingLogos);
            }
            showToast("Logo saved successfully.");
        } catch (err) {
            console.error("Logo upload error:", err);
            showToast("Failed to upload logo.", "error");
        } finally {
            setLogoUploading(false);
        }
    };

    const handlePhotoChange = (e) => uploadLogoFile(e.target.files[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        uploadLogoFile(e.dataTransfer.files[0]);
    };

    const handleSave = async () => {
        if (!tenantId && !isGlobalConsolidated) return;
        setSaving(true);

        if (isGlobalConsolidated) {
            try {
                await setDoc(doc(db, "platform_config", "company"), {
                    name: data.name,
                    logo: data.logo,
                    email: data.email,
                    phone: data.phone,
                    address1: data.address1,
                    address2: data.address2,
                    city: data.city,
                    state: data.state,
                    zip: data.zip,
                    country: data.country,
                    home_page: data.home_page,
                    owner: data.owner,
                    emailSetup: {
                        ...data.emailSetup,
                        smtp: { ...data.emailSetup.smtp, user: (data.emailSetup.smtp.user || "").trim(), pass: (data.emailSetup.smtp.pass || "").trim().replace(/ /g, ' ') },
                        api: { ...data.emailSetup.api, apiKey: (data.emailSetup.api.apiKey || "").trim() }
                    },
                    achSetup: data.achSetup,
                }, { merge: true });
                showToast("Platform company settings saved.", "success");
            } catch (err) {
                showToast("Failed to save: " + (err.message || "Unknown error"), "error");
            } finally {
                setSaving(false);
            }
            return;
        }

        try {
            const isNewOwner = data.owner && data.owner !== data._origOwner;
            
            // 1. Handle Ownership Transfer if it changed
            if (isNewOwner) {
                const iAmOwner = profile?.role_id === "R10005" || profile?.role === "R10005";
                if (!iAmOwner && !isSuperAdmin) {
                    showToast("Only the current Owner or a Super Admin can transfer ownership.", "error");
                    setSaving(false); 
                    return;
                }

                const newOwner = mergedUsers.find(u => u.id === data.owner || u.auth_uid === data.owner);
                if (!newOwner) {
                    showToast("Selected owner not found in user directory.", "error");
                    setSaving(false);
                    return;
                }

                // Demote existing owners
                const existingOwners = mergedUsers.filter(u => (u.role_id === "R10005" || u.role === "R10005") && u.id !== data.owner);
                for (const old of existingOwners) {
                    const oldId = old.id || old.auth_uid;
                    if (oldId) {
                        await updateDoc(doc(db, "tenants", tenantId, "users", oldId), { role_id: "R10004", updated_at: serverTimestamp() });
                        await updateDoc(doc(db, "global_users", old.auth_uid || oldId), { role: "R10004", last_updated: serverTimestamp() });
                    }
                }

                // Promote new owner
                const newId = newOwner.id || newOwner.auth_uid;
                const newAuthUid = newOwner.auth_uid || newId;
                await updateDoc(doc(db, "tenants", tenantId, "users", newId), { role_id: "R10005", updated_at: serverTimestamp() });
                await updateDoc(doc(db, "global_users", newAuthUid), { role: "R10005", tenantId, last_updated: serverTimestamp() });
                
                // Update local state to reflect change
                setData(s => ({ ...s, _origOwner: data.owner }));
            }

            // 2. Prepare payload for tenant document
            const payload = {
                tenant_name: data.name,
                tenant_logo: data.logo,
                tenant_email: data.email,
                tenant_phone: data.phone,
                address1: data.address1,
                address2: data.address2,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
                home_page: data.home_page,
                owner: data.owner,
                emailSetup: {
                    ...data.emailSetup,
                    smtp: {
                        ...data.emailSetup.smtp,
                        // Clean credentials before saving to prevent auth errors (535 5.7.8)
                        user: (data.emailSetup.smtp.user || "").trim(),
                        pass: (data.emailSetup.smtp.pass || "").trim().replace(/\u00a0/g, ' ')
                    },
                    api: {
                        ...data.emailSetup.api,
                        apiKey: (data.emailSetup.api.apiKey || "").trim()
                    }
                },
                achSetup: data.achSetup,
                updated_at: serverTimestamp()
            };

            await updateDoc(doc(db, "tenants", tenantId), payload);
            showToast("Company settings saved successfully.", "success");
        } catch (err) {
            console.error("Save error:", err);
            showToast("Failed to save: " + (err.message || "Unknown error"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!tenantId && !isGlobalConsolidated) return;
        const target = data.emailSetup.common.testEmail || user?.email;
        if (!target) {
            showToast("Please provide a Test Email Address first.", "error"); return;
        }
        setTestingEmail(true);
        try {
            const sendFn = httpsCallable(functions, "sendTestEmail");
            const es = data.emailSetup.usePlatformEmail && platformEmailSetup ? platformEmailSetup : data.emailSetup;
            await sendFn({
                tenantId: isGlobalConsolidated ? "PLATFORM" : tenantId,
                recipientEmail: target,
                usePlatformEmail: isGlobalConsolidated || !!data.emailSetup.usePlatformEmail,
                subject: "Test Configuration - American Vision Group",
                rows: [
                    { type: "paragraph", content: { html: `<h3>Configuration Test Success</h3><p>Your email infrastructure was verified by <b>${user?.displayName || user?.email}</b>.</p><p>Relay: ${es.method === "SMTP" ? es.smtp?.host : es.api?.provider}</p>${(isGlobalConsolidated || data.emailSetup.usePlatformEmail) ? "<p><i>Using Platform Email Service</i></p>" : ""}` } }
                ]
            });
            const verifiedDoc = isGlobalConsolidated ? doc(db, "platform_config", "company") : doc(db, "tenants", tenantId);
            await setDoc(verifiedDoc, { emailSetup: { verified: true, verifiedAt: new Date().toISOString() } }, { merge: true });
            setData(prev => ({ ...prev, emailSetup: { ...prev.emailSetup, verified: true } }));
            showToast(`Test email sent to ${target}. Email infrastructure verified.`, "success");
        } catch (err) {
            console.error("Test email error:", err);
            const verifiedDoc = isGlobalConsolidated ? doc(db, "platform_config", "company") : doc(db, "tenants", tenantId);
            await setDoc(verifiedDoc, { emailSetup: { verified: false } }, { merge: true }).catch(() => {});
            setData(prev => ({ ...prev, emailSetup: { ...prev.emailSetup, verified: false } }));
            showToast("Test failed: " + (err.message || "Connection refused"), "error");
        } finally {
            setTestingEmail(false);
        }
    };

    const updES = (updates) => setData(prev => {
        const { method, timeZone, usePlatformEmail, ...commonUpdates } = updates;
        const newES = { ...prev.emailSetup };
        if (method !== undefined) newES.method = method;
        if (timeZone !== undefined) newES.timeZone = timeZone;
        if (usePlatformEmail !== undefined) newES.usePlatformEmail = usePlatformEmail;
        if (Object.keys(commonUpdates).length > 0) {
            newES.common = { ...newES.common, ...commonUpdates };
        }
        return { ...prev, emailSetup: newES };
    });

    const updAPI = (updates) => setData(prev => ({
        ...prev,
        emailSetup: {
            ...prev.emailSetup,
            api: { ...prev.emailSetup.api, ...updates }
        }
    }));

    const updSMTP = (updates) => setData(prev => ({
        ...prev,
        emailSetup: {
            ...prev.emailSetup,
            smtp: { ...prev.emailSetup.smtp, ...updates }
        }
    }));

    const updACH = (patch) => {
        setData(s => ({
            ...s,
            achSetup: { ...s.achSetup, ...patch }
        }));
    };

    const PROVIDERS = ["SendGrid", "Mailgun", "Amazon SES", "Other / Custom API"];
    const SMTP_PROFILES = [
        { label: "Select Service", host: "", port: "" },
        { label: "Gmail", host: "smtp.gmail.com", port: "587" },
        { label: "Outlook", host: "smtp.office365.com", port: "587" },
        { label: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: "587" },
        { label: "Zoho Mail", host: "smtp.zoho.com", port: "587" },
        { label: "iCloud Mail", host: "smtp.mail.me.com", port: "587" },
        { label: "Custom SMTP", host: "", port: "587" }
    ];
    const [activeTab, setActiveTab] = React.useState("Branding");
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
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>Branding</h3>
                            <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>Set your organization's corporate identity across the platform.</p>
                        </div>
                        <div style={{ display: "grid", gap: 24 }}>
                            <FF label="Organization Name" t={t}><FIn value={data.name} onChange={e => setData(p => ({ ...p, name: e.target.value }))} placeholder="Organization Name" t={t} /></FF>
                            <FF label="Company Logo" t={t}>
                                <div style={{ display: "grid", gap: 16 }}>
                                    <div 
                                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleDrop}
                                        style={{ background: dragOver ? (isDark ? "rgba(52,211,153,0.08)" : "rgba(79,70,229,0.06)") : (isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9"), border: `2px dashed ${dragOver ? t.accent : t.surfaceBorder}`, borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", transition: "all 0.2s" }}
                                    >
                                        {logoUploading ? (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 40, height: 40, border: `3px solid ${t.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                                <span style={{ fontSize: 13, color: t.textMuted }}>Uploading...</span>
                                            </div>
                                        ) : data.logo ? (
                                            <div style={{ position: "relative" }}>
                                                <img src={data.logo} alt="Logo" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }} />
                                                <button onClick={() => setData(p => ({ ...p, logo: "" }))} style={{ position: "absolute", top: -12, right: -12, background: "#EF4444", color: "#fff", border: "2px solid #fff", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>×</button>
                                            </div>
                                        ) : (
                                            <div style={{ width: 90, height: 90, borderRadius: 20, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🏢</div>
                                        )}
                                        <div style={{ marginTop: 8 }}>
                                            <input type="file" id="tenant-logo-upload" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                                            <label htmlFor="tenant-logo-upload" style={{ background: logoUploading ? t.surfaceBorder : t.accentGrad, color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: logoUploading ? "not-allowed" : "pointer", display: "inline-block", opacity: logoUploading ? 0.6 : 1 }}>{data.logo ? "Upload New Logo" : "Upload Logo"}</label>
                                            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 12, fontWeight: 500 }}>Drag & drop or click to upload · PNG/JPEG · Max 2MB</p>
                                        </div>
                                    </div>

                                    {existingLogos.length > 0 && (
                                        <div style={{ display: "grid", gap: 8 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Or select from previously uploaded logos:</div>
                                            <div style={{ position: "relative" }}>
                                                <select 
                                                    value={data.logo} 
                                                    onChange={e => setData(s => ({ ...s, logo: e.target.value }))}
                                                    style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, cursor: "pointer", fontSize: 13.5, appearance: "none", outline: "none" }}
                                                >
                                                    <option value="">-- Choose existing logo --</option>
                                                    {existingLogos.map(logo => (
                                                        <option key={logo.url} value={logo.url}>{logo.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                                            </div>
                                        </div>
                                    )}
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
                            <FF label="OWNER" t={t}>
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
                        
                        <div style={{ height: 1, background: t.border, opacity: 0.5, margin: "24px 0" }} />
                        
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", color: "#F59E0B" }}>
                                🕒
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.text }}>Scheduling & Delivery Context</h4>
                                <p style={{ margin: 0, fontSize: 11.5, color: t.textMuted }}>Used for calculating "Time of Day" for automated marketing campaigns.</p>
                            </div>
                        </div>

                        <div style={{ maxWidth: 400 }}>
                            <FF label={
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span>Primary Time Zone</span>
                                    {(!data.emailSetup.timeZone || data.emailSetup.timeZone === resolveTimeZone(data.state, data.zip)) && (data.state || data.zip) && (
                                        <span style={{ fontSize: 10, background: isDark ? "rgba(52,211,153,0.15)" : "#F0FDF4", color: "#22C55E", padding: "2px 8px", borderRadius: 6, fontWeight: 700, border: "1px solid rgba(34,197,94,0.3)" }}>SUGGESTED</span>
                                    )}
                                </div>
                            } t={t}>
                                <div style={{ position: "relative" }}>
                                    <select 
                                        value={data.emailSetup.timeZone} 
                                        onChange={e => updES({ timeZone: e.target.value })}
                                        style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, cursor: "pointer", fontSize: 14, outline: "none", appearance: "none" }}
                                    >
                                        <option value="">Select Time Zone (Optional)</option>
                                        {US_TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label} ({tz.value})</option>)}
                                    </select>
                                    <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                                </div>
                                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 8, lineHeight: 1.4 }}>
                                    {data.emailSetup.timeZone ? `Campaigns will be scheduled in ${US_TIMEZONES.find(z => z.value === data.emailSetup.timeZone)?.label || data.emailSetup.timeZone}.` : "If left unset, campaigns will use UTC by default."}
                                </p>
                            </FF>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === "Email" && (
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, boxShadow: t.tableShadow }}>
                    <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>Email Setup</h3>
                            <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>Configure organization-level email infrastructure.</p>
                        </div>
                        {!isGlobalConsolidated && <div
                            onClick={() => updES({ usePlatformEmail: !data.emailSetup.usePlatformEmail })}
                            onMouseEnter={e => e.currentTarget.style.borderColor = data.emailSetup.usePlatformEmail ? "rgba(59,130,246,0.5)" : t.accent}
                            onMouseLeave={e => e.currentTarget.style.borderColor = data.emailSetup.usePlatformEmail ? "rgba(59,130,246,0.3)" : t.border}
                            style={{ 
                                display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
                                background: data.emailSetup.usePlatformEmail ? (isDark ? "rgba(59,130,246,0.1)" : "#F0F7FF") : (isDark ? "rgba(255,255,255,0.03)" : "#fff"), 
                                padding: "14px 20px", borderRadius: 14, transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                                border: `2px solid ${data.emailSetup.usePlatformEmail ? (isDark ? "rgba(96,165,250,0.4)" : "#3B82F6") : t.border}`,
                                boxShadow: data.emailSetup.usePlatformEmail ? "0 4px 12px rgba(59,130,246,0.1)" : "none"
                            }}>
                            <div style={{ display: "grid", flex: 1 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.02em", color: data.emailSetup.usePlatformEmail ? (isDark ? "#60A5FA" : "#2563EB") : t.text }}>USE PLATFORM EMAIL SERVICE</span>
                                <span style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>Inherit settings from global configuration</span>
                            </div>
                            <div 
                                style={{ 
                                    width: 44, height: 22, borderRadius: 11, 
                                    background: data.emailSetup.usePlatformEmail ? t.accentGrad : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"), 
                                    position: "relative", transition: "all 0.3s",
                                    border: `1px solid ${data.emailSetup.usePlatformEmail ? "transparent" : t.border}`
                                }}>
                                <div style={{ 
                                    position: "absolute", top: 3, left: data.emailSetup.usePlatformEmail ? 24 : 3, 
                                    width: 14, height: 14, borderRadius: "50%", background: "#fff", 
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)", transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" 
                                }} />
                            </div>
                        </div>}
                    </div>

                    {(() => {
                        const usingPlatform = !!data.emailSetup.usePlatformEmail;
                        const activeSetup = usingPlatform ? platformEmailSetup : data.emailSetup;
                        const isEmailActive = usingPlatform
                            ? !!activeSetup?.common?.fromEmail
                            : data.emailSetup.verified === true && !!activeSetup?.common?.fromEmail;
                        const verifiedButNotTested = !usingPlatform && !!activeSetup?.common?.fromEmail && data.emailSetup.verified !== true;
                        return (
                            <div style={{
                                marginBottom: 24,
                                padding: "14px 20px",
                                borderRadius: 12,
                                background: isEmailActive ? (isDark ? "rgba(52,211,153,0.05)" : "#f0fdf4") : (isDark ? "rgba(248,113,113,0.05)" : "#fef2f2"),
                                border: `1px solid ${isEmailActive ? (isDark ? "rgba(52,211,153,0.2)" : "#bbf7d0") : (isDark ? "rgba(248,113,113,0.2)" : "#fecaca")}`,
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                            }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: isEmailActive ? t.accentGrad : (isDark ? "#2d0a0a" : "#fee2e2"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                                    {isEmailActive ? "📧" : "⚠️"}
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                                        {isEmailActive
                                            ? `Email Infrastructure Active${usingPlatform ? " (Platform)" : ""}: ${activeSetup?.common?.fromName || "American Vision Group"}`
                                            : usingPlatform ? "Platform Email Not Configured"
                                            : verifiedButNotTested ? "Verification Required"
                                            : "Email Setup Incomplete"}
                                    </div>
                                    {!usingPlatform && (
                                        <div style={{ fontSize: 12, color: t.textMuted }}>
                                            {isEmailActive
                                                ? `Sending via ${activeSetup?.method === "API" ? activeSetup?.api?.provider : "SMTP Relay"} • ${activeSetup?.common?.fromEmail}`
                                                : verifiedButNotTested
                                                    ? "Credentials saved but not yet verified. Send a test verification email below to activate."
                                                    : "Fill in your From Email and credentials below, then send a test verification email to activate."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {isGlobalConsolidated && (
                        <div style={{ padding: "12px 16px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 15 }}>🔒</span>
                            <span style={{ fontSize: 12.5, color: t.textMuted }}>Email settings for this view are managed in <strong style={{ color: t.text }}>Platform Company → Email</strong>. Go there to update credentials or re-run verification.</span>
                        </div>
                    )}

                    {!isGlobalConsolidated && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32, paddingBottom: 32, borderBottom: `1px solid ${t.border}` }}>
                        <div style={{ display: "grid", gap: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Common Fields (Required)</div>
                            <FF label="From Email" t={t}><FIn value={data.emailSetup.common.fromEmail} onChange={e => updES({ fromEmail: e.target.value })} placeholder="noreply@company.com" t={t} /></FF>
                            <FF label="From Name" t={t}><FIn value={data.emailSetup.common.fromName} onChange={e => updES({ fromName: e.target.value })} placeholder="Company Name" t={t} /></FF>
                        </div>
                        <div style={{ display: "grid", gap: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Optional / Testing</div>
                            <FF label="Reply-To" t={t}><FIn value={data.emailSetup.common.replyTo} onChange={e => updES({ replyTo: e.target.value })} placeholder="support@company.com" t={t} /></FF>
                            <FF label="Test Email Address" t={t}><FIn value={data.emailSetup.common.testEmail} onChange={e => updES({ testEmail: e.target.value })} placeholder="test@company.com" t={t} /></FF>
                        </div>
                    </div>}

                    {!isGlobalConsolidated && <div style={{ display: "grid", gridTemplateColumns: data.emailSetup.usePlatformEmail ? "1fr" : "1fr 1fr", gap: 32 }}>
                        <div>
                            <FF label="Delivery Method" t={t}>
                                <div style={{ display: "flex", gap: 8, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: 4, borderRadius: 10 }}>
                                    <button onClick={() => updES({ method: "ESP" })}
                                        style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: (data.emailSetup.usePlatformEmail ? platformEmailSetup?.method === "ESP" : data.emailSetup.method === "ESP") ? t.accentGrad : "transparent", color: (data.emailSetup.usePlatformEmail ? platformEmailSetup?.method === "ESP" : data.emailSetup.method === "ESP") ? "#fff" : t.textMuted, position: "relative" }}>
                                        Service Provider (API)
                                        {(data.emailSetup.usePlatformEmail ? platformEmailSetup?.method === "ESP" : data.emailSetup.method === "ESP") && <span style={{ position: "absolute", top: -8, right: 4, background: "#34D399", color: "#fff", fontSize: 8, padding: "2px 6px", borderRadius: 6, fontWeight: 800 }}>ACTIVE</span>}
                                    </button>
                                    <button onClick={() => updES({ method: "SMTP" })}
                                        style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: (data.emailSetup.usePlatformEmail ? platformEmailSetup?.method === "SMTP" : data.emailSetup.method === "SMTP") ? t.accentGrad : "transparent", color: (data.emailSetup.usePlatformEmail ? platformEmailSetup?.method === "SMTP" : data.emailSetup.method === "SMTP") ? "#fff" : t.textMuted, position: "relative" }}>
                                        Custom SMTP
                                        {(data.emailSetup.usePlatformEmail ? platformEmailSetup?.method === "SMTP" : data.emailSetup.method === "SMTP") && <span style={{ position: "absolute", top: -8, right: 4, background: "#34D399", color: "#fff", fontSize: 8, padding: "2px 6px", borderRadius: 6, fontWeight: 800 }}>ACTIVE</span>}
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
                                {data.emailSetup.verified === true && (
                                    <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: isDark ? "rgba(34,197,94,0.08)" : "#F0FDF4", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 16 }}>✅</span>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>Verification successful — email infrastructure is active.</span>
                                    </div>
                                )}
                                {data.emailSetup.verified === false && (
                                    <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: isDark ? "rgba(239,68,68,0.08)" : "#FEF2F2", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 16 }}>❌</span>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>Verification failed</div>
                                            <div style={{ fontSize: 11, color: isDark ? "rgba(239,68,68,0.8)" : "#991b1b", marginTop: 2 }}>Check your SMTP credentials or API key, then re-send the verification email.</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!data.emailSetup.usePlatformEmail && (
                            <div style={{ display: "grid", gap: 16 }}>
                            {(data.emailSetup.usePlatformEmail ? platformEmailSetup?.method === "ESP" : data.emailSetup.method === "ESP") && (
                                <>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Provider Settings</div>
                                    <FF label="Provider" t={t}>
                                        <div style={{ position: "relative" }}>
                                            <select 
                                                value={data.emailSetup.usePlatformEmail ? (platformEmailSetup?.api?.provider || "SendGrid") : data.emailSetup.api.provider} 
                                                onChange={e => updAPI({ provider: e.target.value })}
                                                disabled={data.emailSetup.usePlatformEmail}
                                                style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, cursor: "pointer", fontSize: 14, outline: "none", appearance: "none" }}
                                            >
                                                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                                        </div>
                                    </FF>
                                    <FF label="API Key 🔐" t={t}><FIn type="password" value={data.emailSetup.usePlatformEmail ? "••••••••••••••••" : data.emailSetup.api.apiKey} onChange={e => updAPI({ apiKey: e.target.value })} placeholder="Your API key" t={t} disabled={data.emailSetup.usePlatformEmail} /></FF>
                                    {(data.emailSetup.usePlatformEmail ? platformEmailSetup?.api?.provider === "Mailgun" : data.emailSetup.api.provider === "Mailgun") && (
                                        <FF label="Domain" t={t}><FIn value={data.emailSetup.usePlatformEmail ? (platformEmailSetup?.api?.domain || "") : data.emailSetup.api.domain} onChange={e => updAPI({ domain: e.target.value })} placeholder="mg.yourdomain.com" t={t} disabled={data.emailSetup.usePlatformEmail} /></FF>
                                    )}
                                    {(data.emailSetup.usePlatformEmail ? platformEmailSetup?.api?.provider === "Amazon SES" : data.emailSetup.api.provider === "Amazon SES") && (
                                        <FF label="Region" t={t}><FIn value={data.emailSetup.usePlatformEmail ? (platformEmailSetup?.api?.region || "") : data.emailSetup.api.region} onChange={e => updAPI({ region: e.target.value })} placeholder="us-east-1" t={t} disabled={data.emailSetup.usePlatformEmail} /></FF>
                                    )}
                                    <FF label="API Base URL (Optional)" t={t}><FIn value={data.emailSetup.usePlatformEmail ? (platformEmailSetup?.api?.baseUrl || "") : data.emailSetup.api.baseUrl} onChange={e => updAPI({ baseUrl: e.target.value })} placeholder="https://api.provider.com" t={t} disabled={data.emailSetup.usePlatformEmail} /></FF>
                                </>
                            )}

                            {(data.emailSetup.usePlatformEmail ? platformEmailSetup?.method === "SMTP" : data.emailSetup.method === "SMTP") && (
                                <>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>SMTP Relay Configuration</div>
                                    
                                    {!data.emailSetup.usePlatformEmail && (
                                        <FF label="Email Service" t={t}>
                                            <div style={{ position: "relative" }}>
                                                <select 
                                                    onChange={e => {
                                                        const profile = SMTP_PROFILES.find(p => p.label === e.target.value);
                                                        if (profile && profile.label !== "Select Service") {
                                                            updSMTP({ host: profile.host, port: profile.port });
                                                        }
                                                    }}
                                                    style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, cursor: "pointer", fontSize: 14, outline: "none", appearance: "none" }}
                                                >
                                                    {SMTP_PROFILES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                                                </select>
                                                <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                                            </div>
                                            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>Selecting a service will auto-populate host and port details.</p>
                                        </FF>
                                    )}

                                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                                        <FF label="SMTP Host" t={t}><FIn value={data.emailSetup.usePlatformEmail ? (platformEmailSetup?.smtp?.host || "") : data.emailSetup.smtp.host} onChange={e => updSMTP({ host: e.target.value })} placeholder="smtp.provider.com" t={t} disabled={data.emailSetup.usePlatformEmail} /></FF>
                                        <FF label="Port" t={t}><FIn value={data.emailSetup.usePlatformEmail ? (platformEmailSetup?.smtp?.port || "") : data.emailSetup.smtp.port} onChange={e => updSMTP({ port: e.target.value })} placeholder="587" t={t} disabled={data.emailSetup.usePlatformEmail} /></FF>
                                    </div>
                                    <FF label="SMTP Username" t={t}><FIn value={data.emailSetup.usePlatformEmail ? (platformEmailSetup?.smtp?.user || "") : data.emailSetup.smtp.user} onChange={e => updSMTP({ user: e.target.value })} placeholder="username@provider.com" t={t} disabled={data.emailSetup.usePlatformEmail} /></FF>
                                    
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 12, opacity: data.emailSetup.usePlatformEmail ? 0.6 : 1 }}>
                                            <input type="checkbox" checked={data.emailSetup.usePlatformEmail ? !!platformEmailSetup?.smtp?.has2FA : data.emailSetup.smtp.has2FA} onChange={e => updSMTP({ has2FA: e.target.checked })} style={{ width: 16, height: 16, accentColor: t.accent }} disabled={data.emailSetup.usePlatformEmail} />
                                            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>My account has 2FA enabled (requires App Password)</span>
                                        </label>
                                        
                                        {(data.emailSetup.usePlatformEmail ? platformEmailSetup?.smtp?.has2FA : data.emailSetup.smtp.has2FA) ? (
                                            <FF label="App Password 🔐" t={t}>
                                                <FIn type="password" value={data.emailSetup.usePlatformEmail ? "••••••••••••••••" : data.emailSetup.smtp.pass} onChange={e => updSMTP({ pass: e.target.value })} placeholder="16-character app password" t={t} disabled={data.emailSetup.usePlatformEmail} />
                                                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 8, lineHeight: 1.4 }}>Generate this in your Google Account Security settings. Use it instead of your regular password.</p>
                                            </FF>
                                        ) : (
                                            <FF label="SMTP Password 🔐" t={t}>
                                                <FIn type="password" value={data.emailSetup.usePlatformEmail ? "••••••••••••••••" : data.emailSetup.smtp.pass} onChange={e => updSMTP({ pass: e.target.value })} placeholder="Your password" t={t} disabled={data.emailSetup.usePlatformEmail} />
                                            </FF>
                                        )}
                                    </div>

                                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 4, opacity: data.emailSetup.usePlatformEmail ? 0.6 : 1 }}>
                                        <input type="checkbox" checked={data.emailSetup.usePlatformEmail ? !!platformEmailSetup?.smtp?.secure : data.emailSetup.smtp.secure} onChange={e => updSMTP({ secure: e.target.checked })} style={{ width: 16, height: 16, accentColor: t.accent }} disabled={data.emailSetup.usePlatformEmail} />
                                        <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>Use TLS / SSL for secure connection</span>
                                    </label>
                                </>
                            )}
                        </div>)}
                    </div>}
                </div>
            )}
            {activeTab === "ACH" && (
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, boxShadow: t.tableShadow }}>
                    <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>ACH Setup</h3>
                            <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>Banking credentials for organization-level ACH operations.</p>
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
                            <FF label="Originator ID" t={t}><FIn value={data.achSetup.originatorId} onChange={e => updACH({ originatorId: e.target.value })} placeholder="Tax ID" t={t} /></FF>
                            
                            <div style={{ height: 1, background: t.border, opacity: 0.5, margin: "8px 0" }} />
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Banking Institution (ODFI)</div>
                            <FF label="Bank Name" t={t}><FIn value={data.achSetup.odfiName} onChange={e => updACH({ odfiName: e.target.value })} placeholder="Your Bank Name" t={t} /></FF>
                            <FF label="ODFI Routing Number" t={t}><FIn value={data.achSetup.odfiRouting} onChange={e => updACH({ odfiRouting: e.target.value })} placeholder="9-digit Routing" t={t} /></FF>
                        </div>

                        <div style={{ display: "grid", gap: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Account Details</div>
                            <FF label="Account Number" t={t}><FIn type="password" value={data.achSetup.accountNumber} onChange={e => updACH({ accountNumber: e.target.value })} placeholder="Account Number" t={t} /></FF>
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

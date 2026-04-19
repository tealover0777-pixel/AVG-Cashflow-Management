import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { FF, FIn } from "../components";
import { uploadFile } from "../utils/storageUtils";

export default function PageCompany({ t, isDark, activeTenantId = "", USERS = [], CONTACTS = [] }) {
    const { user, profile, tenantId: authTenantId, isSuperAdmin } = useAuth();
    const tenantId = activeTenantId || authTenantId;
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [showOwnerSearch, setShowOwnerSearch] = useState(false);
    const [ownerSearch, setOwnerSearch] = useState("");

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const [data, setData] = useState({
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
    });

    useEffect(() => {
        if (tenantId) {
            getDoc(doc(db, "tenants", tenantId)).then(snap => {
                if (snap.exists()) {
                    const d = snap.data();
                    setData({
                        name: d.tenant_name || d.name || "",
                        logo: d.tenant_logo || d.logo || "",
                        email: d.tenant_email || d.email || "",
                        phone: d.tenant_phone || d.phone || "",
                        address: d.address || d.address1 || "",
                        address1: d.address || d.address1 || "",
                        address2: d.address2 || "",
                        city: d.city || "",
                        state: d.state || "",
                        zip: d.zip || "",
                        country: d.country || "",
                        home_page: d.home_page || "",
                        owner: d.owner || d.owner_id || "",
                        _origOwner: d.owner || d.owner_id || "",
                    });
                }
            }).catch(e => console.error("Error fetching tenant data:", e));
        }
    }, [tenantId]);

    const resolvedOwnerName = useMemo(() => {
        if (!data.owner) return "—";
        const all = [...USERS, ...CONTACTS];
        const found = all.find(u => u.id === data.owner || u.auth_uid === data.owner || u.email === data.owner);
        if (found) {
            return [found.first_name, found.last_name].filter(Boolean).join(" ") || found.name || found.contact_name || found.email || data.owner;
        }
        return data.owner;
    }, [data.owner, USERS, CONTACTS]);

    const filteredOwnerResults = useMemo(() => {
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
            // Check for Ownership transfer
            const isNewOwner = data.owner && data.owner !== data._origOwner;
            if (isNewOwner) {
                const iAmOwner = profile?.role_id === "R10005" || profile?.role === "R10005";
                if (!iAmOwner && !isSuperAdmin) {
                    showToast("Only the current Owner or a Super Admin can transfer ownership.", "error");
                    setSaving(false);
                    return;
                }

                // 1. Demote old owner(s)
                const existingOwners = USERS.filter(u => u.role_id === "R10005" && u.id !== data.owner);
                for (const old of existingOwners) {
                    await updateDoc(doc(db, "tenants", tenantId, "users", old.id), { role_id: "R10004", updated_at: serverTimestamp() });
                    await updateDoc(doc(db, "global_users", old.auth_uid || old.id), { role: "R10004", last_updated: serverTimestamp() });
                }

                // 2. Promote new owner
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
                updated_at: serverTimestamp()
            });

            setData(s => ({ ...s, _origOwner: data.owner }));
            showToast("Company information updated successfully.");
        } catch (err) {
            console.error("Save company error:", err);
            showToast("Failed to save changes: " + (err.message || "Unknown error"), "error");
        } finally {
            setSaving(false);
        }
    };

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

            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Company</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage organization branding and corporate information</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
                {/* Branding Section */}
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, boxShadow: t.tableShadow }}>
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>Organization Branding</h3>
                        <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>Set your corporate identity across the platform.</p>
                    </div>

                    <div style={{ display: "grid", gap: 24 }}>
                        <FF label="Organization Name" t={t}>
                            <FIn value={data.name} onChange={e => setData(p => ({ ...p, name: e.target.value }))} placeholder="Organization Name" t={t} />
                        </FF>

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
                                    <label htmlFor="company-logo-upload" style={{ background: t.accentGrad, color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "inline-block" }}>
                                        {data.logo ? "Replace Logo" : "Upload Logo"}
                                    </label>
                                    <p style={{ fontSize: 11, color: t.textMuted, marginTop: 12, fontWeight: 500 }}>High resolution PNG/JPEG (Max 2MB)</p>
                                </div>
                            </div>
                        </FF>
                    </div>
                </div>

                {/* Info Section */}
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
                                <div 
                                    onClick={() => setShowOwnerSearch(!showOwnerSearch)}
                                    style={{ 
                                        width: "100%", padding: "10px 14px", borderRadius: 9, 
                                        border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", 
                                        color: t.text, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "space-between" 
                                    }}
                                >
                                    <span>{resolvedOwnerName}</span>
                                    <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
                                </div>
                                {showOwnerSearch && (
                                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, marginTop: 6, zIndex: 100, boxShadow: "0 12px 32px rgba(0,0,0,0.25)", overflow: "hidden" }}>
                                        <input 
                                            autoFocus
                                            value={ownerSearch}
                                            onChange={e => setOwnerSearch(e.target.value)}
                                            placeholder="Search directory..."
                                            style={{ width: "100%", padding: "12px 16px", border: "none", borderBottom: `1px solid ${t.border}`, background: "transparent", color: t.text, outline: "none" }}
                                        />
                                        <div style={{ maxHeight: 240, overflowY: "auto" }}>
                                            {filteredOwnerResults.map(u => {
                                                const uName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.contact_name || u.email || "—";
                                                const uId = u.id || u.auth_uid;
                                                return (
                                                    <div 
                                                        key={uId}
                                                        onClick={() => {
                                                            setData(s => ({ ...s, owner: uId }));
                                                            setShowOwnerSearch(false);
                                                            setOwnerSearch("");
                                                        }}
                                                        style={{ padding: "10px 16px", cursor: "pointer", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}`, background: data.owner === uId ? t.navActive : "transparent" }}
                                                        onMouseEnter={e => e.currentTarget.style.background = t.navHover}
                                                        onMouseLeave={e => e.currentTarget.style.background = data.owner === uId ? t.navActive : "transparent"}
                                                    >
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

                        <button onClick={handleSave} disabled={saving} className="primary-btn" style={{ background: t.accentGrad, color: "#fff", border: "none", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, marginTop: 12 }}>
                            {saving ? "Saving..." : "Save Company Information"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from "../components/TanStackTable";
import { getTenantColumns } from "../components/TenantsTanStackConfig";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { StatCard, Modal, FF, FIn, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";
import { uploadFile } from "../utils/storageUtils";

export default function PageTenants({ t, isDark, TENANTS = [], collectionPath = "" }) {
    const { hasPermission, isSuperAdmin } = useAuth();
    const canCreate = isSuperAdmin || hasPermission("PLATFORM_TENANT_CREATE") || hasPermission("TENANT_CREATE");
    const canUpdate = isSuperAdmin || hasPermission("PLATFORM_TENANT_UPDATE") || hasPermission("TENANT_UPDATE");
    const canDelete = isSuperAdmin || hasPermission("PLATFORM_TENANT_DELETE") || hasPermission("TENANT_DELETE");
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [sel, setSel] = useState(new Set());
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
    const gridRef = useRef(null);
    const [pageSize, setPageSize] = useState(30);

    // Dynamically calculate page size based on available vertical space
    useEffect(() => {
        const calculatePageSize = () => {
            const viewportHeight = window.innerHeight;
            const gridContainerHeight = viewportHeight - 420;
            const availableForRows = gridContainerHeight - 90; 
            const calculatedRows = Math.floor(availableForRows / 40);
            const newPageSize = Math.max(30, calculatedRows);
            setPageSize(newPageSize);
        };
        const timer = setTimeout(calculatePageSize, 100);
        calculatePageSize();
        window.addEventListener('resize', calculatePageSize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculatePageSize);
        };
    }, []);

    const nextTenantId = (() => {
        if (TENANTS.length === 0) return "T10001";
        const maxNum = Math.max(...TENANTS.map(p => {
            const m = String(p.id).match(/^T(\d+)$/);
            return m ? Number(m[1]) : 0;
        }));
        return "T" + (maxNum + 1);
    })();

    const openAdd = () => setModal({
        open: true,
        mode: "add",
        data: { id: nextTenantId, name: "", logo: "", owner_id: "", email: "", phone: "", notes: "" }
    });
    const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    const handleSaveTenant = async () => {
        const d = modal.data;
        const payload = {
            tenant_name: d.name || "",
            tenant_logo: d.logo || "",
            owner_id: d.owner_id || "",
            tenant_email: d.email || "",
            tenant_phone: d.phone || "",
            Notes: d.notes || "",
            updated_at: serverTimestamp(),
        };
        try {
            if (modal.mode === "edit" && d.docId) {
                await updateDoc(doc(db, collectionPath, d.docId), payload);
            } else {
                await setDoc(doc(db, collectionPath, d.id), {
                    ...payload,
                    tenant_id: d.id,
                    created_at: serverTimestamp()
                });
            }
        } catch (err) {
            console.error("Failed to save tenant:", err);
        }
        close();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Basic validation
        if (file.size > 2 * 1024 * 1024) {
            showToast("File is too large! Max size is 2MB for storage.", "error");
            return;
        }

        try {
            const tenantId = modal.data.id;
            const path = `tenants/${tenantId}/branding/logo_${Date.now()}`;
            const url = await uploadFile(file, path);
            setF("logo", url);
        } catch (err) {
            console.error("Logo upload failed:", err);
            showToast("Failed to upload logo to storage.", "error");
        }
    };

    const handleDeleteTenant = async () => {
        if (!delT || !delT.docId) return;
        try {
            await deleteDoc(doc(db, collectionPath, delT.docId));
            setDelT(null);
        } catch (err) { console.error("Delete tenant error:", err); }
    };

    const permissions = { canUpdate, canDelete };
    const columnDefs = useMemo(() => {
        return getTenantColumns(permissions, isDark, t, openEdit, (target) => setDelT({ id: target.id, name: target.name, docId: target.docId }));
    }, [permissions, isDark, t]);

    return (<>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Platform Tenant Admin</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage platform tenants and owners</p>
            </div>
            {canCreate && (
                <Tooltip text="Add a new tenant organization" t={t}>
                    <button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Tenant
                    </button>
                </Tooltip>
            )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            {[{ label: "Total Tenants", value: TENANTS.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
        </div>

        <div style={{ height: 'calc(100vh - 420px)', width: "100%", minHeight: '500px' }}>
            <TanStackTable
                ref={gridRef}
                data={TENANTS}
                columns={columnDefs}
                pageSize={pageSize}
                t={t}
                isDark={isDark}
                onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.id)))}
            />
        </div>


        <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Tenant" : "Edit Tenant"} onSave={handleSaveTenant} width={580} t={t} isDark={isDark}>
            <FF label="Tenant ID" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
            </FF>
            <FF label="Tenant Name" t={t}><FIn value={modal.data.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. AVG Real Estate" t={t} /></FF>
            <FF label="Tenant Logo" t={t}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {modal.data.logo && <img src={modal.data.logo} alt="Preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "contain", background: isDark ? "rgba(255,255,255,0.05)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}` }} />}
                    <div style={{ flex: 1 }}>
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} id="tenant-logo-upload" />
                        <label htmlFor="tenant-logo-upload" style={{ display: "inline-block", background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                            {modal.data.logo ? "Change Photo" : "Upload Logo"}
                        </label>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Recommended: Square or horizontal image, PNG/JPG under 1MB.</div>
                    </div>
                    {modal.data.logo && <button onClick={() => setF("logo", "")} style={{ background: "none", border: "none", color: "#F87171", fontSize: 12, cursor: "pointer" }}>Remove</button>}
                </div>
            </FF>
            <FF label="Owner ID" t={t}><FIn value={modal.data.owner_id} onChange={e => setF("owner_id", e.target.value)} placeholder="e.g. O10001" t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FF label="Email" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="email@tenant.com" t={t} /></FF>
                <FF label="Phone" t={t}><FIn value={modal.data.phone} onChange={e => setF("phone", e.target.value)} placeholder="e.g. +1 234 567 8900" t={t} /></FF>
            </div>
            <FF label="Notes" t={t}><FIn value={modal.data.notes} onChange={e => setF("notes", e.target.value)} placeholder="Internal remarks..." t={t} /></FF>
        </Modal>

        <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteTenant} label="This tenant" t={t} isDark={isDark} />
        {toast && (
            <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
                <span>{toast.type === "success" ? "✅" : "❌"}</span>
                <span>{toast.msg}</span>
                <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
            </div>
        )}
    </>);
}

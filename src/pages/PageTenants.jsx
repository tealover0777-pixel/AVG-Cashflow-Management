import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from "../components/TanStackTable";
import { getTenantColumns } from "../components/TenantsTanStackConfig";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { StatCard, Modal, FF, FIn, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";
import { uploadFile } from "../utils/storageUtils";

export default function PageTenants({ t, isDark, TENANTS = [], GLOBAL_USERS = [], ROLES = [], collectionPath = "" }) {
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

    const nextOwnerId = (() => {
        const allUserIds = [
            ...(GLOBAL_USERS || []).map(u => u.user_id || u.id),
            ...TENANTS.map(t => t.owner_id)
        ];
        const maxNum = Math.max(...allUserIds.map(id => {
            const m = String(id || "").match(/^[UO](\d+)$/);
            return m ? Number(m[1]) : 0;
        }), 10000); 
        return "U" + (maxNum + 1);
    })();

    const openAdd = () => setModal({
        open: true,
        mode: "add",
        data: { id: nextTenantId, name: "", owner_id: nextOwnerId, first_name: "", last_name: "", email: "", phone: "", notes: "", role_id: "R10005" }
    });
    const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    const handleSaveTenant = async () => {
        const d = modal.data;
        const tenantId = d.id;
        const ownerId = d.owner_id || "";
        
        const payload = {
            tenant_name: d.name || "",
            owner_id: ownerId,
            tenant_email: d.email || "",
            tenant_phone: d.phone || "",
            Notes: d.notes || "",
            updated_at: serverTimestamp(),
        };

        try {
            if (modal.mode === "edit" && d.docId) {
                await updateDoc(doc(db, collectionPath, d.docId), payload);
            } else {
                // 1. Create Tenant
                await setDoc(doc(db, collectionPath, tenantId), {
                    ...payload,
                    tenant_id: tenantId,
                    created_at: serverTimestamp()
                });

                // 2. Create Owner User in global_users
                const userPayload = {
                    user_id: ownerId,
                    first_name: d.first_name || "",
                    last_name: d.last_name || "",
                    email: d.email || "",
                    role: d.role_id || "R10005", 
                    status: "Active",
                    notes: d.notes || "",
                    created_at: serverTimestamp(),
                    last_updated: serverTimestamp(),
                    tenantId: tenantId
                };
                await setDoc(doc(db, "global_users", ownerId), userPayload);

                // 3. Create Owner User in tenant users collection
                await setDoc(doc(db, `tenants/${tenantId}/users`, ownerId), {
                    user_id: ownerId,
                    first_name: d.first_name || "",
                    last_name: d.last_name || "",
                    email: d.email || "",
                    role_id: d.role_id || "R10005",
                    status: "Active",
                    phone: d.phone || "",
                    notes: d.notes || "",
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp()
                });
            }
            showToast(`Tenant ${modal.mode === "add" ? "created" : "updated"} successfully.`, "success");
        } catch (err) {
            console.error("Failed to save tenant:", err);
            showToast("Failed to save tenant profile.", "error");
        }
        close();
    };

    const handleFileChange = async (e) => {
        // ... kept for compatibility if needed elsewhere, but removed from UI
    };

    const handleDeleteTenant = async () => {
        if (!delT || !delT.docId) return;
        try {
            await deleteDoc(doc(db, collectionPath, delT.docId));
            setDelT(null);
            showToast("Tenant deleted successfully.", "success");
        } catch (err) { console.error("Delete tenant error:", err); showToast("Delete failed.", "error"); }
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
            <FF label="TENANT ID" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
            </FF>
            <FF label="TENANT NAME" t={t}><FIn value={modal.data.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. AVG Real Estate" t={t} /></FF>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FF label="OWNER ID" t={t}><FIn value={modal.data.owner_id} onChange={e => setF("owner_id", e.target.value)} placeholder="e.g. U10001" t={t} /></FF>
                <FF label="ROLE" t={t}>
                    <FSel 
                        value={modal.data.role_id || "R10005"} 
                        onChange={e => setF("role_id", e.target.value)} 
                        options={ROLES.map(r => ({ label: r.name, value: r.id || r.role_id }))} 
                        t={t} 
                    />
                </FF>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FF label="FIRST NAME" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="e.g. Jane" t={t} /></FF>
                <FF label="LAST NAME" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="e.g. Doe" t={t} /></FF>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FF label="EMAIL" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="email@tenant.com" t={t} /></FF>
                <FF label="PHONE" t={t}><FIn value={modal.data.phone} onChange={e => setF("phone", e.target.value)} placeholder="e.g. +1 234 567 8900" t={t} /></FF>
            </div>
            
            <FF label="INTERNAL NOTES" t={t}><FIn value={modal.data.notes} onChange={e => setF("notes", e.target.value)} placeholder="Internal remarks..." t={t} /></FF>
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

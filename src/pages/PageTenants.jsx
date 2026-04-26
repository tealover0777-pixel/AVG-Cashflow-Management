import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from "../components/TanStackTable";
import { getTenantColumns } from "../components/TenantsTanStackConfig";
import { db, functions } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { StatCard, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";
import { uploadFile } from "../utils/storageUtils";

export default function PageTenants({ t, isDark, TENANTS = [], GLOBAL_USERS = [], ROLES = [], collectionPath = "" }) {
    const { hasPermission, isSuperAdmin, isGlobalRole, permissions: userPerms } = useAuth();
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

    const isSelectedRoleGlobal = (roleId) => {
        const found = ROLES.find(r => (r.id || r.role_id) === roleId);
        return found && found.IsGlobal === true;
    };

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
        data: { id: nextTenantId, name: "", owner_id: "U10001", first_name: "", last_name: "", email: "", phone: "", notes: "", role_id: "R10005", inviteUser: true }
    });
    const openEdit = r => setModal({ 
        open: true, 
        mode: "edit", 
        data: { 
            ...r, 
            first_name: r.owner_first_name || "", 
            last_name: r.owner_last_name || "" 
        } 
    });
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
                
                // Also update the owner's global user record and tenant-specific user record
                if (d.owner_doc_id) {
                    const updateData = {
                        first_name: d.first_name || "",
                        last_name: d.last_name || "",
                        email: d.email || "",
                        phone: d.phone || "",
                        notes: d.notes || "",
                    };

                    await updateDoc(doc(db, "global_users", d.owner_doc_id), {
                        ...updateData,
                        last_updated: serverTimestamp()
                    });

                    // Update the record in the specific tenant's user list
                    try {
                        const usersRef = collection(db, "tenants", d.docId, "users");
                        const q = query(usersRef, where("auth_uid", "==", d.owner_doc_id));
                        const snapshot = await getDocs(q);
                        const updates = [];
                        snapshot.forEach((uDoc) => {
                            updates.push(updateDoc(doc(db, "tenants", d.docId, "users", uDoc.id), {
                                ...updateData,
                                updated_at: serverTimestamp()
                            }));
                        });
                        await Promise.all(updates);
                    } catch (err) {
                        console.error("Error updating tenant user record:", err);
                    }
                }
            } else {
                // 1. Create Tenant
                await setDoc(doc(db, collectionPath, tenantId), {
                    ...payload,
                    tenant_id: tenantId,
                    created_at: serverTimestamp()
                });

                // 2. Create Owner via Cloud Function (consistent with Create New User)
                const inviteUserFn = httpsCallable(functions, "inviteUser");
                await inviteUserFn({
                    email: d.email,
                    role: d.role_id || "R10005",
                    tenantId: tenantId,
                    user_id: ownerId,
                    first_name: d.first_name || "",
                    last_name: d.last_name || "",
                    phone: d.phone || "",
                    notes: d.notes || `Created with New Tenant: ${tenantId}`,
                    inviteUser: d.inviteUser ?? true
                });
            }
            showToast(`Tenant ${modal.mode === "add" ? "created" : "updated"} successfully.`, "success");
        } catch (err) {
            console.error("Failed to save tenant:", err);
            showToast("Failed to save tenant: " + (err.message || "Unknown error"), "error");
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
            
            <div style={{ margin: "20px 0 10px 0", borderBottom: `1px solid ${t.border}`, paddingBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: "0.5px" }}>PRIMARY OWNER DETAILS</span>
            </div>

            <FF label="OWNER ID (UPCOMING)" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.owner_id || "U10001"}</div>
            </FF>

            <FF label="EMAIL ADDRESS" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="owner@company.com" t={t} /></FF>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FF label="FIRST NAME" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="Jane" t={t} /></FF>
                <FF label="LAST NAME" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="Doe" t={t} /></FF>
            </div>

            <FF label="PHONE" t={t}><FIn value={modal.data.phone || ""} onChange={e => setF("phone", e.target.value)} placeholder="+1 555 000 0000" t={t} /></FF>

            <FF label="ROLE" t={t}>
                <select 
                    value={modal.data.role_id || "R10005"} 
                    onChange={e => setF("role_id", e.target.value)} 
                    style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}
                    disabled={modal.mode === "add"} // Primary owner is always Owner role on creation
                >
                    {ROLES.map(r => (
                        <option key={r.id || r.role_id} value={r.id || r.role_id} style={{ color: "#000" }}>{r.role_name || r.name || r.id}</option>
                    ))}
                </select>
                {modal.mode === "add" && <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 4 }}>Primary owner must be assigned the Owner role.</div>}
            </FF>

            <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13.5, color: t.text }}>
                    <input
                        type="checkbox"
                        checked={!!modal.data.inviteUser}
                        onChange={e => setF("inviteUser", e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: t.accent }}
                    />
                    Invite user (Send verification email)
                </label>
            </div>

            <FF label="INTERNAL NOTES" t={t}>
                <textarea 
                    value={modal.data.notes || ""} 
                    onChange={e => setF("notes", e.target.value)} 
                    placeholder="Private notes about this tenant/owner..." 
                    style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", minHeight: 80, fontFamily: t.font, resize: "vertical" }} 
                />
            </FF>
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

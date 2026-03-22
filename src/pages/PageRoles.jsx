import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useFirestoreCollection } from "../useFirestoreCollection";
import { Modal, FF, FIn, DelModal, FMultiSel, Tooltip } from "../components";
import TanStackTable from "../components/TanStackTable";
import { useAuth } from "../AuthContext";
import { getRoleColumns } from "../components/RolesTanStackConfig";

export default function PageRoles({ t, isDark, collectionPath = "", DIMENSIONS = [], USERS = [] }) {
    const { hasPermission, isSuperAdmin, isGlobalRole } = useAuth();
    // Only super admins or properly permissioned users can edit Roles
    const canCreate = isSuperAdmin || hasPermission("ROLE_CREATE") || hasPermission("ROLE_TYPE_CREATE");
    const canUpdate = isSuperAdmin || hasPermission("ROLE_UPDATE") || hasPermission("ROLE_TYPE_UPDATE");
    const canDelete = isSuperAdmin || hasPermission("ROLE_DELETE") || hasPermission("ROLE_TYPE_DELETE");
    const { data: rawRoles = [], loading, error } = useFirestoreCollection(collectionPath);
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);

    const permDim = DIMENSIONS.find(d => d.name === "Permissions")?.items || [];

    const nextRoleId = (() => {
        if (rawRoles.length === 0) return "R10001";
        const maxNum = Math.max(...rawRoles.map(r => { const m = String(r.role_id || "").match(/^R(\d+)$/); return m ? Number(m[1]) : 0; }));
        return "R" + (maxNum + 1);
    })();

    const openAdd = () => setModal({ open: true, mode: "add", data: { role_id: nextRoleId, role_name: "", selectedPerms: [], IsGlobal: false } });
    const openEdit = r => {
        const permStr = r.Permissions || r.Permission || "";
        const pArr = typeof permStr === "string" && permStr ? permStr.split(",").map(s => s.trim()).filter(Boolean) : [];
        setModal({ open: true, mode: "edit", data: { ...r, selectedPerms: pArr } });
    };
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    const handleSaveRole = async () => {
        const d = modal.data;
        if (!d.role_name) return;

        const payload = {
            role_id: d.role_id || "",
            role_name: d.role_name,
            IsGlobal: d.IsGlobal === true,
            Permissions: (d.selectedPerms || []).join(", "),
            permissions: d.selectedPerms || [], // Save as array too!
            updated_at: serverTimestamp(),
        };
        try {
            if (modal.mode === "edit" && d.id) {
                await setDoc(doc(db, collectionPath, d.id), payload, { merge: true });
            } else {
                await setDoc(doc(db, collectionPath, d.role_id || d.id || d.role_name), { ...payload, created_at: serverTimestamp() });
            }
        } catch (err) { console.error("Save role error:", err); }
        close();
    };

    const handleDeleteRole = async () => {
        if (!delT) return;
        try { await deleteDoc(doc(db, collectionPath, delT.id)); }
        catch (err) { console.error("Delete role error:", err); }
        setDelT(null);
    };

    const permissions = { canUpdate, canDelete };
    const columnDefs = useMemo(() => {
        return getRoleColumns(permissions, isDark, t, openEdit, setDelT);
    }, [permissions, isDark, t]);

    // Auto-sync Roles to Dimensions so "Role" dropdowns have access to them!
    useEffect(() => {
        if (!loading && rawRoles.length > 0) {
            const roleNames = rawRoles.map(r => r.role_name || r.name);
            setDoc(doc(db, "dimensions", "Role"), { name: "Role", category: "Role", items: roleNames }, { merge: true })
                .catch(e => console.error("Failed syncing roles to dimension", e));
        }
    }, [rawRoles, loading]);

    if (loading) return <div style={{ padding: 40, color: t.textMuted }}>Loading roles...</div>;
    if (error) return <div style={{ padding: 40, color: "red" }}>Error loading roles: {error.message}</div>;

    const filtered = rawRoles.filter(p => {
        // Filter out global roles if user is not a global user or super admin
        const rid = p.role_id || "";
        const m = rid.match(/^R(\d+)$/);
        const rNum = m ? Number(m[1]) : 0;
        if (!isSuperAdmin && !isGlobalRole && (p.IsGlobal || (rNum >= 10006 && rNum <= 10010))) return false;
        return true;
    });

    return (<>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Role Types</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Define custom roles and map them to application permissions</p>
            </div>
            {canCreate && <Tooltip text="Create a new role type" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>+ Add Role</button></Tooltip>}
        </div>

        <div style={{ height: 'calc(100vh - 350px)', width: "100%", minHeight: '500px' }}>
            <TanStackTable
                data={filtered}
                columns={columnDefs}
                pageSize={20}
                t={t}
                isDark={isDark}
            />
        </div>

        <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Role" : "Edit Role"} onSave={handleSaveRole} width={600} t={t} isDark={isDark}>
            <FF label="Role ID" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.role_id}</div>
            </FF>
            <FF label="Role Name" t={t}><FIn value={modal.data.role_name || modal.data.name} onChange={e => setF("role_name", e.target.value)} placeholder="e.g. Project Manager" t={t} /></FF>
            <FF label="Global Role" t={t}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13.5, color: t.text }}>
                    <input type="checkbox" checked={modal.data.IsGlobal === true} onChange={e => setF("IsGlobal", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#22C55E" }} />
                    <span>This role has access to <strong>all tenants</strong> (no tenant assignment needed)</span>
                </label>
            </FF>
            <FF label="Permissions" t={t}><FMultiSel value={modal.data.selectedPerms || []} onChange={v => setF("selectedPerms", v)} options={permDim} t={t} /></FF>
        </Modal>

        <DelModal open={!!delT} onClose={() => setDelT(null)} onDel={handleDeleteRole} title="Delete Role?" t={t}>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.textMuted }}>
                Are you sure? This will remove the role <strong>{delT?.role_name || delT?.name}</strong>. This might affect users assigned to this role.
            </p>
        </DelModal>
    </>);
}

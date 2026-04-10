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
    const [showPermsModal, setShowPermsModal] = useState(false);
    const [newPerm, setNewPerm] = useState("");
    const [permToggles, setPermToggles] = useState({ VIEW: true, UPDATE: true, CREATE: true, DELETE: true });
    const [savingPerms, setSavingPerms] = useState(false);

    const permDimObj = DIMENSIONS.find(d => d.name === "Permissions") || { items: [], doc_id: "Permissions" };
    const permDim = permDimObj.items || [];
    const globalPermDim = (DIMENSIONS.find(d => d.name === "Permissions_Global") || {}).items || [];

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
    
    const handleAddPerm = async () => {
        const base = newPerm.trim().toUpperCase();
        if (!base) return;
        
        const toAdd = Object.keys(permToggles)
            .filter(k => permToggles[k])
            .map(k => `${base}_${k}`);
        
        if (toAdd.length === 0) {
            // If no toggles, just add the base if it's not empty
            toAdd.push(base);
        }

        const current = [...permDim];
        const newItems = [...current];
        toAdd.forEach(p => {
            if (!newItems.includes(p)) newItems.push(p);
        });

        setSavingPerms(true);
        try {
            await setDoc(doc(db, "dimensions", permDimObj.doc_id), { name: "Permissions", items: newItems, category: "Permissions" }, { merge: true });
            setNewPerm("");
        } catch (err) { console.error("Add perm error:", err); }
        finally { setSavingPerms(false); }
    };

    const handleRemovePerm = async (p) => {
        if (!confirm(`Are you sure you want to remove the permission "${p}"? This will NOT remove it from roles that already have it, but it will no longer be available for selection.`)) return;
        const current = permDim.filter(x => x !== p);
        setSavingPerms(true);
        try {
            await setDoc(doc(db, "dimensions", permDimObj.doc_id), { name: "Permissions", items: current, category: "Permissions" }, { merge: true });
        } catch (err) { console.error("Remove perm error:", err); }
        finally { setSavingPerms(false); }
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
            <div style={{ display: "flex", gap: 12 }}>
                {canUpdate && <button onClick={() => setShowPermsModal(true)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, border: `1px solid ${t.border}`, padding: "10px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Manage Permissions</button>}
                {canCreate && <Tooltip text="Create a new role type" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>+ Add Role</button></Tooltip>}
            </div>
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
            <FF label="Permissions" t={t}>
                <FMultiSel
                    value={(modal.data.selectedPerms || []).filter(p => !globalPermDim.includes(p))}
                    onChange={v => {
                        const globalPerms = (modal.data.selectedPerms || []).filter(p => globalPermDim.includes(p));
                        setF("selectedPerms", [...v, ...globalPerms]);
                    }}
                    options={[...permDim].filter(p => !globalPermDim.includes(p)).sort((a, b) => a.localeCompare(b))}
                    t={t}
                    style={{ maxHeight: 400 }}
                />
            </FF>
            {(isSuperAdmin || isGlobalRole) && (
                <FF label="Platform Admin Permissions" t={t}>
                    <FMultiSel
                        value={(modal.data.selectedPerms || []).filter(p => globalPermDim.includes(p))}
                        onChange={v => {
                            const generalPerms = (modal.data.selectedPerms || []).filter(p => !globalPermDim.includes(p));
                            setF("selectedPerms", [...generalPerms, ...v]);
                        }}
                        options={[...globalPermDim].sort((a, b) => a.localeCompare(b))}
                        t={t}
                        style={{ maxHeight: 200 }}
                    />
                </FF>
            )}
        </Modal>

        <DelModal open={!!delT} onClose={() => setDelT(null)} onDel={handleDeleteRole} title="Delete Role?" t={t}>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.textMuted }}>
                Are you sure? This will remove the role <strong>{delT?.role_name || delT?.name}</strong>. This might affect users assigned to this role.
            </p>
        </DelModal>

        <Modal open={showPermsModal} onClose={() => setShowPermsModal(false)} title="Manage Available Permissions" onSave={() => setShowPermsModal(false)} saveLabel="Done" width={540} t={t} isDark={isDark}>
            <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
                These permissions are used to control access across the application. Adding a new key here makes it available to assign to any Role Type.
            </p>
            
            <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#F9F8F6", padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: newPerm.trim() ? 12 : 0 }}>
                    <FIn value={newPerm} onChange={e => setNewPerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPerm()} placeholder="e.g. REPORT (Suffixes will be added)" t={t} />
                    <button onClick={handleAddPerm} disabled={savingPerms || !newPerm.trim()} style={{ background: t.accentGrad, color: "#fff", border: "none", borderRadius: 10, padding: "0 20px", fontSize: 13.5, fontWeight: 600, cursor: (savingPerms || !newPerm.trim()) ? "default" : "pointer", opacity: (savingPerms || !newPerm.trim()) ? 0.5 : 1 }}>
                        {savingPerms ? "..." : "Add"}
                    </button>
                </div>
                {newPerm.trim() && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "4px 2px" }}>
                        {Object.keys(permToggles).map(k => (
                            <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, color: permToggles[k] ? t.accent : t.textMuted }}>
                                <input type="checkbox" checked={permToggles[k]} onChange={e => setPermToggles(prev => ({ ...prev, [k]: e.target.checked }))} style={{ width: 15, height: 15, accentColor: t.accent }} />
                                <span>{newPerm.trim().toUpperCase()}_{k}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                {[...permDim].sort((a,b)=>a.localeCompare(b)).map(p => (
                    <div key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: isDark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${t.surfaceBorder}`, padding: "10px 14px", borderRadius: 10 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: isDark ? t.text : t.textSecondary, fontFamily: t.mono }}>{p}</span>
                        <button onClick={() => handleRemovePerm(p)} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                    </div>
                ))}
            </div>
            {permDim.length === 0 && <div style={{ textAlign: "center", padding: 40, color: t.textMuted, fontSize: 13.5 }}>No permissions defined.</div>}
        </Modal>
    </>);
}

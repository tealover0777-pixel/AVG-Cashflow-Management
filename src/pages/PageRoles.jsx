import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useFirestoreCollection } from "../useFirestoreCollection";
import { sortData } from "../utils";
import { Bdg, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, DelModal, FMultiSel } from "../components";

export default function PageRoles({ t, isDark, collectionPath = "", DIMENSIONS = [], USERS = [] }) {
    const { data: rawRoles = [], loading, error } = useFirestoreCollection(collectionPath);
    const [hov, setHov] = useState(null);
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [sort, setSort] = useState({ key: null, direction: "asc" });
    const [page, setPage] = useState(1);
    const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };

    const permDim = DIMENSIONS.find(d => d.name === "Permissions")?.items || [];

    const nextRoleId = (() => {
        if (rawRoles.length === 0) return "R10001";
        const maxNum = Math.max(...rawRoles.map(r => { const m = String(r.role_id || "").match(/^R(\d+)$/); return m ? Number(m[1]) : 0; }));
        return "R" + (maxNum + 1);
    })();

    const openAdd = () => setModal({ open: true, mode: "add", data: { role_id: nextRoleId, role_name: "", permissions: [] } });
    const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r, permissions: r.permissions || [] } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    const handleSaveRole = async () => {
        const d = modal.data;
        if (!d.role_name) return;
        const payload = {
            role_id: d.role_id || "",
            role_name: d.role_name,
            permissions: d.permissions || [],
            updated_at: serverTimestamp(),
        };
        try {
            if (modal.mode === "edit" && d.id) {
                await setDoc(doc(db, collectionPath, d.id), payload, { merge: true });
            } else {
                await setDoc(doc(db, collectionPath, d.role_id), { ...payload, created_at: serverTimestamp() });
            }
        } catch (err) { console.error("Save role error:", err); }
        close();
    };

    const cols = [
        { l: "ROLE ID", w: "120px", k: "role_id" },
        { l: "ROLE NAME", w: "200px", k: "role_name" },
        { l: "PERMISSIONS", w: "1fr", k: "permissions" },
        { l: "ACTIONS", w: "80px" }
    ];
    const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
    const [colFilters, setColFilters] = useState({});

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

    const filtered = rawRoles.filter(p => cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(p[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); }));
    const sorted = sortData(filtered, sort);
    const paginated = sorted.slice((page - 1) * 20, page * 20);
    const totalPages = Math.ceil(sorted.length / 20);

    return (<>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Roles</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Define custom roles and map them to application permissions</p>
            </div>
            <button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>+ New Role</button>
        </div>

        <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none" }}>
            <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
            {paginated.map((p, i) => {
                const isHov = hov === p.id;
                return (<div key={p.id} className="data-row" onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent" }}>
                    <div style={{ fontSize: 13.5, color: t.textSecondary, fontFamily: t.mono }}>{p.role_id || p.id || "—"}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: isDark ? "#fff" : (isHov ? t.accent : "#1C1917") }}>{p.role_name || p.name || "—"}</div>
                    <div style={{ fontSize: 11, color: t.textSubtle, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {p.permissions && p.permissions.length > 0 ? p.permissions.map(pm => (
                            <span key={pm} style={{ background: t.chipBg, border: `1px solid ${t.chipBorder}`, padding: "2px 6px", borderRadius: 4 }}>{pm}</span>
                        )) : <span style={{ fontStyle: "italic", opacity: 0.5 }}>No permissions assigned.</span>}
                    </div>
                    <ActBtns show={isHov} t={t} onEdit={() => openEdit(p)} onDel={() => setDelT(p)} />
                </div>);
            })}
        </div>

        {totalPages > 1 && <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}><Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} t={t} /></div>}

        <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Role" : "Edit Role"} onSave={handleSaveRole} width={600} t={t} isDark={isDark}>
            <FF label="Role ID" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.role_id}</div>
            </FF>
            <FF label="Role Name" t={t}><FIn value={modal.data.role_name || modal.data.name} onChange={e => setF("role_name", e.target.value)} placeholder="e.g. Project Manager" t={t} /></FF>
            <FF label="Permissions" t={t}><FMultiSel value={modal.data.permissions || []} onChange={v => setF("permissions", v)} options={permDim} t={t} /></FF>
        </Modal>

        <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={async () => { await deleteDoc(doc(db, collectionPath, delT.id)); setDelT(null); }} label="role" t={t} isDark={isDark} />
    </>);
}

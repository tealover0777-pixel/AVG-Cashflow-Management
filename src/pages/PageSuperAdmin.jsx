import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useFirestoreCollection } from "../useFirestoreCollection";
import { sortData } from "../utils";
import { Bdg, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";

export default function PageSuperAdmin({ t, isDark }) {
    const { data: rawUsers = [], loading, error } = useFirestoreCollection("user_roles");

    const [hov, setHov] = useState(null);
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [sort, setSort] = useState({ key: null, direction: "asc" });
    const [page, setPage] = useState(1);
    const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };

    const openAdd = () => setModal({ open: true, mode: "add", data: { uid: "", email: "", role: "tenant_user", tenantId: "" } });
    const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r, uid: r.id } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    const handleSaveUser = async () => {
        const d = modal.data;
        if (!d.uid) return;

        const payload = {
            email: d.email || "",
            role: d.role || "tenant_user",
            tenantId: d.tenantId || "",
            updated_at: serverTimestamp(),
        };

        try {
            await setDoc(doc(db, "user_roles", d.uid), payload, { merge: true });
        } catch (err) {
            console.error("Save global user error:", err);
        }
        close();
    };

    const cols = [
        { l: "USER UID", w: "220px", k: "id" },
        { l: "EMAIL", w: "1.5fr", k: "email" },
        { l: "GLOBAL ROLE", w: "250px", k: "role" },
        { l: "ASSIGNED TENANT", w: "140px", k: "tenantId" },
        { l: "ACTIONS", w: "80px" }
    ];
    const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
    const [colFilters, setColFilters] = useState({});
    const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };

    const filtered = rawUsers.filter(p => cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(p[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); }));
    const sorted = sortData(filtered, sort);
    const paginated = sorted.slice((page - 1) * 20, page * 20);
    const totalPages = Math.ceil(sorted.length / 20);

    return (
        <>
            <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Super Admin</h1>
                    <p style={{ fontSize: 13.5, color: t.textMuted }}>Global system management and cross-tenant user assignment</p>
                </div>
                <button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>
                    + Assign User Role
                </button>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Loading global roles...</div>
            ) : error ? (
                <div style={{ padding: 40, color: "#EF4444" }}>Error viewing user roles. Make sure rules are deployed.</div>
            ) : (
                <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none" }}>
                    <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
                    <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
                        {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} /> : <div key={c.l || "nofilter"} />)}
                    </div>
                    {paginated.map((p, i) => {
                        const isHov = hov === p.id;
                        return (<div key={p.id} className="data-row" onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent" }}>
                            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{p.id}</div>
                            <div style={{ fontSize: 12.5, color: t.accent }}>{p.email || "—"}</div>
                            <div><Bdg status={p.role ? p.role.replace(/_/g, " ").toUpperCase() : "NONE"} isDark={isDark} /></div>
                            <div style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 600, color: t.text }}>{p.tenantId || <span style={{ color: t.textMuted }}>Global Access</span>}</div>
                            <ActBtns show={isHov} t={t} onEdit={() => openEdit(p)} onDel={() => setDelT(p)} />
                        </div>);
                    })}
                </div>
            )}

            <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "Assign Global Role" : "Edit Global Role"} onSave={handleSaveUser} width={500} t={t} isDark={isDark}>
                <div style={{ marginBottom: 16, fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
                    This writes directly to the global `user_roles` collection. Users will read their role and tenant from here when they log in.
                </div>
                <FF label="User Firebase UID (Required)" t={t}>
                    <FIn value={modal.data.uid} onChange={e => setF("uid", e.target.value)} disabled={modal.mode === "edit"} placeholder="e.g. kH9z..." t={t} />
                </FF>
                <FF label="Email (Optional logging)" t={t}>
                    <FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="user@company.com" t={t} />
                </FF>
                <FF label="Global Role" t={t}>
                    <FSel value={modal.data.role} onChange={e => setF("role", e.target.value)} options={["tenant_user", "tenant_admin_read_only", "tenant_admin_read_write", "tenant_admin_super_user", "company_super_admin_read_write"]} t={t} />
                </FF>
                <FF label="Assigned Tenant ID" t={t}>
                    <FIn value={modal.data.tenantId} onChange={e => setF("tenantId", e.target.value)} placeholder="Leave blank for super admins, e.g. T10001" t={t} />
                </FF>
            </Modal>
            <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={async () => { await deleteDoc(doc(db, "user_roles", delT.id)); setDelT(null); }} label="global role mapping" t={t} isDark={isDark} />
        </>
    );
}

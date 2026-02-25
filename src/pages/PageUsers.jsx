import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData } from "../utils";
import { Bdg, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";

export default function PageUsers({ t, isDark, USERS = [], collectionPath = "" }) {
    const [hov, setHov] = useState(null);
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [sort, setSort] = useState({ key: null, direction: "asc" });
    const [page, setPage] = useState(1);
    const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };

    const openAdd = () => setModal({ open: true, mode: "add", data: { name: "", email: "", role: "tenant_user", phone: "" } });
    const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    const handleSaveUser = async () => {
        const d = modal.data;
        const payload = {
            name: d.name || "",
            email: d.email || "",
            role: d.role || "tenant_user",
            phone: d.phone || "",
            updated_at: serverTimestamp(),
        };
        try {
            if (modal.mode === "edit" && d.docId) {
                await updateDoc(doc(db, collectionPath, d.docId), payload);
            } else {
                // Note: Creating auth user requires admin SDK or client-side signup flow.
                // Here we just save the profile document.
                await setDoc(doc(db, collectionPath, d.email), { ...payload, created_at: serverTimestamp() });
            }
        } catch (err) { console.error("Save user error:", err); }
        close();
    };

    const cols = [
        { l: "NAME", w: "1fr", k: "name" },
        { l: "EMAIL", w: "1.2fr", k: "email" },
        { l: "ROLE", w: "140px", k: "role" },
        { l: "PHONE", w: "120px", k: "phone" },
        { l: "ACTIONS", w: "80px" }
    ];
    const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
    const [colFilters, setColFilters] = useState({});
    const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
    const filtered = USERS.filter(p => cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(p[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); }));
    const sorted = sortData(filtered, sort);
    const paginated = sorted.slice((page - 1) * 20, page * 20);
    const totalPages = Math.ceil(sorted.length / 20);

    return (<>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Users</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage members of your tenant</p>
            </div>
            <button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>+ New User</button>
        </div>

        <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none" }}>
            <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
            {paginated.map((p, i) => {
                const isHov = hov === p.docId;
                return (<div key={p.docId} className="data-row" onMouseEnter={() => setHov(p.docId)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : (isHov ? "#1C1917" : "#44403C") }}>{p.name}</div>
                    <div style={{ fontSize: 12.5, color: t.accent }}>{p.email}</div>
                    <div><Bdg status={p.role.replace(/_/g, " ").toUpperCase()} isDark={isDark} /></div>
                    <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.phone || "—"}</div>
                    <ActBtns show={isHov} t={t} onEdit={() => openEdit(p)} onDel={() => setDelT(p)} />
                </div>);
            })}
        </div>

        <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New User" : "Edit User"} onSave={handleSaveUser} width={500} t={t} isDark={isDark}>
            <FF label="Full Name" t={t}><FIn value={modal.data.name} onChange={e => setF("name", e.target.value)} t={t} /></FF>
            <FF label="Email Address" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} t={t} disabled={modal.mode === "edit"} /></FF>
            <FF label="Role" t={t}><FSel value={modal.data.role} onChange={e => setF("role", e.target.value)} options={["tenant_user", "tenant_admin_read_only", "tenant_admin_read_write", "tenant_admin_super_user"]} t={t} /></FF>
            <FF label="Phone" t={t}><FIn value={modal.data.phone} onChange={e => setF("phone", e.target.value)} t={t} /></FF>
        </Modal>
        <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={async () => { await deleteDoc(doc(db, collectionPath, delT.docId)); setDelT(null); }} label="user" t={t} isDark={isDark} />
    </>);
}

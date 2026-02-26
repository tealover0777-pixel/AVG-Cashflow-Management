import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData } from "../utils";
import { Bdg, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal, FMultiSel } from "../components";

const PERMISSIONS_LIST = [
    "TENANT_CREATE", "TENANT_VIEW", "TENANT_UPDATE", "TENANT_DELETE",
    "USER_CREATE", "USER_INVITE", "USER_VIEW", "USER_UPDATE", "USER_DELETE",
    "PROJECT_CREATE", "PROJECT_VIEW", "PROJECT_UPDATE", "PROJECT_DELETE",
    "MEMBER_CREATE", "MEMBER_VIEW", "MEMBER_UPDATE", "MEMBER_DELETE",
    "CONTRACT_CREATE", "CONTRACT_VIEW", "CONTRACT_UPDATE", "CONTRACTS_DELETE",
    "PAYMENT_SCHEDULE_CREATE", "PAYMENT_SCHEDULE_VIEW", "PAYMENT_SCHEDULE_UPDATE", "PAYMENT_SCHEDULE_DELETE",
    "FEE_CREATE", "FEE_VIEW", "FEE_UPDATE", "FEE_DELETE",
    "DIMENTION_CREATE", "DIMENTION_VIEW", "DIMENTION_UPDATE", "DIMENTION_DELETE",
    "REPORT_CREATE", "REPORT_VIEW", "REPORT_EXPORT", "REPORT_UPDATE", "REPORT_DELETE",
    "PLATFORM_TENANT_CREATE", "PLATFORM_TENANT_DELETE", "PLATFORM_TENANT_VIEW", "PLATFORM_TENANT_UPDATE"
];
import { useAuth } from "../AuthContext";

export default function PageUsers({ t, isDark, USERS = [], ROLES = [], collectionPath = "", DIMENSIONS = [] }) {
    const { hasPermission, isSuperAdmin } = useAuth();
    // Only super admins or properly permissioned users can edit Users
    const canCreate = isSuperAdmin || hasPermission("USER_CREATE");
    const canUpdate = isSuperAdmin || hasPermission("USER_UPDATE");
    const canDelete = isSuperAdmin || hasPermission("USER_DELETE");
    const [hov, setHov] = useState(null);
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [sort, setSort] = useState({ key: null, direction: "asc" });
    const [page, setPage] = useState(1);
    const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };

    // Format roles for the select dropdown
    const roleOpts = [{ name: "Role", items: ROLES.map(r => ({ label: r.name, value: r.id })) }];

    // Fallback dimension (used previously, keep for migrating old data if needed)
    const legacyRoleDim = DIMENSIONS.find(d => d.name === "Role")?.items || [];

    useEffect(() => {
        if (DIMENSIONS && !DIMENSIONS.some(d => d.name === "Permissions")) {
            setDoc(doc(db, "dimensions", "Permissions"), { name: "Permissions", items: PERMISSIONS_LIST, category: "Permissions" })
                .catch(e => console.error("Auto-seed permissions failed. User likely missing write access to 'dimensions'."));
        }
    }, [DIMENSIONS]);

    const nextUserId = (() => {
        if (USERS.length === 0) return "U10001";
        const maxNum = Math.max(...USERS.map(u => { const m = String(u.user_id || "").match(/^U(\d+)$/); return m ? Number(m[1]) : 0; }));
        return "U" + (maxNum + 1);
    })();

    const openAdd = () => setModal({ open: true, mode: "add", data: { user_id: nextUserId, user_name: "", email: "", role_id: "", phone: "" } });
    const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r, role_id: r.role_id || "" } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    const handleSaveUser = async () => {
        const d = modal.data;
        const payload = {
            user_id: d.user_id || "",
            user_name: d.user_name || "",
            email: d.email || "",
            role_id: d.role_id || "",
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
        { l: "USER ID", w: "120px", k: "user_id" },
        { l: "NAME", w: "1fr", k: "user_name" },
        { l: "EMAIL", w: "1.2fr", k: "email" },
        { l: "ROLE", w: "140px", k: "role" },
        { l: "PERMISSIONS", w: "2fr", k: "permissions" },
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
            {canCreate && <button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>+ New User</button>}
        </div>

        <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none" }}>
            <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
            {paginated.map((p, i) => {
                const isHov = hov === p.docId;
                const mappedRole = ROLES.find(r => r.id === p.role_id) || { name: p.role_id || p.role || "Unknown", permissions: p.permissions || [] };

                return (<div key={p.docId || p.user_id} className="data-row" onMouseEnter={() => setHov(p.docId)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent" }}>
                    <div style={{ fontSize: 13.5, color: t.textSecondary, fontFamily: t.mono }}>{p.user_id || "—"}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : (isHov ? "#1C1917" : "#44403C") }}>{p.user_name || p.name || "—"}</div>
                    <div style={{ fontSize: 12.5, color: t.accent }}>{p.email}</div>
                    <div><Bdg status={mappedRole.name.replace(/_/g, " ").toUpperCase()} isDark={isDark} /></div>
                    <div style={{ fontSize: 11, color: t.textSubtle, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {mappedRole.permissions && mappedRole.permissions.length > 0 ? mappedRole.permissions.map(pm => (
                            <span key={pm} style={{ background: t.chipBg, border: `1px solid ${t.chipBorder}`, padding: "2px 6px", borderRadius: 4 }}>{pm}</span>
                        )) : "—"}
                    </div>
                    <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.phone || "—"}</div>
                    <ActBtns show={isHov && (canUpdate || canDelete)} t={t} onEdit={canUpdate ? () => openEdit(p) : null} onDel={canDelete ? () => setDelT(p) : null} />
                </div>);
            })}
        </div>

        <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New User" : "Edit User"} onSave={handleSaveUser} width={600} t={t} isDark={isDark}>
            <FF label="User ID" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.user_id}</div>
            </FF>
            <FF label="Full Name" t={t}><FIn value={modal.data.user_name || modal.data.name} onChange={e => setF("user_name", e.target.value)} t={t} /></FF>
            <FF label="Email Address" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} t={t} disabled={modal.mode === "edit"} /></FF>
            <FF label="Role" t={t}>
                <select
                    value={modal.data.role_id || ""}
                    onChange={e => setF("role_id", e.target.value)}
                    style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}
                >
                    <option value="" disabled>Select a role...</option>
                    {ROLES.map(r => (
                        <option key={r.id} value={r.id} style={{ color: "#000" }}>{r.name}</option>
                    ))}
                    {/* Fallback for legacy roles just in case some aren't in ROLES collection yet */}
                    {modal.data.role_id && !ROLES.some(r => r.id === modal.data.role_id) && <option value={modal.data.role_id} style={{ color: "#000" }}>{modal.data.role_id} (Legacy)</option>}
                </select>
            </FF>
            <FF label="Phone" t={t}><FIn value={modal.data.phone} onChange={e => setF("phone", e.target.value)} t={t} /></FF>
        </Modal>
        <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={async () => { await deleteDoc(doc(db, collectionPath, delT.docId)); setDelT(null); }} label="user" t={t} isDark={isDark} />
    </>);
}

import { useState } from "react";
import { db, functions } from "../firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useFirestoreCollection } from "../useFirestoreCollection";
import { sortData } from "../utils";
import { Bdg, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";

const StatusBadge = ({ status, t, isDark }) => {
    const isPending = !status || status === "Pending";
    const bg = isPending ? (isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB") : (isDark ? "rgba(34,197,94,0.15)" : "#F0FDF4");
    const color = isPending ? "#F59E0B" : "#22C55E";
    const border = isPending ? "1px solid rgba(245,158,11,0.35)" : "1px solid rgba(34,197,94,0.35)";
    return (
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color, border, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
            {isPending ? "⏳ Pending" : "✓ Active"}
        </span>
    );
};

export default function PageSuperAdmin({ t, isDark, DIMENSIONS = [], ROLES = [], TENANTS = [] }) {
    const { data: rawUsers = [], loading, error } = useFirestoreCollection("global_users");

    const [hov, setHov] = useState(null);
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [sort, setSort] = useState({ key: null, direction: "asc" });
    const [page, setPage] = useState(1);
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);
    const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };

    const getRoleName = (role_id) => {
        const found = ROLES.find(r => r.id === role_id || r.role_id === role_id);
        return found ? (found.role_name || found.name || role_id) : null;
    };
    const getTenantName = (tenantId) => {
        const found = TENANTS.find(t2 => t2.id === tenantId);
        return found ? (found.name || tenantId) : null;
    };
    const isRoleGlobal = (roleId) => {
        const found = ROLES.find(r => (r.id || r.role_id) === roleId);
        return found && found.IsGlobal === true;
    };

    const roleDim = DIMENSIONS.find(d => d.name === "Role")?.items || [
        "Tenant Member", "Tenant Viewer", "Tenant Manager", "Tenant Admin", "Tenant Owner",
        "Support Admin", "Auditor", "Platform_Operator", "Platform Admin", "Super Admin", "L2 Admin"
    ];

    const openInvite = () => setModal({ open: true, mode: "invite", data: { email: "", role: "", tenantId: "" } });
    const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r, uid: r.id } });
    const openResendInvite = r => setModal({ open: true, mode: "invite", data: { email: r.email || "", role: r.role || "", tenantId: r.tenantId || "" } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    // Invite user via Cloud Function
    const handleInviteUser = async () => {
        const d = modal.data;
        if (!d.email || !d.role) return;
        setInviting(true);
        try {
            const inviteUserFn = httpsCallable(functions, "inviteUser");
            const result = await inviteUserFn({ email: d.email, role: d.role, tenantId: d.tenantId || "" });
            close();
            setInviteResult({ link: result.data.link, email: d.email });
        } catch (err) {
            console.error("Invite error:", err);
            alert("Invite failed: " + (err.message || "Unknown error"));
        } finally {
            setInviting(false);
        }
    };

    // Edit existing role/tenant mapping in global_users
    const handleSaveUser = async () => {
        const d = modal.data;
        if (!d.uid) return;
        const payload = {
            email: d.email || "",
            role: d.role || "",
            tenantId: d.tenantId || "",
            updated_at: serverTimestamp(),
        };
        try {
            await setDoc(doc(db, "global_users", d.uid), payload, { merge: true });
        } catch (err) {
            console.error("Save global user error:", err);
        }
        close();
    };

    const cols = [
        { l: "USER UID", w: "220px", k: "id" },
        { l: "EMAIL", w: "15%", k: "email" },
        { l: "GLOBAL ROLE", w: "200px", k: "role" },
        { l: "TENANT", w: "130px", k: "tenantId" },
        { l: "STATUS", w: "110px", k: "status" },
        { l: "ACTIONS", w: "110px" }
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
            {/* Invite result popup */}
            {inviteResult && (
                <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 16, padding: 28, maxWidth: 540, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
                        <h3 style={{ fontFamily: t.titleFont, fontSize: 18, marginBottom: 8, color: isDark ? "#fff" : "#1C1917" }}>✅ Invite Created!</h3>
                        <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>Share this link with <strong>{inviteResult.email}</strong> so they can set their password and activate their account:</p>
                        <div style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 14px", fontFamily: t.mono, fontSize: 12, wordBreak: "break-all", color: t.accent, marginBottom: 20 }}>
                            {inviteResult.link}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => navigator.clipboard.writeText(inviteResult.link)} style={{ flex: 1, background: t.accentGrad, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>📋 Copy Link</button>
                            <button onClick={() => setInviteResult(null)} style={{ flex: 1, background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 18px", fontSize: 13.5, cursor: "pointer" }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Super Admin</h1>
                    <p style={{ fontSize: 13.5, color: t.textMuted }}>Global system management and cross-tenant user assignment - Use User Profiles to invite/add users in normal workflow. Use Super Admin only for troubleshooting or manually adjusting global role assignments.</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <button className="primary-btn" onClick={openInvite} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>
                        ✉️ Invite User
                    </button>
                    <button className="primary-btn" onClick={() => setModal({ open: true, mode: "add", data: { uid: "", email: "", role: "Tenant Member", tenantId: "" } })} style={{ background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", color: t.text, border: `1px solid ${t.border}`, padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600 }}>
                        + Assign Role
                    </button>
                </div>
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
                            <div style={{ fontSize: 12 }}><span style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.role || "—"}</span>{" "}{getRoleName(p.role) || <Bdg status={p.role ? p.role.replace(/_/g, " ").toUpperCase() : "NONE"} isDark={isDark} />}</div>
                            <div style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 600, color: t.text }}>
                                {isRoleGlobal(p.role)
                                    ? <span style={{ color: "#22C55E", fontWeight: 600 }}>🌐 Global</span>
                                    : (p.tenantId || p.tenant_id || p.Tenant_ID || <span style={{ color: t.textMuted }}>—</span>)}
                                {!isRoleGlobal(p.role) && getTenantName(p.tenantId || p.tenant_id || p.Tenant_ID) && <span style={{ fontFamily: t.font, fontWeight: 400, fontSize: 11, color: t.textMuted }}>{" "}{getTenantName(p.tenantId || p.tenant_id || p.Tenant_ID)}</span>}
                            </div>
                            <div><StatusBadge status={p.status} t={t} isDark={isDark} /></div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <ActBtns show={isHov} t={t} onEdit={() => openEdit(p)} onDel={() => setDelT(p)} />
                                {isHov && (!p.status || p.status === "Pending") && (
                                    <button onClick={() => openResendInvite(p)} title="Re-send invite" style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", fontSize: 13, color: t.textMuted }}>✉️</button>
                                )}
                            </div>
                        </div>);
                    })}
                </div>
            )}

            <Pagination page={page} totalPages={totalPages} setPage={setPage} t={t} isDark={isDark} />

            {/* Invite Modal */}
            <Modal open={modal.open && modal.mode === "invite"} onClose={close} title="Invite User" onSave={handleInviteUser} saveLabel={inviting ? "Sending..." : "Send Invite ✉️"} width={500} t={t} isDark={isDark}>
                <p style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 16, lineHeight: 1.6 }}>Creates a Firebase Auth account, sets their role and tenant, and generates a secure password-setup link to share with them.</p>
                <FF label="Email Address" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="user@company.com" t={t} /></FF>
                <FF label="Global Role" t={t}><FSel value={modal.data.role} onChange={e => setF("role", e.target.value)} options={roleDim} t={t} /></FF>
                <FF label="Assigned Tenant ID" t={t}>
                    {isRoleGlobal(modal.data.role)
                        ? <div style={{ fontSize: 13, fontWeight: 600, color: "#22C55E", background: isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4", border: "1px solid rgba(34,197,94,0.35)", borderRadius: 9, padding: "10px 13px" }}>🌐 Global — Access to all tenants</div>
                        : <FIn value={modal.data.tenantId} onChange={e => setF("tenantId", e.target.value)} placeholder="Leave blank for global admins, e.g. T10001" t={t} />}
                </FF>
            </Modal>

            {/* Assign / Edit Role Modal */}
            <Modal open={modal.open && (modal.mode === "add" || modal.mode === "edit")} onClose={close} title={modal.mode === "add" ? "Assign Global Role" : "Edit Global Role"} onSave={handleSaveUser} width={500} t={t} isDark={isDark}>
                <div style={{ marginBottom: 16, fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
                    This writes directly to the global `global_users` collection. Users will read their role and tenant from here when they log in.
                </div>
                <FF label="User Firebase UID (Required)" t={t}>
                    <FIn value={modal.data.uid} onChange={e => setF("uid", e.target.value)} disabled={modal.mode === "edit"} placeholder="e.g. kH9z..." t={t} />
                </FF>
                <FF label="Email (Optional logging)" t={t}>
                    <FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="user@company.com" t={t} />
                </FF>
                <FF label="Global Role" t={t}><FSel value={modal.data.role} onChange={e => setF("role", e.target.value)} options={roleDim} t={t} /></FF>
                <FF label="Assigned Tenant ID" t={t}>
                    {isRoleGlobal(modal.data.role)
                        ? <div style={{ fontSize: 13, fontWeight: 600, color: "#22C55E", background: isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4", border: "1px solid rgba(34,197,94,0.35)", borderRadius: 9, padding: "10px 13px" }}>🌐 Global — Access to all tenants</div>
                        : <FIn value={modal.data.tenantId} onChange={e => setF("tenantId", e.target.value)} placeholder="Leave blank for super admins, e.g. T10001" t={t} />}
                </FF>
            </Modal>

            <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={async () => { await deleteDoc(doc(db, "global_users", delT.id)); setDelT(null); }} label="global role mapping" t={t} isDark={isDark} />
        </>
    );
}

import { useState, useEffect } from "react";
import { db, functions } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { sortData } from "../utils";
import { Bdg, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, DelModal } from "../components";
import { useAuth } from "../AuthContext";

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

export default function PageUserProfiles({ t, isDark, USERS = [], ROLES = [], collectionPath = "", DIMENSIONS = [], tenantId = "", TENANTS = [] }) {
    const { hasPermission, isSuperAdmin } = useAuth();
    const canCreate = isSuperAdmin || hasPermission("USER_CREATE");
    const canInvite = isSuperAdmin || hasPermission("USER_INVITE");
    const canUpdate = isSuperAdmin || hasPermission("USER_UPDATE");
    const canDelete = isSuperAdmin || hasPermission("USER_DELETE");

    const [hov, setHov] = useState(null);
    // mode: "add" | "edit" | "invite" (invite = new user invite form)
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [sort, setSort] = useState({ key: null, direction: "asc" });
    const [page, setPage] = useState(1);
    const [inviting, setInviting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [inviteResult, setInviteResult] = useState(null); // { link, email } or null
    const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };

    useEffect(() => {
        if (DIMENSIONS && !DIMENSIONS.some(d => d.name === "Permissions")) {
            setDoc(doc(db, "dimensions", "Permissions"), { name: "Permissions", items: PERMISSIONS_LIST, category: "Permissions" })
                .catch(e => console.error("Auto-seed permissions failed.", e));
        }
    }, [DIMENSIONS]);

    const nextUserId = (() => {
        if (USERS.length === 0) return "U10001";
        const maxNum = Math.max(...USERS.map(u => { const m = String(u.user_id || "").match(/^U(\d+)$/); return m ? Number(m[1]) : 0; }));
        return "U" + String(maxNum + 1).padStart(5, "0");
    })();

    // Check if selected role is a Global role (IsGlobal flag in role_types)
    const isSelectedRoleGlobal = (roleId) => {
        const found = ROLES.find(r => (r.id || r.role_id) === roleId);
        return found && found.IsGlobal === true;
    };

    const openInvite = () => setModal({ open: true, mode: "invite", data: { email: "", role_id: "", user_name: "" } });
    const openEdit = r => {
        const tid = r.tenantId || r.tenant_id || r.Tenant_ID || tenantId;
        setModal({ open: true, mode: "edit", data: { ...r, role_id: r.role_id || "", tenantId: tid, _origTenantId: tid } });
    };
    const openResendInvite = r => setModal({ open: true, mode: "resend", data: { email: r.email, role_id: r.role_id || "", user_name: r.user_name || "", phone: r.phone || "", notes: r.notes || "", user_id: r.user_id || "" } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    // Invite NEW user via Cloud Function (creates Auth user, sets claims, writes profile)
    const handleInviteUser = async () => {
        const d = modal.data;
        if (!d.email || !d.role_id) return;
        setInviting(true);
        try {
            const inviteUserFn = httpsCallable(functions, "inviteUser");
            const result = await inviteUserFn({
                email: d.email,
                role: d.role_id,
                tenantId: isSelectedRoleGlobal(d.role_id) ? "" : (d.inviteTenantId || tenantId),
                user_id: nextUserId,
                user_name: d.user_name || "",
                phone: d.phone || "",
                notes: d.notes || ""
            });
            close();
            setInviteResult({ email: d.email, user_id: result.data.user_id, emailSent: result.data.emailSent, link: result.data.link });
        } catch (err) {
            console.error("Invite error:", err);
            alert("Invite failed: " + (err.message || "Unknown error"));
        } finally {
            setInviting(false);
        }
    };

    // Re-send verification email only — no user data changes
    const handleResendInvite = async () => {
        const d = modal.data;
        if (!d.email) return;
        setInviting(true);
        try {
            const resendFn = httpsCallable(functions, "resendVerification");
            const result = await resendFn({ email: d.email });
            close();
            setInviteResult({ email: d.email, user_id: d.user_id, emailSent: result.data.emailSent, link: result.data.link });
        } catch (err) {
            console.error("Resend error:", err);
            alert("Re-send failed: " + (err.message || "Unknown error"));
        } finally {
            setInviting(false);
        }
    };

    const handleFixStatuses = async () => {
        if (!confirm("This will set all 'Pending' users to 'Active' (except L2 Admin). Proceed?")) return;
        setFixing(true);
        try {
            const fixFn = httpsCallable(functions, "fixAllStatuses");
            const res = await fixFn();
            alert(res.data.message || "Updated statuses successfully.");
        } catch (err) {
            console.error("Fix statuses error:", err);
            alert("Failed to fix statuses: " + (err.message || "Unknown error"));
        } finally {
            setFixing(false);
        }
    };

    // Delete = remove from Firestore AND Firebase Auth via Cloud Function
    const [deleting, setDeleting] = useState(false);
    const handleDeleteUser = async () => {
        if (!delT) return;
        setDeleting(true);
        try {
            const deleteUserFn = httpsCallable(functions, "deleteUser");
            await deleteUserFn({ email: delT.email, docId: delT.id, tenantId });
        } catch (err) {
            console.error("Delete user error:", err);
            // Fallback: delete Firestore doc directly if function fails
            await deleteDoc(doc(db, collectionPath, delT.id));
        } finally {
            setDeleting(false);
            setDelT(null);
        }
    };

    // Edit = update the Firestore profile document only (no Auth changes)
    // UNLESS tenantId has changed (Super Admin only)
    const handleSaveUser = async () => {
        const d = modal.data;
        const tid = d.tenantId || d.tenant_id || d.Tenant_ID || tenantId;
        const isTenantChange = d._origTenantId && tid !== d._origTenantId;

        setSaving(true);
        try {
            if (isTenantChange && isSuperAdmin) {
                const updateTenantFn = httpsCallable(functions, "updateUserTenant");
                await updateTenantFn({
                    uid: d.auth_uid || d.id,
                    email: d.email,
                    newTenantId: tid,
                    oldTenantId: d._origTenantId,
                    role: d.role_id,
                    user_id: d.user_id,
                    user_name: d.user_name || d.name || "",
                    phone: d.phone || "",
                    notes: d.notes || ""
                });
            } else if (modal.mode === "edit" && d.id) {
                const payload = {
                    user_id: d.user_id || "",
                    user_name: d.user_name || d.name || "",
                    email: d.email || "",
                    role_id: d.role_id || "",
                    phone: d.phone || "",
                    notes: d.notes || "",
                    updated_at: serverTimestamp(),
                };
                await updateDoc(doc(db, collectionPath, d.id), payload);
            }
            close();
        } catch (err) {
            console.error("Save user error:", err);
            alert("Save failed: " + (err.message || "Unknown error"));
        } finally {
            setSaving(false);
        }
    };

    const cols = [
        { l: "USER ID", w: "100px", k: "user_id" },
        { l: "NAME", w: "0.125fr", k: "user_name" },
        { l: "EMAIL", w: "0.15fr", k: "email" },
        { l: "ROLE", w: "192px", k: "role_id" },
        { l: "STATUS", w: "110px", k: "status" },
        { l: "AUTH UID", w: "240px", k: "auth_uid" },
        ...(isSuperAdmin ? [{ l: "TENANT ID", w: "120px", k: "tenantId" }] : []),
        { l: "PHONE", w: "120px", k: "phone" },
        { l: "NOTES", w: "0.3fr", k: "notes" },
        { l: "ACTIONS", w: "100px" }
    ];
    const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
    const [colFilters, setColFilters] = useState({});
    const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
    const filtered = USERS.filter(p => cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(p[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); }));
    const sorted = sortData(filtered, sort);
    const paginated = sorted.slice((page - 1) * 20, page * 20);
    const totalPages = Math.ceil(sorted.length / 20);

    // Resolve role display name from ROLES collection
    const getRoleName = (role_id) => {
        const found = ROLES.find(r => r.id === role_id || r.role_id === role_id);
        return found ? (found.role_name || found.name || role_id) : (role_id || "—");
    };

    return (<>
        {/* Invite result link sheet */}
        {inviteResult && (
            <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 16, padding: 28, maxWidth: 540, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
                    <h3 style={{ fontFamily: t.titleFont, fontSize: 18, marginBottom: 8, color: isDark ? "#fff" : "#1C1917" }}>
                        {inviteResult.emailSent ? "✅ Invite Sent!" : "✅ User Created"}
                    </h3>
                    <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
                        {inviteResult.emailSent
                            ? <>A verification email has been sent to <strong>{inviteResult.email}</strong>. They will need to click the link in the email to verify their address.</>
                            : <>User <strong>{inviteResult.email}</strong> has been created. Share the verification link below so they can verify their email and log in.</>
                        }
                    </p>
                    {inviteResult.user_id && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: 12, color: t.textMuted }}>User ID:</span>
                            <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: t.accent, background: isDark ? "rgba(255,255,255,0.08)" : "#F0F9FF", padding: "3px 10px", borderRadius: 6 }}>{inviteResult.user_id}</span>
                        </div>
                    )}
                    {inviteResult.link && (
                        <>
                            <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>Verification link:</p>
                            <div style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 14px", fontFamily: t.mono, fontSize: 12, wordBreak: "break-all", color: t.accent, marginBottom: 16 }}>
                                {inviteResult.link}
                            </div>
                        </>
                    )}
                    <div style={{ display: "flex", gap: 10 }}>
                        {inviteResult.link && (
                            <button onClick={() => { navigator.clipboard.writeText(inviteResult.link); }} style={{ flex: 1, background: t.accentGrad, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Copy Link</button>
                        )}
                        <button onClick={() => setInviteResult(null)} style={{ flex: 1, background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 18px", fontSize: 13.5, cursor: "pointer" }}>Close</button>
                    </div>
                </div>
            </div>
        )}

        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>User Profiles</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage members of your tenant</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
                {isSuperAdmin && (
                    <button className="nav-item" onClick={handleFixStatuses} disabled={fixing} style={{ background: "none", border: `1px solid ${t.border}`, color: t.textSecondary, padding: "10px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
                        {fixing ? "⏳ Fixing..." : "🔧 Fix All Statuses"}
                    </button>
                )}
                {(canCreate || canInvite) && <button className="primary-btn" onClick={openInvite} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>✉️ Invite User</button>}
            </div>
        </div>

        <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none" }}>
            <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
            {/* Filter row */}
            <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
                {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: t.text, outline: "none", width: "100%", boxSizing: "border-box" }} /> : <div key={c.l || "nofilter"} />)}
            </div>

            {paginated.map((p, i) => {
                const isHov = hov === p.id;
                const roleName = getRoleName(p.role_id);
                return (
                    <div key={p.id || p.user_id} className="data-row" onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent" }}>
                        <div style={{ fontSize: 13, color: t.textSecondary, fontFamily: t.mono }}>{p.user_id || "—"}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#44403C" }}>{p.user_name || p.name || "—"}</div>
                        <div style={{ fontSize: 12.5, color: t.accent }}>{p.email}</div>
                        <div style={{ fontSize: 12 }}><span style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.role_id || "—"}</span>{" "}{roleName}</div>
                        <div><StatusBadge status={p.status} t={t} isDark={isDark} /></div>
                        <div style={{ fontFamily: t.mono, fontSize: 10, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.auth_uid || p.id}>{p.auth_uid || p.id || "—"}</div>
                        {isSuperAdmin && (
                            <div style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 600, color: t.text }}>
                                {p.tenantId || p.tenant_id || p.Tenant_ID || tenantId || <span style={{ color: t.textMuted }}>—</span>}
                            </div>
                        )}
                        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.phone || "—"}</div>
                        <div style={{ fontSize: 12, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.notes || ""}>{p.notes || "—"}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <ActBtns show={isHov && (canUpdate || canDelete)} t={t} onEdit={canUpdate ? () => openEdit(p) : null} onDel={canDelete ? () => setDelT(p) : null} />
                            {isHov && canInvite && (!p.status || p.status === "Pending") && (
                                <button onClick={() => openResendInvite(p)} title="Re-send invite link" style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", fontSize: 13, color: t.textMuted }}>✉️</button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        <Pagination page={page} totalPages={totalPages} setPage={setPage} t={t} isDark={isDark} />

        {/* Invite Modal */}
        <Modal open={modal.open && modal.mode === "invite"} onClose={close} title="Invite New User" onSave={handleInviteUser} saveLabel={inviting ? "Sending..." : "Send Invite ✉️"} width={520} t={t} isDark={isDark}>
            <p style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
                This will create a Firebase Auth account for the user (if they don't already have one), set their role/tenant permissions, and generate a secure invite link to share with them.
            </p>
            <FF label="Upcoming User ID" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{nextUserId}</div>
            </FF>
            <FF label="Email Address" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="user@company.com" t={t} /></FF>
            <FF label="Full Name (optional)" t={t}><FIn value={modal.data.user_name} onChange={e => setF("user_name", e.target.value)} placeholder="Jane Doe" t={t} /></FF>
            <FF label="Phone (optional)" t={t}><FIn value={modal.data.phone || ""} onChange={e => setF("phone", e.target.value)} placeholder="+1 555 000 0000" t={t} /></FF>
            <FF label="Role" t={t}>
                <select value={modal.data.role_id || ""} onChange={e => setF("role_id", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    <option value="" disabled style={{ color: "#000" }}>Select a role...</option>
                    {ROLES.map(r => <option key={r.id || r.role_id} value={r.id || r.role_id} style={{ color: "#000" }}>{r.role_name || r.name || r.id}</option>)}
                </select>
            </FF>
            {isSuperAdmin && !isSelectedRoleGlobal(modal.data.role_id) && (
                <FF label="Tenant ID" t={t}>
                    <select value={modal.data.inviteTenantId || tenantId || ""} onChange={e => setF("inviteTenantId", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                        <option value="">— No tenant (global admin) —</option>
                        {TENANTS.map(ten => <option key={ten.id} value={ten.id} style={{ color: "#000" }}>{ten.id}{ten.name ? ` — ${ten.name}` : ""}</option>)}
                    </select>
                </FF>
            )}
            {isSelectedRoleGlobal(modal.data.role_id) && (
                <FF label="Tenant ID" t={t}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#22C55E", background: isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4", border: "1px solid rgba(34,197,94,0.35)", borderRadius: 9, padding: "10px 13px" }}>🌐 Global — Access to all tenants</div>
                </FF>
            )}
            <FF label="Notes" t={t}>
                <textarea
                    value={modal.data.notes || ""}
                    onChange={e => setF("notes", e.target.value)}
                    placeholder="Optional notes about this user..."
                    rows={3}
                    style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, resize: "vertical", boxSizing: "border-box" }}
                />
            </FF>
        </Modal>

        {/* Re-send Invite Modal */}
        <Modal open={modal.open && modal.mode === "resend"} onClose={close} title="Re-send Invite Link" onSave={handleResendInvite} saveLabel={inviting ? "Sending..." : "Re-send Invite ✉️"} width={520} t={t} isDark={isDark}>
            <p style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
                This will generate a new invite link for the existing user. Their current account and profile will be preserved, and a fresh password reset link will be created for them to log in.
            </p>
            <FF label="Email Address" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.email}</div>
            </FF>
            <FF label="Full Name" t={t}>
                <div style={{ fontSize: 13, color: t.text, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.user_name || "—"}</div>
            </FF>
            <FF label="Role" t={t}>
                <select value={modal.data.role_id || ""} onChange={e => setF("role_id", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    <option value="" disabled style={{ color: "#000" }}>Select a role...</option>
                    {ROLES.map(r => <option key={r.id || r.role_id} value={r.id || r.role_id} style={{ color: "#000" }}>{r.role_name || r.name || r.id}</option>)}
                </select>
            </FF>
        </Modal>

        {/* Edit Modal */}
        <Modal open={modal.open && modal.mode === "edit"} onClose={close} title="Edit User" onSave={handleSaveUser} saveLabel={saving ? "Saving..." : "Save Changes"} width={600} t={t} isDark={isDark}>
            <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 14 }}>
                {isSuperAdmin
                    ? "Updates the Firestore profile. Changing Tenant ID will migrate all user data and update access permissions immediately."
                    : "Updates the Firestore profile. To change role/permissions in Firebase Auth, use \"Re-invite\" to re-send a new invite link with updated claims."}
            </p>
            <FF label="User ID" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.user_id}</div>
            </FF>
            <FF label="Auth UID (Firebase)" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", wordBreak: "break-all" }}>
                    {modal.data.auth_uid
                        ? modal.data.auth_uid
                        : (modal.data.id && !/^U\d+$/.test(modal.data.id) ? modal.data.id : "— (not linked to Firebase Auth)")}
                </div>
            </FF>
            {isSuperAdmin && !isSelectedRoleGlobal(modal.data.role_id) && (
                <FF label="Tenant ID" t={t}>
                    <select value={modal.data.tenantId || ""} onChange={e => setF("tenantId", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                        <option value="">— No tenant (global admin) —</option>
                        {TENANTS.map(ten => <option key={ten.id} value={ten.id} style={{ color: "#000" }}>{ten.id}{ten.name ? ` — ${ten.name}` : ""}</option>)}
                    </select>
                </FF>
            )}
            {isSelectedRoleGlobal(modal.data.role_id) && (
                <FF label="Tenant ID" t={t}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#22C55E", background: isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4", border: "1px solid rgba(34,197,94,0.35)", borderRadius: 9, padding: "10px 13px" }}>🌐 Global — Access to all tenants</div>
                </FF>
            )}
            <FF label="Full Name" t={t}><FIn value={modal.data.user_name || modal.data.name} onChange={e => setF("user_name", e.target.value)} t={t} /></FF>
            <FF label="Email Address" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} t={t} disabled /></FF>
            <FF label="Role" t={t}>
                <select value={modal.data.role_id || ""} onChange={e => setF("role_id", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    <option value="" disabled style={{ color: "#000" }}>Select a role...</option>
                    {ROLES.map(r => <option key={r.id || r.role_id} value={r.id || r.role_id} style={{ color: "#000" }}>{(r.id || r.role_id)} — {r.role_name || r.name || r.id}</option>)}
                </select>
            </FF>
            <FF label="Phone" t={t}><FIn value={modal.data.phone} onChange={e => setF("phone", e.target.value)} t={t} /></FF>
            <FF label="Notes" t={t}>
                <textarea
                    value={modal.data.notes || ""}
                    onChange={e => setF("notes", e.target.value)}
                    placeholder="Optional notes about this user..."
                    rows={3}
                    style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, resize: "vertical", boxSizing: "border-box" }}
                />
            </FF>
        </Modal>

        <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteUser} label="user" t={t} isDark={isDark} />
    </>);
}

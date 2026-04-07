import React, { useState, useEffect, useMemo } from "react";
import { db, functions } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ActBtns, Modal, FF, FIn, DelModal, Tooltip } from "../components";
import TanStackTable from "../components/TanStackTable";
import { useAuth } from "../AuthContext";
import { getUserProfileColumns } from "../components/UserProfilesTanStackConfig";

const PERMISSIONS_LIST = [
    "TENANT_CREATE", "TENANT_VIEW", "TENANT_UPDATE", "TENANT_DELETE",
    "USER_CREATE", "USER_INVITE", "USER_VIEW", "USER_UPDATE", "USER_DELETE",
    "PROJECT_CREATE", "PROJECT_VIEW", "PROJECT_UPDATE", "PROJECT_DELETE",
    "MEMBER_CREATE", "MEMBER_VIEW", "MEMBER_UPDATE", "MEMBER_DELETE",
    "INVESTMENT_CREATE", "INVESTMENT_VIEW", "INVESTMENT_UPDATE", "INVESTMENT_DELETE",
    "PAYMENT_SCHEDULE_CREATE", "PAYMENT_SCHEDULE_VIEW", "PAYMENT_SCHEDULE_UPDATE", "PAYMENT_SCHEDULE_DELETE",
    "FEE_CREATE", "FEE_VIEW", "FEE_UPDATE", "FEE_DELETE",
    "DIMENTION_CREATE", "DIMENTION_VIEW", "DIMENTION_UPDATE", "DIMENTION_DELETE",
    "REPORT_CREATE", "REPORT_VIEW", "REPORT_EXPORT", "REPORT_UPDATE", "REPORT_DELETE",
    "PLATFORM_TENANT_CREATE", "PLATFORM_TENANT_DELETE", "PLATFORM_TENANT_VIEW", "PLATFORM_TENANT_UPDATE",
    "CONTACT_CREATE", "CONTACT_VIEW", "CONTACT_UPDATE", "CONTACT_DELETE"
];

export default function PageUserProfiles({ t, isDark, USERS = [], ROLES = [], collectionPath = "", DIMENSIONS = [], tenantId = "", TENANTS = [], CONTACTS = [] }) {
    const { hasPermission, isSuperAdmin } = useAuth();
    const canCreate = isSuperAdmin || hasPermission("USER_PROFILE_CREATE") || hasPermission("USER_CREATE");
    const canInvite = isSuperAdmin || hasPermission("USER_PROFILE_CREATE") || hasPermission("USER_INVITE");
    const canUpdate = isSuperAdmin || hasPermission("USER_PROFILE_UPDATE") || hasPermission("USER_UPDATE");
    const canDelete = isSuperAdmin || hasPermission("USER_PROFILE_DELETE") || hasPermission("USER_DELETE");

    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [inviting, setInviting] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);

    const [sel, setSel] = useState(new Set());
    const [pageSize, setPageSize] = useState(20);

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

    const handleInviteUser = async () => {
        const d = modal.data;
        if (!d.email || !d.role_id) return;
        const emailExists = CONTACTS.some(p => p.email && p.email.toLowerCase() === d.email.toLowerCase());
        if (!emailExists) {
            alert("This email does not belong to any existing Contact. Please create a Contact record first on the Contacts page.");
            return;
        }
        setProcessing(true);
        setInviting(true);
        try {
            const resolvedTenantId = isSelectedRoleGlobal(d.role_id) ? "" : (d.inviteTenantId || tenantId || "");
            const inviteUserFn = httpsCallable(functions, "inviteUser");
            const result = await inviteUserFn({
                email: d.email,
                role: d.role_id,
                tenantId: resolvedTenantId,
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
            setProcessing(false);
        }
    };

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

    const handleDeleteUser = async () => {
        if (!delT) return;
        try {
            const deleteUserFn = httpsCallable(functions, "deleteUser");
            await deleteUserFn({ email: delT.email, docId: delT.id, tenantId });
        } catch (err) {
            console.error("Delete user error:", err);
            await deleteDoc(doc(db, collectionPath, delT.id));
        } finally {
            setDelT(null);
        }
    };

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
                    first_name: d.first_name || "",
                    last_name: d.last_name || "",
                    phone: d.phone || "",
                    notes: d.notes || ""
                });
            } else if (modal.mode === "edit" && d.id) {
                const payload = {
                    user_id: d.user_id || "",
                    user_name: d.user_name || d.name || "",
                    first_name: d.first_name || "",
                    last_name: d.last_name || "",
                    email: d.email || "",
                    role_id: d.role_id || "",
                    phone: d.phone || "",
                    notes: d.notes || "",
                    updated_at: serverTimestamp(),
                };
                await updateDoc(doc(db, collectionPath, d.id), payload);
                // Sync to global_users to keep data consistent
                const authUid = d.auth_uid || d.id;
                if (authUid && !/^U\d+$/.test(authUid)) {
                    await setDoc(doc(db, "global_users", authUid), {
                        first_name: d.first_name || "",
                        last_name: d.last_name || "",
                        email: d.email || "",
                        role: d.role_id || "",
                        last_updated: serverTimestamp()
                    }, { merge: true });
                }
            }
            close();
        } catch (err) {
            console.error("Save user error:", err);
            alert("Save failed: " + (err.message || "Unknown error"));
        } finally {
            setSaving(false);
        }
    };

    const permissions = { canUpdate, canDelete, canInvite };
    const columnDefs = useMemo(() => {
        return getUserProfileColumns(permissions, isDark, t, openEdit, setDelT, openResendInvite, ROLES, isSuperAdmin, tenantId);
    }, [permissions, isDark, t, ROLES, isSuperAdmin, tenantId]);

    return (<>
        {processing && (
            <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <div style={{ width: 44, height: 44, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.5px" }}>Processing Invitation...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )}

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
                {(canCreate || canInvite) && <Tooltip text="Send invitation to new user" t={t}><button className="primary-btn" onClick={openInvite} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>✉️ Invite User</button></Tooltip>}
            </div>
        </div>

        <div style={{ height: 'calc(100vh - 420px)', width: "100%", minHeight: '500px' }}>
            <TanStackTable
                data={USERS}
                columns={columnDefs}
                pageSize={pageSize}
                t={t}
                isDark={isDark}
                onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.id)))}
            />
        </div>

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
                <FF label="Invite to Tenant (Override)" t={t}>
                    <select value={modal.data.inviteTenantId || ""} onChange={e => setF("inviteTenantId", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font }}>
                        <option value="">Current Tenant ({tenantId})</option>
                        {TENANTS.map(ten => <option key={ten.id} value={ten.id} style={{ color: "#000" }}>{ten.name} ({ten.id})</option>)}
                    </select>
                </FF>
            )}
            <FF label="Internal Notes" t={t}><textarea value={modal.data.notes || ""} onChange={e => setF("notes", e.target.value)} placeholder="Private notes about this user..." style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", minHeight: 80, fontFamily: t.font, resize: "vertical" }} /></FF>
        </Modal>

        {/* Resend Invite Modal */}
        <Modal open={modal.open && modal.mode === "resend"} onClose={close} title="Re-send Invitation" onSave={handleResendInvite} saveLabel={inviting ? "Sending..." : "Send Verification Email ✉️"} width={480} t={t} isDark={isDark}>
            <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                User <strong>{modal.data.email}</strong> is currently Pending. This will re-trigger the verification email and generate a new secure link. No data will be modified.
            </p>
        </Modal>

        <Modal open={modal.open && modal.mode === "edit"} onClose={close} title="Edit User Profile" onSave={handleSaveUser} saveLabel={saving ? "Saving..." : "Save Changes"} width={520} t={t} isDark={isDark}>
            <FF label="User ID" t={t}><FIn value={modal.data.user_id} onChange={e => setF("user_id", e.target.value)} t={t} /></FF>
            <FF label="Auth UID (Firebase)" t={t}><FIn value={modal.data.auth_uid || modal.data.id} disabled t={t} /></FF>
            <FF label="Full Name" t={t}><FIn value={modal.data.user_name || modal.data.name} onChange={e => setF("user_name", e.target.value)} t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FF label="First Name" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="Jane" t={t} /></FF>
              <FF label="Last Name" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="Doe" t={t} /></FF>
            </div>
            <FF label="Email" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} t={t} /></FF>
            <FF label="Role" t={t}>
                <select value={modal.data.role_id || ""} onChange={e => setF("role_id", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    {ROLES.map(r => <option key={r.id || r.role_id} value={r.id || r.role_id} style={{ color: "#000" }}>{r.role_name || r.name || r.id}</option>)}
                </select>
            </FF>
            {isSuperAdmin && (
                <FF label="Tenant (Move User)" t={t}>
                    <select value={modal.data.tenantId || ""} onChange={e => setF("tenantId", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font }}>
                        {TENANTS.map(ten => <option key={ten.id} value={ten.id} style={{ color: "#000" }}>{ten.name} ({ten.id})</option>)}
                    </select>
                </FF>
            )}
            <FF label="Phone" t={t}><FIn value={modal.data.phone || ""} onChange={e => setF("phone", e.target.value)} t={t} /></FF>
            <FF label="Internal Notes" t={t}><textarea value={modal.data.notes || ""} onChange={e => setF("notes", e.target.value)} placeholder="Private notes..." style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", minHeight: 80, fontFamily: t.font, resize: "vertical" }} /></FF>
        </Modal>

        <DelModal open={!!delT} onClose={() => setDelT(null)} onDel={handleDeleteUser} title="Delete User?" t={t}>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.textMuted }}>
                Are you sure? This will remove the Firestore profile for <strong>{delT?.email}</strong> and attempt to delete their Firebase Authentication login.
                <br /><br />
                <span style={{ color: "#EF4444", fontWeight: 600 }}>⚠️ This action is permanent and cannot be undone.</span>
            </p>
        </DelModal>
    </>);
}

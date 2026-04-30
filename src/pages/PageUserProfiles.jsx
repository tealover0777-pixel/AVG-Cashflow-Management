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

export default function PageUserProfiles({ t, isDark, USERS = [], GLOBAL_USERS = [], ROLES = [], collectionPath = "", DIMENSIONS = [], tenantId = "", TENANTS = [], CONTACTS = [] }) {
    const { hasPermission, isSuperAdmin, user, profile, isGlobalRole } = useAuth();
    const canCreate = isSuperAdmin || hasPermission("USER_PROFILE_CREATE") || hasPermission("USER_CREATE") || profile?.role_id === "R10005";
    const canInvite = isSuperAdmin || hasPermission("USER_PROFILE_CREATE") || hasPermission("USER_INVITE") || profile?.role_id === "R10005";
    const canUpdate = isSuperAdmin || hasPermission("USER_PROFILE_UPDATE") || hasPermission("USER_UPDATE") || profile?.role_id === "R10005";
    const canDelete = isSuperAdmin || hasPermission("USER_PROFILE_DELETE") || hasPermission("USER_DELETE") || profile?.role_id === "R10005";

    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [inviting, setInviting] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);
    const [inviteConfirm, setInviteConfirm] = useState(null);
    const [toast, setToast] = useState(null); // { msg, type: 'success'|'error'|'info' }

    const showToast = (msg, type = "info") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const [sel, setSel] = useState(new Set());
    const [pageSize, setPageSize] = useState(20);

    useEffect(() => {
        if (DIMENSIONS && !DIMENSIONS.some(d => d.name === "Permissions")) {
            setDoc(doc(db, "dimensions", "Permissions"), { name: "Permissions", items: PERMISSIONS_LIST, category: "Permissions" })
                .catch(e => console.error("Auto-seed permissions failed.", e));
        }
    }, [DIMENSIONS]);

    const isSelectedRoleGlobal = (roleId) => {
        const found = ROLES.find(r => (r.id || r.role_id) === roleId);
        return found && found.IsGlobal === true;
    };

    const getRoleInfo = (id) => {
        const r = ROLES.find(x => (x.id || x.role_id) === id);
        return r ? { name: r.role_name || r.name || id, id } : { name: "Member", id: "R10001" };
    };

    // Merge tenant users with global users data and include standalone Global users
    const mergedUsers = useMemo(() => {
        // 1. Process Tenant Users (from the 'users' collection or collection group)
        const tUsers = USERS.map(u => {
            const globalUser = GLOBAL_USERS.find(gu =>
                (u.auth_uid && gu.id === u.auth_uid) ||
                (u.email && gu.email && gu.email.toLowerCase() === u.email.toLowerCase())
            );
            return {
                ...u,
                docId: u._path || u.docId || u.id,
                first_name: globalUser?.first_name || u.first_name || "",
                last_name: globalUser?.last_name || u.last_name || "",
                displayName: globalUser?.displayName || u.displayName || "",
                role_id: u.role_id || globalUser?.role || ""
            };
        });

        // 2. Add Global Users who aren't already represented in the tenant-user list
        const missingGlobal = GLOBAL_USERS.filter(gu => {
            // Only include if they have a Global Role
            if (!isSelectedRoleGlobal(gu.role)) return false;

            return !tUsers.some(tu => 
                (tu.auth_uid && tu.auth_uid === gu.id) || 
                (tu.email && gu.email && tu.email.toLowerCase() === gu.email.toLowerCase())
            );
        }).map(gu => ({
            ...gu,
            id: gu.id,
            docId: gu.id,
            auth_uid: gu.id,
            first_name: gu.first_name || "",
            last_name: gu.last_name || "",
            email: gu.email || "",
            role_id: gu.role || "",
            status: gu.status || "Active",
            tenant_id: "GLOBAL",
            _isGlobalOnly: true
        }));

        return [...tUsers, ...missingGlobal];
    }, [USERS, GLOBAL_USERS]);

    // Filter logic: Include all unless it's the secret admin (for non-owners)
    const filteredUsers = useMemo(() => {
        const currentUserEmail = user?.email?.toLowerCase();
        const isSecretAdmin = currentUserEmail === 'kyuahn@yahoo.com';

        return mergedUsers.filter(u => {
            // Filter out secret admin from other users
            if (!isSecretAdmin && u.email?.toLowerCase() === 'kyuahn@yahoo.com') {
                return false;
            }
            // Requirements: 
            // 2. If "Consolidated" selected, display all users for every tenant + Global users
            // 3. If specific tenant selected, display users from that tenant + Global users
            // Since mergedUsers already contains (tenant users + missing global), we show all.
            return true;
        });
    }, [mergedUsers, user]);

    const nextUserId = useMemo(() => {
        if (filteredUsers.length === 0) return "U10001";
        const maxNum = Math.max(...filteredUsers.map(u => { const m = String(u.user_id || "").match(/^U(\d+)$/); return m ? Number(m[1]) : 0; }));
        return "U" + String(maxNum + 1).padStart(5, "0");
    }, [filteredUsers]);

    const openInvite = () => setModal({ open: true, mode: "invite", data: { email: "", role_id: "", first_name: "", last_name: "", inviteUser: true } });
    const openEdit = r => {
        const tid = r.tenantId || r.tenant_id || r.Tenant_ID || tenantId;
        setModal({ open: true, mode: "edit", data: { ...r, role_id: r.role_id || "", tenantId: tid, _origTenantId: tid } });
    };
    const openResendInvite = r => setModal({ open: true, mode: "resend", data: { email: r.email, role_id: r.role_id || "", first_name: r.first_name || "", last_name: r.last_name || "", phone: r.phone || "", notes: r.notes || "", user_id: r.user_id || "" } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    const handleInviteUser = async () => {
        const d = modal.data;
        if (!d.email || !d.role_id) return;
        const emailExists = CONTACTS.some(p => p.email && p.email.toLowerCase() === d.email.toLowerCase());
        if (!emailExists) {
            showToast("This email does not belong to any existing Contact. Please create a Contact record first on the Contacts page.", "error");
            return;
        }
        setInviteConfirm({ ...d, tenantId: isSelectedRoleGlobal(d.role_id) ? "" : (d.inviteTenantId || tenantId || "") });
    };

    const executeInvite = async () => {
        setProcessing(true);
        setInviting(true);
        try {
            const inviteUserFn = httpsCallable(functions, "inviteUser");
            const party = inviteConfirm;
            let firstName = party.first_name || "";
            let lastName = party.last_name || "";

            if (!firstName && party.name) {
                const nameParts = (party.name || "").trim().split(/\s+/);
                firstName = nameParts[0] || "";
                lastName = nameParts.slice(1).join(" ") || "";
            }

            const roleInfo = getRoleInfo(party.role_id || party.role);
            const result = await inviteUserFn({
                email: party.email,
                role: party.role_id || party.role,
                tenantId: party.tenantId || "",
                user_id: nextUserId,
                first_name: firstName,
                last_name: lastName,
                phone: party.phone || "",
                notes: `Created from User Profiles page — ${party.email}`,
                inviteUser: party.inviteUser ?? true
            });
            close();
            setInviteConfirm(null);
            setInviteResult({ email: party.email, user_id: result.data.user_id, emailSent: result.data.emailSent, link: result.data.link, roleName: roleInfo.name });
        } catch (err) {
            console.error("Invite error:", err);
            showToast("Invite failed: " + (err.message || "Unknown error"), "error");
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
            showToast("Re-send failed: " + (err.message || "Unknown error"), "error");
        } finally {
            setInviting(false);
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
                    first_name: d.first_name || "",
                    last_name: d.last_name || "",
                    phone: d.phone || "",
                    notes: d.notes || ""
                });
            } else if (modal.mode === "edit" && d.id) {
                // Check for Ownership transfer
                const isPromotingToOwner = d.role_id === "R10005";
                const wasAlreadyOwner = profile?.role_id === "R10005" || profile?.role === "R10005";

                if (isPromotingToOwner) {
                    if (!wasAlreadyOwner && !isSuperAdmin) {
                        showToast("Only the current Owner or a Super Admin can assign a new Owner.", "error");
                        setSaving(false);
                        return;
                    }

                    // Find current owner to demote
                    const existingOwner = USERS.find(u => u.role_id === "R10005" && u.id !== d.id);
                    if (existingOwner) {
                        await updateDoc(doc(db, collectionPath, existingOwner.id), { role_id: "R10004", updated_at: serverTimestamp() });
                        await updateDoc(doc(db, "global_users", existingOwner.auth_uid || existingOwner.id), { role: "R10004", last_updated: serverTimestamp() });
                    }
                    // Update tenant doc
                    await updateDoc(doc(db, "tenants", tenantId), { owner: d.auth_uid || d.id, owner_id: d.auth_uid || d.id, updated_at: serverTimestamp() });
                }

                const payload = {
                    user_id: String(d.user_id || ""),
                    first_name: String(d.first_name || ""),
                    last_name: String(d.last_name || ""),
                    email: String(d.email || ""),
                    role_id: String(d.role_id || ""),
                    status: String(d.status || "Active"),
                    phone: String(d.phone || ""),
                    notes: String(d.notes || ""),
                    updated_at: serverTimestamp(),
                };
                await updateDoc(doc(db, collectionPath, d.id), payload);
                const authUid = String(d.auth_uid || d.id);
                if (authUid && !/^U\d+$/.test(authUid)) {
                    const globalData = {
                        user_id: String(d.user_id || ""),
                        first_name: String(d.first_name || ""),
                        last_name: String(d.last_name || ""),
                        email: String(d.email || ""),
                        phone: String(d.phone || ""),
                        role: String(d.role_id || ""),
                        status: String(d.status || "Active"),
                        notes: String(d.notes || ""),
                        last_updated: serverTimestamp()
                    };
                    await setDoc(doc(db, "global_users", authUid), globalData, { merge: true });
                }

                // If this is the owner, update the tenant document too for Platform Tenant Admin visibility
                if (d.role_id === "R10005") {
                    await updateDoc(doc(db, "tenants", tenantId), {
                        tenant_email: String(d.email || ""),
                        tenant_phone: String(d.phone || ""),
                        Notes: String(d.notes || ""),
                        updated_at: serverTimestamp()
                    });
                }
            }
            close();
            showToast("User saved successfully.", "success");
        } catch (err) {
            console.error("Save user error:", err);
            showToast("Save failed: " + (err.message || "Unknown error"), "error");
        } finally {
            setSaving(false);
        }
    };

    const permissions = { canUpdate, canDelete, canInvite };
    const columnDefs = useMemo(() => {
        return getUserProfileColumns(permissions, isDark, t, openEdit, setDelT, openResendInvite, ROLES);
    }, [permissions, isDark, t, ROLES]);

    return (<>
        {/* Toast Notification */}
        {toast && (
            <div style={{
                position: "fixed", bottom: 28, right: 28, zIndex: 10000,
                background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : toast.type === "error" ? (isDark ? "#2d0a0a" : "#fef2f2") : (isDark ? "#1e1b4b" : "#eff6ff"),
                border: `1px solid ${toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : "#60a5fa"}`,
                color: toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : "#60a5fa",
                borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 500,
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)", maxWidth: 420, lineHeight: 1.5,
                display: "flex", alignItems: "center", gap: 10
            }}>
                <span>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
                <span>{toast.msg}</span>
                <span onClick={() => setToast(null)} style={{ marginLeft: "auto", cursor: "pointer", opacity: 0.6, fontSize: 16 }}>✕</span>
            </div>
        )}


        {/* Invite Confirm Modal */}
        <Modal open={!!inviteConfirm} onClose={() => setInviteConfirm(null)} title="Confirm User Creation" onSave={executeInvite} saveLabel={processing ? "Processing..." : "Create User"} width={480} t={t} isDark={isDark} loading={processing}>
            <div style={{ fontSize: 13.5, color: t.text, marginBottom: 12, fontWeight: 600 }}>Create {inviteConfirm?.first_name || (inviteConfirm?.name || "").split(" ")[0] || "User"}?</div>
            <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>
                {inviteConfirm?.email} will be invited as a <strong>{getRoleInfo(inviteConfirm?.role_id).name}</strong>.
            </div>
            <div style={{ fontSize: 12, color: t.textSubtle, marginTop: 12, padding: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#F9F8F6", borderRadius: 8, border: `1px solid ${t.surfaceBorder}` }}>
                This will create a secure profile {inviteConfirm?.inviteUser ? "and send a verification email" : ""}. They will be addressed as <strong>{inviteConfirm?.first_name || (inviteConfirm?.name || "").split(" ")[0] || "User"}</strong> in the greeting.
            </div>
        </Modal>

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
                        <strong>{inviteResult.email}</strong> has been invited as a {inviteResult.roleName || "User"}.
                    </p>
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
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage Users of your company</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
                {(canCreate || canInvite) && <Tooltip text="Create a new user profile" t={t}><button className="primary-btn" onClick={openInvite} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>➕ Create User</button></Tooltip>}
            </div>
        </div>

        <div style={{ height: 'calc(100vh - 420px)', width: "100%", minHeight: '500px' }}>
            <TanStackTable
                data={filteredUsers}
                columns={columnDefs}
                pageSize={pageSize}
                t={t}
                isDark={isDark}
                onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.docId || r.id)))}
            />
        </div>

        {/* Invite Modal */}
        <Modal open={modal.open && modal.mode === "invite"} onClose={close} title="Create New User" onSave={handleInviteUser} saveLabel={inviting ? "Processing..." : "Create User"} width={520} t={t} isDark={isDark}>
            <p style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
                This will create a user in your organization responsible for monitoring operations and managing users associated with your business processes.
            </p>
            <FF label="Upcoming User ID" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{nextUserId}</div>
            </FF>
            <FF label="Email Address" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="user@company.com" t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FF label="First Name (optional)" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="Jane" t={t} /></FF>
                <FF label="Last Name (optional)" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="Doe" t={t} /></FF>
            </div>
            <FF label="Phone (optional)" t={t}><FIn value={modal.data.phone || ""} onChange={e => setF("phone", e.target.value)} placeholder="+1 555 000 0000" t={t} /></FF>
            <FF label="Role" t={t}>
                <select value={modal.data.role_id || ""} onChange={e => setF("role_id", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    <option value="" disabled style={{ color: "#000" }}>Select a role...</option>
                    {ROLES.filter(r => isGlobalRole || isSuperAdmin || (!isSelectedRoleGlobal(r.id || r.role_id) && (r.id || r.role_id) !== "R10005")).map(r => (
                        <option key={r.id || r.role_id} value={r.id || r.role_id} style={{ color: "#000" }}>{r.role_name || r.name || r.id}</option>
                    ))}
                </select>
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
            <FF label="Internal Notes" t={t}><textarea value={modal.data.notes || ""} onChange={e => setF("notes", e.target.value)} placeholder="Private notes about this user..." style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", minHeight: 80, fontFamily: t.font, resize: "vertical" }} /></FF>
        </Modal>

        {/* Resend Invite Modal */}
        <Modal open={modal.open && modal.mode === "resend"} onClose={close} title="Invite / Re-send Verification" onSave={handleResendInvite} saveLabel={inviting ? "Sending..." : "Send Verification Email ✉️"} width={480} t={t} isDark={isDark}>
            <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                Sending this will re-trigger the verification email for <strong>{modal.data.email}</strong> and generate a new secure sign-in link. This follows your high-fidelity security protocols and does not modify any existing profile data.
            </p>
        </Modal>

        <Modal open={modal.open && modal.mode === "edit"} onClose={close} title="Edit User Profile" onSave={handleSaveUser} saveLabel={saving ? "Saving..." : "Save Changes"} width={520} t={t} isDark={isDark}>
            <FF label="User ID" t={t}><FIn value={modal.data.user_id} onChange={e => setF("user_id", e.target.value)} t={t} /></FF>
            <FF label="Auth UID (Firebase)" t={t}><FIn value={modal.data.auth_uid || modal.data.id} disabled t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FF label="First Name" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="Jane" t={t} /></FF>
                <FF label="Last Name" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="Doe" t={t} /></FF>
            </div>
            <FF label="Email" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} t={t} /></FF>
            <FF label="Role" t={t}>
                <select value={modal.data.role_id || ""} onChange={e => setF("role_id", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    {ROLES.filter(r => isGlobalRole || isSuperAdmin || (!isSelectedRoleGlobal(r.id || r.role_id) && (r.id || r.role_id) !== "R10005")).map(r => (
                        <option key={r.id || r.role_id} value={r.id || r.role_id} style={{ color: "#000" }}>{r.role_name || r.name || r.id}</option>
                    ))}
                </select>
            </FF>
            <FF label="Status" t={t}>
                <select value={modal.data.status || "Active"} onChange={e => setF("status", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    <option value="Active" style={{ color: "#000" }}>Active</option>
                    <option value="Pending" style={{ color: "#000" }}>Pending</option>
                    <option value="Inactive" style={{ color: "#000" }}>Inactive</option>
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

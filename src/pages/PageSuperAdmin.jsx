import React, { useState, useMemo } from "react";
import { db, functions } from "../firebase";
import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, deleteField } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useFirestoreCollection } from "../useFirestoreCollection";
import { useAuth } from "../AuthContext";
import { Modal, FF, FIn, DelModal } from "../components";
import TanStackTable from "../components/TanStackTable";
import { getSuperAdminColumns } from "../components/SuperAdminTanStackConfig";

export default function PageSuperAdmin({ t, isDark, ROLES = [], TENANTS = [] }) {
    const { hasPermission, isSuperAdmin, user } = useAuth();
    const canView = isSuperAdmin || hasPermission("PlatformAdmin_view");
    const canCreate = isSuperAdmin || hasPermission("PlatformAdmin_create");
    const canUpdate = isSuperAdmin || hasPermission("PlatformAdmin_update");
    const canDelete = isSuperAdmin || hasPermission("PlatformAdmin_delete");
    
    const US_STATES = [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
        "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
        "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
    ];
    
    // Fetch global users list
    const { data: globalUsers = [], loading, error } = useFirestoreCollection("global_users");
    
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [invitingId, setInvitingId] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [resendConfirm, setResendConfirm] = useState(null);
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

    const getRoleName = (role_id) => {
        const found = ROLES.find(r => r.id === role_id || r.role_id === role_id);
        return found ? (found.role_name || found.name || role_id) : null;
    };
    const getTenantName = (tid) => {
        const found = TENANTS.find(tn => tn.id === tid);
        return found ? (found.name || tid) : null;
    };
    const isRoleGlobal = (roleId) => {
        const found = ROLES.find(r => (r.id || r.role_id) === roleId);
        return found && found.IsGlobal === true;
    };

    const mergedUsers = useMemo(() => {
        return globalUsers.map(gu => ({
            ...gu,
            id: gu.id,
            docId: gu.id,
            auth_uid: gu.id,
            first_name: gu.first_name || "",
            last_name: gu.last_name || "",
            email: gu.email || "",
            role: gu.role || "",
            status: gu.status || "Active",
            tenantId: gu.tenantId || "GLOBAL",
            _isGlobalOnly: true
        }));
    }, [globalUsers]);

    const filteredUsers = useMemo(() => {
        return mergedUsers.filter(u => {
            // Requirement: display all global users only
            return isRoleGlobal(u.role);
        });
    }, [mergedUsers, ROLES]);

    // Get role options from ROLES collection
    const roleOptions = useMemo(() => {
        return ROLES.filter(r => {
            const id = r.id || r.role_id;
            return ["R10006", "R10007", "R10008", "R10009", "R10010"].includes(id);
        }).map(r => {
            const id = r.id || r.role_id;
            const name = r.role_name || r.name || id;
            return {
                id: id,
                display: `${id} - ${name}`
            };
        }).sort((a, b) => a.display.localeCompare(b.display));
    }, [ROLES]);

    const openInvite = () => setModal({ open: true, mode: "invite", data: { email: "", first_name: "", last_name: "", role: "", tenantId: "", street1: "", street2: "", city: "", state: "", zip: "", notes: "" } });
    const openEdit = r => {
        // Use auth_uid or id for global_users key
        const targetUid = r.auth_uid || r.uid || r.id;
        setModal({ open: true, mode: "edit", data: { ...r, uid: targetUid } });
    };
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => {
        setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));
    };

    // Invite user via Cloud Function
    const handleInviteUser = async () => {
        const d = modal.data;
        const missing = [];
        if (!d.first_name?.trim()) missing.push("First Name");
        if (!d.last_name?.trim()) missing.push("Last Name");
        if (!d.email?.trim()) missing.push("Email Address");

        if (missing.length > 0) {
            showToast(`Cannot invite user. Missing mandatory field(s): ${missing.join(", ")}`, "error");
            return;
        }

        if (!d.role) {
            showToast("Cannot invite user. Please select a Global Role.", "error");
            return;
        }

        setInviting(true);
        try {
            const checkEmailFn = httpsCallable(functions, "checkEmailExists");
            const emailRes = await checkEmailFn({ email: d.email });
            if (emailRes.data.exists) {
                showToast("This email is already in use by another user.", "error");
                setInviting(false);
                return;
            }

            const inviteUserFn = httpsCallable(functions, "inviteUser");
            const result = await inviteUserFn({
                email: d.email,
                role: d.role,
                tenantId: d.tenantId || "",
                first_name: d.first_name || "",
                last_name: d.last_name || "",
                phone: d.phone || "",
                notes: d.notes || "",
                street1: d.street1 || "",
                street2: d.street2 || "",
                city: d.city || "",
                state: d.state || "",
                zip: d.zip || ""
            });
            close();
            setInviteResult({ link: result.data.link, email: d.email, emailSent: result.data.emailSent, roleName: d.role, user_id: result.data.user_id });
        } catch (err) {
            console.error("Invite error:", err);
            showToast("Invite failed: " + (err.message || "Unknown error"), "error");
        } finally {
            setInviting(false);
        }
    };

    // Invite user from row action
    const handleRowInvite = async (user) => {
        if (!user.email || !user.role) return;
        setProcessing(true);
        setInvitingId(user.id);
        try {
            const inviteUserFn = httpsCallable(functions, "inviteUser");
            
            let fn = user.first_name || "";
            let ln = user.last_name || "";
            if (!fn && user.name) {
                const parts = user.name.trim().split(/\s+/);
                fn = parts[0] || "";
                ln = parts.slice(1).join(" ") || "";
            }

            const result = await inviteUserFn({ 
                email: user.email, 
                role: user.role, 
                tenantId: user.tenantId || "",
                first_name: fn,
                last_name: ln
            });
            setInviteResult({ link: result.data.link, email: user.email, emailSent: result.data.emailSent, roleName: user.role, user_id: result.data.user_id });
        } catch (err) {
            console.error("Row invite error:", err);
            showToast("Invite failed: " + (err.message || "Unknown error"), "error");
        } finally {
            setInvitingId(null);
            setProcessing(false);
        }
    };

    // Edit existing role/tenant mapping in global_users + sync to tenant user doc
    const handleSaveUser = async () => {
        const d = modal.data;
        if (!d.uid) {
            showToast("Missing User ID (UID). Cannot save.", "error");
            return;
        }

        const missing = [];
        if (!d.first_name?.trim()) missing.push("First Name");
        if (!d.last_name?.trim()) missing.push("Last Name");
        if (!d.email?.trim()) missing.push("Email Address");
        if (missing.length > 0) {
            showToast(`Cannot save user. Missing mandatory field(s): ${missing.join(", ")}`, "error");
            return;
        }

        setProcessing(true);

        try {
            const checkEmailFn = httpsCallable(functions, "checkEmailExists");
            const emailRes = await checkEmailFn({ email: d.email });
            if (emailRes.data.exists && emailRes.data.uid !== d.uid) {
                showToast("This email is already in use by another user.", "error");
                setProcessing(false);
                return;
            }
        } catch (err) {
            console.error("Check email error:", err);
        }

        // Ensure all values are plain strings, not Firestore objects
        const isGlobal = isRoleGlobal(d.role);
        const tid = isGlobal ? "GLOBAL" : String(d.tenantId || "");
        
        const payload = {
            email: String(d.email || ""),
            role: String(d.role || ""),
            tenantId: tid,
            status: String(d.status || "Active"),
            updated_at: serverTimestamp(),
        };

        if (isGlobal) {
            payload.first_name = String(d.first_name || "");
            payload.last_name = String(d.last_name || "");
            payload.phone = String(d.phone || "");
            payload.notes = String(d.notes || "");
            payload.street1 = String(d.street1 || "");
            payload.street2 = String(d.street2 || "");
            payload.city = String(d.city || "");
            payload.state = String(d.state || "");
            payload.zip = String(d.zip || "");
        } else {
            // Symmetrical Structure: Strip detailed profile fields for tenant users
            payload.first_name = deleteField();
            payload.last_name = deleteField();
            payload.phone = deleteField();
            payload.notes = deleteField();
            payload.street1 = deleteField();
            payload.street2 = deleteField();
            payload.city = deleteField();
            payload.state = deleteField();
            payload.zip = deleteField();
            payload.user_id = String(d.user_id || d.id || "");
            payload.contact_id = deleteField();
        }

        try {
            await setDoc(doc(db, "global_users", d.uid), payload, { merge: true });
            // Sync to tenant user doc if it's a real tenant (not GLOBAL)
            if (tid && tid !== "GLOBAL") {
                const q = query(collection(db, `tenants/${tid}/users`), where("auth_uid", "==", d.uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    await updateDoc(snap.docs[0].ref, {
                        first_name: String(d.first_name || ""),
                        last_name: String(d.last_name || ""),
                        email: String(d.email || ""),
                        role_id: String(d.role || ""),
                        phone: String(d.phone || ""),
                        notes: String(d.notes || ""),
                        street1: String(d.street1 || ""),
                        street2: String(d.street2 || ""),
                        city: String(d.city || ""),
                        state: String(d.state || ""),
                        zip: String(d.zip || ""),
                        updated_at: serverTimestamp()
                    });
                }
            }
            close();
        } catch (err) {
            console.error("Save global user error:", err);
            showToast("Save failed: " + (err.message || "Unknown error"), "error");
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!delT) return;
        try {
            const deleteUserFn = httpsCallable(functions, "deleteUser");
            await deleteUserFn({
                email: delT.email,
                docId: delT.id,
                tenantId: delT.tenantId || ""
            });
            setDelT(null);
        } catch (err) {
            console.error("Delete global user error:", err);
            showToast("Delete failed: " + (err.message || "Unknown error"), "error");
        }
    };

    const permissions = { canUpdate, canDelete, canCreate };
    const columnDefs = useMemo(() => {
        return getSuperAdminColumns(permissions, isDark, t, openEdit, setDelT, getRoleName, getTenantName, (user) => setResendConfirm(user), invitingId, ROLES);
    }, [permissions, isDark, t, ROLES, TENANTS, invitingId]);

    if (!canView) return <div style={{ padding: 40, color: t.textMuted }}>You don't have permission to view this page.</div>;
    if (loading) return <div style={{ padding: 40, color: t.textMuted }}>Loading global users...</div>;
    if (error) return <div style={{ padding: 40, color: "red" }}>Error loading users: {error.message}</div>;

    return (<>
        {toast && (
            <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
                <span>{toast.type === "success" ? "✅" : "❌"}</span>
                <span>{toast.msg}</span>
                <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
            </div>
        )}
        {/* Full-screen Loading Overlay */}
        {processing && (
            <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <div style={{ width: 44, height: 44, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.5px" }}>Generating Invite Link...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )}

        <Modal
            open={!!resendConfirm}
            onClose={() => setResendConfirm(null)}
            title="Invite / Re-send Verification"
            onSave={() => { const u = resendConfirm; setResendConfirm(null); handleRowInvite(u); }}
            saveLabel="Send Verification Email ✉️"
            width={480} t={t} isDark={isDark}
        >
            {resendConfirm && (
                <p style={{ fontSize: 14, color: t.text, lineHeight: 1.6, margin: 0 }}>
                    Sending this will re-trigger the verification email for{" "}
                    <strong>{resendConfirm.email}</strong> and generate a new secure sign-in link.
                    This follows your high-fidelity security protocols and does not modify any existing profile data.
                </p>
            )}
        </Modal>

        <Modal
            open={!!inviteResult}
            onClose={() => { setInviteResult(null); setLinkCopied(false); }}
            title={inviteResult?.emailSent ? "Invitation Sent" : "User Created"}
            onSave={inviteResult?.link ? () => { navigator.clipboard.writeText(inviteResult.link); setLinkCopied(true); } : null}
            saveLabel={linkCopied ? "✅ Copied!" : "📋 Copy Link"}
            width={520} t={t} isDark={isDark}
        >
            {inviteResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", borderRadius: 10, background: inviteResult.emailSent ? (isDark ? "rgba(34,197,94,0.08)" : "#F0FDF4") : (isDark ? "rgba(239,68,68,0.08)" : "#FEF2F2"), border: `1px solid ${inviteResult.emailSent ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                        <span style={{ fontSize: 28, lineHeight: 1 }}>{inviteResult.emailSent ? "📧" : "❌"}</span>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: inviteResult.emailSent ? "#16a34a" : "#dc2626", marginBottom: 4 }}>
                                {inviteResult.emailSent ? "Email sent successfully" : "Email could not be sent"}
                            </div>
                            <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
                                {inviteResult.emailSent
                                    ? <><strong>{inviteResult.email}</strong> has been invited as <strong>{inviteResult.roleName || "User"}</strong>. A password-reset link has been emailed — you can also copy it below.</>
                                    : <>User <strong>{inviteResult.email}</strong> was created as <strong>{inviteResult.roleName || "User"}</strong> but the invitation email failed. Copy the link below and share it manually.</>}
                            </div>
                        </div>
                    </div>
                    {inviteResult.user_id && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, color: t.textMuted, whiteSpace: "nowrap" }}>User ID</span>
                            <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: t.accent, background: isDark ? "rgba(255,255,255,0.08)" : "#F0F9FF", padding: "3px 10px", borderRadius: 6 }}>{inviteResult.user_id}</span>
                        </div>
                    )}
                    {inviteResult.link && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                {inviteResult.emailSent ? "Password Reset Link (also emailed)" : "Invitation Link"}
                            </div>
                            <div style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "12px 14px", fontFamily: t.mono, fontSize: 11.5, wordBreak: "break-all", color: t.accent, lineHeight: 1.6 }}>
                                {inviteResult.link}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>

        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Platform User Admin</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage global platform users and administrative access</p>
            </div>
            {canCreate && <button className="primary-btn" onClick={openInvite} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>✉️ Invite Global User</button>}
        </div>

        <div style={{ height: 'calc(100vh - 220px)', width: "100%" }}>
            <TanStackTable
                data={filteredUsers}
                columns={columnDefs}
                pageSize={20}
                t={t}
                isDark={isDark}
                rowStyle={(r) => {
                    if (!r.first_name?.trim() || !r.last_name?.trim() || !r.email?.trim()) {
                        return { background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 226, 226, 0.7)' };
                    }
                    return {};
                }}
            />
        </div>

        {/* Edit Modal */}
        <Modal open={modal.open && modal.mode === "edit"} onClose={close} title="Edit User Profile" onSave={handleSaveUser} saveLabel={processing ? "Saving..." : "Save Changes"} width={520} t={t} isDark={isDark}>
            <FF label="Auth UID (Firebase)" t={t}><FIn value={modal.data.uid} disabled t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FF label="First Name" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="Jane" t={t} /></FF>
              <FF label="Last Name" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="Doe" t={t} /></FF>
            </div>
            <FF label="Email" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} t={t} /></FF>
            <FF label="Global Role" t={t}>
                <select value={modal.data.role || ""} onChange={e => setF("role", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    <option value="" disabled style={{ color: "#000" }}>Select a role...</option>
                    {roleOptions.map(r => <option key={r.id} value={r.id} style={{ color: "#000" }}>{r.display}</option>)}
                </select>
            </FF>
            <FF label="Status" t={t}>
                <select value={modal.data.status || "Active"} onChange={e => setF("status", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    <option value="Active" style={{ color: "#000" }}>Active</option>
                    <option value="Pending" style={{ color: "#000" }}>Pending</option>
                    <option value="Inactive" style={{ color: "#000" }}>Inactive</option>
                </select>
            </FF>
            <FF label="Tenant Assignment" t={t}>
                {!isRoleGlobal(modal.data.role) ? (
                    <select value={modal.data.tenantId || ""} onChange={e => setF("tenantId", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                        <option value="">No Tenant</option>
                        <option value="GLOBAL">Platform Company (GLOBAL)</option>
                        {TENANTS.map(tn => <option key={tn.id} value={tn.id} style={{ color: "#000" }}>{tn.name} ({tn.id})</option>)}
                    </select>
                ) : (
                    <div style={{ padding: "10px 13px", borderRadius: 9, background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6", fontSize: 13, color: t.text, fontWeight: 600, border: `1px solid ${t.surfaceBorder}` }}>User belongs to Platform Company (Global Role)</div>
                )}
            </FF>
            <FF label="Phone" t={t}><FIn value={modal.data.phone || ""} onChange={e => setF("phone", e.target.value)} placeholder="+1 555 000 0000" t={t} /></FF>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
              <FF label="Street 1" t={t}><FIn value={modal.data.street1 || ""} onChange={e => setF("street1", e.target.value)} placeholder="123 Main St" t={t} /></FF>
              <FF label="Street 2" t={t}><FIn value={modal.data.street2 || ""} onChange={e => setF("street2", e.target.value)} placeholder="Apt 4B" t={t} /></FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16 }}>
              <FF label="City" t={t}><FIn value={modal.data.city || ""} onChange={e => setF("city", e.target.value)} placeholder="New York" t={t} /></FF>
              <FF label="State" t={t}>
                <select value={modal.data.state || ""} onChange={e => setF("state", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font }}>
                    <option value="">Select...</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FF>
              <FF label="Zip" t={t}><FIn value={modal.data.zip || ""} onChange={e => setF("zip", e.target.value)} placeholder="10001" t={t} /></FF>
            </div>
            <FF label="Notes" t={t}><textarea value={modal.data.notes || ""} onChange={e => setF("notes", e.target.value)} placeholder="Private notes..." style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", minHeight: 80, fontFamily: t.font, resize: "vertical" }} /></FF>
        </Modal>

        {/* Invite Modal */}
        <Modal open={modal.open && modal.mode === "invite"} onClose={close} title="Invite Global User" onSave={handleInviteUser} saveLabel={inviting ? "Inviting..." : "Invite User"} width={520} t={t} isDark={isDark}>
            <FF label="Email Address" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="user@example.com" t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FF label="First Name" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="Jane" t={t} /></FF>
              <FF label="Last Name" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="Doe" t={t} /></FF>
            </div>
            <FF label="Global Role" t={t}>
                <select value={modal.data.role || ""} onChange={e => setF("role", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    <option value="" disabled style={{ color: "#000" }}>Select a role...</option>
                    {roleOptions.map(r => <option key={r.id} value={r.id} style={{ color: "#000" }}>{r.display}</option>)}
                </select>
            </FF>
            <FF label="Status" t={t}>
                <select value={modal.data.status || "Active"} onChange={e => setF("status", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                    <option value="Active" style={{ color: "#000" }}>Active</option>
                    <option value="Pending" style={{ color: "#000" }}>Pending</option>
                    <option value="Inactive" style={{ color: "#000" }}>Inactive</option>
                </select>
            </FF>
            <FF label="Tenant Assignment" t={t}>
                {!isRoleGlobal(modal.data.role) ? (
                    <select value={modal.data.tenantId || ""} onChange={e => setF("tenantId", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font, appearance: "none" }}>
                        <option value="">No Tenant</option>
                        <option value="GLOBAL">Platform Company (GLOBAL)</option>
                        {TENANTS.map(tn => <option key={tn.id} value={tn.id} style={{ color: "#000" }}>{tn.name} ({tn.id})</option>)}
                    </select>
                ) : (
                    <div style={{ padding: "10px 13px", borderRadius: 9, background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6", fontSize: 13, color: t.text, fontWeight: 600, border: `1px solid ${t.surfaceBorder}` }}>User belongs to Platform Company (Global Role)</div>
                )}
            </FF>
            <FF label="Phone" t={t}><FIn value={modal.data.phone || ""} onChange={e => setF("phone", e.target.value)} placeholder="+1 555 000 0000" t={t} /></FF>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
              <FF label="Street 1" t={t}><FIn value={modal.data.street1 || ""} onChange={e => setF("street1", e.target.value)} placeholder="123 Main St" t={t} /></FF>
              <FF label="Street 2" t={t}><FIn value={modal.data.street2 || ""} onChange={e => setF("street2", e.target.value)} placeholder="Apt 4B" t={t} /></FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16 }}>
              <FF label="City" t={t}><FIn value={modal.data.city || ""} onChange={e => setF("city", e.target.value)} placeholder="New York" t={t} /></FF>
              <FF label="State" t={t}>
                <select value={modal.data.state || ""} onChange={e => setF("state", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#fff" : "#000", border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", fontFamily: t.font }}>
                    <option value="">Select...</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FF>
              <FF label="Zip" t={t}><FIn value={modal.data.zip || ""} onChange={e => setF("zip", e.target.value)} placeholder="10001" t={t} /></FF>
            </div>
            <FF label="Notes" t={t}><textarea value={modal.data.notes || ""} onChange={e => setF("notes", e.target.value)} placeholder="Private notes..." style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13.5, outline: "none", width: "100%", minHeight: 80, fontFamily: t.font, resize: "vertical" }} /></FF>
        </Modal>

        <DelModal open={!!delT} onClose={() => setDelT(null)} onDel={handleDeleteUser} title="Delete Global User?" t={t}>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.textMuted }}>Are you sure? This will remove the global user record and syncing logic for <strong>{delT?.email}</strong>.</p>
        </DelModal>
    </>);
}

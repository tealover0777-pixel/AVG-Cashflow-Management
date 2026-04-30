import React, { useState, useMemo } from "react";
import { db, functions } from "../firebase";
import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useFirestoreCollection } from "../useFirestoreCollection";
import { useAuth } from "../AuthContext";
import { Modal, FF, FIn, DelModal } from "../components";
import TanStackTable from "../components/TanStackTable";
import { getSuperAdminColumns } from "../components/SuperAdminTanStackConfig";

export default function PageSuperAdmin({ t, isDark, ROLES = [], TENANTS = [], USERS = [], tenantId = "" }) {
    const { hasPermission, isSuperAdmin, user } = useAuth();
    const canCreate = isSuperAdmin || hasPermission("PLATFORM_USER_CREATE");
    const canView = isSuperAdmin || hasPermission("PLATFORM_USER_VIEW");
    const canUpdate = isSuperAdmin || hasPermission("PLATFORM_USER_UPDATE");
    const canDelete = isSuperAdmin || hasPermission("PLATFORM_USER_DELETE");
    
    // Fetch global users list
    const { data: globalUsers = [], loading, error } = useFirestoreCollection("global_users");
    
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);
    const [invitingId, setInvitingId] = useState(null);
    const [processing, setProcessing] = useState(false);
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

    // Merge tenant users with global users data and include standalone Global users
    const mergedUsers = useMemo(() => {
        // 1. Process Tenant Users (from the 'users' collection or collection group passed as USERS)
        const tUsers = USERS.map(u => {
            const globalUser = globalUsers.find(gu =>
                (u.auth_uid && gu.id === u.auth_uid) ||
                (u.email && gu.email && gu.email.toLowerCase() === u.email.toLowerCase())
            );
            
            // Extract tenantId from path if not present (for collection group)
            let tid = u.tenantId || u.tenant_id || u.Tenant_ID;
            if (!tid && u._path) {
                const parts = u._path.split('/');
                if (parts[0] === 'tenants' && parts[1]) tid = parts[1];
            }
            if (!tid) tid = tenantId;

            return {
                ...u,
                docId: u._path || u.docId || u.id,
                first_name: globalUser?.first_name || u.first_name || "",
                last_name: globalUser?.last_name || u.last_name || "",
                displayName: globalUser?.displayName || u.displayName || "",
                role: u.role_id || globalUser?.role || "", // SuperAdmin config uses 'role'
                tenantId: tid
            };
        });

        // 2. Add Global Users who aren't already represented in the tenant-user list
        const missingGlobal = globalUsers.filter(gu => {
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
            role: gu.role || "",
            status: gu.status || "Active",
            tenantId: gu.tenantId || "GLOBAL",
            _isGlobalOnly: true
        }));

        return [...tUsers, ...missingGlobal];
    }, [USERS, globalUsers, tenantId]);

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
            return true;
        });
    }, [mergedUsers, user]);

    // Get role options from ROLES collection
    const roleOptions = useMemo(() => {
        return ROLES.map(r => {
            const id = r.id || r.role_id;
            const name = r.role_name || r.name || id;
            return {
                id: id,
                display: `${id} - ${name}`
            };
        }).sort((a, b) => a.display.localeCompare(b.display));
    }, [ROLES]);

    const openInvite = () => setModal({ open: true, mode: "invite", data: { email: "", first_name: "", last_name: "", role: "", tenantId: "" } });
    const openEdit = r => {
        setModal({ open: true, mode: "edit", data: { ...r, uid: r.id } });
    };
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => {
        setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));
    };

    // Invite user via Cloud Function
    const handleInviteUser = async () => {
        const d = modal.data;
        if (!d.email || !d.role) return;
        setInviting(true);
        try {
            const inviteUserFn = httpsCallable(functions, "inviteUser");
            const result = await inviteUserFn({
                email: d.email,
                role: d.role,
                tenantId: d.tenantId || "",
                first_name: d.first_name || "",
                last_name: d.last_name || ""
            });
            close();
            setInviteResult({ link: result.data.link, email: d.email });
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
            setInviteResult({ link: result.data.link, email: user.email });
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
        if (!d.uid) return;

        // Ensure all values are plain strings, not Firestore objects
        const payload = {
            email: String(d.email || ""),
            first_name: String(d.first_name || ""),
            last_name: String(d.last_name || ""),
            role: String(d.role || ""),
            tenantId: String(d.tenantId || ""),
            status: String(d.status || "Active"),
            updated_at: serverTimestamp(),
        };

        try {
            await setDoc(doc(db, "global_users", d.uid), payload, { merge: true });
            // Sync to tenant user doc
            const tid = String(d.tenantId || "");
            if (tid) {
                const q = query(collection(db, `tenants/${tid}/users`), where("auth_uid", "==", d.uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    await updateDoc(snap.docs[0].ref, {
                        first_name: String(d.first_name || ""),
                        last_name: String(d.last_name || ""),
                        email: String(d.email || ""),
                        role_id: String(d.role || ""),
                        updated_at: serverTimestamp()
                    });
                }
            }
            close();
        } catch (err) {
            console.error("Save global user error:", err);
            showToast("Save failed: " + (err.message || "Unknown error"), "error");
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
        return getSuperAdminColumns(permissions, isDark, t, openEdit, setDelT, getRoleName, getTenantName, handleRowInvite, invitingId, ROLES);
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

        {inviteResult && (
            <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 16, padding: 28, maxWidth: 540, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
                    <h3 style={{ fontFamily: t.titleFont, fontSize: 18, marginBottom: 8, color: isDark ? "#fff" : "#1C1917" }}>Verification Link Generated</h3>
                    <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12, lineHeight: 1.6 }}>Share this link with <strong>{inviteResult.email}</strong> so they can verify their account and log in.</p>
                    <div style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 14px", fontFamily: t.mono, fontSize: 12, wordBreak: "break-all", color: t.accent, marginBottom: 16 }}>{inviteResult.link}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => { navigator.clipboard.writeText(inviteResult.link); }} style={{ flex: 1, background: t.accentGrad, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Copy Link</button>
                        <button onClick={() => setInviteResult(null)} style={{ flex: 1, background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 18px", fontSize: 13.5, cursor: "pointer" }}>Close</button>
                    </div>
                </div>
            </div>
        )}

        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>User Admin</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage global user permissions and tenant associations</p>
            </div>
            {canCreate && <button className="primary-btn" onClick={openInvite} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}` }}>✉️ Invite Global User</button>}
        </div>

        <div style={{ height: 'calc(100vh - 350px)', width: "100%", minHeight: '500px' }}>
            <TanStackTable
                data={filteredUsers}
                columns={columnDefs}
                pageSize={20}
                t={t}
                isDark={isDark}
            />
        </div>

        {/* Edit Modal */}
        <Modal open={modal.open && modal.mode === "edit"} onClose={close} title="Edit User Mapping" onSave={handleSaveUser} width={520} t={t} isDark={isDark}>
            <FF label="Email" t={t}><FIn value={modal.data.email} disabled t={t} /></FF>
            <FF label="Firebase UID" t={t}><FIn value={modal.data.uid} disabled t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FF label="First Name" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="Jane" t={t} /></FF>
              <FF label="Last Name" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="Doe" t={t} /></FF>
            </div>
            <FF label="Global Role" t={t}>
                <select value={modal.data.role || ""} onChange={e => setF("role", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, fontSize: 14, outline: "none", width: "100%" }}>
                    <option value="">Select Role</option>
                    {roleOptions.map(r => <option key={r.id} value={r.id} style={{ color: "#000" }}>{r.display}</option>)}
                </select>
            </FF>
            <FF label="Status" t={t}>
                <select value={modal.data.status || "Active"} onChange={e => setF("status", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, fontSize: 14, outline: "none", width: "100%" }}>
                    <option value="Active" style={{ color: "#000" }}>Active</option>
                    <option value="Pending" style={{ color: "#000" }}>Pending</option>
                    <option value="Inactive" style={{ color: "#000" }}>Inactive</option>
                </select>
            </FF>
            <FF label="Tenant Assignment" t={t}>
                {!isRoleGlobal(modal.data.role) ? (
                    <select value={modal.data.tenantId || ""} onChange={e => setF("tenantId", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, fontSize: 14, outline: "none", width: "100%" }}>
                        <option value="">No Tenant</option>
                        {TENANTS.map(tn => <option key={tn.id} value={tn.id} style={{ color: "#000" }}>{tn.name} ({tn.id})</option>)}
                    </select>
                ) : (
                    <div style={{ padding: "12px 14px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6", fontSize: 13, color: t.textMuted, border: `1px solid ${t.surfaceBorder}` }}>Tenant mapping not required for Global roles.</div>
                )}
            </FF>
        </Modal>

        {/* Invite Modal */}
        <Modal open={modal.open && modal.mode === "invite"} onClose={close} title="Invite Global User" onSave={handleInviteUser} saveLabel={inviting ? "Inviting..." : "Invite User"} width={520} t={t} isDark={isDark}>
            <FF label="Email Address" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="user@example.com" t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FF label="First Name" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="Jane" t={t} /></FF>
              <FF label="Last Name" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="Doe" t={t} /></FF>
            </div>
            <FF label="Global Role" t={t}>
                <select value={modal.data.role || ""} onChange={e => setF("role", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, fontSize: 14, outline: "none", width: "100%" }}>
                    <option value="">Select Role</option>
                    {roleOptions.map(r => <option key={r.id} value={r.id} style={{ color: "#000" }}>{r.display}</option>)}
                </select>
            </FF>
            <FF label="Status" t={t}>
                <select value={modal.data.status || "Active"} onChange={e => setF("status", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, fontSize: 14, outline: "none", width: "100%" }}>
                    <option value="Active" style={{ color: "#000" }}>Active</option>
                    <option value="Pending" style={{ color: "#000" }}>Pending</option>
                    <option value="Inactive" style={{ color: "#000" }}>Inactive</option>
                </select>
            </FF>
            <FF label="Tenant Assignment" t={t}>
                {!isRoleGlobal(modal.data.role) ? (
                    <select value={modal.data.tenantId || ""} onChange={e => setF("tenantId", e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, fontSize: 14, outline: "none", width: "100%" }}>
                        <option value="">No Tenant</option>
                        {TENANTS.map(tn => <option key={tn.id} value={tn.id} style={{ color: "#000" }}>{tn.name} ({tn.id})</option>)}
                    </select>
                ) : (
                    <div style={{ padding: "12px 14px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6", fontSize: 13, color: t.textMuted, border: `1px solid ${t.surfaceBorder}` }}>Tenant mapping not required for Global roles.</div>
                )}
            </FF>
        </Modal>

        <DelModal open={!!delT} onClose={() => setDelT(null)} onDel={handleDeleteUser} title="Delete Global User?" t={t}>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.textMuted }}>Are you sure? This will remove the global user record and syncing logic for <strong>{delT?.email}</strong>.</p>
        </DelModal>
    </>);
}

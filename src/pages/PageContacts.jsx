import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from '../components/TanStackTable';
import { getContactColumns } from '../components/ContactsTanStackConfig';
import { db, functions } from "../firebase";
import { collection, doc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { initials, av, badge, sortData, fmtCurr } from "../utils";
import { StatCard, Bdg, Pagination, ActBtns, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { InvestorSummaryModal } from "../components/InvestorSummaryModal";
import { useAuth } from "../AuthContext";

export default function PageContacts({ t, isDark, CONTACTS = [], INVESTMENTS = [], SCHEDULES = [], DEALS = [], collectionPath = "", DIMENSIONS = [], tenantId = "", LEDGER = [], USERS = [] }) {
  const { hasPermission, isSuperAdmin, user } = useAuth();
  const canCreate = hasPermission("CONTACT_CREATE");
  const canUpdate = hasPermission("CONTACT_UPDATE");
  const canDelete = hasPermission("CONTACT_DELETE");
  const canInvite = isSuperAdmin || hasPermission("CONTACT_INVITE");
  const roleOpts = (DIMENSIONS.find(d => d.name === "ContactRole") || {}).items || ["Investor", "Borrower"];
  const contactTypeOpts = (DIMENSIONS.find(d => d.name === "ContactType") || {}).items || ["Individual", "Company", "Trust", "Partnership"];
  const investorTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorType") || {}).items || ["Fixed", "Equity", "Both"];
  const paymentMethods = (DIMENSIONS.find(d => d.name === "Payment Method" || d.name === "PaymentMethod") || {}).items || [];
  const [chip, setChip] = useState("All");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const nextContactId = (() => {
    if (CONTACTS.length === 0) return "M10001";
    const maxNum = Math.max(...CONTACTS.map(p => { const m = String(p.id).match(/^M(\d+)$/); return m ? Number(m[1]) : 0; }));
    return "M" + (maxNum + 1);
  })();
  const openAdd = () => setModal({ open: true, mode: "add", data: { id: nextContactId, first_name: "", last_name: "", type: "Individual", role: "Investor", email: "", payment_method: paymentMethods[0] || "", marketing_emails: "Subscribed" } });
  const openEdit = r => {
    let fn = r.first_name || "";
    let ln = r.last_name || "";
    if (!fn && !ln && r.name) {
      const parts = r.name.trim().split(/\s+/);
      if (parts.length > 1) {
        ln = parts.pop();
        fn = parts.join(" ");
      } else {
        fn = parts[0] || "";
      }
    }
    setModal({ open: true, mode: "edit", data: { ...r, first_name: fn, last_name: ln } });
  };
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleUpdateInvestment = async (inv) => {
    if (!inv.id) return;
    const { id, ...rest } = inv;
    const payload = {
      ...rest,
      amount: rest.amount ? Number(String(rest.amount).replace(/[^0-9.-]/g, "")) || null : null,
      rate: rest.rate ? Number(String(rest.rate).replace(/[^0-9.-]/g, "")) || null : null,
      interest_rate: rest.rate ? Number(String(rest.rate).replace(/[^0-9.-]/g, "")) || null : null,
      term_months: rest.term_months ? Number(rest.term_months) || null : null,
      updated_at: serverTimestamp()
    };
    delete payload.docId;
    delete payload._path;
    
    try {
      const docRef = inv._path ? doc(db, inv._path) : doc(db, "tenants", tenantId, "investments", id);
      await updateDoc(docRef, payload);
      
      const tenantPath = docRef.path.split("/investments")[0];
      const ledgerRef = collection(db, tenantPath, "ledger");
      await addDoc(ledgerRef, {
        entity_type: "Investment",
        entity_id: id,
        note: `Investment ${id} updated: ${Object.keys(rest).join(", ")}`,
        created_at: serverTimestamp(),
        user_id: user?.uid || "system"
      });
    } catch (err) {
      console.error("Update investment error:", err);
      throw err;
    }
  };

  const handleSaveContact = async () => {
    const d = modal.data;
    const payload = {
      contact_name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || d.name || "",
      first_name: d.first_name || "",
      last_name: d.last_name || "",
      contact_type: d.type || "",
      role_type: d.role || "",
      investor_type: d.investor_type || "",
      email: d.email || "",
      phone: d.phone || "",
      address: d.address || "",
      tax_id: d.tax_id || "",
      bank_information: d.bank_information || "",
      bank_address: d.bank_address || "",
      bank_routing_number: d.bank_routing_number || "",
      bank_account_number: d.bank_account_number || "",
      payment_method: d.payment_method || "",
      marketing_emails: d.marketing_emails || "Subscribed",
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        const docRef = d._path ? doc(db, d._path) : doc(db, collectionPath, d.docId);
        await updateDoc(docRef, payload);
      } else {
        await setDoc(doc(db, collectionPath, d.id), { ...payload, created_at: serverTimestamp() });
      }
      close();
    } catch (err) { 
      console.error("Save contact error:", err);
      showToast("Failed to save contact. " + err.message, "error");
    }
  };

  const handleDeleteContact = async () => {
    try {
      const docRef = delT._path ? doc(db, delT._path) : (delT.docId ? doc(db, collectionPath, delT.docId) : null);
      if (docRef) {
        await deleteDoc(docRef);
        setDelT(null);
      }
    } catch (err) { 
      console.error("Delete contact error:", err); 
      showToast("Delete contact error: " + err.message, "error");
    }
  };

  const handleUpdateContact = async (updatedData) => {
    const d = updatedData;
    const payload = {
      contact_name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || d.name || "",
      first_name: d.first_name || "",
      last_name: d.last_name || "",
      contact_type: d.contact_type || d.type || "",
      role_type: d.role_type || d.role || "",
      investor_type: d.investor_type || "",
      email: d.email || "",
      phone: d.phone || "",
      address: d.address || "",
      tax_id: d.tax_id || "",
      bank_information: d.bank_information || "",
      bank_address: d.bank_address || "",
      bank_routing_number: d.bank_routing_number || "",
      bank_account_number: d.bank_account_number || "",
      payment_method: d.payment_method || "",
      marketing_emails: d.marketing_emails || "Subscribed",
      updated_at: serverTimestamp(),
    };
    try {
      const docRef = d._path ? doc(db, d._path) : doc(db, collectionPath, d.docId || d.id);
      await updateDoc(docRef, payload);
      setDetailContact(prev => ({ ...prev, ...payload }));

      const tenantPath = docRef.path.split("/contacts")[0];
      const ledgerRef = collection(db, tenantPath, "ledger");
      await addDoc(ledgerRef, {
        entity_type: "Contact",
        entity_id: d.id || d.docId,
        note: `Contact profile updated: ${Object.keys(payload).filter(k => k !== 'updated_at').join(", ")}`,
        created_at: serverTimestamp(),
        user_id: user?.uid || "system"
      });
    } catch (err) {
      console.error("Update contact error:", err);
      throw err;
    }
  };
  const [detailContact, setDetailContact] = useState(null);
  const [invitingId, setInvitingId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [inviteConfirm, setInviteConfirm] = useState(null);
  const handleInviteContact = (party) => {
    if (!party.email) {
      showToast("This contact has no email address. Please add a valid email first.", "error");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(party.email)) {
      showToast("The email address provided is not in a valid format. Please correct it first.", "error");
      return;
    }
    setInviteConfirm(party);
  };
  const executeInvite = async () => {
    const party = inviteConfirm;
    setInviteConfirm(null);
    if (!party) return;
    setProcessing(true);
    setInvitingId(party.id);
    try {
      const inviteUserFn = httpsCallable(functions, "inviteUser");
      
      // Prioritize existing first_name/last_name fields, fall back to splitting name
      let firstName = party.first_name || "";
      let lastName = party.last_name || "";
      
      if (!firstName && party.name) {
        const nameParts = (party.name || "").trim().split(/\s+/);
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ") || "";
      }

      const result = await inviteUserFn({
        email: party.email,
        role: "R10001",
        tenantId: tenantId || "",
        first_name: firstName,
        last_name: lastName,
        phone: party.phone || "",
        contactId: party.id || "",
        notes: `Invited from Contacts page — ${party.id}`,
      });
      setInviteResult({ email: party.email, user_id: result.data.user_id, link: result.data.link });
    } catch (err) {
      console.error("Invite contact error:", err);
      showToast("Invite failed: " + (err.message || "Unknown error"), "error");
    } finally {
      setInvitingId(null);
      setProcessing(false);
    }
  };
  const chips = ["All", "Investors", "Borrowers", "Companies"];
  const [pageSize, setPageSize] = useState(30);
  const [sel, setSel] = useState(new Set());
  const gridRef = useRef(null);

  useEffect(() => {
    const calculatePageSize = () => {
      const viewportHeight = window.innerHeight;
      const gridContainerHeight = viewportHeight - 480;
      const availableForRows = gridContainerHeight - 90;
      const calculatedRows = Math.floor(availableForRows / 40);
      const newPageSize = Math.max(20, calculatedRows); 
      setPageSize(newPageSize);
    };
    const timer = setTimeout(calculatePageSize, 100);
    calculatePageSize();
    window.addEventListener('resize', calculatePageSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePageSize);
    };
  }, []);

  const filteredData = useMemo(() => {
    return CONTACTS.filter(p => {
      if (chip === "Investors" && p.role !== "Investor") return false;
      if (chip === "Borrowers" && p.role !== "Borrower") return false;
      if (chip === "Companies" && p.type !== "Company") return false;
      return true;
    });
  }, [CONTACTS, chip]);

  const permissions = { canUpdate, canDelete, canInvite };
  
  const columnContext = useMemo(() => ({
    isDark,
    t,
    permissions,
    callbacks: {
      onEdit: openEdit,
      onDelete: (target) => setDelT(target),
      onInvite: handleInviteContact,
      onNameClick: (party) => setDetailContact(party),
      onClone: async (r) => {
        try {
          let maxNum = 10000;
          CONTACTS.forEach(p => {
            const m = String(p.id).match(/^M(\d+)$/);
            if (m) {
              const num = Number(m[1]);
              if (num > maxNum) maxNum = num;
            }
          });
          const nextContactId = "M" + (maxNum + 1);
          
          const { id, docId, _path, created_at, updated_at, ...rest } = r;
          const payload = {
            ...rest,
            id: nextContactId,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            notes: `Cloned from ${id || "unknown"} on ${new Date().toLocaleDateString()}.${r.notes ? ` ${r.notes}` : ""}`
          };
          
          const colRef = collectionPath ? collection(db, collectionPath) : collection(db, "tenants", tenantId, "contacts");
          await addDoc(colRef, payload);
          if (typeof showToast === "function") showToast(`Contact ${nextContactId} created (cloned)`, "success");
        } catch (err) {
          console.error("Clone error:", err);
          if (typeof showToast === "function") showToast("Failed to clone contact", "error");
        }
      }
    },
    invitingId,
    INVESTMENTS
  }), [isDark, t, permissions, invitingId, INVESTMENTS]);

  const columnDefs = useMemo(() => {
    return getContactColumns(permissions, isDark, t, columnContext);
  }, [permissions, isDark, t, columnContext]);

  return (<>
    {processing && (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <div style={{ width: 44, height: 44, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.5px" }}>Inviting Member...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )}

    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Contacts</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage Investors, Borrowers, and Companies</p></div>
      {canCreate && <Tooltip text="Add a new investor or borrower" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Contact</button></Tooltip>}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {[{ label: "Total Contacts", value: CONTACTS.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Investors", value: CONTACTS.filter(p => p.role === "Investor").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Borrowers", value: CONTACTS.filter(p => p.role === "Borrower").length, accent: isDark ? "#FB923C" : "#C2410C", bg: isDark ? "rgba(251,146,60,0.08)" : "#FFF7ED", border: isDark ? "rgba(251,146,60,0.15)" : "#FED7AA" }, { label: "Companies", value: CONTACTS.filter(p => p.type === "Company").length, accent: isDark ? "#A78BFA" : "#7C3AED", bg: isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>{chips.map((c, i) => { const isA = chip === c; return (<span key={c} className="filter-chip" onClick={() => setChip(c)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{c}</span>); })}</div>
    </div>
    <div style={{ height: 'calc(100vh - 480px)', width: '100%', minHeight: '500px' }}>
      <TanStackTable
        ref={gridRef}
        data={filteredData}
        columns={columnDefs}
        isDark={isDark}
        t={t}
        pageSize={pageSize}
        onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.id)))}
      />
    </div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Contact" : "Edit Contact"} onSave={handleSaveContact} width={600} t={t} isDark={isDark}>
      <FF label="Contact ID" t={t}>
        <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
      </FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="First Name" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="e.g. Pao Fu" t={t} /></FF>
        <FF label="Last Name" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="e.g. Chen" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Contact Type" t={t}><FSel value={modal.data.type || "Individual"} onChange={e => setF("type", e.target.value)} options={contactTypeOpts} t={t} /></FF>
        <FF label="Role" t={t}><FSel value={modal.data.role || "Investor"} onChange={e => setF("role", e.target.value)} options={roleOpts} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Investor Type" t={t}><FSel value={modal.data.investor_type || "Fixed"} onChange={e => setF("investor_type", e.target.value)} options={investorTypeOpts} t={t} /></FF>
        <FF label="Tax ID" t={t}><FIn value={modal.data.tax_id || ""} onChange={e => setF("tax_id", e.target.value)} placeholder="e.g. 123-45-6789" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Email" t={t}><FIn value={modal.data.email || ""} onChange={e => setF("email", e.target.value)} placeholder="email@example.com" t={t} type="email" /></FF>
        <FF label="Phone" t={t}><FIn value={modal.data.phone || ""} onChange={e => setF("phone", e.target.value)} placeholder="e.g. 212-411-4566" t={t} /></FF>
      </div>
      <FF label="Address" t={t}><FIn value={modal.data.address || ""} onChange={e => setF("address", e.target.value)} placeholder="Full address" t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Bank Information" t={t}><FIn value={modal.data.bank_information || ""} onChange={e => setF("bank_information", e.target.value)} placeholder="e.g. Citibank" t={t} /></FF>
        <FF label="Payment Method" t={t}><FSel value={modal.data.payment_method} onChange={e => setF("payment_method", e.target.value)} options={paymentMethods} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Marketing Emails?" t={t}><FSel value={modal.data.marketing_emails || "Subscribed"} onChange={e => setF("marketing_emails", e.target.value)} options={["Subscribed", "Unsubscribed"]} t={t} /></FF>
      </div>
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteContact} label="This contact" t={t} isDark={isDark} />
    <Modal open={!!inviteConfirm} onClose={() => setInviteConfirm(null)} title="Invite as Member" onSave={executeInvite} saveLabel="Invite" t={t} isDark={isDark}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "8px 0" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF", border: `1px solid ${isDark ? "rgba(96,165,250,0.25)" : "#BFDBFE"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: isDark ? "#60A5FA" : "#2563EB" }}>✉️</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 8 }}>Invite {inviteConfirm?.name}?</div>
          <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>{inviteConfirm?.email} will be invited as a Member (R10001).</div>
        </div>
      </div>
    </Modal>
    <InvestorSummaryModal 
      contact={detailContact}
      onClose={() => setDetailContact(null)}
      isDark={isDark}
      t={t}
      INVESTMENTS={INVESTMENTS}
      SCHEDULES={SCHEDULES}
      DEALS={DEALS}
      DIMENSIONS={DIMENSIONS}
      onUpdate={handleUpdateContact}
      onUpdateInvestment={handleUpdateInvestment}
      tenantId={tenantId}
      LEDGER={LEDGER}
      USERS={USERS}
    />
    {inviteResult && (
      <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 16, padding: 28, maxWidth: 540, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
          <h3 style={{ fontFamily: t.titleFont, fontSize: 18, marginBottom: 8, color: isDark ? "#fff" : "#1C1917" }}>Member Invited</h3>
          <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
            <strong>{inviteResult.email}</strong> has been invited as a Member (R10001).
          </p>
          {inviteResult.user_id && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: t.textMuted }}>User ID:</span>
              <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: t.accent, background: isDark ? "rgba(255,255,255,0.08)" : "#F0F9FF", padding: "3px 10px", borderRadius: 6 }}>{inviteResult.user_id}</span>
            </div>
          )}
          {inviteResult.link && (<>
            <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>Verification link:</p>
            <div style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 14px", fontFamily: t.mono, fontSize: 12, wordBreak: "break-all", color: t.accent, marginBottom: 16 }}>{inviteResult.link}</div>
          </>)}
          <div style={{ display: "flex", gap: 10 }}>
            {inviteResult.link && <button onClick={() => navigator.clipboard.writeText(inviteResult.link)} style={{ flex: 1, background: t.accentGrad, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Copy Link</button>}
            <button onClick={() => setInviteResult(null)} style={{ flex: 1, background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 18px", fontSize: 13.5, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      </div>
    )}
    {toast && (
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
        <span>{toast.type === "success" ? "✅" : "❌"}</span>
        <span>{toast.msg}</span>
        <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
      </div>
    )}
  </>);
}

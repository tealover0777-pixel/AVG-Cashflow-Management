import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp, collection, query, onSnapshot, addDoc } from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { Bdg, FF, FIn, FSel, TanStackTable, Tooltip, Modal, ConfirmModal } from "../components";
import InvestmentDocumentsTab from "../components/InvestmentDocumentsTab";
import InvestmentChangelogTab from "../components/InvestmentChangelogTab";
import { getContactTransactionColumns } from "../components/ContactTransactionsTanStackConfig";
import { fmtCurr } from "../utils";
import { ArrowUp, Info, RotateCcw } from "lucide-react";

export default function PageMemberAccount({ 
  t, 
  isDark, 
  CONTACTS = [], 
  INVESTMENTS = [], 
  SCHEDULES = [], 
  DEALS = [], 
  DIMENSIONS = [], 
  tenantId = "", 
  LEDGER = [], 
  USERS = [],
  loading = false
}) {
  const { user, hasPermission, isSuperAdmin } = useAuth();
  const contact = CONTACTS[0]; // Since CONTACTS is globally filtered for the logged-in member

  const [activeTab, setActiveTab] = useState("Capital Transactions");
  const [viewMode, setViewMode] = useState("simple"); // 'simple' (Transaction View) or 'detail' (Detail View)
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("");
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Populate editData when contact is loaded
  useEffect(() => {
    if (contact) {
      setEditData({
        ...contact,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        contact_type: contact.contact_type || contact.type || "Individual",
        role_type: contact.role_type || contact.role || "Member",
        email: contact.email || "",
        phone: contact.phone || "",
        address: contact.address || "",
        bank_information: contact.bank_information || contact.bank_name || "",
        bank_address: contact.bank_address || "",
        bank_routing_number: contact.bank_routing_number || "",
        bank_account_number: contact.bank_account_number || "",
        tax_id: contact.tax_id || "",
        payment_method: contact.payment_method || "",
        investor_type: contact.investor_type || "Fixed",
        marketing_emails: contact.marketing_emails || "Subscribed"
      });
      setIsEditing(false);
    }
  }, [contact]);

  // Real-time Notes fetching
  useEffect(() => {
    if (!tenantId || !contact?.id) return;
    const q = query(collection(db, "tenants", tenantId, "contacts", contact.id, "notes"));
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => {
        const da = a.created_at?.seconds || 0;
        const db = b.created_at?.seconds || 0;
        return db - da;
      }));
    }, (err) => {
      console.error("Notes unsub error:", err);
    });
    return () => unsub();
  }, [tenantId, contact?.id]);

  const dpId = contact ? String(contact.id || "").trim() : "";
  const dpDocId = contact ? String(contact.docId || "").trim() : "";

  // Get investments for this contact
  const partyInvestments = useMemo(() => {
    if (!contact) return [];
    return INVESTMENTS.filter(c => {
      const cPId = String(c.contact_id || "").trim();
      return (cPId === dpId || (dpDocId && cPId === dpDocId));
    });
  }, [INVESTMENTS, contact, dpId, dpDocId]);

  // Auto-select first investment if none selected
  useEffect(() => {
    if (partyInvestments.length > 0 && !selectedInvestmentId) {
      setSelectedInvestmentId(partyInvestments[0].id);
    }
  }, [partyInvestments, selectedInvestmentId]);

  const selectedInv = useMemo(() => {
    return partyInvestments.find(i => i.id === selectedInvestmentId || i.investment_id === selectedInvestmentId);
  }, [partyInvestments, selectedInvestmentId]);

  // Get payment schedules for this contact/investments
  const partySchedules = useMemo(() => {
    if (!contact) return [];
    return SCHEDULES.filter(s => {
      const sPId = String(s.contact_id || "").trim();
      const isMatched = sPId === dpId || (dpDocId && sPId === dpDocId);
      return isMatched || partyInvestments.some(c => c.id === s.investment);
    }).sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return da - db;
    });
  }, [SCHEDULES, contact, dpId, dpDocId, partyInvestments]);

  // Metrics calculations
  const investedAmount = useMemo(() => {
    return partyInvestments.reduce((sum, c) => {
      const amtStr = String(c.amount || 0).replace(/[^0-9.-]/g, '');
      return sum + (Number(amtStr) || 0);
    }, 0);
  }, [partyInvestments]);

  const contributions = useMemo(() => {
    return partySchedules.filter(s => (s.payment_type || s.type) === "INVESTOR_PRINCIPAL_DEPOSIT" || (s.type === 'deposit'));
  }, [partySchedules]);

  const totalContributions = useMemo(() => {
    return contributions.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0), 0);
  }, [contributions]);

  const withdrawals = useMemo(() => {
    return partySchedules.filter(s => {
      const st = (s.PaymentStatus || s.status || "").toLowerCase();
      return st === "withdrawal" || st === "withdrawals" || st === "withdrawl";
    });
  }, [partySchedules]);

  const totalWithdrawals = useMemo(() => {
    return withdrawals.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0), 0);
  }, [withdrawals]);

  const capitalBalance = totalContributions - Math.abs(totalWithdrawals);

  const distributions = useMemo(() => {
    return partySchedules.filter(s => {
      const ty = (s.payment_type || s.type || "").toLowerCase();
      return ty.includes("interest") || ty.includes("distribution");
    });
  }, [partySchedules]);

  const distributedAmount = useMemo(() => {
    return distributions.reduce((sum, s) => {
      const st = (s.status || s.PaymentStatus || "").trim();
      if (st === "Paid" || st === "Partial") {
        return sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0);
      }
      return sum;
    }, 0);
  }, [distributions]);

  // Dimension option fallbacks
  const roleOpts = (DIMENSIONS.find(d => d.name === "ContactRole" || d.name === "Contact Role") || {}).items || ["Investor", "Borrower", "Member"];
  const contactTypeOpts = (DIMENSIONS.find(d => d.name === "ContactType" || d.name === "Contact Type") || {}).items || ["Individual", "Company", "Trust", "Partnership"];
  const investorTypeOpts = ["Fixed", "Equity", "Both"];
  const paymentMethods = (DIMENSIONS.find(d => d.name === "Payment Method" || d.name === "PaymentMethod") || {}).items || [];
  const scheduleStatusOpts = (DIMENSIONS.find(d => d.name === "ScheduleStatus" || d.name === "Schedule Status" || d.name === "PaymentStatus" || d.name === "Payment Status") || {}).items?.map(i => String(i || "").trim()).filter(Boolean) || ["Paid", "Due", "Partial", "Hold", "Not Paid", "Reinvested"];

  // Profile Save Changes handler
  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      const payload = {
        contact_name: editData.contact_type === "Company" ? (editData.company_name || "") : `${editData.first_name || ""} ${editData.last_name || ""}`.trim(),
        first_name: editData.first_name || "",
        last_name: editData.last_name || "",
        contact_type: editData.contact_type || "",
        role_type: editData.role_type || "",
        investor_type: editData.investor_type || "",
        email: editData.email || "",
        phone: editData.phone || "",
        address: editData.address || "",
        tax_id: editData.tax_id || "",
        company_name: editData.company_name || "",
        bank_information: editData.bank_information || "",
        bank_address: editData.bank_address || "",
        bank_routing_number: editData.bank_routing_number || "",
        bank_account_number: editData.bank_account_number || "",
        payment_method: editData.payment_method || "",
        marketing_emails: editData.marketing_emails || "Subscribed",
        notes: editData.notes || "",
        updated_at: serverTimestamp(),
      };
      
      const docRef = contact._path ? doc(db, contact._path) : doc(db, "tenants", tenantId, "contacts", contact.docId || contact.id);
      await updateDoc(docRef, payload);
      
      try {
        const tenantPath = docRef.path.split("/contacts")[0];
        const ledgerRef = collection(db, tenantPath, "ledger");
        await addDoc(ledgerRef, {
          entity_type: "Contact",
          entity_id: contact.id || contact.docId,
          note: `Member profile self-updated: ${Object.keys(payload).filter(k => k !== 'updated_at').join(", ")}`,
          created_at: serverTimestamp(),
          user_id: user?.uid || "system"
        });
      } catch (lErr) {
        console.warn("Ledger write omitted or failed:", lErr);
      }

      showToast("Profile updated successfully", "success");
      setIsEditing(false);
    } catch (err) {
      console.error("Save profile error:", err);
      showToast("Failed to update profile: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!tenantId || !contact?.id || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const noteCol = collection(db, "tenants", tenantId, "contacts", contact.id, "notes");
      await addDoc(noteCol, {
        text: noteText.trim(),
        author: user?.displayName || user?.email || "Member",
        created_at: serverTimestamp()
      });
      setNoteText("");
      showToast("Note added successfully", "success");
    } catch (err) {
      console.error("Save note error:", err);
      showToast("Failed to save note: " + err.message, "error");
    } finally {
      setSavingNote(false);
    }
  };

  const setED = (newVal) => {
    const next = { ...editData, ...newVal };
    if (newVal.hasOwnProperty('first_name') || newVal.hasOwnProperty('last_name')) {
      next.contact_name = `${next.first_name || ""} ${next.last_name || ""}`.trim();
    }
    setEditData(next);
  };

  // Render Deal Table for Contributions/Withdrawals
  const renderDealTable = (items, emptyMsg) => {
    if (!items || items.length === 0) return <div style={{ fontSize: 13, color: t.textMuted, padding: "16px 24px" }}>{emptyMsg}</div>;
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA", borderBottom: `1px solid ${t.surfaceBorder}` }}>
          <tr>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>DEAL</th>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>TYPE</th>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>MEMO</th>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted, textAlign: "right" }}>AMOUNT</th>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted, textAlign: "right" }}>RECEIVED DATE</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => {
            const d = DEALS.find(dd => dd.id === s.deal_id);
            const dealName = d?.name || s.deal_id || s.project || "—";
            const amtNum = Number(String(s.signed_payment_amount || s.payment_amount || s.amount || 0).replace(/[^0-9.-]/g,''));
            const amtColor = amtNum > 0 ? (isDark ? "#34D399" : "#10B981") : amtNum < 0 ? (isDark ? "#F87171" : "#EF4444") : (isDark ? "#fff" : "#1C1917");
            return (
              <tr key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${t.surfaceBorder}` : "none" }}>
                <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{dealName}</td>
                <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary }}>{s.type || s.payment_type}</td>
                <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary }}>{s.memo || s.notes || "—"}</td>
                <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 600, color: amtColor, textAlign: "right" }}>{fmtCurr(s.signed_payment_amount || s.payment_amount || s.amount)}</td>
                <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary, textAlign: "right" }}>{s.receivedDate || s.dueDate || s.date || "—"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  };

  // Tab contents
  const tabs = ["Edit Investment", "Investment Documents", "Capital Transactions", "Distributions", "Notes", "Investment Changelog", "Investment Sharing"];

  const renderTabContent = () => {
    if (viewMode === "detail") {
      const showData = isEditing ? editData : contact;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <FF label="First Name" t={t}>
              {isEditing ? <FIn value={editData.first_name} onChange={e => setED({ first_name: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.first_name || "—"}</div>}
            </FF>
            <FF label="Last Name" t={t}>
              {isEditing ? <FIn value={editData.last_name} onChange={e => setED({ last_name: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.last_name || "—"}</div>}
            </FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <FF label="Contact Type" t={t}>
              {isEditing ? <FSel value={editData.contact_type} options={contactTypeOpts} onChange={e => setED({ contact_type: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.contact_type || showData.type || "—"}</div>}
            </FF>
            <FF label="Role" t={t}>
              {isEditing ? <FSel value={editData.role_type} options={roleOpts} onChange={e => setED({ role_type: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.role_type || showData.role || "—"}</div>}
            </FF>
          </div>
          {(isEditing ? editData.contact_type === "Company" : (showData.contact_type === "Company" || showData.type === "Company" || showData.company_name)) && (
            <FF label="Company Name" t={t}>
              {isEditing ? <FIn value={editData.company_name} onChange={e => setED({ company_name: e.target.value })} placeholder="e.g. Acme Corp" t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.company_name || "—"}</div>}
            </FF>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <FF label="Investor Type" t={t}>
              {isEditing ? <FSel value={editData.investor_type} options={investorTypeOpts} onChange={e => setED({ investor_type: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.investor_type || "—"}</div>}
            </FF>
            <FF label="Tax ID" t={t}>
              {isEditing ? <FIn value={editData.tax_id} onChange={e => setED({ tax_id: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.tax_id || "—"}</div>}
            </FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <FF label="Email" t={t}>
              {isEditing ? <FIn value={editData.email} onChange={e => setED({ email: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.email || "—"}</div>}
            </FF>
            <FF label="Phone" t={t}>
              {isEditing ? <FIn value={editData.phone} onChange={e => setED({ phone: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.phone || "—"}</div>}
            </FF>
          </div>
          <FF label="Address" t={t}>
            {isEditing ? <FIn value={editData.address} onChange={e => setED({ address: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.address || "—"}</div>}
          </FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <FF label="Bank Name" t={t}>
              {isEditing ? <FIn value={editData.bank_information} onChange={e => setED({ bank_information: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_information || "—"}</div>}
            </FF>
            <FF label="Bank Address" t={t}>
              {isEditing ? <FIn value={editData.bank_address} onChange={e => setED({ bank_address: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_address || "—"}</div>}
            </FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <FF label="Bank Routing Number" t={t}>
              {isEditing ? <FIn value={editData.bank_routing_number} onChange={e => setED({ bank_routing_number: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_routing_number || "—"}</div>}
            </FF>
            <FF label="Bank Account Number" t={t}>
              {isEditing ? <FIn value={editData.bank_account_number} onChange={e => setED({ bank_account_number: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_account_number || "—"}</div>}
            </FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <FF label="Payment Method" t={t}>
              {isEditing ? <FSel value={editData.payment_method} options={paymentMethods} onChange={e => setED({ payment_method: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.payment_method || "—"}</div>}
            </FF>
            <FF label="Marketing Emails?" t={t}>
              {isEditing ? <FSel value={editData.marketing_emails} options={["Subscribed", "Unsubscribed"]} onChange={e => setED({ marketing_emails: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.marketing_emails || "—"}</div>}
            </FF>
          </div>
          <FF label="Notes" t={t}>
            {isEditing ? (
              <textarea 
                value={editData.notes || ""} 
                onChange={e => setED({ notes: e.target.value })} 
                placeholder="Additional notes..." 
                rows={3} 
                style={{ width: "100%", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, padding: "12px 16px", color: t.text, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} 
              />
            ) : (
              <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500, minHeight: 46, whiteSpace: "pre-wrap" }}>
                {showData.notes || "—"}
              </div>
            )}
          </FF>
        </div>
      );
    }

    switch (activeTab) {
      case "Capital Transactions":
        return (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
              <div style={{ width: 280, padding: "24px", borderRadius: 16, background: isDark ? "linear-gradient(145deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.05) 100%)" : "linear-gradient(145deg, #EFF6FF 0%, #DBEAFE 100%)", border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "#BFDBFE"}`, boxShadow: isDark ? "none" : "0 4px 6px -1px rgba(59, 130, 246, 0.1)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#93C5FD" : "#1D4ED8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <ArrowUp size={16} /> Capital balance
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: isDark ? "#fff" : "#1E3A8A", marginBottom: 4 }}>{fmtCurr(capitalBalance)}</div>
                <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.6)" : "#3B82F6" }}>Total contributions - Total withdrawals</div>
              </div>
            </div>

            <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>Contributions</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{fmtCurr(totalContributions)}</div>
              </div>
              {renderDealTable(contributions, "No contributions found.")}
            </div>

            <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>Withdrawals</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{fmtCurr(Math.abs(totalWithdrawals))}</div>
              </div>
              {renderDealTable(withdrawals, "No withdrawals found.")}
            </div>

            <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>All Transactions</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>
                  {fmtCurr(partySchedules.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0), 0))}
                </div>
              </div>
              <div style={{ height: "calc(100vh - 340px)" }}>
                <TanStackTable
                  data={partySchedules}
                  columns={getContactTransactionColumns(isDark, t, { DEALS })}
                  isDark={isDark}
                  t={t}
                  pageSize={50}
                />
              </div>
            </div>
          </div>
        );

      case "Edit Investment":
        return (
          <div style={{ maxWidth: 800 }}>
            {partyInvestments.length > 1 && (
              <div style={{ marginBottom: 24, padding: "16px 20px", background: isDark ? "rgba(59,130,246,0.1)" : "#EFF6FF", borderRadius: 12, border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "#BFDBFE"}` }}>
                <FF label="Switch Investment" t={t}>
                  <select 
                    value={selectedInvestmentId} 
                    onChange={e => setSelectedInvestmentId(e.target.value)}
                    style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
                  >
                    {partyInvestments.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.investment_name || inv.id} ({inv.deal || "No Deal"}) — {fmtCurr(inv.amount)}
                      </option>
                    ))}
                  </select>
                </FF>
              </div>
            )}

            {!selectedInv ? (
              <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>No investment selected or available.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <FF label="Investment ID" t={t}>
                    <div style={{ padding: "10px 13px", background: isDark ? "rgba(255,255,255,0.03)" : "#f9f9f9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.textMuted, fontSize: 13, fontFamily: t.mono }}>{selectedInv.id}</div>
                  </FF>
                  <FF label="Deal ID" t={t}>
                    <div style={{ padding: "10px 13px", background: isDark ? "rgba(255,255,255,0.03)" : "#f9f9f9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.textMuted, fontSize: 13, fontFamily: t.mono }}>
                      {selectedInv.deal_id ? `${selectedInv.deal_id} - ${selectedInv.deal || selectedInv.deal_name || DEALS.find(d => d.id === selectedInv.deal_id)?.name || ""}`.replace(/ - $/, "") : "—"}
                    </div>
                  </FF>
                  <FF label="Type" t={t}>
                    <FIn value={selectedInv.type || selectedInv.investment_type || ""} disabled t={t} />
                  </FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <FF label="Amount" t={t}>
                    <FIn value={fmtCurr(selectedInv.amount)} disabled t={t} />
                  </FF>
                  <FF label="Rate (%)" t={t}>
                    <FIn value={selectedInv.rate || selectedInv.interest_rate || ""} disabled t={t} />
                  </FF>
                  <FF label="Frequency" t={t}>
                    <FIn value={selectedInv.freq || selectedInv.payment_frequency || ""} disabled t={t} />
                  </FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <FF label="Term (months)" t={t}>
                    <FIn value={selectedInv.term_months || ""} disabled t={t} />
                  </FF>
                  <FF label="Status" t={t}>
                    <FIn value={selectedInv.status || "Open"} disabled t={t} />
                  </FF>
                  <FF label="Calculator" t={t}>
                    <FIn value={selectedInv.calculator || "—"} disabled t={t} />
                  </FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FF label="Start Date" t={t}>
                    <FIn value={selectedInv.start_date || ""} disabled t={t} />
                  </FF>
                  <FF label="Maturity Date" t={t}>
                    <FIn value={selectedInv.maturity_date || ""} disabled t={t} />
                  </FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FF label="Payment Method" t={t}>
                    <FIn value={selectedInv.payment_method || ""} disabled t={t} />
                  </FF>
                  <FF label="Rollover at Maturity" t={t}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", height: 40 }}>
                        <input type="checkbox" checked={!!selectedInv.rollover} disabled style={{ width: 18, height: 18 }} />
                        <span style={{ marginLeft: 10, fontSize: 13, color: t.textSecondary }}>Rollover Principal</span>
                      </div>
                      {selectedInv.rollover && (
                        <div style={{ 
                          padding: "10px 14px", 
                          background: isDark ? "rgba(99,102,241,0.08)" : "#EEF2FF", 
                          border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "#C7D2FE"}`, 
                          borderRadius: 8, 
                          display: "flex", 
                          gap: 10, 
                          alignItems: "flex-start" 
                        }}>
                          <RotateCcw size={16} style={{ marginTop: 2, color: isDark ? "#818CF8" : "#4F46E5", flexShrink: 0 }} />
                          <div style={{ fontSize: 12, color: isDark ? "#A5B4FC" : "#3730A3", lineHeight: 1.5 }}>
                            <strong>Principal Rollover Enabled:</strong> The final principal payment will be marked as <strong>ROLLOVER</strong> in the schedule.
                          </div>
                        </div>
                      )}
                    </div>
                  </FF>
                </div>
              </div>
            )}
          </div>
        );

      case "Distributions":
        return (
          <div>
            <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>
                  Distributions
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{fmtCurr(distributedAmount)}</div>
              </div>
              <div style={{ height: "calc(100vh - 340px)" }}>
                <TanStackTable
                  data={distributions}
                  columns={getContactTransactionColumns(isDark, t, { DEALS })}
                  isDark={isDark}
                  t={t}
                  pageSize={50}
                />
              </div>
            </div>
          </div>
        );

      case "Notes":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700 }}>
            <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Add Note</div>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write a note to add to your account record..."
                rows={4}
                style={{ width: "100%", padding: "10px 13px", borderRadius: 9, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(0,0,0,0.2)" : "#fff", color: t.text, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  disabled={savingNote || !noteText.trim()}
                  onClick={handleAddNote}
                  style={{ padding: "9px 22px", borderRadius: 9, background: noteText.trim() ? t.accentGrad : (isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb"), color: noteText.trim() ? "#fff" : t.textMuted, border: "none", fontWeight: 700, fontSize: 13.5, cursor: noteText.trim() && !savingNote ? "pointer" : "default", boxShadow: noteText.trim() ? `0 4px 12px ${t.accentShadow}` : "none" }}
                >
                  {savingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </div>

            {notes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: 13.5 }}>No notes yet. Add the first one above.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {notes.map((n, i) => (
                  <div key={n.id || i} style={{ background: isDark ? "#1C1917" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 13.5, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.text}</div>
                    <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 10, display: "flex", gap: 12 }}>
                      <span>{n.author || "—"}</span>
                      <span>{n.created_at?.toDate ? n.created_at.toDate().toLocaleString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "Investment Documents":
        return (
          <InvestmentDocumentsTab
            t={t}
            isDark={isDark}
            tenantId={tenantId}
            contact={contact}
            DEALS={DEALS}
            INVESTMENTS={INVESTMENTS}
          />
        );

      case "Investment Changelog":
        return (
          <InvestmentChangelogTab
            t={t}
            isDark={isDark}
            LEDGER={LEDGER}
            USERS={USERS}
            currentUser={user}
            contact={contact}
            selectedInvestmentId={selectedInvestmentId}
          />
        );

      case "Investment Sharing":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5, padding: "60px 0" }}>
            <Info size={48} style={{ marginBottom: 16, color: t.textMuted }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: isDark ? "#fff" : "#111827" }}>Investment Sharing</div>
            <div style={{ fontSize: 14, color: t.textMuted, marginTop: 8 }}>Secure document and portal access controls coming soon.</div>
          </div>
        );

      default:
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
            <Info size={48} style={{ marginBottom: 16, color: t.textMuted }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: isDark ? "#fff" : "#111827" }}>Coming Soon</div>
            <div style={{ fontSize: 14, color: t.textMuted, marginTop: 8 }}>This tab is under construction.</div>
          </div>
        );
    }
  };

  if (!contact) {
    if (loading) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.textMuted, fontSize: 14 }}>
          Loading account details...
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: t.textMuted, gap: 16, padding: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxWidth: 450, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? "#fff" : "#1C1917" }}>No Profile Linked</div>
          <div style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.6 }}>
            Your user account is not currently linked to an investor or borrower profile.
          </div>
          <div style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.5, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", border: `1px solid ${t.surfaceBorder}`, padding: "12px 18px", borderRadius: 10, marginTop: 8 }}>
            Please contact support to link your user credentials with your contact profile.
          </div>
        </div>
      </div>
    );
  }

  const showData = isEditing ? editData : contact;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header Container */}
      <div style={{ padding: "0 0 24px 0", borderBottom: `1px solid ${t.surfaceBorder}`, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 4 }}>
              {[showData.first_name, showData.last_name].filter(Boolean).join(" ") || "—"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: t.textMuted }}>Profile:</span>
                <Bdg status={showData.role_type || showData.role || "Member"} isDark={isDark} />
              </div>
              {selectedInv && (
                <>
                  <div style={{ width: 1, height: 14, background: t.surfaceBorder }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: t.textMuted }}>Deal:</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{selectedInv.deal || selectedInv.deal_name || "—"}</span>
                  </div>
                  {selectedInv.investment_name && (
                    <>
                      <div style={{ width: 1, height: 14, background: t.surfaceBorder }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: t.textMuted }}>Investment:</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{selectedInv.investment_name}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: 4, borderRadius: 8 }}>
              <button 
                onClick={() => { setViewMode("simple"); setIsEditing(false); }} 
                style={{ padding: "6px 16px", borderRadius: 6, background: viewMode === "simple" ? (isDark ? "#3B82F6" : "#fff") : "transparent", color: viewMode === "simple" ? (isDark ? "#fff" : "#111827") : t.textSecondary, boxShadow: viewMode === "simple" && !isDark ? "0 1px 3px rgba(0,0,0,0.1)" : "none", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}>
                Transaction View
              </button>
              <button 
                onClick={() => setViewMode("detail")} 
                style={{ padding: "6px 16px", borderRadius: 6, background: viewMode === "detail" ? (isDark ? "#3B82F6" : "#fff") : "transparent", color: viewMode === "detail" ? (isDark ? "#fff" : "#111827") : t.textSecondary, boxShadow: viewMode === "detail" && !isDark ? "0 1px 3px rgba(0,0,0,0.1)" : "none", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}>
                Detail View
              </button>
            </div>

            {viewMode === "detail" && (
              <div style={{ marginLeft: 8 }}>
                {isEditing ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, background: t.accentGrad, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, boxShadow: `0 4px 12px ${t.accentShadow}`, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
                    <button onClick={() => setIsEditing(false)} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", color: t.textSecondary, border: `1px solid ${t.surfaceBorder}`, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditing(true)} style={{ padding: "8px 20px", borderRadius: 8, background: t.accentGrad, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, boxShadow: `0 4px 12px ${t.accentShadow}` }}>Edit Profile</button>
                )}
              </div>
            )}
          </div>
        </div>

        {viewMode === "simple" && (
          <>
            <div style={{ display: "flex", gap: 16, marginTop: 24, marginBottom: 24 }}>
              {[
                { label: "Invested amount", val: fmtCurr(investedAmount) },
                { label: "Distributed amount", val: fmtCurr(distributedAmount) },
                { label: "Net capital", val: fmtCurr(capitalBalance) }
              ].map((st, i) => (
                <div key={i} style={{ flex: 1, padding: "20px 24px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", border: `1px solid ${t.surfaceBorder}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{st.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>{st.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${t.surfaceBorder}` }}>
              {tabs.map(tab => (
                <div 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{ 
                    padding: "12px 0", cursor: "pointer", fontSize: 14, fontWeight: activeTab === tab ? 600 : 500,
                    color: activeTab === tab ? t.accent : t.textMuted,
                    borderBottom: activeTab === tab ? `2px solid ${t.accent}` : "2px solid transparent",
                    transition: "all 0.2s"
                  }}
                >
                  {tab}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {renderTabContent()}
      </div>
      
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
        </div>
      )}
    </div>
  );
}

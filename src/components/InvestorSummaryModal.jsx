import React, { useState, useEffect, useRef } from "react";
import { fmtCurr } from "../utils";
import {
  X, Info, ArrowUp, AlertCircle, RotateCcw
} from "lucide-react";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Bdg, FF, FIn, FSel, TanStackTable, Tooltip, Modal } from "../components"; // We will export these from the main components file
import InvestmentDocumentsTab from "./InvestmentDocumentsTab";
import InvestmentChangelogTab from "./InvestmentChangelogTab";
import { getContactTransactionColumns } from "./ContactTransactionsTanStackConfig";

export const InvestorSummaryModal = ({ 
  contact, 
  defaultView = "simple", 
  selectedInvestmentId: initialInvestmentId = "",
  initialTab = "Capital Transactions",
  onClose, 
  isDark, 
  t, 
  INVESTMENTS, 
  SCHEDULES, 
  DEALS, 
  onUpdate, 
  onUpdateInvestment, 
  onAddNote, 
  DIMENSIONS = [], 
  tenantId, 
  LEDGER = [],
  USERS = [],
  currentUser = null
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState(defaultView);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const lastContactIdRef = useRef("");

  const [selectedInvestmentId, setSelectedInvestmentId] = useState(initialInvestmentId);
  const [investmentEditData, setInvestmentEditData] = useState({});
  const [savingInvestment, setSavingInvestment] = useState(false);

  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [distFilter, setDistFilter] = useState("All");
  const [txEditModal, setTxEditModal] = useState({ open: false, data: null });
  const [txSaving, setTxSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [resizeW, setResizeW] = useState(null);
  const [resizeH, setResizeH] = useState(null);
  const modalContainerRef = useRef(null);

  const onHeaderMouseDown = React.useCallback((e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    e.preventDefault();
    const startMx = e.clientX, startMy = e.clientY;
    const startOx = dragOffsetRef.current.x, startOy = dragOffsetRef.current.y;
    setIsDraggingModal(true);
    const onMove = (e) => {
      const next = { x: startOx + e.clientX - startMx, y: startOy + e.clientY - startMy };
      dragOffsetRef.current = next;
      setDragOffset(next);
    };
    const onUp = () => {
      setIsDraggingModal(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const onResizeStart = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = modalContainerRef.current;
    if (!el) return;
    const { width: startW, height: startH } = el.getBoundingClientRect();
    const startMx = e.clientX, startMy = e.clientY;
    const onMove = (e) => {
      setResizeW(Math.max(480, startW + e.clientX - startMx));
      setResizeH(Math.max(360, startH + e.clientY - startMy));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const handleSaveTx = async () => {
    const s = txEditModal.data;
    if (!s?._path) { showToast("Cannot update: missing document path", "error"); return; }
    setTxSaving(true);
    try {
      const amt = Number(String(s.payment_amount_edit ?? (s.payment || 0)).replace(/[^0-9.-]/g, "")) || 0;
      const signedAmt = s.direction === "OUT" ? -Math.abs(amt) : Math.abs(amt);
      await updateDoc(doc(db, s._path), {
        status: s.status_edit ?? s.status,
        notes: s.notes_edit ?? s.notes ?? "",
        due_date: s.due_date_edit ?? s.dueDate ?? null,
        payment_amount: amt,
        signed_payment_amount: signedAmt,
        updated_at: serverTimestamp(),
      });
      showToast("Transaction updated", "success");
      setTxEditModal({ open: false, data: null });
    } catch (err) {
      showToast("Failed to update: " + err.message, "error");
    } finally {
      setTxSaving(false);
    }
  };

  const handleUpdateStatus = async (row, newStatus) => {
    if (!row?._path) { showToast("Cannot update: missing document path", "error"); return; }
    try {
      await updateDoc(doc(db, row._path), {
        status: newStatus,
        updated_at: serverTimestamp(),
      });
      showToast("Status updated", "success");
    } catch (err) {
      showToast("Failed to update status: " + err.message, "error");
    }
  };
  
  useEffect(() => {
    setViewMode(defaultView);
  }, [defaultView]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialInvestmentId) {
      setSelectedInvestmentId(initialInvestmentId);
    }
  }, [initialInvestmentId]);

  useEffect(() => {
    const contactId = contact?.id || contact?.docId || "";
    if (contact && contactId !== lastContactIdRef.current) {
      lastContactIdRef.current = contactId;

      setEditData({
        ...contact,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        contact_type: contact.contact_type || contact.type || "Individual",
        role_type: contact.role_type || contact.role || "Investor",
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

  const dpId = contact ? String(contact.id || "").trim() : "";
  const dpDocId = contact ? String(contact.docId || "").trim() : "";

  const partyInvestments = contact ? INVESTMENTS.filter(c => {
    const cPId = String(c.contact_id || "").trim();
    return (cPId === dpId || (dpDocId && cPId === dpDocId));
  }) : [];

  useEffect(() => {
    if (partyInvestments.length > 0 && !selectedInvestmentId) {
      setSelectedInvestmentId(partyInvestments[0].id);
    }
  }, [partyInvestments, selectedInvestmentId]);

  useEffect(() => {
    const inv = partyInvestments.find(i => i.id === selectedInvestmentId);
    if (inv) {
      setInvestmentEditData({
        ...inv,
        amount: inv.amount || "",
        rate: inv.rate || inv.interest_rate || "",
        freq: inv.freq || inv.payment_frequency || "",
        term_months: inv.term_months || "",
        status: inv.status || "Open",
        rollover: !!inv.rollover,
        calculator: inv.calculator || "",
        start_date: inv.start_date || "",
        maturity_date: inv.maturity_date || "",
        payment_method: inv.payment_method || "",
        feeIds: Array.isArray(inv.feeIds) ? inv.feeIds : (inv.fees ? String(inv.fees).split(",").filter(Boolean) : [])
      });
    }
  }, [selectedInvestmentId]);

  useEffect(() => {
    setNotes([]);
    setNoteText("");
  }, [contact?.id]);

  if (!contact) return null;
  const dp = contact;
  const showData = isEditing ? editData : contact;

  const roleOpts = (DIMENSIONS.find(d => d.name === "ContactRole" || d.name === "Contact Role") || {}).items || ["Investor", "Borrower"];
  const contactTypeOpts = (DIMENSIONS.find(d => d.name === "ContactType" || d.name === "Contact Type") || {}).items || ["Individual", "Company", "Trust", "Partnership"];
  const investorTypeOpts = ["Fixed", "Equity", "Both"];
  const paymentMethods = (DIMENSIONS.find(d => d.name === "Payment Method" || d.name === "PaymentMethod") || {}).items || [];

  const handleSave = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(editData);
      setIsEditing(false);
    } catch (err) {
      showToast("Failed to update contact: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const setED = (newVal) => {
    const next = { ...editData, ...newVal };
    if (newVal.hasOwnProperty('first_name') || newVal.hasOwnProperty('last_name')) {
      next.contact_name = `${next.first_name || ""} ${next.last_name || ""}`.trim();
    }
    setEditData(next);
  };

  const partySchedules = SCHEDULES.filter(s => {
    const sPId = String(s.contact_id || "").trim();
    const isMatched = sPId === dpId || (dpDocId && sPId === dpDocId);
    return isMatched || partyInvestments.some(c => c.id === s.investment);
  }).sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return da - db;
  });
  
  const investedAmount = partyInvestments.reduce((sum, c) => {
    const amtStr = String(c.amount || 0).replace(/[^0-9.-]/g, '');
    return sum + (Number(amtStr) || 0);
  }, 0);

  const selectedInv = partyInvestments.find(i => i.id === selectedInvestmentId || i.investment_id === selectedInvestmentId);


  const contributions = partySchedules.filter(s => (s.payment_type || s.type) === "INVESTOR_PRINCIPAL_DEPOSIT" || (s.type === 'deposit'));
  const totalContributions = contributions.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0), 0);

  const withdrawals = partySchedules.filter(s => {
      const st = (s.PaymentStatus || s.status || "").toLowerCase();
      return st === "withdrawal" || st === "withdrawals" || st === "withdrawl";
  });
  const totalWithdrawals = withdrawals.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0), 0);

  const capitalBalance = totalContributions - Math.abs(totalWithdrawals);

  const distributions = partySchedules.filter(s => {
      const ty = (s.payment_type || s.type || "").toLowerCase();
      return ty.includes("interest") || ty.includes("distribution");
  });
  const distributedAmount = distributions.reduce((sum, s) => {
    const st = (s.status || s.PaymentStatus || "").trim();
    if (st === "Paid" || st === "Partial") {
      return sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0);
    }
    return sum;
  }, 0);
  
  const tabs = ["Edit Investment", "Investment Documents", "Capital Transactions", "Distributions", "Notes", "Investment Changelog", "Investment Sharing"];

  const handleSaveInvestment = async () => {
    if (!onUpdateInvestment) return;
    setSavingInvestment(true);
    try {
      await onUpdateInvestment(investmentEditData);
    } catch (err) {
      showToast("Failed to update investment: " + err.message, "error");
    } finally {
      setSavingInvestment(false);
    }
  };

  const setIED = (newVal) => setInvestmentEditData(prev => ({ ...prev, ...newVal }));

  const investorEditTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorInvestmentEditType") || {}).items || [];
  const borrowerEditTypeOpts = (DIMENSIONS.find(d => d.name === "BorrowerInvestmentEditType") || {}).items || [];
  const scheduleFrequencyOpts = (DIMENSIONS.find(d => d.name === "ScheduleFrequency" || d.name === "Schedule Frequency") || {}).items || ["Monthly", "Quarterly", "Semi-Annual", "Annual", "At Maturity"];
  const calculatorOpts = (DIMENSIONS.find(d => d.name === "CalculatorType") || {}).items || ["ACT/360", "30/360", "ACT/ACT", "ACT/365"];
  const FEES_DATA = (DIMENSIONS.find(d => d.name === "Fees") || {}).items || [];
  const scheduleStatusOpts = (DIMENSIONS.find(d => d.name === "ScheduleStatus" || d.name === "Schedule Status" || d.name === "PaymentStatus" || d.name === "Payment Status") || {}).items?.map(i => String(i || "").trim()).filter(Boolean) || ["Paid", "Due", "Partial", "Hold", "Not Paid", "Reinvested"];

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

  // REFACTORED: Tab Content Selector
  const renderTabContent = () => {
    if (viewMode === "detail") {
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

    // simple mode tabs
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
              <div style={{ height: 400 }}>
                <TanStackTable
                  data={partySchedules}
                  columns={getContactTransactionColumns(isDark, t, { 
                    DEALS, 
                    statusOptions: scheduleStatusOpts,
                    onStatusChange: handleUpdateStatus,
                    onEdit: (row) => setTxEditModal({ open: true, data: { ...row, status_edit: row.status, notes_edit: row.notes ?? "", payment_amount_edit: row.payment, due_date_edit: row.dueDate ?? "" } }) 
                  })}
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

            {!investmentEditData.id ? (
              <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>No investment selected or available.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FF label="Investment ID" t={t}>
                    <div style={{ padding: "10px 13px", background: isDark ? "rgba(255,255,255,0.03)" : "#f9f9f9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.textMuted, fontSize: 13, fontFamily: t.mono }}>{investmentEditData.id}</div>
                  </FF>
                  <FF label="Deal ID" t={t}>
                    <div style={{ padding: "10px 13px", background: isDark ? "rgba(255,255,255,0.03)" : "#f9f9f9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.textMuted, fontSize: 13, fontFamily: t.mono }}>{investmentEditData.deal_id || "—"}</div>
                  </FF>
                </div>
                
                <FF label="Investment Name" t={t}><FIn value={investmentEditData.investment_name} onChange={e => setIED({ investment_name: e.target.value })} placeholder="e.g. Initial Investment" t={t} /></FF>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FF label="Deal" t={t}><FSel value={investmentEditData.deal} onChange={e => setIED({ deal: e.target.value })} options={DEALS.map(d => d.name)} t={t} /></FF>
                  <FF label="Type" t={t}>
                    <FSel 
                      value={investmentEditData.type || investmentEditData.investment_type} 
                      onChange={e => setIED({ type: e.target.value, investment_type: e.target.value })} 
                      options={dp.role_type === "Borrower" ? borrowerEditTypeOpts : investorEditTypeOpts} 
                      t={t} 
                    />
                  </FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <FF label="Amount" t={t}><FIn value={investmentEditData.amount} onChange={e => setIED({ amount: e.target.value })} placeholder="$0" t={t} /></FF>
                  <FF label="Rate (%)" t={t}><FIn value={investmentEditData.rate} onChange={e => setIED({ rate: e.target.value, interest_rate: e.target.value })} placeholder="e.g. 10" t={t} /></FF>
                  <FF label="Frequency" t={t}><FSel value={investmentEditData.freq} onChange={e => setIED({ freq: e.target.value, payment_frequency: e.target.value })} options={scheduleFrequencyOpts} t={t} /></FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <FF label="Term (months)" t={t}><FIn value={investmentEditData.term_months} onChange={e => setIED({ term_months: e.target.value })} placeholder="e.g. 24" t={t} /></FF>
                  <FF label="Status" t={t}><FSel value={investmentEditData.status} onChange={e => setIED({ status: e.target.value })} options={["Open", "Active", "Closed"]} t={t} /></FF>
                  <FF label="Calculator" t={t}><FSel value={investmentEditData.calculator} onChange={e => setIED({ calculator: e.target.value })} options={calculatorOpts} t={t} /></FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FF label="Start Date" t={t}><FIn value={investmentEditData.start_date} onChange={e => setIED({ start_date: e.target.value })} t={t} type="date" /></FF>
                  <FF label="Maturity Date" t={t}><FIn value={investmentEditData.maturity_date} onChange={e => setIED({ maturity_date: e.target.value })} t={t} type="date" /></FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FF label="Payment Method" t={t}><FSel value={investmentEditData.payment_method} onChange={e => setIED({ payment_method: e.target.value })} options={paymentMethods} t={t} /></FF>
                  <FF label="Rollover at Maturity" t={t}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", height: 40 }}>
                        <input type="checkbox" checked={investmentEditData.rollover} onChange={e => setIED({ rollover: e.target.checked })} style={{ cursor: "pointer", width: 18, height: 18 }} />
                        <span style={{ marginLeft: 10, fontSize: 13, color: t.textSecondary }}>Rollover Principal</span>
                      </div>
                      {investmentEditData.rollover && (
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
                            <strong>Principal Rollover Enabled:</strong> The final principal payment will be marked as <strong>ROLLOVER</strong> in the schedule. Administrators should manually move these funds to a new investment record upon maturity.
                          </div>
                        </div>
                      )}
                    </div>
                  </FF>
                </div>

                {FEES_DATA.length > 0 && (
                  <FF label="Applicable Fees" t={t}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {FEES_DATA.map(f => {
                        const selected = (investmentEditData.feeIds || []).includes(f.id);
                        const toggleFee = () => {
                          const cur = investmentEditData.feeIds || [];
                          setIED({ feeIds: selected ? cur.filter(x => x !== f.id) : [...cur, f.id] });
                        };
                        return (
                          <div key={f.id} onClick={toggleFee} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: selected ? 600 : 400, padding: "6px 12px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease", background: selected ? (isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5") : t.chipBg, color: selected ? (isDark ? "#34D399" : "#059669") : t.textSecondary, border: `1px solid ${selected ? (isDark ? "rgba(52,211,153,0.4)" : "#A7F3D0") : t.chipBorder}` }}>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{selected ? "✓" : "+"}</span>
                            {f.name} {f.rate ? `(${f.rate})` : ""}
                          </div>
                        );
                      })}
                    </div>
                  </FF>
                )}

                <div style={{ marginTop: 12, pt: 12, borderTop: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    onClick={handleSaveInvestment} 
                    disabled={savingInvestment}
                    style={{ padding: "10px 24px", borderRadius: 10, background: t.accentGrad, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 14, boxShadow: `0 4px 12px ${t.accentShadow}`, opacity: savingInvestment ? 0.7 : 1 }}
                  >
                    {savingInvestment ? "Saving..." : "Save Investment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case "Distributions":
        const filteredDist = partySchedules.filter(s => {
          if (distFilter === "All") return true;
          const ty = (s.payment_type || s.type || "").toLowerCase();
          if (distFilter === "Interest") return ty.includes("interest") || ty.includes("distribution");
          if (distFilter === "Principal") return ty.includes("principal") || ty.includes("deposit") || ty.includes("received") || ty.includes("disbursement");
          if (distFilter === "Fee") return ty.includes("fee");
          return true;
        });
        const filteredTotal = filteredDist.reduce((sum, s) => {
          const st = (s.status || s.PaymentStatus || "").trim();
          if (st === "Paid" || st === "Partial") {
            return sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0);
          }
          return sum;
        }, 0);

        return (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {["All", "Interest", "Principal", "Fee"].map(f => (
                <button
                  key={f}
                  onClick={() => setDistFilter(f)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    background: distFilter === f ? t.accentGrad : (isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"),
                    color: distFilter === f ? "#fff" : t.textSecondary,
                    border: `1px solid ${distFilter === f ? "transparent" : t.surfaceBorder}`,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: distFilter === f ? `0 4px 10px ${t.accentShadow}` : "none"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>
                  {distFilter === "All" ? "All Transactions" : `${distFilter} Transactions`}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{fmtCurr(filteredTotal)}</div>
              </div>
              <div style={{ height: 400 }}>
                <TanStackTable
                  data={filteredDist}
                  columns={getContactTransactionColumns(isDark, t, { 
                    DEALS, 
                    statusOptions: scheduleStatusOpts,
                    onStatusChange: handleUpdateStatus,
                    onEdit: (row) => setTxEditModal({ open: true, data: { ...row, status_edit: row.status, notes_edit: row.notes ?? "", payment_amount_edit: row.payment, due_date_edit: row.dueDate ?? "" } }) 
                  })}
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
                placeholder="Write a note about this contact..."
                rows={4}
                style={{ width: "100%", padding: "10px 13px", borderRadius: 9, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(0,0,0,0.2)" : "#fff", color: t.text, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  disabled={savingNote || !noteText.trim()}
                  onClick={async () => {
                    if (!noteText.trim() || !onAddNote) return;
                    setSavingNote(true);
                    try {
                      const saved = await onAddNote({ text: noteText.trim() });
                      setNotes(prev => [saved, ...prev]);
                      setNoteText("");
                    } catch (err) {
                      showToast("Failed to save note: " + err.message, "error");
                    } finally {
                      setSavingNote(false);
                    }
                  }}
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
                      <span>{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</span>
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
            currentUser={currentUser}
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0 }} />
      <div ref={modalContainerRef} style={{ position: "relative", background: isDark ? "#0F0F0F" : "#fff", borderRadius: 16, padding: 0, width: resizeW || "95%", maxWidth: resizeW ? "none" : 1100, height: resizeH || "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.4)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB"}`, overflow: "hidden", transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`, minWidth: 480, minHeight: 360 }}>

        <div onMouseDown={onHeaderMouseDown} style={{ padding: "32px 40px 0 40px", flexShrink: 0, cursor: isDraggingModal ? "grabbing" : "grab", userSelect: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? "#fff" : "#111827", marginBottom: 4 }}>
                {[showData.first_name, showData.last_name].filter(Boolean).join(" ") || "—"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, color: t.textMuted }}>Profile:</span>
                  <Bdg status={showData.role_type || showData.role} isDark={isDark} />
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
              <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, background: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", border: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", color: t.textSecondary, transition: "background 0.2s" }}>×</button>
            </div>
          </div>

          {viewMode === "simple" && (
            <>
              <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
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

        <div style={{ flex: 1, overflow: "auto", padding: "32px 40px", background: isDark ? "#141414" : "#F9FAFB" }}>
          {renderTabContent()}
        </div>
        <div onMouseDown={onResizeStart} style={{ position: "absolute", right: 0, bottom: 0, width: 22, height: 22, cursor: "nwse-resize", zIndex: 10, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 4 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="13" x2="13" y2="2" stroke={isDark ? "#6B7280" : "#94A3B8"} strokeWidth="2" strokeLinecap="round"/>
            <line x1="7" y1="13" x2="13" y2="7" stroke={isDark ? "#6B7280" : "#94A3B8"} strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="13" x2="13" y2="12" stroke={isDark ? "#6B7280" : "#94A3B8"} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <Modal
        open={txEditModal.open}
        onClose={() => setTxEditModal({ open: false, data: null })}
        title={`Edit Transaction — ${txEditModal.data?.schedule_id || ""}`}
        onSave={handleSaveTx}
        width={480}
        t={t}
        isDark={isDark}
      >
        {txEditModal.data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FF label="Status" t={t}>
              <FSel
                value={txEditModal.data.status_edit}
                options={scheduleStatusOpts}
                onChange={e => setTxEditModal(m => ({ ...m, data: { ...m.data, status_edit: e.target.value } }))}
                t={t}
              />
            </FF>
            <FF label="Amount" t={t}>
              <FIn
                value={txEditModal.data.payment_amount_edit}
                onChange={e => setTxEditModal(m => ({ ...m, data: { ...m.data, payment_amount_edit: e.target.value } }))}
                placeholder="0.00"
                t={t}
              />
            </FF>
            <FF label="Due Date" t={t}>
              <FIn
                value={txEditModal.data.due_date_edit}
                onChange={e => setTxEditModal(m => ({ ...m, data: { ...m.data, due_date_edit: e.target.value } }))}
                type="date"
                t={t}
              />
            </FF>
            <FF label="Notes" t={t}>
              <textarea
                value={txEditModal.data.notes_edit}
                onChange={e => setTxEditModal(m => ({ ...m, data: { ...m.data, notes_edit: e.target.value } }))}
                rows={3}
                style={{ width: "100%", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, padding: "10px 13px", color: t.text, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
              />
            </FF>
          </div>
        )}
      </Modal>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
        </div>
      )}
    </div>
  );
};

export default InvestorSummaryModal;

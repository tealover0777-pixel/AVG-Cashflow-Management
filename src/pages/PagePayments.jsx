import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from "../components/TanStackTable";
import { getPaymentColumns, getBatchColumns, getLedgerColumns } from "../components/PaymentsTanStackConfig";
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { sortData, fmtCurr, fmtDate, splitInvestorName } from "../utils";
import { Modal, FF, FIn, FSel, DelModal, Tooltip, Bdg } from "../components";
import { useAuth } from "../AuthContext";

export default function PagePayments({ t, isDark, PAYMENTS = [], INVESTMENTS = [], CONTACTS = [], SCHEDULES = [], DIMENSIONS = [], ACH_BATCHES = [], LEDGER = [], collectionPath = "", achBatchPath = "", ledgerPath = "" }) {
  const { hasPermission, isSuperAdmin, user } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("PAYMENT_CREATE") || hasPermission("PAYMENTS_CREATE");
  const canUpdate = isSuperAdmin || hasPermission("PAYMENT_UPDATE") || hasPermission("PAYMENTS_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("PAYMENT_DELETE") || hasPermission("PAYMENTS_DELETE");

  const isLedgerEditable = isSuperAdmin || ["platform", "tenant_owner", "tenant_admin"].includes(user?.role);
  const isLedgerDeletable = isSuperAdmin || ["platform", "tenant_owner", "tenant_admin"].includes(user?.role);

  const [activeTab, setActiveTab] = useState("Payments");
  const [chip, setChip] = useState("All");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {}, type: "payment" });
  const [batchSummary, setBatchSummary] = useState(null); // Current Batch ID being viewed
  const [delT, setDelT] = useState(null);
  const [sel, setSel] = useState(new Set());
  
  const gridRef = useRef(null);
  const [pageSize, setPageSize] = useState(30);
  const [achConfig, setAchConfig] = useState(null);
  const [loadingAch, setLoadingAch] = useState(true);

  // Fetch ACH setup for the active tenant
  const { tenantId: authTenantId } = useAuth();
  const activeTenantId = collectionPath.split("/")[1] || authTenantId;

  useEffect(() => {
    if (activeTenantId) {
      setLoadingAch(true);
      getDoc(doc(db, "tenants", activeTenantId)).then(snap => {
        if (snap.exists()) {
          setAchConfig(snap.data()?.achSetup || { enabled: false });
        }
      }).finally(() => setLoadingAch(false));
    }
  }, [activeTenantId]);

  const sortedContacts = useMemo(() => {
    return [...CONTACTS].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [CONTACTS]);

  useEffect(() => {
    const calculatePageSize = () => {
      const viewportHeight = window.innerHeight;
      const gridContainerHeight = viewportHeight - 420;
      const availableForRows = gridContainerHeight - 90; 
      const calculatedRows = Math.floor(availableForRows / 40);
      const newPageSize = Math.max(30, calculatedRows); 
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

  const paymentStatusOpts = (DIMENSIONS.find(d => d.name === "PaymentStatus" || d.name === "Payment Status") || {}).items || ["Paid", "Due", "Partial", "Hold", "Not Paid", "Reinvested"];
  const achBatchStatusOpts = (DIMENSIONS.find(d => d.name === "ACHBatchStatus" || d.name === "ACH Batch Status") || {}).items || ["VERSION_CREATED", "STATUS_UPDATED", "PAYMENT_FAILED"];

  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const openAddPayment = () => setModal({ open: true, mode: "add", type: "payment", data: { investment_id: "", contact_name: "", first_name: "", last_name: "", payment_type: "Principal", amount: "", payment_date: "", payment_method: "Wire", direction: "Received", status: "Pending", notes: "" } });
  const openEditPayment = r => {
    const contactName = r.contact_name || r.contact || r.party_name || r.party || "";
    const parts = contactName.split(' ');
    setModal({ open: true, mode: "edit", type: "payment", data: {
      ...r,
      investment_id: r.investment_id || r.investment || "",
      contact_name: contactName,
      first_name: r.first_name || parts[0] || "",
      last_name: r.last_name || parts.slice(1).join(' ') || "",
      payment_type: r.payment_type || r.type || "",
      payment_date: r.payment_date || r.date || "",
      payment_method: r.payment_method || r.method || "",
    } });
  };
  
  const openAddBatch = () => setModal({ open: true, mode: "add", type: "batch", data: { batch_id: `B${Date.now().toString().slice(-6)}`, status: "VERSION_CREATED", notes: "" } });
  const openEditBatch = r => setModal({ open: true, mode: "edit", type: "batch", data: { ...r } });

  const openEditLedger = r => setModal({ open: true, mode: "edit", type: "ledger", data: { 
    ...r,
    amount: r.amount || 0,
    note: r.note || "",
    entity_type: r.entity_type || "",
    entity_id: r.entity_id || "",
    created_at: r.created_at ? (typeof r.created_at.toDate === 'function' ? r.created_at.toDate().toISOString().split('T')[0] : r.created_at) : ""
  } });

  const handleSave = async () => {
    const d = modal.data;
    const type = modal.type;
    let payload = {};
    let path = "";

    if (type === "payment") {
      payload = {
        investment_id: d.investment_id || "",
        contact_name: `${d.first_name || ""} ${d.last_name || ""}`.trim(),
        first_name: d.first_name || "",
        last_name: d.last_name || "",
        payment_type: d.payment_type || "",
        amount: d.amount ? Number(String(d.amount).replace(/[^0-9.-]/g, "")) || null : null,
        payment_date: d.payment_date || null,
        payment_method: d.payment_method || "",
        direction: d.direction || "",
        status: d.status || "Pending",
        batch_id: d.batch_id || "", // Ensure batch_id is saved
        notes: d.notes || "",
        updated_at: serverTimestamp(),
      };
      path = collectionPath;
    } else if (type === "batch") {
      payload = {
        batch_id: d.batch_id || "",
        status: d.status || "",
        notes: d.notes || "",
        updated_at: serverTimestamp(),
      };
      path = achBatchPath;
    } else if (type === "ledger") {
      payload = {
        entity_type: d.entity_type || "",
        entity_id: d.entity_id || "",
        amount: d.amount ? Number(String(d.amount).replace(/[^0-9.-]/g, "")) || 0 : 0,
        note: d.note || "",
        created_at: d.created_at ? new Date(d.created_at) : serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      path = ledgerPath;
    }

    try {
      if (modal.mode === "edit" && d.docId) {
        const docRef = d._path ? doc(db, d._path) : doc(db, path, d.docId);
        await updateDoc(docRef, payload);
      } else {
        await addDoc(collection(db, path), { ...payload, created_at: serverTimestamp() });
      }
    } catch (err) { console.error(`Save ${type} error:`, err); }
    close();
  };

  const handleDelete = async () => {
    if (!delT || !delT.docId) return;
    let path = collectionPath;
    if (activeTab === "ACH Batches") path = achBatchPath;
    if (activeTab === "Ledger") path = ledgerPath;
    
    try {
      await deleteDoc(doc(db, path, delT.docId));
      setDelT(null);
    } catch (err) { console.error(`Delete ${activeTab} error:`, err); }
  };

  const permissions = { canUpdate, canDelete };
  const columnDefs = useMemo(() => {
    const editCb = activeTab === "Payments" ? openEditPayment : (activeTab === "ACH Batches" ? openEditBatch : openEditLedger);
    const delCb = (target) => setDelT(target);
    const batchSummaryCb = (batchId) => setBatchSummary(batchId);

    if (activeTab === "Payments") return getPaymentColumns(permissions, isDark, t, editCb, delCb, batchSummaryCb);
    if (activeTab === "ACH Batches") return getBatchColumns(permissions, isDark, t, editCb, delCb, batchSummaryCb);
    
    const ledgerPerms = { 
      canUpdate: isLedgerEditable, 
      canDelete: isLedgerDeletable 
    };
    return getLedgerColumns(ledgerPerms, isDark, t, editCb, delCb);
  }, [activeTab, permissions, isDark, t, openEditPayment, openEditBatch, openEditLedger, isLedgerEditable, isLedgerDeletable]);

  const rowData = useMemo(() => {
    let baseData = [];
    if (activeTab === "Payments") {
      // Include actual payments
      const payments = PAYMENTS;
      
      // Include "Withdrawal" schedules that aren't processed yet
      const withdrawals = SCHEDULES.filter(s => {
        const type = (s.type || "").toLowerCase();
        const status = (s.status || "").toLowerCase();
        // Check for withdrawal type or status and ensure it's not already "Paid" or "Completed"
        const isWithdrawal = type.includes("withdrawal") || type.includes("withdrawl")
          || status.includes("withdrawal") || status.includes("withdrawl");
        return isWithdrawal && status !== "paid" && status !== "completed";
      }).map(s => ({
        ...s,
        id: s.id || s.docId,
        investment: s.investment || s.investment_id || "",
        amount: s.payment || s.amount || 0,
        date: s.dueDate || s.date || "",
        direction: "Sent", // Withdrawals are always outgoing
        status: s.status || "Pending",
        _isSchedule: true // Flag to distinguish from actual payment record if needed
      }));

      // Include "Paid" or "Partial" schedules that are part of a distribution memo
      const memoSchedules = SCHEDULES.filter(s => {
        const sStatus = (s.status || "").toLowerCase();
        return (sStatus === "paid" || sStatus === "partial") && s.dist_memo_id;
      }).map(s => {
        const contact = CONTACTS.find(c => c.id === s.contact_id || c.docId === s.contact_id);
        const name = contact?.name || s.contact_name || s.investor || "";
        const { firstName, lastName } = contact?.first_name ? { firstName: contact.first_name, lastName: contact.last_name || "" } : splitInvestorName(name);
        
        return {
          ...s,
          id: s.id || s.docId,
          investment: s.investment_id || s.investment || "",
          contact_name: name,
          first_name: firstName,
          last_name: lastName,
          amount: s.signed_payment_amount || s.payment_amount || s.payment || 0,
          date: s.due_date || s.dueDate || "",
          direction: "Sent",
          status: s.status || "Paid",
          _isSchedule: true
        };
      });

      const merged = [...payments, ...withdrawals, ...memoSchedules];
      baseData = chip === "All" ? merged : merged.filter(p => p.direction === chip);
    } else if (activeTab === "ACH Batches") {
      baseData = ACH_BATCHES;
    } else {
      baseData = LEDGER;
    }
    return baseData;
  }, [activeTab, chip, PAYMENTS, SCHEDULES, ACH_BATCHES, LEDGER]);

  const handleBulkBatchAssign = async (batchId) => {
    if (!batchId) return;
    const selectedIds = Array.from(sel);
    const toUpdate = rowData.filter(r => selectedIds.includes(r.id));
    
    try {
      for (const item of toUpdate) {
        const ref = item._path ? doc(db, item._path) : doc(db, collectionPath, item.docId);
        await updateDoc(ref, { 
          batch_id: batchId,
          updated_at: serverTimestamp()
        });
      }
      setSel(new Set());
    } catch (err) {
      console.error("Bulk batch assign error:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (sel.size === 0) return;
    const selectedIds = Array.from(sel);
    const toDelete = rowData.filter(r => selectedIds.includes(r.id));
    
    if (!window.confirm(`Are you sure you want to delete ${sel.size} items?`)) return;

    try {
      const { writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);
      
      let path = collectionPath;
      if (activeTab === "ACH Batches") path = achBatchPath;
      if (activeTab === "Ledger") path = ledgerPath;

      for (const item of toDelete) {
        const ref = item._path ? doc(db, item._path) : doc(db, path, item.docId || item.id);
        batch.delete(ref);
      }
      
      await batch.commit();
      setSel(new Set());
    } catch (err) {
      console.error("Bulk delete error:", err);
    }
  };

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Payments & ACH Batches</h1>
        <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage transactions, batches, and audit trails</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {activeTab === "Payments" && canCreate && (
          <Tooltip text="Record a new cash receipt or disbursement" t={t}>
            <button className="primary-btn" onClick={openAddPayment} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Record Payment
            </button>
          </Tooltip>
        )}
        {activeTab === "ACH Batches" && canCreate && (
          <Tooltip text="Create a new ACH batch record" t={t}>
            <button className="primary-btn" onClick={openAddBatch} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Create Batch
            </button>
          </Tooltip>
        )}
      </div>
    </div>

    <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", padding: 4, borderRadius: 14, display: "inline-flex", gap: 4, marginBottom: 24, border: `1px solid ${t.surfaceBorder}` }}>
      {["Payments", "ACH Batches", "Ledger"].map(tab => {
        const isA = activeTab === tab;
        return (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "10px 22px", borderRadius: 11, fontSize: 13, fontWeight: 600, background: isA ? t.accentGrad : "transparent", color: isA ? "#fff" : t.textMuted, border: "none", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: isA ? `0 4px 12px ${t.accentShadow}` : "none" }}>{tab}</button>
        );
      })}
    </div>

    {activeTab === "ACH Batches" && (
      <div style={{ 
        marginBottom: 20, 
        padding: "16px 20px", 
        borderRadius: 12, 
        background: achConfig?.enabled ? (isDark ? "rgba(52,211,153,0.05)" : "#f0fdf4") : (isDark ? "rgba(248,113,113,0.05)" : "#fef2f2"),
        border: `1px solid ${achConfig?.enabled ? (isDark ? "rgba(52,211,153,0.2)" : "#bbf7d0") : (isDark ? "rgba(248,113,113,0.2)" : "#fecaca")}`,
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        gap: 16,
        animation: "slideIn 0.3s ease-out"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: achConfig?.enabled ? t.accentGrad : (isDark ? "#2d0a0a" : "#fee2e2"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {achConfig?.enabled ? "🏦" : "⚠️"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: t.text }}>
              {achConfig?.enabled ? "ACH Infrastructure Active" : "ACH Generation Disabled"}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted }}>
              {achConfig?.enabled 
                ? `Ready for NACHA generation using ${achConfig.odfiName || "Authorized Bank"} (${achConfig.originatorId || "No ID Set"})` 
                : "Your banking credentials must be configured in Company settings before processing payments."}
            </div>
          </div>
        </div>
        {!achConfig?.enabled && (
          <button onClick={() => window.location.hash = "#Company"} style={{ padding: "8px 16px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Finalize Setup
          </button>
        )}
      </div>
    )}

    {activeTab === "Payments" && (
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["All", "Received", "Sent"].map(f => {
          const isA = chip === f;
          return <span key={f} onClick={() => setChip(f)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{f}</span>;
        })}
      </div>
    )}

    <div style={{ height: "calc(100vh - 420px)", width: "100%", minHeight: "500px", position: "relative" }}>
      <TanStackTable
        ref={gridRef}
        data={rowData}
        columns={columnDefs}
        pageSize={pageSize}
        t={t}
        isDark={isDark}
        onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.id)))}
      />

      {/* Bulk Actions Bar */}
      {sel.size > 0 && (activeTab === "Payments" || activeTab === "Ledger") && (
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: isDark ? "#1C1917" : "#fff", padding: "12px 24px", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", border: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", gap: 20, zIndex: 100, animation: "slideUp 0.3s ease-out" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{sel.size} selected</div>
          <div style={{ height: 20, width: 1, background: t.surfaceBorder }} />
          
          {activeTab === "Payments" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: t.textMuted }}>Assign to Batch:</span>
              <select 
                onChange={(e) => handleBulkBatchAssign(e.target.value)}
                value=""
                style={{ padding: "6px 12px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", border: `1px solid ${t.surfaceBorder}`, color: t.text, fontSize: 12, outline: "none" }}
              >
                <option value="" disabled>Select Batch...</option>
                {ACH_BATCHES.map(b => <option key={b.id} value={b.batch_id}>{b.batch_id} ({b.status})</option>)}
              </select>
            </div>
          )}

          {((activeTab === "Ledger" && isLedgerDeletable) || (activeTab === "Payments" && canDelete)) && (
            <button 
              onClick={handleBulkDelete}
              style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
            >
              Delete Selected
            </button>
          )}

          <button onClick={() => setSel(new Set())} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
        </div>
      )}
    </div>

    {/* Modals */}
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? `New ${modal.type}` : `Edit ${modal.type}`} onSave={handleSave} width={480} t={t} isDark={isDark}>
      {modal.type === "payment" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Direction" t={t}><FSel value={modal.data.direction} onChange={e => setF("direction", e.target.value)} options={["Received", "Sent"]} t={t} /></FF>
            <FF label="Payment Type" t={t}><FSel value={modal.data.payment_type} onChange={e => setF("payment_type", e.target.value)} options={["Interest", "Principal", "Interest + Principal", "Disbursement", "Fee", "Rollover"]} t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FF label="Investment ID" t={t}><FSel value={modal.data.investment_id} onChange={e => setF("investment_id", e.target.value)} options={INVESTMENTS.map(i => i.id)} t={t} /></FF>
            <FF label="First Name" t={t}><FIn value={modal.data.first_name} onChange={e => setF("first_name", e.target.value)} t={t} /></FF>
            <FF label="Last Name" t={t}><FIn value={modal.data.last_name} onChange={e => setF("last_name", e.target.value)} t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Amount" t={t}><FIn value={modal.data.amount} onChange={e => setF("amount", e.target.value)} placeholder="0.00" t={t} /></FF>
            <FF label="Date" t={t}><FIn value={modal.data.payment_date} onChange={e => setF("payment_date", e.target.value)} type="date" t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Method" t={t}><FSel value={modal.data.payment_method} onChange={e => setF("payment_method", e.target.value)} options={["Wire", "ACH", "Check", "Internal"]} t={t} /></FF>
            <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={paymentStatusOpts} t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Batch ID" t={t}>
              <FSel 
                value={modal.data.batch_id} 
                onChange={e => setF("batch_id", e.target.value)} 
                options={["", ...ACH_BATCHES.map(b => b.batch_id)]} 
                t={t} 
              />
            </FF>
            <FF label="Notes" t={t}><FIn value={modal.data.notes} onChange={e => setF("notes", e.target.value)} placeholder="Optional note..." t={t} /></FF>
          </div>
        </>
      ) : modal.type === "batch" ? (
        <>
          <FF label="Batch ID" t={t}><FIn value={modal.data.batch_id} onChange={e => setF("batch_id", e.target.value)} t={t} /></FF>
          <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={achBatchStatusOpts} t={t} /></FF>
          <FF label="Notes" t={t}><FIn value={modal.data.notes} onChange={e => setF("notes", e.target.value)} placeholder="Batch notes..." t={t} /></FF>
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Entity Type" t={t}><FIn value={modal.data.entity_type} onChange={e => setF("entity_type", e.target.value)} t={t} /></FF>
            <FF label="Entity ID" t={t}><FIn value={modal.data.entity_id} onChange={e => setF("entity_id", e.target.value)} t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Amount" t={t}><FIn value={modal.data.amount} onChange={e => setF("amount", e.target.value)} placeholder="0.00" t={t} /></FF>
            <FF label="Date" t={t}><FIn value={modal.data.created_at} onChange={e => setF("created_at", e.target.value)} type="date" t={t} /></FF>
          </div>
          <FF label="Note" t={t}><FIn value={modal.data.note} onChange={e => setF("note", e.target.value)} placeholder="Ledger entry note..." t={t} /></FF>
        </>
      )}
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDelete} label={`This ${activeTab.slice(0, -1)}`} t={t} isDark={isDark} />

    {/* Batch Summary Modal */}
    <Modal 
      open={!!batchSummary} 
      onClose={() => setBatchSummary(null)} 
      title={`Batch Summary: ${batchSummary}`} 
      onSave={null} 
      width={700} 
      t={t} 
      isDark={isDark}
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.surfaceBorder}`, color: t.textSubtle, textAlign: 'left' }}>
              <th style={{ padding: '12px 8px' }}>Date</th>
              <th style={{ padding: '12px 8px' }}>Contact</th>
              <th style={{ padding: '12px 8px' }}>Investment</th>
              <th style={{ padding: '12px 8px' }}>Type</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const matchedPayments = PAYMENTS.filter(p => p.batch_id === batchSummary);
              const matchedWithdrawals = SCHEDULES.filter(s => {
                const t2 = (s.type || "").toLowerCase();
                const st = (s.status || "").toLowerCase();
                const isWithdrawal = t2.includes("withdrawal") || t2.includes("withdrawl") || st.includes("withdrawal") || st.includes("withdrawl");
                return isWithdrawal && s.batch_id === batchSummary;
              });
              const matchedMemoSchedules = SCHEDULES.filter(s => {
                const sStatus = (s.status || "").toLowerCase();
                return (sStatus === "paid" || sStatus === "partial") && s.dist_memo_id && s.batch_id === batchSummary;
              });
              
              // Map memo schedules to match the payment/withdrawal row structure
              const mappedMemoSchedules = matchedMemoSchedules.map(s => {
                const contact = CONTACTS.find(c => c.id === s.contact_id || c.docId === s.contact_id);
                return {
                  ...s,
                  date: s.due_date || s.dueDate,
                  contact: contact?.name || s.contact_name || s.investor || s.contact_id,
                  investment: s.investment_id || s.investment,
                  type: s.payment_type || s.type,
                  amount: s.signed_payment_amount || s.payment_amount || s.payment || 0
                };
              });
              
              const allItems = [...matchedPayments, ...matchedWithdrawals, ...mappedMemoSchedules].sort((a, b) => new Date(a.date || a.dueDate) - new Date(b.date || b.dueDate));
              
              if (allItems.length === 0) return <tr><td colSpan="5" style={{ padding: 24, textAlign: 'center', color: t.textSubtle }}>No payments assigned to this batch.</td></tr>;
              
              let total = 0;
              return (<>
                {allItems.map((item, idx) => {
                  const amt = item.amount || item.payment || 0;
                  total += amt;
                  return (
                    <tr key={idx} style={{ borderBottom: idx === allItems.length - 1 ? 'none' : `1px solid ${t.rowDivider}` }}>
                      <td style={{ padding: '12px 8px', fontFamily: t.mono, fontSize: 11 }}>{fmtDate(item.date || item.dueDate)}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 500 }}>{item.contact || item.party}</td>
                      <td style={{ padding: '12px 8px', fontFamily: t.mono, fontSize: 11 }}>{item.investment}</td>
                      <td style={{ padding: '12px 8px', fontSize: 12 }}>{item.type}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: t.mono, fontWeight: 700, color: amt < 0 ? "#F87171" : "#34D399" }}>{fmtCurr(amt)}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", fontWeight: 700 }}>
                  <td colSpan="4" style={{ padding: '14px 8px', textAlign: 'right' }}>Total Batch Volume</td>
                  <td style={{ padding: '14px 8px', textAlign: 'right', fontFamily: t.mono, color: total < 0 ? "#F87171" : "#34D399" }}>{fmtCurr(total)}</td>
                </tr>
              </>);
            })()}
          </tbody>
        </table>
      </div>
    </Modal>
  </>);
}
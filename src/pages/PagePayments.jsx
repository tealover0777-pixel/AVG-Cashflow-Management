import { useState, useMemo, useRef, useEffect } from "react";
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

import 'ag-grid-community/styles/ag-grid.css';
import '../components/ag-grid/ag-grid-theme.css';
import { getPaymentColumnDefs, getBatchColumnDefs, getLedgerColumnDefs } from '../components/ag-grid/PaymentsGridConfig';

import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData, fmtCurr } from "../utils";
import { Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip, Bdg } from "../components";
import { useAuth } from "../AuthContext";

export default function PagePayments({ t, isDark, PAYMENTS = [], INVESTMENTS = [], CONTACTS = [], SCHEDULES = [], DIMENSIONS = [], ACH_BATCHES = [], LEDGER = [], collectionPath = "", achBatchPath = "", ledgerPath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("PAYMENT_CREATE") || hasPermission("PAYMENTS_CREATE");
  const canUpdate = isSuperAdmin || hasPermission("PAYMENT_UPDATE") || hasPermission("PAYMENTS_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("PAYMENT_DELETE") || hasPermission("PAYMENTS_DELETE");

  const [activeTab, setActiveTab] = useState("Payments");
  const [chip, setChip] = useState("All");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {}, type: "payment" });
  const [delT, setDelT] = useState(null);
  
  const gridRef = useRef(null);
  const [pageSize, setPageSize] = useState(30);

  // Dynamically calculate page size based on available vertical space
  useEffect(() => {
    const calculatePageSize = () => {
      const rowHeight = 42; 
      const headerHeight = 56; 
      const viewportHeight = window.innerHeight;

      // Grid container matches: calc(100vh - 420px)
      const gridContainerHeight = viewportHeight - 420;
      const availableForRows = gridContainerHeight - headerHeight;
      const calculatedRows = Math.floor(availableForRows / rowHeight);

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

  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.paginationSetPageSize(pageSize);
    }
  }, [pageSize, activeTab]);

  const paymentStatusOpts = (DIMENSIONS.find(d => d.name === "PaymentStatus" || d.name === "Payment Status") || {}).items || ["Pending", "Paid", "Failed"];
  const achBatchStatusOpts = (DIMENSIONS.find(d => d.name === "ACHBatchStatus" || d.name === "ACH Batch Status") || {}).items || ["VERSION_CREATED", "STATUS_UPDATED", "PAYMENT_FAILED"];

  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  // --- Actions ---
  const openAddPayment = () => setModal({ open: true, mode: "add", type: "payment", data: { investment_id: "", party_name: "", payment_type: "Principal", amount: "", payment_date: "", payment_method: "Wire", direction: "Received", status: "Pending", notes: "" } });
  const openEditPayment = r => setModal({ open: true, mode: "edit", type: "payment", data: { ...r } });
  
  const openAddBatch = () => setModal({ open: true, mode: "add", type: "batch", data: { batch_id: `B${Date.now().toString().slice(-6)}`, status: "VERSION_CREATED", notes: "" } });
  const openEditBatch = r => setModal({ open: true, mode: "edit", type: "batch", data: { ...r } });

  const handleSave = async () => {
    const d = modal.data;
    const type = modal.type;
    let payload = {};
    let path = "";

    if (type === "payment") {
      payload = {
        investment_id: d.investment_id || "",
        party_name: d.party_name || "",
        payment_type: d.payment_type || "",
        amount: d.amount ? Number(String(d.amount).replace(/[^0-9.-]/g, "")) || null : null,
        payment_date: d.payment_date || null,
        payment_method: d.payment_method || "",
        direction: d.direction || "",
        status: d.status || "Pending",
        batch_status: d.batch_status || "",
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
    }

    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, path, d.docId), payload);
      } else {
        await addDoc(collection(db, path), { ...payload, created_at: serverTimestamp() });
      }
    } catch (err) { console.error(`Save ${type} error:`, err); }
    close();
  };

  const handleDelete = async () => {
    if (!delT || !delT.docId) return;
    const path = activeTab === "Payments" ? collectionPath : achBatchPath;
    try {
      await deleteDoc(doc(db, path, delT.docId));
      setDelT(null);
    } catch (err) { console.error(`Delete ${activeTab} error:`, err); }
  };

  // --- AG Grid Config ---
  const permissions = { canUpdate, canDelete };
  
  const columnDefs = useMemo(() => {
    if (activeTab === "Payments") return getPaymentColumnDefs(permissions, isDark, t);
    if (activeTab === "ACH Batches") return getBatchColumnDefs(permissions, isDark, t);
    return getLedgerColumnDefs(permissions, isDark, t);
  }, [activeTab, permissions, isDark, t]);

  const rowData = useMemo(() => {
    let baseData = [];
    if (activeTab === "Payments") {
      baseData = chip === "All" ? PAYMENTS : PAYMENTS.filter(p => p.direction === chip);
    } else if (activeTab === "ACH Batches") {
      baseData = ACH_BATCHES;
    } else {
      baseData = LEDGER;
    }
    return baseData;
  }, [activeTab, chip, PAYMENTS, ACH_BATCHES, LEDGER]);

  const context = useMemo(() => ({
    isDark,
    t,
    permissions,
    dimensions: DIMENSIONS,
    callbacks: {
      onEdit: activeTab === "Payments" ? openEditPayment : openEditBatch,
      onDelete: setDelT
    }
  }), [isDark, t, permissions, DIMENSIONS, activeTab]);

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
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: isA ? t.accentGrad : "transparent", color: isA ? "#fff" : t.textMuted, border: "none", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: isA ? `0 4px 12px ${t.accentShadow}` : "none" }}>{tab}</button>
        );
      })}
    </div>

    {activeTab === "Payments" && (
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["All", "Received", "Sent"].map(f => {
          const isA = chip === f;
          return <span key={f} onClick={() => setChip(f)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{f}</span>;
        })}
      </div>
    )}

    <div
      className={`ag-theme-custom ${isDark ? 'dark-mode' : 'light-mode'}`}
      style={{ height: "calc(100vh - 420px)", minHeight: "500px" }}
    >
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        context={context}
        animateRows={true}
        pagination={true}
        paginationPageSize={pageSize}
        suppressPaginationPanel={true}
        suppressCellFocus={true}
        columnHoverHighlight={true}
        theme="legacy"
        onColumnResized={(event) => {
          // Persist column widths to localStorage
          if (event.finished) {
            const columnState = event.api.getColumnState();
            localStorage.setItem(`paymentsColumnState_${activeTab}`, JSON.stringify(columnState));
          }
        }}
        onGridReady={(params) => {
          // Restore saved column widths from localStorage
          const savedState = localStorage.getItem(`paymentsColumnState_${activeTab}`);
          if (savedState) {
            params.api.applyColumnState({
              state: JSON.parse(savedState),
              applyOrder: false
            });
          }
        }}
      />
    </div>

    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: t.textSubtle }}>
        Showing <strong style={{ color: t.textSecondary }}>{Math.min(rowData.length, pageSize)}</strong> of <strong style={{ color: t.textSecondary }}>{rowData.length}</strong> {activeTab.toLowerCase()}
      </span>
      <Pagination totalPages={Math.ceil(rowData.length / pageSize)} currentPage={1} onPageChange={(newPage) => gridRef.current?.api.paginationGoToPage(newPage - 1)} t={t} />
    </div>

    {/* Modals */}
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? `New ${modal.type}` : `Edit ${modal.type}`} onSave={handleSave} width={480} t={t} isDark={isDark}>
      {modal.type === "payment" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Direction" t={t}><FSel value={modal.data.direction} onChange={e => setF("direction", e.target.value)} options={["Received", "Sent"]} t={t} /></FF>
            <FF label="Payment Type" t={t}><FSel value={modal.data.payment_type} onChange={e => setF("payment_type", e.target.value)} options={["Interest", "Principal", "Interest + Principal", "Disbursement", "Fee", "Rollover"]} t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Investment ID" t={t}><FSel value={modal.data.investment_id} onChange={e => setF("investment_id", e.target.value)} options={INVESTMENTS.map(i => i.id)} t={t} /></FF>
            <FF label="Party" t={t}><FSel value={modal.data.party_name} onChange={e => setF("party_name", e.target.value)} options={CONTACTS.map(c => c.name)} t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Amount" t={t}><FIn value={modal.data.amount} onChange={e => setF("amount", e.target.value)} placeholder="0.00" t={t} /></FF>
            <FF label="Date" t={t}><FIn value={modal.data.payment_date} onChange={e => setF("payment_date", e.target.value)} type="date" t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Method" t={t}><FSel value={modal.data.payment_method} onChange={e => setF("payment_method", e.target.value)} options={["Wire", "ACH", "Check", "Internal"]} t={t} /></FF>
            <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={paymentStatusOpts} t={t} /></FF>
          </div>
          <FF label="Notes" t={t}><FIn value={modal.data.notes} onChange={e => setF("notes", e.target.value)} placeholder="Optional note..." t={t} /></FF>
        </>
      ) : (
        <>
          <FF label="Batch ID" t={t}><FIn value={modal.data.batch_id} onChange={e => setF("batch_id", e.target.value)} t={t} /></FF>
          <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={achBatchStatusOpts} t={t} /></FF>
          <FF label="Notes" t={t}><FIn value={modal.data.notes} onChange={e => setF("notes", e.target.value)} placeholder="Batch notes..." t={t} /></FF>
        </>
      )}
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDelete} label={`This ${activeTab.slice(0, -1)}`} t={t} isDark={isDark} />
  </>);
}
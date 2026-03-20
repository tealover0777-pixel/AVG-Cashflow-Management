import { useState, useMemo, useRef, useEffect } from "react";
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

import 'ag-grid-community/styles/ag-grid.css';
import '../components/ag-grid/ag-grid-theme.css';
import { getColumnDefs } from '../components/ag-grid/FeesGridConfig';
import { db } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { StatCard, Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";

export default function PageFees({ t, isDark, FEES_DATA = [], DIMENSIONS = [], collectionPath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("FEE_CREATE");
  const canUpdate = isSuperAdmin || hasPermission("FEE_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("FEE_DELETE");
  const feeChargeAtOpts = (DIMENSIONS.find(d => d.name === "FeeChargeAt") || {}).items || [];
  const feeFrequencyOpts = (DIMENSIONS.find(d => d.name === "FeeFrequency") || {}).items || [];
  const feeTypeOpts = (DIMENSIONS.find(d => d.name === "FeeType") || {}).items || [];
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const gridRef = useRef(null);
  const [pageSize, setPageSize] = useState(30);

  // Dynamically calculate page size based on available vertical space
  useEffect(() => {
    const calculatePageSize = () => {
      const rowHeight = 42; // AG Grid default row height
      const headerHeight = 56; // AG Grid header height + padding
      const viewportHeight = window.innerHeight;

      // Grid container matches: calc(100vh - 420px)
      const gridContainerHeight = viewportHeight - 420;
      const availableForRows = gridContainerHeight - headerHeight;
      const calculatedRows = Math.floor(availableForRows / rowHeight);

      const newPageSize = Math.max(30, calculatedRows); // Minimum 30 rows
      setPageSize(newPageSize);
    };

    // Initial calculation with a slight delay to ensure layout is settled
    const timer = setTimeout(calculatePageSize, 100);

    calculatePageSize();
    window.addEventListener('resize', calculatePageSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePageSize);
    };
  }, []);

  // Update grid when pageSize changes
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.paginationSetPageSize(pageSize);
    }
  }, [pageSize]);
  const nextFeeId = (() => {
    if (FEES_DATA.length === 0) return "F10001";
    const maxNum = Math.max(...FEES_DATA.map(f => { const m = String(f.id).match(/^F(\d+)$/); return m ? Number(m[1]) : 0; }));
    return "F" + (maxNum + 1);
  })();
  const openAdd = () => setModal({ open: true, mode: "add", data: { id: nextFeeId, name: "", fee_type: "", method: "% of Amount", rate: "", applied_to: "Principal Amount", fee_charge_at: "", fee_frequency: "", description: "", direction: "IN" } });
  const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));
  const handleSaveFee = async () => {
    const d = modal.data;
    const payload = {
      fee_name: d.name || "",
      fee_type: d.fee_type || "",
      calculation_method: d.method || "",
      default_rate: d.rate || "",
      applied_to: d.applied_to || "Principal Amount",
      direction: d.direction || "IN",
      fee_charge_at: d.fee_charge_at || "",
      fee_frequency: d.fee_frequency || "",
      description: d.description || "",
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, collectionPath, d.docId), payload);
      } else {
        await setDoc(doc(db, collectionPath, d.id), { ...payload, created_at: serverTimestamp() });
      }
    } catch (err) { console.error("Save fee error:", err); }
    close();
  };

  const handleDeleteFee = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete fee error:", err); }
  };
  // AG Grid: Column definitions
  const permissions = { canUpdate, canDelete };
  const columnDefs = useMemo(() => {
    return getColumnDefs(permissions, isDark, t);
  }, [permissions, isDark, t]);

  // AG Grid: Context for cell renderers
  const context = useMemo(() => ({
    isDark,
    t,
    permissions,
    callbacks: {
      onEdit: openEdit,
      onDelete: (target) => setDelT({ id: target.id, name: target.name, docId: target.docId })
    }
  }), [isDark, t, permissions]);
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Fees</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Define and manage fee structures</p></div>
      {canCreate && <Tooltip text="Define a new fee structure" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Fee</button></Tooltip>}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {[{ label: "Total Fees", value: FEES_DATA.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "% of Amount", value: FEES_DATA.filter(f => f.method === "% of Amount").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Fixed Amount", value: FEES_DATA.filter(f => f.method === "Fixed Amount").length, accent: isDark ? "#A78BFA" : "#7C3AED", bg: isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE" }, { label: "Recurring", value: FEES_DATA.filter(f => f.fee_frequency !== "One-time" && f.fee_frequency !== "Per occurrence").length, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    <div
      className={`ag-theme-custom ${isDark ? 'dark-mode' : 'light-mode'}`}
      style={{ height: 'calc(100vh - 420px)', minHeight: '500px' }}
    >
      <AgGridReact
        ref={gridRef}
        rowData={FEES_DATA}
        columnDefs={columnDefs}
        context={context}
        animateRows={true}
        pagination={true}
        paginationPageSize={pageSize}
        suppressPaginationPanel={true}
        suppressCellFocus={true}
        rowHover={true}
        columnHover={true}
        onColumnResized={(event) => {
          if (event.finished) {
            const columnState = event.api.getColumnState();
            localStorage.setItem('feesColumnState', JSON.stringify(columnState));
          }
        }}
        onGridReady={(params) => {
          const savedState = localStorage.getItem('feesColumnState');
          if (savedState) {
            params.api.applyColumnState({
              state: JSON.parse(savedState),
              applyOrder: false
            });
          }
        }}
      />
    </div>

    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{Math.min(FEES_DATA.length, pageSize)}</strong> of <strong style={{ color: t.textSecondary }}>{FEES_DATA.length}</strong> fees</span><Pagination totalPages={Math.ceil(FEES_DATA.length / pageSize)} currentPage={1} onPageChange={(newPage) => gridRef.current?.api.paginationGoToPage(newPage - 1)} t={t} /></div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Fee" : "Edit Fee"} onSave={handleSaveFee} t={t} isDark={isDark}>
      <FF label="Fee ID" t={t}>
        <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
      </FF>
      <FF label="Fee Name" t={t}><FIn value={modal.data.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Origination Fee" t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Fee Type" t={t}><FSel value={modal.data.fee_type || ""} onChange={e => {
          const feeType = e.target.value;
          // Auto-set "Applied To" based on Fee Type
          let appliedTo = "Principal Amount"; // default
          if (feeType === "Late Fee") appliedTo = "Payment Amount";
          else if (feeType === "Partial-Pay Penalty") appliedTo = "Outstanding Balance";
          else if (feeType === "Investment Initiation") appliedTo = "Principal Amount";
          setModal(m => ({ ...m, data: { ...m.data, fee_type: feeType, applied_to: appliedTo } }));
        }} options={feeTypeOpts} t={t} /></FF>
        <FF label="Applied To" t={t}><FSel value={modal.data.applied_to || "Principal Amount"} onChange={e => setF("applied_to", e.target.value)} options={["Principal Amount", "Payment Amount", "Outstanding Balance", "Interest Amount"]} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <FF label="Method" t={t}><FSel value={modal.data.method} onChange={e => setF("method", e.target.value)} options={["% of Amount", "Fixed Amount"]} t={t} /></FF>
        <FF label="Direction" t={t}><FSel value={modal.data.direction || "IN"} onChange={e => setF("direction", e.target.value)} options={["IN", "OUT"]} t={t} /></FF>
        <FF label="Rate / Amount" t={t}><FIn value={modal.data.rate} onChange={e => setF("rate", e.target.value)} placeholder={modal.data.method === "Fixed Amount" ? "$500" : "1.50%"} t={t} /></FF>
      </div>
      <FF label="Signed Rate / Amount" t={t}>
        {(() => {
          const rateValue = modal.data.rate ? String(modal.data.rate).replace(/[^0-9.-]/g, "") : "0";
          const rateNum = Number(rateValue) || 0;
          const dir = modal.data.direction || "IN";
          const signedRate = dir === "OUT" ? -rateNum : rateNum;
          const isFixedAmount = modal.data.method === "Fixed Amount" || modal.data.method === "Flat";
          const formattedSignedRate = isFixedAmount
            ? (signedRate >= 0 ? `$${Math.abs(signedRate).toFixed(2)}` : `($${Math.abs(signedRate).toFixed(2)})`)
            : (signedRate >= 0 ? `${signedRate}%` : `(${Math.abs(signedRate)}%)`);
          const displayColor = signedRate >= 0 ? (isDark ? "#34D399" : "#059669") : (isDark ? "#F87171" : "#DC2626");
          return (
            <div style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: displayColor, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>
              {formattedSignedRate}
            </div>
          );
        })()}
      </FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Charge At" t={t}><FSel value={modal.data.fee_charge_at || ""} onChange={e => setF("fee_charge_at", e.target.value)} options={feeChargeAtOpts} t={t} /></FF>
        <FF label="Frequency" t={t}><FSel value={modal.data.fee_frequency || ""} onChange={e => setF("fee_frequency", e.target.value)} options={feeFrequencyOpts} t={t} /></FF>
      </div>
      <FF label="Description" t={t}><FIn value={modal.data.description} onChange={e => setF("description", e.target.value)} placeholder="Brief description..." t={t} /></FF>
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteFee} label="This fee definition" t={t} isDark={isDark} />
  </>);
}

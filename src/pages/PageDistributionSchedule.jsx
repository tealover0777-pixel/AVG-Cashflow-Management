import { useState, useMemo, useRef, useEffect } from "react";
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

import 'ag-grid-community/styles/ag-grid.css';
import '../components/ag-grid/ag-grid-theme.css';
import { getDistributionColumnDefs } from '../components/ag-grid/DistributionsGridConfig';

import { db } from "../firebase";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { fmtCurr } from "../utils";
import { StatCard, Bdg, Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";

export default function PageDistributionSchedule({ t, isDark, DEALS = [], SCHEDULES = [], CONTACTS = [], DIMENSIONS = [], DISTRIBUTIONS = [], collectionPath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canUpdate = isSuperAdmin || hasPermission("DISTRIBUTION_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("DISTRIBUTION_DELETE");

  const [chip, setChip] = useState("All");
  const [detailBatch, setDetailBatch] = useState(null);
  const [delT, setDelT] = useState(null);

  const gridRef = useRef(null);
  const [pageSize, setPageSize] = useState(30);

  // Dynamically calculate page size based on available vertical space
  useEffect(() => {
    const calculatePageSize = () => {
      const rowHeight = 42; 
      const headerHeight = 56; 
      const viewportHeight = window.innerHeight;

      // Grid container matches: calc(100vh - 310px) 
      const gridContainerHeight = viewportHeight - 310;
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

  const columnDefs = useMemo(() => getDistributionColumnDefs(isDark, t, CONTACTS, DEALS), [isDark, t, CONTACTS, DEALS]);

  const distributionSchedules = useMemo(() => {
    return SCHEDULES.filter(s => s.batch_id);
  }, [SCHEDULES]);

  const filteredData = useMemo(() => {
    if (chip === "All") return distributionSchedules;
    return distributionSchedules.filter(s => s.status === chip);
  }, [distributionSchedules, chip]);

  const context = useMemo(() => ({
    isDark,
    t,
    CONTACTS,
    DEALS,
  }), [isDark, t, CONTACTS, DEALS]);

  const stats = [
    { label: "Total Distributed", value: fmtCurr(distributionSchedules.reduce((s, b) => s + (parseFloat(String(b.payment_amount || 0).replace(/[^0-9.-]/g, "")) || 0), 0)), accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
    { label: "Due Distributions", value: distributionSchedules.filter(s => s.status === "Due").length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
    { label: "Unique Recipients", value: new Set(distributionSchedules.map(s => s.party_id)).size, accent: isDark ? "#F472B6" : "#BE185D", bg: isDark ? "rgba(244,114,182,0.08)" : "#FDF2F8", border: isDark ? "rgba(244,114,182,0.15)" : "#FBCFE8" },
    { label: "Total Batches", value: new Set(distributionSchedules.map(s => s.batch_id)).size, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" },
  ];

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Distribution Schedule</h1>
        <p style={{ fontSize: 13.5, color: t.textMuted }}>Review and manage capital distributions across deals</p>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {stats.map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {["All", "Due", "Paid"].map(c => {
          const isA = chip === c;
          return <span key={c} onClick={() => setChip(c)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{c}</span>;
        })}
      </div>
      <div style={{ fontSize: 12, color: t.textMuted }}>
        <strong style={{ color: t.textSecondary }}>{filteredData.length}</strong> schedules identified
      </div>
    </div>

    <div className={`ag-theme-custom ${isDark ? 'dark-mode' : 'light-mode'}`} style={{ height: "calc(100vh - 430px)", width: "100%" }}>
      <AgGridReact
        ref={gridRef}
        rowData={filteredData}
        columnDefs={columnDefs}
        context={context}
        animateRows={true}
        pagination={true}
        paginationPageSize={pageSize}
        suppressPaginationPanel={true}
        suppressCellFocus={true}
        columnHoverHighlight={true}
        onRowClicked={(p) => {
          const batch = DISTRIBUTIONS.find(b => b.batch_id === p.data.batch_id);
          if (batch) setDetailBatch(batch);
        }}
        rowStyle={{ cursor: 'pointer' }}
      />
    </div>

    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{Math.min(filteredData.length, pageSize)}</strong> of <strong style={{ color: t.textSecondary }}>{filteredData.length}</strong> results</span>
      <Pagination totalPages={Math.ceil(filteredData.length / pageSize)} currentPage={1} onPageChange={(newPage) => gridRef.current?.api.paginationGoToPage(newPage - 1)} t={t} />
    </div>

    {detailBatch && (
      <Modal open={true} onClose={() => setDetailBatch(null)} title={`Batch Details: ${detailBatch.batch_id}`} width={500} t={t} isDark={isDark}>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>Deals</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{detailBatch.deal_names}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>Total Amount</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.accent }}>{fmtCurr(detailBatch.amount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>Method</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{detailBatch.method}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>Recipients</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{detailBatch.recipient_count}</span>
          </div>
          <div style={{ padding: "12px 0" }}>
            <span style={{ fontSize: 13, color: t.textMuted, display: "block", marginBottom: 8 }}>Notes</span>
            <div style={{ fontSize: 12.5, color: t.textSecondary, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", padding: 12, borderRadius: 8, minHeight: 60 }}>{detailBatch.notes || "No notes provided."}</div>
          </div>
        </div>
      </Modal>
    )}

    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={async () => {
      if (!delT || !delT.docId) return;
      try {
        await deleteDoc(doc(db, collectionPath, delT.docId));
        setDelT(null);
      } catch (err) { console.error("Delete batch error:", err); }
    }} label="This distribution batch" t={t} isDark={isDark} />
  </>);
}

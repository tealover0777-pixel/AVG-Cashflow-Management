import { useState, useMemo, useRef, useEffect } from "react";
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

import 'ag-grid-community/styles/ag-grid.css';
import '../components/ag-grid/ag-grid-theme.css';
import { db } from "../firebase";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData, fmtCurr, badge, av, initials } from "../utils";
import { StatCard, Bdg, Pagination, ActBtns, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";

export default function PageDistributionSchedule({ t, isDark, DEALS = [], SCHEDULES = [], DIMENSIONS = [], DISTRIBUTIONS = [], collectionPath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canUpdate = isSuperAdmin || hasPermission("DISTRIBUTION_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("DISTRIBUTION_DELETE");

  const [hov, setHov] = useState(null);
  const [chip, setChip] = useState("All");
  const [detailBatch, setDetailBatch] = useState(null);
  const [delT, setDelT] = useState(null);

  const stats = [
    { label: "Total Batches", value: DISTRIBUTIONS.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
    { label: "Total Distributed", value: fmtCurr(DISTRIBUTIONS.reduce((s, b) => s + (b.amount || 0), 0)), accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
    { label: "Draft Batches", value: DISTRIBUTIONS.filter(b => b.status === "Draft").length, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" },
    { label: "Total Recipients", value: DISTRIBUTIONS.reduce((s, b) => s + (b.recipient_count || 0), 0), accent: isDark ? "#F472B6" : "#BE185D", bg: isDark ? "rgba(244,114,182,0.08)" : "#FDF2F8", border: isDark ? "rgba(244,114,182,0.15)" : "#FBCFE8" },
  ];

  const gridRef = useRef(null);
  const [pageSize, setPageSize] = useState(30);

  const columnDefs = useMemo(() => [
    {
      field: 'batch_id',
      headerName: 'BATCH ID',
      width: 120,
      cellRenderer: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 8 }}>
          <span style={{ fontFamily: t.mono, fontSize: 11, fontWeight: 700, color: t.accent }}>{p.value}</span>
        </div>
      )
    },
    {
      field: 'deal_names',
      headerName: 'DEALS',
      flex: 1,
      cellRenderer: (p) => (
        <div 
          onClick={() => setDetailBatch(p.data)}
          style={{ cursor: 'pointer', color: isDark ? '#fff' : '#1C1917', fontWeight: 600, display: 'flex', alignItems: 'center', height: '100%' }}
        >
          {p.value}
        </div>
      )
    },
    {
      field: 'amount',
      headerName: 'TOTAL AMOUNT',
      width: 140,
      cellRenderer: (p) => (
        <div style={{ fontFamily: t.mono, fontWeight: 700, color: t.accent, display: 'flex', alignItems: 'center', height: '100%' }}>
          {fmtCurr(p.value)}
        </div>
      )
    },
    {
      field: 'status',
      headerName: 'STATUS',
      width: 120,
      cellRenderer: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Bdg label={p.value} {...(p.value === "Verified" ? { bg: "rgba(52,211,153,0.1)", text: "#34D399" } : { bg: "rgba(156,163,175,0.1)", text: "#9CA3AF" })} t={t} />
        </div>
      )
    },
    {
      field: 'recipient_count',
      headerName: 'RECIPIENTS',
      width: 110,
      cellStyle: { textAlign: 'center' }
    },
    {
      field: 'created_at',
      headerName: 'CREATED',
      width: 130,
      valueFormatter: (p) => p.value?.toDate ? p.value.toDate().toLocaleDateString() : (p.value || "")
    },
    {
      headerName: 'ACTIONS',
      width: 100,
      cellRenderer: (p) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: '100%' }}>
          <Tooltip text="View Details" t={t}><button onClick={() => setDetailBatch(p.data)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>👁️</button></Tooltip>
          {canDelete && <Tooltip text="Delete Batch" t={t}><button onClick={() => setDelT(p.data)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button></Tooltip>}
        </div>
      )
    }
  ], [isDark, t, canDelete]);

  const handleDeleteBatch = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete batch error:", err); }
  };

  const filteredData = useMemo(() => {
    if (chip === "All") return DISTRIBUTIONS;
    return DISTRIBUTIONS.filter(d => d.status === chip);
  }, [DISTRIBUTIONS, chip]);

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
        {["All", "Draft", "Verified"].map(c => {
          const isA = chip === c;
          return <span key={c} className="filter-chip" onClick={() => setChip(c)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{c}</span>;
        })}
      </div>
    </div>

    <div className={(isDark ? "ag-theme-quartz-dark" : "ag-theme-quartz") + " ag-theme-custom"} style={{ height: "calc(100vh - 310px)", width: "100%" }}>
      <AgGridReact
        ref={gridRef}
        rowData={filteredData}
        columnDefs={columnDefs}
        animateRows={true}
        pagination={true}
        paginationPageSize={pageSize}
        suppressPaginationPanel={true}
        suppressCellFocus={true}
        columnHoverHighlight={true}
      />
    </div>

    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{Math.min(filteredData.length, pageSize)}</strong> of <strong style={{ color: t.textSecondary }}>{filteredData.length}</strong> batches</span>
      <Pagination totalPages={Math.ceil(filteredData.length / pageSize)} currentPage={1} onPageChange={(newPage) => gridRef.current?.api.paginationGoToPage(newPage - 1)} t={t} />
    </div>

    {detailBatch && (
      <Modal open={true} onClose={() => setDetailBatch(null)} title={`Distribution Batch: ${detailBatch.batch_id}`} width={800} t={t} isDark={isDark}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Deals</div><div style={{ fontSize: 14, fontWeight: 600 }}>{detailBatch.deal_names}</div></div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Total Amount</div><div style={{ fontSize: 18, fontWeight: 700, color: t.accent }}>{fmtCurr(detailBatch.amount)}</div></div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Method</div><div style={{ fontSize: 14, fontWeight: 600 }}>{detailBatch.method}</div></div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 12 }}>Generated Schedules</div>
        <div style={{ borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA" }}>
              <tr>
                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>INVESTMENT</th>
                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>DUE DATE</th>
                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>TERM</th>
                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULES.filter(s => s.batch_id === detailBatch.batch_id).map((s, i, arr) => (
                <tr key={s.docId || i} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${t.rowDivider}` : "none" }}>
                  <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: t.mono }}>{s.investment_id}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12 }}>{s.due_date}</td>
                  <td style={{ padding: "12px 14px", fontSize: 11, color: t.textMuted }}>{s.term_start} - {s.term_end}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: t.accent }}>{fmtCurr(s.payment_amount)}</td>
                </tr>
              ))}
              {SCHEDULES.filter(s => s.batch_id === detailBatch.batch_id).length === 0 && (
                <tr><td colSpan="4" style={{ padding: 20, textAlign: "center", color: t.textMuted }}>No schedules linked to this batch</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    )}

    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteBatch} label="This distribution batch" t={t} isDark={isDark} />
  </>);
}

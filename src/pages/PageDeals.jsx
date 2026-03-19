import { useState, useMemo, useRef, useEffect } from "react";
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

import 'ag-grid-community/styles/ag-grid.css';
import '../components/ag-grid/ag-grid-theme.css';
import { getColumnDefs } from '../components/ag-grid/DealsGridConfig.jsx';
import { db } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData } from "../utils";
import { Bdg, StatCard, Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";

export default function PageDeals({ t, isDark, DEALS = [], FEES_DATA = [], DIMENSIONS = [], collectionPath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("DEAL_CREATE");
  const canUpdate = isSuperAdmin || hasPermission("DEAL_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("DEAL_DELETE");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const nextDealId = (() => {
    if (DEALS.length === 0) return "D10001";
    const maxNum = Math.max(...DEALS.map(p => { const m = String(p.id).match(/^D(\d+)$/); return m ? Number(m[1]) : 0; }));
    return "D" + (maxNum + 1);
  })();
  const dealStatuses = DIMENSIONS.find(d => d.name === "Deal Status" || d.name === "DealStatus")?.items || ["Active", "Closed"];
  const dealTypes = DIMENSIONS.find(d => d.name === "Deal Type" || d.name === "DealType")?.items || [];

  const openAdd = () => setModal({
    open: true,
    mode: "add",
    data: {
      id: nextDealId,
      name: "",
      status: dealStatuses[0] || "Active",
      type: dealTypes[0] || "",
      startDate: "",
      endDate: "",
      valuation: "",
      description: ""
    }
  });
  const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleSaveDeal = async () => {
    const d = modal.data;
    const payload = {
      deal_name: d.name || "",
      status: d.status || (dealStatuses[0] || "Active"),
      deal_type: d.type || (dealTypes[0] || ""),
      description: d.description || "",
      start_date: d.startDate || null,
      end_date: d.endDate || null,
      valuation_amount: d.valuation ? Number(String(d.valuation).replace(/[^0-9.]/g, "")) || null : null,
      fees: (d.feeIds || []).join(","),
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, collectionPath, d.docId), payload);
      } else {
        await setDoc(doc(db, collectionPath, d.id), { ...payload, created_at: serverTimestamp() });
      }
    } catch (err) {
      console.error("Failed to save deal:", err);
    }
    close();
  };
  const handleDeleteDeal = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete deal error:", err); }
  };

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
    feesData: FEES_DATA,
    callbacks: {
      onEdit: openEdit,
      onDelete: (target) => setDelT(target)
    }
  }), [isDark, t, permissions, FEES_DATA]);

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Deals</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage your investment deals</p></div>{canCreate && <Tooltip text="Create a new investment deal" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Deal</button></Tooltip>}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
      {[{ label: "Total", value: DEALS.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Active", value: DEALS.filter(p => p.status !== "Closed" && p.status !== "Liquidated").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Closed", value: DEALS.filter(p => p.status === "Closed" || p.status === "Liquidated").length, accent: isDark ? "rgba(255,255,255,0.4)" : "#6B7280", bg: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB", border: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    
    <div
      className={`ag-theme-custom ${isDark ? 'dark-mode' : 'light-mode'}`}
      style={{ height: 'calc(100vh - 420px)', minHeight: '500px' }}
    >
      <AgGridReact
        ref={gridRef}
        rowData={DEALS}
        columnDefs={columnDefs}
        context={context}
        animateRows={true}
        pagination={true}
        paginationPageSize={pageSize}
        suppressPaginationPanel={true}
        suppressCellFocus={true}
        onRowClicked={(event) => {
          if (!event.event?.target?.closest?.('.action-btn')) {
            openEdit(event.data);
          }
        }}
        onColumnResized={(event) => {
          if (event.finished) {
            const columnState = event.api.getColumnState();
            localStorage.setItem('dealsColumnState', JSON.stringify(columnState));
          }
        }}
        onGridReady={(params) => {
          const savedState = localStorage.getItem('dealsColumnState');
          if (savedState) {
            params.api.applyColumnState({
              state: JSON.parse(savedState),
              applyOrder: false
            });
          }
        }}
      />
    </div>

    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{Math.min(DEALS.length, pageSize)}</strong> of <strong style={{ color: t.textSecondary }}>{DEALS.length}</strong> deals</span><Pagination totalPages={Math.ceil(DEALS.length / pageSize)} currentPage={1} onPageChange={(newPage) => gridRef.current?.api.paginationGoToPage(newPage - 1)} t={t} /></div>
    
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Deal" : "Edit Deal"} onSave={handleSaveDeal} width={580} t={t} isDark={isDark}>
      <FF label="Deal ID" t={t}>
        <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
      </FF>
      <FF label="Deal Name" t={t}><FIn value={modal.data.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Palm Springs Villas" t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Deal Stage" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={dealStatuses} t={t} /></FF>
        <FF label="Deal type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={dealTypes} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Start Date" t={t}><FIn value={modal.data.startDate || ""} onChange={e => setF("startDate", e.target.value)} t={t} type="date" /></FF>
        <FF label="End Date" t={t}><FIn value={modal.data.endDate || ""} onChange={e => setF("endDate", e.target.value)} t={t} type="date" /></FF>
      </div>
      <FF label="Fundraising Target" t={t}><FIn value={modal.data.valuation || ""} onChange={e => setF("valuation", e.target.value)} placeholder="e.g. 2,500,000" t={t} /></FF>
      <FF label="Description" t={t}><FIn value={modal.data.description} onChange={e => setF("description", e.target.value)} placeholder="Brief description..." t={t} /></FF>
      {FEES_DATA.filter(f => f.name !== "Late Fee").length > 0 && (
        <FF label="Applicable Fees" t={t}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {FEES_DATA.filter(f => f.name !== "Late Fee").map(f => {
              const selected = (modal.data.feeIds || []).includes(f.id);
              const toggleFee = () => {
                const cur = modal.data.feeIds || [];
                setF("feeIds", selected ? cur.filter(x => x !== f.id) : [...cur, f.id]);
              };
              return (
                <div key={f.id} onClick={toggleFee} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: selected ? 600 : 400, padding: "5px 12px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease", background: selected ? (isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5") : t.chipBg, color: selected ? (isDark ? "#34D399" : "#059669") : t.textSecondary, border: `1px solid ${selected ? (isDark ? "rgba(52,211,153,0.4)" : "#A7F3D0") : t.chipBorder}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                  {f.name}
                  <span style={{ fontFamily: t.mono, fontSize: 10.5, opacity: 0.7 }}>({f.rate})</span>
                </div>
              );
            })}
          </div>
        </FF>
      )}
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteDeal} label="This deal" t={t} isDark={isDark} />
  </>);
}

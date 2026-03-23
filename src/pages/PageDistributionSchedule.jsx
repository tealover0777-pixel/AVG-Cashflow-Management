import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from "../components/TanStackTable";
import { getDistributionColumns } from "../components/DistributionScheduleTanStackConfig";
import { db } from "../firebase";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { fmtCurr } from "../utils.jsx";
import { StatCard, Bdg, Modal, FF, FIn, FSel, DelModal } from "../components";
import { useAuth } from "../AuthContext";

export default function PageDistributionSchedule({ t, isDark, DEALS = [], SCHEDULES = [], CONTACTS = [], DIMENSIONS = [], collectionPath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canUpdate = isSuperAdmin || hasPermission("DISTRIBUTION_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("DISTRIBUTION_DELETE");

  const [chip, setChip] = useState("All");
  const [delT, setDelT] = useState(null);
  const [bulkStatus, setBulkStatus] = useState("");
  const [scheduleModal, setScheduleModal] = useState({ open: false, mode: "edit", data: null });

  const gridRef = useRef(null);
  const [pageSize, setPageSize] = useState(30);
  const [selSchedules, setSelSchedules] = useState(new Set());

  // Dynamically calculate page size
  useEffect(() => {
    const calculatePageSize = () => {
      const rowHeight = 42; 
      const headerHeight = 56; 
      const viewportHeight = window.innerHeight;
      const gridContainerHeight = viewportHeight - 310;
      const availableForRows = gridContainerHeight - headerHeight;
      const calculatedRows = Math.floor(availableForRows / rowHeight);
      setPageSize(Math.max(30, calculatedRows));
    };
    calculatePageSize();
    window.addEventListener('resize', calculatePageSize);
    return () => window.removeEventListener('resize', calculatePageSize);
  }, []);

  const distributionSchedules = useMemo(() => {
    // Both batch_id (legacy) and is_distribution flag identify distributions
    return SCHEDULES.filter(s => s.is_distribution || s.batch_id);
  }, [SCHEDULES]);

  const filteredData = useMemo(() => {
    if (chip === "All") return distributionSchedules;
    return distributionSchedules.filter(s => s.status === chip);
  }, [distributionSchedules, chip]);

  const stats = useMemo(() => {
    const total = distributionSchedules.length;
    const due = distributionSchedules.filter(s => s.status === "Due").length;
    const paid = distributionSchedules.filter(s => s.status === "Paid").length;
    const amount = distributionSchedules.reduce((acc, s) => acc + (s.signed_payment_amount || 0), 0);

    return [
      { label: "Total Records", value: total, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF" },
      { label: "Pending/Due", value: due, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB" },
      { label: "Completed/Paid", value: paid, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5" },
      { label: "Total Amount", value: fmtCurr(amount), accent: isDark ? "#F87171" : "#DC2626", bg: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2" }
    ];
  }, [distributionSchedules, isDark]);

  const handleBulkStatus = async (status) => {
    if (selSchedules.size === 0 || !status) return;
    if (!window.confirm(`Update ${selSchedules.size} entries to ${status}?`)) return;
    try {
      const selected = distributionSchedules.filter(s => selSchedules.has(s.id || s.docId));
      await Promise.all(selected.map(s => updateDoc(doc(db, collectionPath, s.docId), { status, updated_at: serverTimestamp() })));
      setSelSchedules(new Set());
      setBulkStatus("");
    } catch (err) { console.error("Bulk status error:", err); }
  };

  const handleBulkDelete = async () => {
    if (selSchedules.size === 0) return;
    if (!window.confirm(`Permanently delete ${selSchedules.size} entries?`)) return;
    try {
      const selected = distributionSchedules.filter(s => selSchedules.has(s.id || s.docId));
      await Promise.all(selected.map(s => deleteDoc(doc(db, collectionPath, s.docId))));
      setSelSchedules(new Set());
    } catch (err) { console.error("Bulk delete error:", err); }
  };

  const handleUndo = async (r) => {
    if (!r._undo_snapshot) { alert("No undo snapshot available for this record."); return; }
    if (!window.confirm("Revert this schedule to its previous version?")) return;
    try {
      const snap = r._undo_snapshot;
      await updateDoc(doc(db, collectionPath, r.docId), { ...snap, _undo_snapshot: null, updated_at: serverTimestamp() });
    } catch (err) { console.error("Undo error:", err); }
  };

  const openEdit = (r) => {
    setScheduleModal({ open: true, mode: "edit", data: { ...r, payment: r.payment_amount || 0 } });
  };

  const handleSaveSchedule = async (id, updated) => {
    try {
      const { payment, ...cleanData } = updated;
      const amountNum = parseFloat(String(payment || "0").replace(/[^0-9.-]/g, ""));
      const finalData = {
        ...cleanData,
        payment_amount: amountNum,
        signed_payment_amount: (updated.direction === "OUT" ? -1 : 1) * Math.abs(amountNum),
        updated_at: serverTimestamp()
      };
      await updateDoc(doc(db, collectionPath, id), finalData);
      setScheduleModal({ open: false, mode: "edit", data: null });
    } catch (err) { console.error("Save schedule error:", err); alert("Error saving: " + err.message); }
  };

  const context = useMemo(() => ({
    isDark, t, USERS: [], // USERS lookup if needed
    callbacks: {
      onEdit: openEdit,
      onDelete: (r) => setDelT({ ...r, label: "this distribution entry" }),
      onUndo: handleUndo
    }
  }), [isDark, t]);

  const columnDefs = useMemo(() => getDistributionColumns(isDark, t, CONTACTS, DEALS, context), [isDark, t, CONTACTS, DEALS, context]);

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Distribution Schedule</h1>
        <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage lifecycle distributions and payment statuses</p>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
      {stats.map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {["All", "Due", "Paid"].map(c => {
          const isA = chip === c;
          return <span key={c} onClick={() => setChip(c)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{c}</span>;
        })}
        {selSchedules.size > 0 && (
          <>
            <div style={{ width: 1, height: 16, background: t.surfaceBorder, margin: "0 4px" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6", padding: "4px 12px", borderRadius: 20, border: `1px solid ${t.surfaceBorder}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase" }}>{selSchedules.size} Selected</span>
              <select 
                value={bulkStatus} 
                onChange={e => setBulkStatus(e.target.value)}
                style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: t.searchBg, color: t.searchText }}
              >
                <option value="" disabled>Status...</option>
                {((DIMENSIONS.find(d => d.name === "ScheduleStatus" || d.name === "Schedule Status" || d.name === "Payment Status" || d.name === "PaymentStatus") || {}).items || ["Due", "Paid", "Pending", "Cancelled"])
                  .map(i => String(i || "").trim())
                  .filter(i => i !== "" && i !== "Missed" && i !== "Partial")
                  .map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <button onClick={() => handleBulkStatus(bulkStatus)} disabled={!bulkStatus} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: bulkStatus ? t.accentGrad : t.chipBg, color: bulkStatus ? "#fff" : t.textMuted, border: "none" }}>APPLY</button>
              {canDelete && <button onClick={handleBulkDelete} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "none" }}>DELETE</button>}
              <button onClick={() => setSelSchedules(new Set())} style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, background: "none", border: "none", cursor: "pointer" }}>CLEAR</button>
            </div>
          </>
        )}
      </div>
      <div style={{ fontSize: 12, color: t.textMuted }}>
        <strong style={{ color: t.textSecondary }}>{filteredData.length}</strong> schedules identified
      </div>
    </div>

    <div style={{ height: 'calc(100vh - 420px)', width: '100%', minHeight: '400px' }}>
      <TanStackTable
        ref={gridRef}
        data={filteredData}
        columns={columnDefs}
        pageSize={pageSize}
        t={t}
        isDark={isDark}
        onSelectionChange={(selected) => setSelSchedules(new Set(selected.map(r => r.id || r.docId)))}
      />
    </div>

    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={async () => {
      if (!delT || !delT.docId) return;
      try {
        await deleteDoc(doc(db, collectionPath, delT.docId));
        setDelT(null);
      } catch (err) { console.error("Delete error:", err); }
    }} label={delT?.label || "this entry"} t={t} isDark={isDark} />

    {scheduleModal.open && (
      <Modal open={true} onClose={() => setScheduleModal({ open: false, data: null })} title="Edit Schedule Entry" onSave={() => handleSaveSchedule(scheduleModal.data.docId, scheduleModal.data)} width={400} t={t} isDark={isDark}>
        <div style={{ display: "grid", gap: 16 }}>
          <FF label="Due Date" t={t}><FIn type="date" value={scheduleModal.data.dueDate || ""} onChange={e => setScheduleModal({ ...scheduleModal, data: { ...scheduleModal.data, dueDate: e.target.value } })} t={t} /></FF>
          <FF label="Amount" t={t}><FIn value={scheduleModal.data.payment || ""} onChange={e => setScheduleModal({ ...scheduleModal, data: { ...scheduleModal.data, payment: e.target.value } })} placeholder="$0.00" t={t} /></FF>
          <FF label="Status" t={t}>
            <FSel 
              value={scheduleModal.data.status} 
              onChange={e => setScheduleModal({ ...scheduleModal, data: { ...scheduleModal.data, status: e.target.value } })} 
              options={((DIMENSIONS.find(d => d.name === "ScheduleStatus" || d.name === "Schedule Status" || d.name === "Payment Status" || d.name === "PaymentStatus") || {}).items || ["Due", "Paid", "Pending", "Cancelled"])
                .map(i => String(i || "").trim())
                .filter(i => i !== "")}
              t={t} 
            />
          </FF>
          <FF label="Notes" t={t}><textarea value={scheduleModal.data.notes} onChange={e => setScheduleModal({ ...scheduleModal, data: { ...scheduleModal.data, notes: e.target.value } })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.searchBg, color: t.searchText, fontSize: 13, minHeight: 80, fontFamily: t.font }} t={t} /></FF>
        </div>
      </Modal>
    )}
  </>);
}

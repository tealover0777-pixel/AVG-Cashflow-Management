import { useState } from "react";
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData, badge } from "../utils";
import { StatCard, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";

export default function PageSchedule({ t, isDark, SCHEDULES = [], CONTRACTS = [], DIMENSIONS = [], FEES_DATA = [], collectionPath = "" }) {
  const getNextScheduleId = () => {
    let maxNum = 9999;
    SCHEDULES.forEach(s => {
      if (s.id && s.id.startsWith("S")) {
        const num = parseInt(s.id.substring(1), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `S${maxNum + 1}`;
  };
  const paymentStatusOpts = (DIMENSIONS.find(d => d.name === "PaymentStatus") || {}).items || ["Due", "Paid", "Missed"];
  const [hov, setHov] = useState(null); const [sel, setSel] = useState(new Set()); const [chip, setChip] = useState("All");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [sort, setSort] = useState({ key: "id", direction: "asc" });
  const [page, setPage] = useState(1);
  const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const openAdd = () => setModal({ open: true, mode: "add", data: { id: getNextScheduleId(), contract: "C10000", dueDate: "", type: "Interest", payment: "", status: "Due", notes: "" } });
  const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r, originalStatus: r.status } });
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleSaveSchedule = async () => {
    const d = modal.data;
    const payload = {
      id: d.id || "",
      contract_id: d.contract || "",
      project_id: d.project_id || "",
      party_id: d.party_id || "",
      due_date: d.dueDate || null,
      payment_type: d.type || "",
      direction_from_company: d.direction || "",
      period_number: d.period_number ? Number(d.period_number) : null,
      principal_amount: d.principal_amount ? Number(String(d.principal_amount).replace(/[^0-9.-]/g, "")) || null : null,
      signed_payment_amount: d.signed_payment_amount ? Number(String(d.signed_payment_amount).replace(/[^0-9.-]/g, "")) || null : null,
      fee_id: d.fee_id || null,
      linked_schedule_id: d.linked || null,
      status: d.status || "Due",
      notes: d.notes || "",
      updated_at: serverTimestamp(),
    };

    // Missed Payment Workflow
    if (modal.mode === "edit" && d.status === "Missed" && d.status !== d.originalStatus) {
      if (window.confirm(`Do you want to set "Missed" payment and book a replacement schedule?`)) {
        try {
          await updateDoc(doc(db, collectionPath, d.docId), payload);
          // Pre-populate late payment
          const lateId = getNextScheduleId();
          setModal({
            open: true,
            mode: "add_late",
            originalDocId: d.docId, // Carry over to update later
            data: {
              ...d,
              id: lateId,
              linked: d.id,
              status: "Due",
              notes: `Late payment replacement for ${d.id}`,
            }
          });
          return; // Stay open in add_late mode
        } catch (err) { console.error("Update missed error:", err); return; }
      } else {
        return; // Cancel the edit
      }
    }

    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, collectionPath, d.docId), payload);
      } else {
        const docRef = await addDoc(collection(db, collectionPath), { ...payload, created_at: serverTimestamp() });
        // If this was a late payment, link back to original
        if (modal.mode === "add_late" && modal.originalDocId) {
          await updateDoc(doc(db, collectionPath, modal.originalDocId), { linked_schedule_id: payload.id, updated_at: serverTimestamp() });
        }
      }
    } catch (err) {
      console.error("Failed to save schedule:", err);
    }
    close();
  };

  const handleDeleteSchedule = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete schedule error:", err); }
  };
  const [bulkStatus, setBulkStatus] = useState("");
  const handleBulkStatus = async (status) => {
    if (!status || sel.size === 0) return;
    if (!window.confirm(`Are you sure you want to update status to "${status}" for ${sel.size} schedule(s)?`)) return;
    try {
      await Promise.all([...sel].map(id => {
        const s = SCHEDULES.find(s => s.id === id);
        if (s && s.docId) return updateDoc(doc(db, collectionPath, s.docId), { status, updated_at: serverTimestamp() });
        return Promise.resolve();
      }));
      setSel(new Set()); setBulkStatus("");
    } catch (err) { console.error("Bulk status update error:", err); }
  };
  const handleBulkDelete = async () => {
    if (sel.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${sel.size} schedule(s)? This action cannot be undone.`)) return;
    try {
      await Promise.all([...sel].map(id => {
        const s = SCHEDULES.find(s => s.id === id);
        if (s && s.docId) return deleteDoc(doc(db, collectionPath, s.docId));
        return Promise.resolve();
      }));
      setSel(new Set());
    } catch (err) { console.error("Bulk delete error:", err); }
  };
  const cols = [{ l: "", w: "36px" }, { l: "ID", w: "80px", k: "id" }, { l: "LINKED", w: "80px", k: "linked" }, { l: "CONTRACT", w: "85px", k: "contract" }, { l: "PROJECT ID", w: "85px", k: "project_id" }, { l: "PARTY ID", w: "80px", k: "party_id" }, { l: "PERIOD", w: "58px", k: "period_number" }, { l: "DUE DATE", w: "98px", k: "dueDate" }, { l: "TYPE", w: "minmax(60px, 0.33fr)", k: "type" }, { l: "FEE", w: "260px", k: "fee_id" }, { l: "DIR", w: "50px", k: "direction" }, { l: "SIGNED AMT", w: "110px", k: "signed_payment_amount" }, { l: "PRINCIPAL", w: "110px", k: "principal_amount" }, { l: "STATUS", w: "90px", k: "status" }, { l: "ACTIONS", w: "76px" }];
  const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
  const [colFilters, setColFilters] = useState({});
  const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const filtered = SCHEDULES.filter(s => chip === "All" || s.status === chip).filter(s => cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(s[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); }));
  const sorted = sortData(filtered, sort);
  const paginated = sorted.slice((page - 1) * 20, page * 20);
  const totalPages = Math.ceil(sorted.length / 20);
  const statsData = [{ label: "Total", value: SCHEDULES.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Due", value: SCHEDULES.filter(s => s.status === "Due").length, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" }, { label: "Paid", value: SCHEDULES.filter(s => s.status === "Paid").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Missed", value: SCHEDULES.filter(s => s.status === "Missed").length, accent: isDark ? "#F87171" : "#DC2626", bg: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2", border: isDark ? "rgba(248,113,113,0.15)" : "#FECACA" }];
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Payment Schedule</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage payment schedules and statuses</p></div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {sel.size > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.surfaceBorder}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{sel.size} selected</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 7, border: `1px solid ${t.surfaceBorder}`, background: t.searchBg, color: t.searchText, cursor: "pointer" }}>
            <option value="">Update status...</option>
            {paymentStatusOpts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => handleBulkStatus(bulkStatus)} disabled={!bulkStatus} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: bulkStatus ? t.accentGrad : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"), color: bulkStatus ? "#fff" : t.textMuted, border: "none", cursor: bulkStatus ? "pointer" : "default" }}>Apply</button>
          <div style={{ width: 1, height: 20, background: t.surfaceBorder }} />
          <button onClick={handleBulkDelete} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "#FECACA"}`, cursor: "pointer" }}>Delete ({sel.size})</button>
        </div>}
        <button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Schedule</button>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>{statsData.map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}</div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{["All", "Due", "Paid", "Missed"].map(f => { const isA = chip === f; return <span key={f} className="filter-chip" onClick={() => setChip(f)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{f}</span>; })}
        {sel.size > 0 && <><div style={{ width: 1, height: 18, background: t.surfaceBorder, marginLeft: 4 }} /><span onClick={() => setSel(new Set())} style={{ fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20, background: isDark ? "rgba(248,113,113,0.12)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.25)" : "#FECACA"}`, cursor: "pointer" }}>Clear</span></>}
      </div>
    </div>
    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
      <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart}>
        <input type="checkbox" checked={sel.size === filtered.length && filtered.length > 0} onChange={() => setSel(sel.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id)))} style={{ accentColor: t.checkActive, width: 14, height: 14 }} />
      </TblHead>
      <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
        {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} /> : <div key={c.l || "nofilter"} />)}
      </div>
      {paginated.map((s, i) => {
        const isHov = hov === s.id; const isSel = sel.has(s.id); const [bg, color, border] = badge(s.status, isDark);
        const dash = <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>;
        return (<div key={s.id} className="data-row" onMouseEnter={() => setHov(s.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isSel ? (isDark ? "rgba(52,211,153,0.04)" : "#F0FDF4") : isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
          <input type="checkbox" checked={isSel} onChange={() => { const n = new Set(sel); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setSel(n); }} style={{ accentColor: t.checkActive, width: 14, height: 14 }} onClick={e => e.stopPropagation()} />
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{s.id}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{s.linked || dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 500 }}>{s.contract}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{s.project_id || dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{s.party_id || dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: t.textMuted, textAlign: "center" }}>{s.period_number || dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: isDark ? "rgba(255,255,255,0.7)" : "#44403C" }}>{s.dueDate}</div>
          <div style={{ fontSize: 11.5, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.type}</div>
          <div style={{ fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.fee_id
              ? <><span style={{ fontFamily: t.mono, color: t.idText }}>{s.fee_id}</span><span style={{ color: t.textMuted }}> - {(FEES_DATA.find(f => f.id === s.fee_id) || {}).name || ""}</span></>
              : dash}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: s.direction === "IN" ? (isDark ? "#34D399" : "#059669") : s.direction === "OUT" ? (isDark ? "#F87171" : "#DC2626") : t.textMuted }}>{s.direction || dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 700, color: isDark ? "#60A5FA" : "#4F46E5" }}>
            {s.signed_payment_amount && s.direction === "OUT" && String(s.signed_payment_amount).includes("-")
              ? String(s.signed_payment_amount).replace("-", "(") + ")"
              : (s.signed_payment_amount || dash)}
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: t.textMuted }}>{s.principal_amount || dash}</div>
          <div><span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 20, background: bg, color, border: `1px solid ${border}` }}>{s.status}</span></div>
          <ActBtns show={isHov} t={t} onEdit={() => openEdit(s)} onDel={() => setDelT({ id: s.id, name: s.id, docId: s.docId })} />
        </div>);
      })}
    </div>
    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{paginated.length}</strong> of <strong style={{ color: t.textSecondary }}>{sorted.length}</strong> schedules{sel.size > 0 && <span style={{ color: t.accent, marginLeft: 8 }}>· {sel.size} selected</span>}</span><Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} t={t} /></div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Schedule Entry" : modal.mode === "add_late" ? "Late Payment Schedule" : "Edit Schedule Entry"} onSave={handleSaveSchedule} width={620} t={t} isDark={isDark}>
      {modal.mode === "edit" && (
        <FF label="Schedule ID" t={t}>
          <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.id}</div>
        </FF>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <FF label="Contract" t={t}><FSel value={modal.data.contract} onChange={e => setF("contract", e.target.value)} options={CONTRACTS.map(c => c.id)} t={t} /></FF>
        <FF label="Project ID" t={t}><FIn value={modal.data.project_id || ""} onChange={e => setF("project_id", e.target.value)} placeholder="P10000" t={t} /></FF>
        <FF label="Party ID" t={t}><FIn value={modal.data.party_id || ""} onChange={e => setF("party_id", e.target.value)} placeholder="M10000" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <FF label="Due Date" t={t}><FIn value={modal.data.dueDate || ""} onChange={e => setF("dueDate", e.target.value)} t={t} type="date" /></FF>
        <FF label="Period Number" t={t}><FIn value={modal.data.period_number || ""} onChange={e => setF("period_number", e.target.value)} placeholder="1" t={t} /></FF>
        <FF label="Direction" t={t}><FSel value={modal.data.direction} onChange={e => setF("direction", e.target.value)} options={["IN", "OUT"]} t={t} /></FF>
      </div>
      <FF label="Payment Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={["INVESTOR_PRINCIPAL_DEPOSIT", "INVESTOR_INTEREST_PAYMENT", "INVESTOR_PRINCIPAL_RETURN", "BORROWER_PRINCIPAL_DISBURSEMENT", "BORROWER_INTEREST_COLLECTION", "BORROWER_PRINCIPAL_REPAYMENT", "Interest", "Principal", "Fee", "Catch-Up"]} t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <FF label="Payment Amount" t={t}><FIn value={modal.data.payment || ""} onChange={e => setF("payment", e.target.value)} placeholder="$0" t={t} /></FF>
        <FF label="Principal Amount" t={t}><FIn value={modal.data.principal_amount || ""} onChange={e => setF("principal_amount", e.target.value)} placeholder="$0" t={t} /></FF>
        <FF label="Signed Amount" t={t}><FIn value={modal.data.signed_payment_amount || ""} onChange={e => setF("signed_payment_amount", e.target.value)} placeholder="$0" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <FF label="Fee ID" t={t}><FIn value={modal.data.fee_id || ""} onChange={e => setF("fee_id", e.target.value)} placeholder="F10001" t={t} /></FF>
        <FF label="Linked Schedule" t={t}><FIn value={modal.data.linked || ""} onChange={e => setF("linked", e.target.value)} placeholder="S00001" t={t} /></FF>
        <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={paymentStatusOpts} t={t} /></FF>
      </div>
      <FF label="Notes" t={t}><FIn value={modal.data.notes || ""} onChange={e => setF("notes", e.target.value)} placeholder="Any remarks..." t={t} /></FF>
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteSchedule} label="This schedule entry" t={t} isDark={isDark} />
  </>);
}

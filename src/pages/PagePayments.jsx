import { useState } from "react";
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData } from "../utils";
import { Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";

export default function PagePayments({ t, isDark, PAYMENTS = [], collectionPath = "" }) {
  const [hov, setHov] = useState(null); const [chip, setChip] = useState("All");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const openAdd = () => setModal({ open: true, mode: "add", data: { contract: "", party: "", type: "Interest", amount: "", date: "", method: "Wire", direction: "Received", note: "" } });
  const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleDeletePayment = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete payment error:", err); }
  };

  const handleSavePayment = async () => {
    const d = modal.data;
    const payload = {
      contract_id: d.contract || "",
      party_name: d.party || "",
      payment_type: d.type || "",
      amount: d.amount ? Number(String(d.amount).replace(/[^0-9.-]/g, "")) || null : null,
      payment_date: d.date || null,
      payment_method: d.method || "",
      direction: d.direction || "",
      notes: d.note || "",
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, collectionPath, d.docId), payload);
      } else {
        await addDoc(collection(db, collectionPath), { ...payload, created_at: serverTimestamp() });
      }
    } catch (err) { console.error("Save payment error:", err); }
    close();
  };
  const cols = [{ l: "PAY ID", w: "110px", k: "id" }, { l: "CONTRACT", w: "90px", k: "contract" }, { l: "PARTY", w: "1fr", k: "party" }, { l: "TYPE", w: "110px", k: "type" }, { l: "AMOUNT", w: "120px", k: "amount" }, { l: "DATE", w: "110px", k: "date" }, { l: "METHOD", w: "90px", k: "method" }, { l: "ACTIONS", w: "80px" }];
  const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
  const [colFilters, setColFilters] = useState({});
  const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const filtered = PAYMENTS.filter(p => chip === "All" || p.direction === chip).filter(p => cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(p[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); }));
  const sorted = sortData(filtered, sort);
  const paginated = sorted.slice((page - 1) * 20, page * 20);
  const totalPages = Math.ceil(sorted.length / 20);
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Payments - Under Construction</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Track actual cash receipts and disbursements</p></div><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Record Payment</button></div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>{["All", "Received", "Disbursed"].map(f => { const isA = chip === f; return <span key={f} className="filter-chip" onClick={() => setChip(f)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{f}</span>; })}</div>
    </div>
    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
      <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
      <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
        {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} /> : <div key={c.l || "nofilter"} />)}
      </div>
      {paginated.map((p, i) => {
        const isHov = hov === p.id; const isIn = p.direction === "Received"; return (<div key={p.id} className="data-row" onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
          <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{p.id}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 500 }}>{p.contract || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.party}</div>
          <div style={{ fontSize: 12, color: t.textMuted }}>{p.type}</div>
          <div style={{ fontFamily: t.mono, fontSize: 12.5, fontWeight: 700, color: isIn ? (isDark ? "#34D399" : "#059669") : (isDark ? "#F87171" : "#DC2626") }}>{isIn ? "+" : "−"}{p.amount}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.date}</div>
          <div style={{ fontSize: 12, color: t.textMuted }}>{p.method}</div>
          <ActBtns show={isHov} t={t} onEdit={() => openEdit(p)} onDel={() => setDelT({ id: p.id, name: p.id, docId: p.docId })} />
        </div>);
      })}
    </div>
    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{paginated.length}</strong> of <strong style={{ color: t.textSecondary }}>{sorted.length}</strong> payments</span><Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} t={t} /></div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "Record Payment" : "Edit Payment"} onSave={handleSavePayment} width={520} t={t} isDark={isDark}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Direction" t={t}><FSel value={modal.data.direction} onChange={e => setF("direction", e.target.value)} options={["Received", "Disbursed"]} t={t} /></FF>
        <FF label="Payment Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={["Interest", "Principal", "Interest + Principal", "Disbursement", "Fee"]} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Contract" t={t}><FIn value={modal.data.contract} onChange={e => setF("contract", e.target.value)} placeholder="C10000" t={t} /></FF>
        <FF label="Party" t={t}><FIn value={modal.data.party} onChange={e => setF("party", e.target.value)} placeholder="Party name" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Amount" t={t}><FIn value={modal.data.amount} onChange={e => setF("amount", e.target.value)} placeholder="$0" t={t} /></FF>
        <FF label="Date" t={t}><FIn value={modal.data.date} onChange={e => setF("date", e.target.value)} placeholder="YYYY-MM-DD" t={t} type="date" /></FF>
      </div>
      <FF label="Method" t={t}><FSel value={modal.data.method} onChange={e => setF("method", e.target.value)} options={["Wire", "Check", "ACH", "Cash"]} t={t} /></FF>
      <FF label="Note (optional)" t={t}><FIn value={modal.data.note} onChange={e => setF("note", e.target.value)} placeholder="Any remarks..." t={t} /></FF>
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeletePayment} label="This payment record" t={t} isDark={isDark} />
  </>);
}
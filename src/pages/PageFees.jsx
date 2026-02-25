import { useState } from "react";
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData } from "../utils";
import { StatCard, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";

export default function PageFees({ t, isDark, FEES_DATA = [], DIMENSIONS = [], collectionPath = "" }) {
  const feeChargeAtOpts = (DIMENSIONS.find(d => d.name === "FeeChargeAt") || {}).items || [];
  const feeFrequencyOpts = (DIMENSIONS.find(d => d.name === "FeeFrequency") || {}).items || [];
  const feeTypeOpts = (DIMENSIONS.find(d => d.name === "FeeType") || {}).items || [];
  const [hov, setHov] = useState(null);
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const openAdd = () => setModal({ open: true, mode: "add", data: { name: "", fee_type: "", method: "% of Amount", rate: "", fee_charge_at: "", fee_frequency: "", description: "" } });
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
      fee_charge_at: d.fee_charge_at || "",
      fee_frequency: d.fee_frequency || "",
      description: d.description || "",
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, collectionPath, d.docId), payload);
      } else {
        await addDoc(collection(db, collectionPath), { ...payload, created_at: serverTimestamp() });
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
  const cols = [{ l: "FEE ID", w: "100px", k: "id" }, { l: "NAME", w: "1fr", k: "name" }, { l: "FEE TYPE", w: "130px", k: "fee_type" }, { l: "METHOD", w: "130px", k: "method" }, { l: "RATE", w: "110px", k: "rate" }, { l: "CHARGE AT", w: "120px", k: "fee_charge_at" }, { l: "FREQUENCY", w: "120px", k: "fee_frequency" }, { l: "DESCRIPTION", w: "1fr", k: "description" }, { l: "ACTIONS", w: "90px" }];
  const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
  const [colFilters, setColFilters] = useState({});
  const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const filtered = FEES_DATA.filter(f => cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(f[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); }));
  const sorted = sortData(filtered, sort);
  const paginated = sorted.slice((page - 1) * 20, page * 20);
  const totalPages = Math.ceil(sorted.length / 20);
  const mCfg = { "% of Amount": [isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF", isDark ? "#60A5FA" : "#2563EB", isDark ? "rgba(96,165,250,0.3)" : "#BFDBFE"], "Fixed Amount": [isDark ? "rgba(167,139,250,0.15)" : "#F5F3FF", isDark ? "#A78BFA" : "#7C3AED", isDark ? "rgba(167,139,250,0.3)" : "#DDD6FE"] };
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Fees</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Define and manage fee structures</p></div><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Fee</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {[{ label: "Total Fees", value: FEES_DATA.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "% of Amount", value: FEES_DATA.filter(f => f.method === "% of Amount").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Fixed Amount", value: FEES_DATA.filter(f => f.method === "Fixed Amount").length, accent: isDark ? "#A78BFA" : "#7C3AED", bg: isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE" }, { label: "Recurring", value: FEES_DATA.filter(f => f.frequency !== "One-time" && f.frequency !== "Per occurrence").length, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
      <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
      <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
        {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} /> : <div key={c.l || "nofilter"} />)}
      </div>
      {paginated.map((f, i) => {
        const isHov = hov === f.id; const [mb, mc, mbr] = mCfg[f.method] || ["transparent", "#888", "#ccc"]; return (<div key={f.id} className="data-row" onMouseEnter={() => setHov(f.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{f.id}</div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : (isHov ? "#1C1917" : "#44403C") }}>{f.name}</div>
          <div style={{ fontSize: 12.5, color: t.textMuted }}>{f.fee_type}</div>
          <div><span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 20, background: mb, color: mc, border: `1px solid ${mbr}` }}>{f.method}</span></div>
          <div style={{ fontFamily: t.mono, fontSize: 12.5, fontWeight: 700, color: isDark ? "#60A5FA" : "#4F46E5" }}>{(f.method === "Fixed Amount" || f.method === "Flat") ? (f.rate && !String(f.rate).startsWith("$") ? `$${f.rate}` : f.rate) : (f.rate && !String(f.rate).endsWith("%") ? `${f.rate}%` : f.rate)}</div>
          <div style={{ fontSize: 12.5, color: t.textMuted }}>{f.fee_charge_at}</div>
          <div style={{ fontSize: 12.5, color: t.textMuted }}>{f.fee_frequency}</div>
          <div style={{ fontSize: 12.5, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{f.description}</div>
          <ActBtns show={isHov} t={t} onEdit={() => openEdit(f)} onDel={() => setDelT({ id: f.id, name: f.name, docId: f.docId })} />
        </div>);
      })}
    </div>
    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{filtered.length}</strong> of <strong style={{ color: t.textSecondary }}>{FEES_DATA.length}</strong> fees</span><Pagination pages={["‹", "1", "›"]} t={t} /></div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Fee" : "Edit Fee"} onSave={handleSaveFee} t={t} isDark={isDark}>
      <FF label="Fee Name" t={t}><FIn value={modal.data.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Origination Fee" t={t} /></FF>
      <FF label="Fee Type" t={t}><FSel value={modal.data.fee_type || ""} onChange={e => setF("fee_type", e.target.value)} options={feeTypeOpts} t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Method" t={t}><FSel value={modal.data.method} onChange={e => setF("method", e.target.value)} options={["% of Amount", "Fixed Amount"]} t={t} /></FF>
        <FF label="Rate / Amount" t={t}><FIn value={modal.data.rate} onChange={e => setF("rate", e.target.value)} placeholder={modal.data.method === "Fixed Amount" ? "$500" : "1.50%"} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Charge At" t={t}><FSel value={modal.data.fee_charge_at || ""} onChange={e => setF("fee_charge_at", e.target.value)} options={feeChargeAtOpts} t={t} /></FF>
        <FF label="Frequency" t={t}><FSel value={modal.data.fee_frequency || ""} onChange={e => setF("fee_frequency", e.target.value)} options={feeFrequencyOpts} t={t} /></FF>
      </div>
      <FF label="Description" t={t}><FIn value={modal.data.description} onChange={e => setF("description", e.target.value)} placeholder="Brief description..." t={t} /></FF>
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteFee} label="This fee definition" t={t} isDark={isDark} />
  </>);
}

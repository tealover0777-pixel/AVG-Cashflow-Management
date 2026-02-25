import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData } from "../utils";
import { Bdg, StatCard, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";

export default function PageProjects({ t, isDark, PROJECTS = [], FEES_DATA = [], collectionPath = "" }) {
  const [hov, setHov] = useState(null);
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const nextProjectId = (() => {
    if (PROJECTS.length === 0) return "P10001";
    const maxNum = Math.max(...PROJECTS.map(p => { const m = String(p.id).match(/^P(\d+)$/); return m ? Number(m[1]) : 0; }));
    return "P" + (maxNum + 1);
  })();
  const openAdd = () => setModal({ open: true, mode: "add", data: { id: nextProjectId, name: "", status: "Active", currency: "USD", startDate: "", endDate: "", valuation: "", description: "" } });
  const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleSaveProject = async () => {
    const d = modal.data;
    const payload = {
      project_name: d.name || "",
      status: d.status || "Active",
      currency: d.currency || "USD",
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
      console.error("Failed to save project:", err);
    }
    close();
  };
  const cols = [{ l: "PROJECT ID", w: "110px", k: "id" }, { l: "NAME", w: "1fr", k: "name" }, { l: "STATUS", w: "100px", k: "status" }, { l: "CCY", w: "60px", k: "currency" }, { l: "START DATE", w: "104px", k: "startDate" }, { l: "END DATE", w: "104px", k: "endDate" }, { l: "VALUATION", w: "120px", k: "valuation" }, { l: "DESCRIPTION", w: "1fr", k: "description" }, { l: "FEES", w: "minmax(120px,1.2fr)", k: "feeIds" }, { l: "ACTIONS", w: "80px" }];
  const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
  const [colFilters, setColFilters] = useState({});
  const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const filtered = PROJECTS.filter(p => cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(p[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); }));
  const sorted = sortData(filtered, sort);
  const paginated = sorted.slice((page - 1) * 20, page * 20);
  const totalPages = Math.ceil(sorted.length / 20);
  const handleDeleteProject = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete project error:", err); }
  };

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Projects</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage your investment projects</p></div><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Project</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {[{ label: "Total", value: PROJECTS.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Active", value: PROJECTS.filter(p => p.status === "Active").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Closed", value: PROJECTS.filter(p => p.status === "Closed").length, accent: isDark ? "rgba(255,255,255,0.4)" : "#6B7280", bg: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB", border: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB" }, { label: "USD", value: PROJECTS.filter(p => p.currency === "USD").length, accent: isDark ? "#A78BFA" : "#7C3AED", bg: isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
      <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
      <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
        {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} /> : <div key={c.l || "nofilter"} />)}
      </div>
      {paginated.map((p, i) => {
        const isHov = hov === p.id;
        const appliedFees = (p.feeIds || []).map(fid => FEES_DATA.find(f => f.id === fid)).filter(Boolean);
        return (<div key={p.id} className="data-row" onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{p.id}</div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : (isHov ? "#1C1917" : "#44403C"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.name}</div>
          <div><Bdg status={p.status} isDark={isDark} /></div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: t.textMuted }}>{p.currency}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{p.startDate || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{p.endDate || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 600, color: isDark ? "#60A5FA" : "#4F46E5" }}>{p.valuation ? `$${Number(String(p.valuation).replace(/[^0-9.]/g, "")).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontSize: 12, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.description || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {appliedFees.length > 0
              ? appliedFees.map(f => <span key={f.id} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: isDark ? "rgba(52,211,153,0.12)" : "#ECFDF5", color: isDark ? "#34D399" : "#059669", border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#A7F3D0"}`, whiteSpace: "nowrap" }}>{f.name}</span>)
              : <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB", fontSize: 12 }}>—</span>}
          </div>
          <ActBtns show={isHov} t={t} onEdit={() => openEdit(p)} onDel={() => setDelT({ id: p.id, name: p.name, docId: p.docId })} />
        </div>);
      })}
    </div>
    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{paginated.length}</strong> of <strong style={{ color: t.textSecondary }}>{sorted.length}</strong> projects</span><Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} t={t} /></div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Project" : "Edit Project"} onSave={handleSaveProject} width={580} t={t} isDark={isDark}>
      <FF label="Project ID" t={t}>
        <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
      </FF>
      <FF label="Project Name" t={t}><FIn value={modal.data.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Palm Springs Villas" t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={["Active", "Closed"]} t={t} /></FF>
        <FF label="Currency" t={t}><FSel value={modal.data.currency} onChange={e => setF("currency", e.target.value)} options={["USD", "CAD", "EUR", "TWD"]} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Start Date" t={t}><FIn value={modal.data.startDate || ""} onChange={e => setF("startDate", e.target.value)} t={t} type="date" /></FF>
        <FF label="End Date" t={t}><FIn value={modal.data.endDate || ""} onChange={e => setF("endDate", e.target.value)} t={t} type="date" /></FF>
      </div>
      <FF label="Valuation Amount" t={t}><FIn value={modal.data.valuation || ""} onChange={e => setF("valuation", e.target.value)} placeholder="e.g. 2,500,000" t={t} /></FF>
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
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteProject} label="This project" t={t} isDark={isDark} />
  </>);
}
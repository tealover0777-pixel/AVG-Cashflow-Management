import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { initials, av, badge, sortData } from "../utils";
import { StatCard, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";

export default function PageParties({ t, isDark, PARTIES = [], collectionPath = "", DIMENSIONS = [] }) {
  const roleOpts = (DIMENSIONS.find(d => d.name === "Role") || {}).items || ["Investor", "Borrower"];
  const partyTypeOpts = (DIMENSIONS.find(d => d.name === "PartyType") || {}).items || ["Individual", "Company", "Trust", "Partnership"];
  const investorTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorType") || {}).items || ["Fixed", "Equity", "Both"];
  const [hov, setHov] = useState(null); const [chip, setChip] = useState("All");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const nextPartyId = (() => {
    if (PARTIES.length === 0) return "M10001";
    const maxNum = Math.max(...PARTIES.map(p => { const m = String(p.id).match(/^M(\d+)$/); return m ? Number(m[1]) : 0; }));
    return "M" + (maxNum + 1);
  })();
  const openAdd = () => setModal({ open: true, mode: "add", data: { id: nextPartyId, name: "", type: "Individual", role: "Investor", email: "" } });
  const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));
  const handleSaveParty = async () => {
    const d = modal.data;
    const payload = {
      party_name: d.name || "",
      party_type: d.type || "",
      role_type: d.role || "",
      investor_type: d.investor_type || "",
      email: d.email || "",
      phone: d.phone || "",
      address: d.address || "",
      tax_id: d.tax_id || "",
      bank_information: d.bank_information || "",
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, collectionPath, d.docId), payload);
      } else {
        await setDoc(doc(db, collectionPath, d.id), { ...payload, created_at: serverTimestamp() });
      }
    } catch (err) { console.error("Save party error:", err); }
    close();
  };

  const handleDeleteParty = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete party error:", err); }
  };
  const [colFilters, setColFilters] = useState({});
  const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const chips = ["All", "Investors", "Borrowers", "Companies"];
  const cols = [{ l: "PARTY ID", w: "90px", k: "id" }, { l: "NAME", w: "1fr", k: "name" }, { l: "TYPE", w: "100px", k: "type" }, { l: "ROLE", w: "90px", k: "role" }, { l: "INV TYPE", w: "80px", k: "investor_type" }, { l: "EMAIL", w: "1fr", k: "email" }, { l: "PHONE", w: "120px", k: "phone" }, { l: "ADDRESS", w: "1fr", k: "address" }, { l: "TAX ID", w: "110px", k: "tax_id" }, { l: "BANK INFO", w: "1fr", k: "bank_information" }, { l: "CREATED", w: "95px", k: "created_at" }, { l: "UPDATED", w: "95px", k: "updated_at" }, { l: "ACTIONS", w: "80px" }];
  const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
  const filtered = PARTIES.filter(p => {
    if (chip === "Investors" && p.role !== "Investor") return false;
    if (chip === "Borrowers" && p.role !== "Borrower") return false;
    if (chip === "Companies" && p.type !== "Company") return false;
    return cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(p[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); });
  });
  const sorted = sortData(filtered, sort);
  const paginated = sorted.slice((page - 1) * 20, page * 20);
  const totalPages = Math.ceil(sorted.length / 20);
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Parties</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage Investors, Borrowers, and Companies</p></div><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Party</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {[{ label: "Total Parties", value: PARTIES.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Investors", value: PARTIES.filter(p => p.role === "Investor").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Borrowers", value: PARTIES.filter(p => p.role === "Borrower").length, accent: isDark ? "#FB923C" : "#C2410C", bg: isDark ? "rgba(251,146,60,0.08)" : "#FFF7ED", border: isDark ? "rgba(251,146,60,0.15)" : "#FED7AA" }, { label: "Companies", value: PARTIES.filter(p => p.type === "Company").length, accent: isDark ? "#A78BFA" : "#7C3AED", bg: isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>{chips.map((c, i) => { const isA = chip === c; return (<span key={c} className="filter-chip" onClick={() => setChip(c)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{c}</span>); })}</div>
    </div>
    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
      <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
      <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
        {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} /> : <div key={c.l || "nofilter"} />)}
      </div>
      {paginated.map((p, i) => {
        const isHov = hov === p.id; const a = av(p.name, isDark); const [rb, rc, rbr] = badge(p.role, isDark); return (<div key={p.id} className="data-row" onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{p.id}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}><div style={{ width: 32, height: 32, borderRadius: 9, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: a.c, flexShrink: 0, border: `1px solid ${a.c}${isDark ? "44" : "22"}` }}>{initials(p.name)}</div><span style={{ fontSize: 13.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : (isHov ? "#1C1917" : "#44403C"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span></div>
          <div style={{ fontSize: 12.5, color: p.type === "Company" ? (isDark ? "#A78BFA" : "#7C3AED") : t.textMuted }}>{p.type === "Company" ? "◈ Company" : "◎ Individual"}</div>
          <div><span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 20, background: rb, color: rc, border: `1px solid ${rbr}` }}>{p.role}</span></div>
          <div style={{ fontSize: 11.5, color: t.textMuted }}>{p.investor_type || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.email ? <span style={{ color: isDark ? "#60A5FA" : "#4F46E5" }}>{p.email}</span> : <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.phone || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontSize: 12, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.address || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.tax_id || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontSize: 12, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.bank_information || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{p.created_at || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{p.updated_at || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <ActBtns show={isHov} t={t} onEdit={() => openEdit(p)} onDel={() => setDelT({ id: p.id, name: p.name, docId: p.docId })} />
        </div>);
      })}
    </div>
    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{paginated.length}</strong> of <strong style={{ color: t.textSecondary }}>{sorted.length}</strong> parties</span><Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} t={t} /></div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Party" : "Edit Party"} onSave={handleSaveParty} width={600} t={t} isDark={isDark}>
      <FF label="Party ID" t={t}>
        <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
      </FF>
      <FF label="Full Name" t={t}><FIn value={modal.data.name || ""} onChange={e => setF("name", e.target.value)} placeholder="e.g. Pao Fu Chen" t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Party Type" t={t}><FSel value={modal.data.type || "Individual"} onChange={e => setF("type", e.target.value)} options={partyTypeOpts} t={t} /></FF>
        <FF label="Role" t={t}><FSel value={modal.data.role || "Investor"} onChange={e => setF("role", e.target.value)} options={roleOpts} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Investor Type" t={t}><FSel value={modal.data.investor_type || "Fixed"} onChange={e => setF("investor_type", e.target.value)} options={investorTypeOpts} t={t} /></FF>
        <FF label="Tax ID" t={t}><FIn value={modal.data.tax_id || ""} onChange={e => setF("tax_id", e.target.value)} placeholder="e.g. 123-45-6789" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Email" t={t}><FIn value={modal.data.email || ""} onChange={e => setF("email", e.target.value)} placeholder="email@example.com" t={t} type="email" /></FF>
        <FF label="Phone" t={t}><FIn value={modal.data.phone || ""} onChange={e => setF("phone", e.target.value)} placeholder="e.g. 212-411-4566" t={t} /></FF>
      </div>
      <FF label="Address" t={t}><FIn value={modal.data.address || ""} onChange={e => setF("address", e.target.value)} placeholder="Full address" t={t} /></FF>
      <FF label="Bank Information" t={t}><FIn value={modal.data.bank_information || ""} onChange={e => setF("bank_information", e.target.value)} placeholder="e.g. Citibank" t={t} /></FF>
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteParty} label="This party" t={t} isDark={isDark} />
  </>);
}

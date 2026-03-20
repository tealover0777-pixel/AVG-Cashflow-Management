import { useState } from "react";
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData, fmtCurr } from "../utils";
import { Pagination, ActBtns, useResizableColumns, TblHead, TblFilterRow, Modal, FF, FIn, FSel, DelModal, Tooltip, Bdg } from "../components";
import { useAuth } from "../AuthContext";

export default function PagePayments({ t, isDark, PAYMENTS = [], INVESTMENTS = [], CONTACTS = [], SCHEDULES = [], DIMENSIONS = [], ACH_BATCHES = [], LEDGER = [], collectionPath = "", achBatchPath = "", ledgerPath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("PAYMENT_CREATE") || hasPermission("PAYMENTS_CREATE");
  const canUpdate = isSuperAdmin || hasPermission("PAYMENT_UPDATE") || hasPermission("PAYMENTS_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("PAYMENT_DELETE") || hasPermission("PAYMENTS_DELETE");

  const [activeTab, setActiveTab] = useState("Payments");
  const [hov, setHov] = useState(null); 
  const [chip, setChip] = useState("All");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {}, type: "payment" });
  const [delT, setDelT] = useState(null);
  const [sort, setSort] = useState({ key: "date", direction: "desc" });
  const [page, setPage] = useState(1);
  const [colFilters, setColFilters] = useState({});

  const paymentStatusOpts = (DIMENSIONS.find(d => d.name === "PaymentStatus" || d.name === "Payment Status") || {}).items || ["Pending", "Paid", "Failed"];
  const achBatchStatusOpts = (DIMENSIONS.find(d => d.name === "ACHBatchStatus" || d.name === "ACH Batch Status") || {}).items || ["VERSION_CREATED", "STATUS_UPDATED", "PAYMENT_FAILED"];

  const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  // --- Actions ---
  const openAddPayment = () => setModal({ open: true, mode: "add", type: "payment", data: { investment: "", party: "", type: "Interest", amount: "", date: "", method: "Wire", direction: "Received", status: "Pending", batch_status: "", note: "" } });
  const openEditPayment = r => setModal({ open: true, mode: "edit", type: "payment", data: { ...r } });
  
  const openAddBatch = () => setModal({ open: true, mode: "add", type: "batch", data: { batch_id: `B${Date.now().toString().slice(-6)}`, status: "VERSION_CREATED", notes: "" } });
  const openEditBatch = r => setModal({ open: true, mode: "edit", type: "batch", data: { ...r } });

  const handleSave = async () => {
    const d = modal.data;
    const type = modal.type;
    let payload = {};
    let path = "";

    if (type === "payment") {
      payload = {
        investment_id: d.investment || "",
        party_name: d.party || "",
        payment_type: d.type || "",
        amount: d.amount ? Number(String(d.amount).replace(/[^0-9.-]/g, "")) || null : null,
        payment_date: d.date || null,
        payment_method: d.method || "",
        direction: d.direction || "",
        status: d.status || "Pending",
        batch_status: d.batch_status || "",
        notes: d.note || "",
        updated_at: serverTimestamp(),
      };
      path = collectionPath;
    } else if (type === "batch") {
      payload = {
        batch_id: d.batch_id || "",
        status: d.status || "",
        notes: d.notes || "",
        updated_at: serverTimestamp(),
      };
      path = achBatchPath;
    }

    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, path, d.docId), payload);
      } else {
        await addDoc(collection(db, path), { ...payload, created_at: serverTimestamp() });
      }
    } catch (err) { console.error(`Save ${type} error:`, err); }
    close();
  };

  const handleDelete = async () => {
    if (!delT || !delT.docId) return;
    const path = activeTab === "Payments" ? collectionPath : achBatchPath;
    try {
      await deleteDoc(doc(db, path, delT.docId));
      setDelT(null);
    } catch (err) { console.error(`Delete ${activeTab} error:`, err); }
  };

  // --- Columns Configuration ---
  const paymentCols = [
    { l: "PAY ID", w: "110px", k: "id" }, 
    { l: "INVESTMENT", w: "100px", k: "investment" }, 
    { l: "PARTY", w: "1fr", k: "party" }, 
    { l: "TYPE", w: "110px", k: "type" }, 
    { l: "AMOUNT", w: "120px", k: "amount" }, 
    { l: "DATE", w: "110px", k: "date" }, 
    { l: "STATUS", w: "100px", k: "status" }, 
    { l: "ACTIONS", w: "80px" }
  ];

  const batchCols = [
    { l: "BATCH ID", w: "130px", k: "batch_id" },
    { l: "STATUS", w: "160px", k: "status" },
    { l: "CREATED", w: "120px", k: "created_at" },
    { l: "UPDATED", w: "120px", k: "updated_at" },
    { l: "NOTES", w: "1fr", k: "notes" },
    { l: "ACTIONS", w: "80px" }
  ];

  const ledgerCols = [
    { l: "DATE", w: "110px", k: "created_at" },
    { l: "ENTITY TYPE", w: "120px", k: "entity_type" },
    { l: "ENTITY ID", w: "130px", k: "entity_id" },
    { l: "AMOUNT", w: "120px", k: "amount" },
    { l: "NOTE", w: "1fr", k: "note" }
  ];

  const activeCols = activeTab === "Payments" ? paymentCols : (activeTab === "ACH Batches" ? batchCols : ledgerCols);
  const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(activeCols);

  // --- Data Filtering & Sorting ---
  const getFilteredData = () => {
    let baseData = [];
    if (activeTab === "Payments") baseData = PAYMENTS;
    else if (activeTab === "ACH Batches") baseData = ACH_BATCHES;
    else baseData = LEDGER;

    return baseData.filter(p => {
      // Top level chips for payments
      if (activeTab === "Payments" && chip !== "All" && p.direction !== chip) return false;
      
      // Column filters
      return activeCols.every(c => {
        if (!c.k || !colFilters[c.k]) return true;
        const val = String(p[c.k] || "").toLowerCase();
        return val.includes(colFilters[c.k].toLowerCase());
      });
    });
  };

  const filtered = getFilteredData();
  const sorted = sortData(filtered, sort);
  const paginated = sorted.slice((page - 1) * 20, page * 20);
  const totalPages = Math.ceil(sorted.length / 20);

  // --- Render Helpers ---
  const renderRow = (p, i) => {
    const isHov = hov === p.id;
    if (activeTab === "Payments") {
      const isIn = p.direction === "Received";
      return (
        <div key={p.id} className="data-row" onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
          <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{p.id}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 500 }}>{p.investment || "—"}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.party}</div>
          <div style={{ fontSize: 12, color: t.textMuted }}>{p.type}</div>
          <div style={{ fontFamily: t.mono, fontSize: 12.5, fontWeight: 700, color: isIn ? (isDark ? "#34D399" : "#059669") : (isDark ? "#F87171" : "#DC2626") }}>{fmtCurr(isIn ? Math.abs(p.amount) : -Math.abs(p.amount))}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.date}</div>
          <div style={{ padding: "4px 0" }}>
            <Bdg label={p.status || "Pending"} {...(DIMENSIONS.find(d => d.name === "PaymentStatus" || d.name === "Payment Status")?.style?.[p.status] || { bg: isDark ? "rgba(156,163,175,0.1)" : "#F3F4F6", text: isDark ? "#9CA3AF" : "#4B5563" })} t={t} />
          </div>
          <ActBtns show={isHov && (canUpdate || canDelete)} t={t} onEdit={canUpdate ? () => openEditPayment(p) : null} onDel={canDelete ? () => setDelT({ id: p.id, name: p.id, docId: p.docId }) : null} />
        </div>
      );
    } else if (activeTab === "ACH Batches") {
      return (
        <div key={p.id} className="data-row" onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText, fontWeight: 600 }}>{p.batch_id}</div>
          <div>
            <Bdg label={p.status || "UNKNOWN"} {...(DIMENSIONS.find(d => d.name === "ACHBatchStatus" || d.name === "ACH Batch Status")?.style?.[p.status] || { bg: isDark ? "rgba(156,163,175,0.1)" : "#F3F4F6", text: isDark ? "#9CA3AF" : "#4B5563" })} t={t} />
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.created_at}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.updated_at || "—"}</div>
          <div style={{ fontSize: 12, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.notes || "—"}</div>
          <ActBtns show={isHov && (canUpdate || canDelete)} t={t} onEdit={canUpdate ? () => openEditBatch(p) : null} onDel={canDelete ? () => setDelT({ id: p.batch_id, name: p.batch_id, docId: p.docId }) : null} />
        </div>
      );
    } else { // Ledger
      return (
        <div key={p.id} className="data-row" style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: "transparent" }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.created_at}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary }}>{p.entity_type}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{p.entity_id}</div>
          <div style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 600, color: p.amount < 0 ? "#DC2626" : "#059669" }}>{fmtCurr(p.amount)}</div>
          <div style={{ fontSize: 12, color: t.textMuted }}>{p.note}</div>
        </div>
      );
    }
  };

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Payments & ACH Batches</h1>
        <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage transactions, batches, and audit trails</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {activeTab === "Payments" && canCreate && (
          <Tooltip text="Record a new cash receipt or disbursement" t={t}>
            <button className="primary-btn" onClick={openAddPayment} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Record Payment
            </button>
          </Tooltip>
        )}
        {activeTab === "ACH Batches" && canCreate && (
           <Tooltip text="Create a new ACH batch" t={t}>
           <button className="primary-btn" onClick={openAddBatch} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}>
             <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Batch
           </button>
         </Tooltip>
        )}
      </div>
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24, borderBottom: `1px solid ${t.surfaceBorder}` }}>
      {["Payments", "ACH Batches", "Ledger"].map(tab => (
        <div key={tab} onClick={() => { setActiveTab(tab); setPage(1); setColFilters({}); }} style={{ padding: "8px 4px 12px", fontSize: 14, fontWeight: activeTab === tab ? 600 : 500, color: activeTab === tab ? t.accent : t.textMuted, borderBottom: `2px solid ${activeTab === tab ? t.accent : "transparent"}`, cursor: "pointer", transition: "all 0.2s ease" }}>
          {tab}
        </div>
      ))}
    </div>

    {activeTab === "Payments" && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>{["All", "Received", "Disbursed"].map(f => { const isA = chip === f; return <span key={f} className="filter-chip" onClick={() => setChip(f)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{f}</span>; })}</div>
      </div>
    )}

    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
      <TblHead cols={activeCols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
      <TblFilterRow cols={activeCols} colFilters={colFilters} onFilterChange={setColFilter} onClear={() => setColFilters({})} gridTemplate={gridTemplate} t={t} isDark={isDark} />
      {paginated.length > 0 ? paginated.map((p, i) => renderRow(p, i)) : (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 14 }}>No {activeTab.toLowerCase()} found</div>
      )}
    </div>

    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{paginated.length}</strong> of <strong style={{ color: t.textSecondary }}>{sorted.length}</strong> records</span>
      <Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} t={t} />
    </div>

    {/* Modals */}
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? `New ${modal.type}` : `Edit ${modal.type}`} onSave={handleSave} width={modal.type === "payment" ? 520 : 420} t={t} isDark={isDark}>
      {modal.type === "payment" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Direction" t={t}><FSel value={modal.data.direction} onChange={e => setF("direction", e.target.value)} options={["Received", "Disbursed"]} t={t} /></FF>
            <FF label="Payment Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={["Interest", "Principal", "Interest + Principal", "Disbursement", "Fee"]} t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Investment" t={t}><FIn value={modal.data.investment} onChange={e => setF("investment", e.target.value)} placeholder="I10001" t={t} /></FF>
            <FF label="Contact" t={t}><FIn value={modal.data.party} onChange={e => setF("party", e.target.value)} placeholder="Contact name" t={t} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Amount" t={t}><FIn value={modal.data.amount} onChange={e => setF("amount", e.target.value)} placeholder="$0" t={t} /></FF>
            <FF label="Date" t={t}><FIn value={modal.data.date} onChange={e => setF("date", e.target.value)} placeholder="YYYY-MM-DD" t={t} type="date" /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label="Method" t={t}><FSel value={modal.data.method} onChange={e => setF("method", e.target.value)} options={["Wire", "Check", "ACH", "Cash"]} t={t} /></FF>
            <FF label="Payment Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={paymentStatusOpts} t={t} /></FF>
          </div>
          {modal.data.method === "ACH" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
               <FF label="ACH Batch Status" t={t}><FSel value={modal.data.batch_status} onChange={e => setF("batch_status", e.target.value)} options={achBatchStatusOpts} t={t} /></FF>
               <FF label="Batch ID" t={t}><FSel value={modal.data.batch_id} onChange={e => setF("batch_id", e.target.value)} options={ACH_BATCHES.map(b => b.batch_id)} t={t} /></FF>
            </div>
          )}
          <FF label="Note (optional)" t={t}><FIn value={modal.data.note} onChange={e => setF("note", e.target.value)} placeholder="Any remarks..." t={t} /></FF>
        </>
      ) : (
        <>
          <FF label="Batch ID" t={t}><FIn value={modal.data.batch_id} onChange={e => setF("batch_id", e.target.value)} placeholder="B1001" t={t} /></FF>
          <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={achBatchStatusOpts} t={t} /></FF>
          <FF label="Notes" t={t}><FIn value={modal.data.notes} onChange={e => setF("notes", e.target.value)} placeholder="Batch notes..." t={t} /></FF>
        </>
      )}
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDelete} label={`This ${activeTab.slice(0, -1)}`} t={t} isDark={isDark} />
  </>);
}
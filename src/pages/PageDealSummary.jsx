import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../firebase";
import { doc, getDocs, collection, updateDoc, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Modal, FF, FIn, FSel, DelModal } from "../components";
import { useAuth } from "../AuthContext";
import { getDealInvestmentColumns } from "../components/DealSummaryTanStackConfig";
import { getDistributionColumns } from "../components/DistributionScheduleTanStackConfig";
import TanStackTable from "../components/TanStackTable";

export default function PageDealSummary({ t, isDark, dealId, DEALS = [], INVESTMENTS = [], CONTACTS = [], DIMENSIONS = [], FEES_DATA = [], SCHEDULES = [], USERS = [], setActivePage, investmentCollection = "investments" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canUpdate = isSuperAdmin || hasPermission("INVESTMENT_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("INVESTMENT_DELETE") || hasPermission("INVESTMENTS_DELETE");
  const canCreate = isSuperAdmin || hasPermission("INVESTMENT_CREATE");

  const deal = useMemo(() => DEALS.find(d => d.id === dealId) || {}, [dealId, DEALS]);
  const [activeTab, setActiveTab] = useState("Investments");
  const [assetImages, setAssetImages] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (deal.id) {
       getDocs(collection(db, "deals", deal.id, "asset_images")).then(snap => {
         setAssetImages(snap.docs.map(d => d.data()));
       }).catch(console.error);
    }
  }, [deal.id]);

  const dealInvestments = useMemo(() => 
    INVESTMENTS.filter(c => c.deal_id === dealId || c.deal === deal.name)
  , [dealId, deal.name, INVESTMENTS]);

  const dealSchedules = useMemo(() => 
    SCHEDULES.filter(s => s.deal_id === dealId)
  , [dealId, SCHEDULES]);

  const gridRef = useRef();
  const tabs = ["Investments", "Assets", "Distributions", "Documents", "Valuation forms", "Contacts"];

  const openAdd = () => {
    let maxIdNum = 10000;
    INVESTMENTS.forEach(c => {
      const cid = c.investment_id || c.id;
      if (cid && cid.startsWith("I")) {
        const num = parseInt(cid.substring(1), 10);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
    setModal({
      open: true,
      mode: "add",
      data: {
        id: `I${maxIdNum + 1}`,
        deal: deal.name || "",
        deal_id: deal.id || "",
        party: "",
        type: "Individual",
        amount: "",
        rate: "",
        freq: "Quarterly",
        status: "Open",
        start_date: deal.startDate || "",
        maturity_date: deal.endDate || "",
        term_months: "",
        calculator: ""
      }
    });
  };

  const openEdit = (r) => setModal({ open: true, mode: "edit", data: { ...r } });
  
  const handleSaveInvestment = async () => {
    const d = modal.data;
    const dealObj = DEALS.find(p => p.name === d.deal);
    const parObj = CONTACTS.find(p => p.name === d.party);
    const payload = {
      deal_name: d.deal || "",
      deal_id: dealObj ? dealObj.id : (d.deal_id || ""),
      party_name: d.party || "",
      party_id: parObj ? parObj.id : (d.party_id || ""),
      investment_type: d.type || "",
      amount: d.amount ? Number(String(d.amount).replace(/[^0-9.-]/g, "")) || null : null,
      interest_rate: d.rate ? Number(String(d.rate).replace(/[^0-9.-]/g, "")) || null : null,
      payment_frequency: d.freq || "",
      term_months: d.term_months ? Number(d.term_months) : null,
      calculator: d.calculator || "",
      start_date: d.start_date || null,
      maturity_date: d.maturity_date || null,
      status: d.status || "",
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, investmentCollection, d.docId), payload);
      } else {
        await addDoc(collection(db, investmentCollection), { ...payload, investment_id: d.id || "", created_at: serverTimestamp() });
      }
      setModal(m => ({ ...m, open: false }));
    } catch (err) { console.error("Save investment error:", err); }
  };

  const handleDeleteInvestment = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, investmentCollection, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete investment error:", err); }
  };

  const permissions = { canUpdate, canDelete };
  const callbacks = { onEdit: openEdit, onDelete: setDelT };
  const context = { CONTACTS, FEES_DATA, callbacks, permissions, isDark, t };
  const columnDefs = useMemo(() => {
    return getDealInvestmentColumns(permissions, isDark, t, context);
  }, [permissions, isDark, t, CONTACTS, FEES_DATA]);

  const scheduleColumnDefs = useMemo(() => {
    return getDistributionColumns(isDark, t, CONTACTS, DEALS);
  }, [isDark, t, CONTACTS, DEALS]);

  function fmtCurrency(val) {
    if (val === null || val === undefined || val === "") return "—";
    const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]/g, ""));
    if (isNaN(num)) return "—";
    return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Breadcrumbs & Title */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: t.textMuted, marginBottom: 12 }}>
           <span style={{ cursor: "pointer" }} onClick={() => setActivePage("Dashboard")}>🏠</span>
           <span>›</span>
           <span style={{ cursor: "pointer" }} onClick={() => setActivePage("Deals")}>Deals</span>
           <span>›</span>
           <span style={{ color: t.textSecondary, fontWeight: 500 }}>{deal.name || "Loading..."}</span>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: t.titleFont, fontWeight: 800, fontSize: 28, color: isDark ? "#fff" : "#1C1917", marginBottom: 4 }}>
              {deal.name || "Deal Details"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
               <button onClick={() => setActivePage("Deals")} style={{ background: "none", border: "none", color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                 <span>‹</span> Back
               </button>
               <h2 style={{ fontSize: 18, color: t.textSecondary, fontWeight: 600 }}>Deal summary</h2>
               <span style={{ color: t.accent, fontSize: 13, fontWeight: 500 }}>{deal.status || "—"}</span>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
             <button style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fff", border: `1px solid ${t.surfaceBorder}`, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: t.textSecondary }}>Manage deal</button>
             {canCreate && <button onClick={openAdd} style={{ background: t.accent, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>+ Add investment</button>}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
         <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8 }}>Fundraising Progress</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? "#fff" : "#1C1917" }}>
              {fmtCurrency(deal.fundraisingAmount || 0)} <span style={{ fontSize: 16, color: t.accent }}>({(deal.fundraisingProgress || 0).toFixed(1)}%)</span>
            </div>
         </div>
         <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8 }}>Fund Balance</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? "#fff" : "#1C1917" }}>{deal.fundBalance || "$0"}</div>
         </div>
         <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8 }}>Fundraising Target</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? "#fff" : "#1C1917" }}>{deal.valuation || "$0"}</div>
         </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${t.surfaceBorder}`, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 32 }}>
          {tabs.map(tab => (
            <div 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              style={{ 
                padding: "12px 0", 
                fontSize: 14, 
                fontWeight: 600, 
                color: activeTab === tab ? t.text : t.textMuted, 
                cursor: "pointer", 
                position: "relative",
                transition: "all 0.2s ease"
              }}>
              {tab}
              {activeTab === tab && <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: t.accent }} />}
            </div>
          ))}
        </div>
        <button style={{ background: "none", border: `1px solid ${t.accent}`, color: t.accent, padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Export as Excel</button>
      </div>

      {activeTab === "Investments" ? (
        <div style={{ height: '500px', width: "100%", minHeight: '500px' }}>
            <TanStackTable
                data={dealInvestments}
                columns={columnDefs}
                pageSize={pageSize}
                t={t}
                isDark={isDark}
                onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.id)))}
            />
        </div>
      ) : activeTab === "Distributions" ? (
        <div style={{ height: '500px', width: "100%", minHeight: '500px' }}>
            <TanStackTable
                data={dealSchedules}
                columns={scheduleColumnDefs}
                pageSize={pageSize}
                t={t}
                isDark={isDark}
            />
        </div>
      ) : activeTab === "Assets" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
          {assetImages.length > 0 ? assetImages.map((img, i) => (
            <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${t.surfaceBorder}` }}>
              <img src={img.url} style={{ width: "100%", height: 160, objectFit: "cover" }} />
              <div style={{ padding: 12, fontSize: 12, color: t.textSecondary }}>{img.name}</div>
            </div>
          )) : <div style={{ color: t.textMuted }}>No assets found.</div>}
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA", borderRadius: 12 }}>
          Section "{activeTab}" is coming soon.
        </div>
      )}
      <Modal 
        open={modal.open} 
        onClose={() => setModal(m => ({ ...m, open: false }))} 
        title={modal.mode === "add" ? "New Investment" : "Edit Investment"} 
        onSave={handleSaveInvestment} 
        width={500} 
        t={t} 
        isDark={isDark}
      >
        <FF label="Investment ID" t={t}>
          <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.id}</div>
        </FF>
        <FF label="Contact (Investor)" t={t}>
          <FSel value={modal.data.party} onChange={e => setModal(m => ({ ...m, data: { ...m.data, party: e.target.value } }))} options={CONTACTS.map(p => p.name)} t={t} />
        </FF>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Invested amount" t={t}><FIn value={modal.data.amount} onChange={e => setModal(m => ({ ...m, data: { ...m.data, amount: e.target.value } }))} placeholder="e.g. 50,000" t={t} /></FF>
          <FF label="Interest Rate (%)" t={t}><FIn value={modal.data.rate} onChange={e => setModal(m => ({ ...m, data: { ...m.data, rate: e.target.value } }))} placeholder="e.g. 8.5" t={t} /></FF>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Start Date" t={t}><FIn value={modal.data.start_date || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, start_date: e.target.value } }))} t={t} type="date" /></FF>
          <FF label="Maturity Date" t={t}><FIn value={modal.data.maturity_date || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, maturity_date: e.target.value } }))} t={t} type="date" /></FF>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Payment Freq" t={t}><FSel value={modal.data.freq} onChange={e => setModal(m => ({ ...m, data: { ...m.data, freq: e.target.value } }))} options={["Monthly", "Quarterly", "Semi-Annual", "Annual", "At Maturity"]} t={t} /></FF>
          <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setModal(m => ({ ...m, data: { ...m.data, status: e.target.value } }))} options={["Open", "Active", "Closed"]} t={t} /></FF>
        </div>
      </Modal>
      <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteInvestment} label="this investment" t={t} isDark={isDark} />
    </div>
  );
}

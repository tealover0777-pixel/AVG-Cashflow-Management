import { useState, useMemo, useRef, useEffect } from "react";
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Bdg, StatCard, Pagination, Tooltip } from "../components";

ModuleRegistry.registerModules([AllCommunityModule]);

import 'ag-grid-community/styles/ag-grid.css';
import '../components/ag-grid/ag-grid-theme.css';

export default function PageDealSummary({ t, isDark, dealId, DEALS = [], CONTRACTS = [], CONTACTS = [], setActivePage }) {
  const deal = useMemo(() => DEALS.find(d => d.id === dealId) || {}, [dealId, DEALS]);
  const [activeTab, setActiveTab] = useState("Investments");
  const [assetImages, setAssetImages] = useState([]);

  useEffect(() => {
    if (deal.id) {
       getDocs(collection(db, "deals", deal.id, "asset_images")).then(snap => {
         setAssetImages(snap.docs.map(d => d.data()));
       }).catch(console.error);
    }
  }, [deal.id]);

  const dealContracts = useMemo(() => 
    CONTRACTS.filter(c => c.deal_id === dealId || c.deal === deal.name)
  , [dealId, deal.name, CONTRACTS]);

  const gridRef = useRef();
  
  const tabs = ["Investments", "Assets", "Distributions", "Documents", "Valuation forms", "Contacts"];

  const columnDefs = [
    { 
      headerName: "Investor name & profile", 
      field: "party", 
      flex: 1.5,
      cellRenderer: (params) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: isDark ? "#60A5FA" : "#2563EB" }}>{params.value}</div>
          <div style={{ fontSize: '10px', color: t.textMuted }}>{params.data.type || "Investor"}</div>
        </div>
      )
    },
    { 
      headerName: "Email address", 
      field: "email",
      flex: 1,
      valueGetter: (params) => {
        const p = CONTACTS.find(x => x.name === params.data.party || x.id === params.data.party_id);
        return p?.email || "—";
      }
    },
    { headerName: "Date placed", field: "start_date", flex: 0.8 },
    { 
      headerName: "Invested amount", 
      field: "amount",
      flex: 1,
      cellStyle: { fontWeight: 600 },
      headerComponentParams: {
         template: `
          <div class="ag-cell-label-container" role="presentation">
            <span ref="eMenu" class="ag-header-icon ag-header-cell-menu-button"></span>
            <div ref="eLabel" class="ag-header-cell-label" role="presentation">
              <span ref="eText" class="ag-header-cell-text"></span>
              <div style="font-size: 9px; opacity: 0.6; font-weight: 400;">Total: ${fmtCurrency(deal.fundraisingAmount || 0)}</div>
            </div>
          </div>
         `
      }
    },
    {
      headerName: "Actions",
      width: 100,
      pinned: "right",
      cellRenderer: () => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <button className="action-btn" style={{ opacity: 0.4 }}><span style={{ fontSize: 16 }}>📤</span></button>
        </div>
      )
    }
  ];

  function fmtCurrency(val) {
    return "$" + Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
             <button style={{ background: t.accent, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>+ Add investment</button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
         <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8 }}>Fundraising Progress</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? "#fff" : "#1C1917" }}>
              ${(deal.fundraisingAmount || 0).toLocaleString()} <span style={{ fontSize: 16, color: t.accent }}>({(deal.fundraisingProgress || 0).toFixed(1)}%)</span>
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
        <div className={`ag-theme-custom ${isDark ? 'dark-mode' : 'light-mode'}`} style={{ height: '500px', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
          <AgGridReact
            ref={gridRef}
            rowData={dealContracts}
            columnDefs={columnDefs}
            animateRows={true}
            pagination={true}
            paginationPageSize={20}
            suppressCellFocus={true}
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
    </div>
  );
}

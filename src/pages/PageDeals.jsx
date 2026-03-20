import { useState, useMemo, useRef, useEffect } from "react";
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

import 'ag-grid-community/styles/ag-grid.css';
import '../components/ag-grid/ag-grid-theme.css';
import { getColumnDefs } from '../components/ag-grid/DealsGridConfig.jsx';
import { db, storage } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sortData, mkId, fmtCurr, normalizeDateAtNoon, pmtCalculator_ACT360_30360, feeCalculator_ACT360_30360 } from "../utils";
import { Bdg, StatCard, Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";
import { Check, Plus } from "lucide-react";

const PT_INTEREST = "Interest_Payment";
const PT_PRINCIPAL = "Principal_Payment";
const PT_FEE = "Fee_Payment";
const PT_INV_FUND = "Investment_Funding";
const PT_INV_REPAYMENT = "Investment_Repayment";
const PT_BOR_RECEIVED = "Loan_Proceeds_Received";
const PT_BOR_PAYBACK = "Loan_Payback";

export default function PageDeals({ t, isDark, DEALS = [], INVESTMENTS = [], FEES_DATA = [], DIMENSIONS = [], collectionPath = "", setActivePage, setSelectedDealId, DISTRIBUTIONS = [] }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("DEAL_CREATE");
  const canUpdate = isSuperAdmin || hasPermission("DEAL_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("DEAL_DELETE");
  const [modal, setModal] = useState({ open: false, mode: "add", step: 1, data: {} });
  const [delT, setDelT] = useState(null);
  const [assetImages, setAssetImages] = useState([]); // { url, name, id }
  const [newFiles, setNewFiles] = useState([]); // { file, preview }
  const [isUploading, setIsUploading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [distModal, setDistModal] = useState({ open: false, data: { calculator: "ACT/360", startDate: "", endDate: "", notes: "" } });
  
  const fetchImages = async (did) => {
    try {
      const snap = await getDocs(collection(db, "deals", did, "asset_images"));
      setAssetImages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const nextDealId = (() => {
    if (DEALS.length === 0) return "D10001";
    const maxNum = Math.max(...DEALS.map(p => { const m = String(p.id).match(/^D(\d+)$/); return m ? Number(m[1]) : 0; }));
    return "D" + (maxNum + 1);
  })();
  const dealStatuses = DIMENSIONS.find(d => d.name === "Deal Status" || d.name === "DealStatus")?.items || ["Active", "Closed"];
  const dealTypes = DIMENSIONS.find(d => d.name === "Deal Type" || d.name === "DealType")?.items || [];

  const openAdd = () => {
    setAssetImages([]);
    setNewFiles([]);
    setModal({
      open: true,
      mode: "add",
      step: 1,
      data: {
        id: nextDealId,
        name: "",
        status: dealStatuses[0] || "Active",
        type: dealTypes[0] || "",
        startDate: "",
        endDate: "",
        valuation: "",
        description: "",
        // Asset info
        propName: "",
        country: "United States of America",
        addr1: "",
        addr2: "",
        city: "",
        state: "",
        zip: "",
      }
    });
  };
  const openEdit = r => {
    setAssetImages([]);
    setNewFiles([]);
    fetchImages(r.id);
    setModal({ open: true, mode: "edit", step: 1, data: { ...r } });
  };
  const close = () => {
    setModal(m => ({ ...m, open: false }));
    setNewFiles([]);
    setAssetImages([]);
  };
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
      // Asset info
      property_name: d.propName || "",
      asset_country: d.country || "",
      asset_addr1: d.addr1 || "",
      asset_addr2: d.addr2 || "",
      asset_city: d.city || "",
      asset_state: d.state || "",
      asset_zip: d.zip || "",
      updated_at: serverTimestamp(),
    };
    try {
      setIsUploading(true);
      const dealRef = doc(db, collectionPath, d.id);
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(dealRef, payload);
      } else {
        await setDoc(dealRef, { ...payload, created_at: serverTimestamp() });
      }

      // Handle new image uploads
      for (const fObj of newFiles) {
        const fileRef = ref(storage, `deals/${d.id}/asset_images/${Date.now()}_${fObj.file.name}`);
        const snap = await uploadBytes(fileRef, fObj.file);
        const url = await getDownloadURL(snap.ref);
        
        // Save to subcollection (not synced with BQ)
        await setDoc(doc(collection(db, "deals", d.id, "asset_images")), {
          url,
          name: fObj.file.name,
          created_at: serverTimestamp(),
        });
      }

      setIsUploading(false);
      close();
    } catch (err) {
      console.error("Failed to save deal:", err);
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const added = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));
    setNewFiles(prev => [...prev, ...added]);
  };

  const removeNewFile = (id) => {
    setNewFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const deleteExistingImage = async (imgId) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      await deleteDoc(doc(db, "deals", modal.data.id, "asset_images", imgId));
      setAssetImages(prev => prev.filter(img => img.id !== imgId));
    } catch (e) { console.error(e); }
  };
  const handleDeleteDeal = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete deal error:", err); }
  };

  const handleGenerateDistribution = async () => {
    if (selectedRows.length === 0) return;
    setIsUploading(true);
    try {
      const batchId = mkId("DIST");
      const tenantPath = collectionPath.split("/deals")[0];
      const schedulePath = `${tenantPath}/paymentSchedules`;
      const batchPath = `${tenantPath}/distributionBatches`;

      let totalAmount = 0;
      let recipientCount = 0;
      const processedInvestments = new Set();

      for (const deal of selectedRows) {
        // Find investments for this deal
        const dealInvestments = INVESTMENTS.filter(inv => inv.deal_id === deal.id || inv.deal_id === deal.docId);
        
        for (const inv of dealInvestments) {
          processedInvestments.add(inv.id);
          recipientCount++;

          // Simplified generation for the batch
          // In a real app, this would use the robust logic from PageInvestments.jsx
          const startDate = normalizeDateAtNoon(new Date(distModal.data.startDate || inv.startDate || new Date()));
          const endDate = normalizeDateAtNoon(new Date(distModal.data.endDate || inv.endDate || new Date()));
          const amount = parseFloat(String(inv.amount || 0).replace(/[^0-9.-]/g, ""));
          const rate = parseFloat(String(inv.rate || 0).replace(/[^0-9.-]/g, "")) / 100;

          // Generate one interest entry for this period
          const interestAmt = pmtCalculator_ACT360_30360(startDate, endDate, startDate, amount, rate, "Monthly");
          const sId = mkId("S");
          const payload = {
            schedule_id: sId,
            version_num: 1,
            version_id: `${sId}-V1`,
            payment_id: `${sId}-P`,
            active_version: true,
            investment_id: inv.id,
            deal_id: deal.id,
            party_id: inv.party_id || "",
            due_date: endDate.toISOString().slice(0, 10),
            payment_type: PT_INTEREST,
            payment_amount: Math.round(interestAmt * 100) / 100,
            signed_payment_amount: -Math.abs(interestAmt), // Assuming OUT for distribution
            direction_from_company: "OUT",
            status: "Due",
            notes: `Distribution Batch ${batchId}: ${distModal.data.notes || ""}`,
            created_at: serverTimestamp(),
            term_start: startDate.toISOString().slice(0, 10),
            term_end: endDate.toISOString().slice(0, 10),
            batch_id: batchId
          };
          
          await addDoc(collection(db, schedulePath), payload);
          totalAmount += Math.abs(interestAmt);
        }
      }

      // Create batch record
      await addDoc(collection(db, batchPath), {
        batch_id: batchId,
        deal_names: selectedRows.map(d => d.name).join(", "),
        amount: totalAmount,
        status: "Draft",
        method: distModal.data.calculator,
        recipient_count: recipientCount,
        notes: distModal.data.notes,
        created_at: serverTimestamp(),
        start_date: distModal.data.startDate,
        end_date: distModal.data.endDate,
        deal_ids: selectedRows.map(d => d.id)
      });

      setDistModal({ ...distModal, open: false });
      setSelectedRows([]);
      if (gridRef.current?.api) gridRef.current.api.deselectAll();
      setActivePage("Distribution Schedule");
    } catch (err) {
      console.error("Distribution generation error:", err);
      alert("Failed to generate distribution: " + err.message);
    } finally {
      setIsUploading(false);
    }
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
      onDelete: (target) => setDelT(target),
      onSelectDeal: (data) => {
        setSelectedDealId(data.id);
        setActivePage("Deal Summary");
      }
    }
  }), [isDark, t, permissions, FEES_DATA]);

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Deals</h1>
        <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage your investment deals</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {selectedRows.length > 0 && (
          <Tooltip text="Generate distribution schedules for selected deals" t={t}>
            <button className="primary-btn" onClick={() => setDistModal({ ...distModal, open: true })} style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px rgba(16, 185, 129, 0.25)`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 16 }}>📊</span> Generate Distribution Schedule
            </button>
          </Tooltip>
        )}
        {canCreate && <Tooltip text="Create a new investment deal" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Deal</button></Tooltip>}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
      {[{ label: "Total", value: DEALS.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Active", value: DEALS.filter(p => p.status !== "Closed" && p.status !== "Liquidated").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Closed", value: DEALS.filter(p => p.status === "Closed" || p.status === "Liquidated").length, accent: isDark ? "rgba(255,255,255,0.4)" : "#6B7280", bg: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB", border: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    
    <div className={(isDark ? "ag-theme-quartz-dark" : "ag-theme-quartz") + " ag-theme-custom"} style={{ height: "calc(100vh - 310px)", width: "100%" }}>
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
        columnHoverHighlight={true}
        rowSelection="multiple"
        onSelectionChanged={() => {
          const rows = gridRef.current.api.getSelectedRows();
          setSelectedRows(rows);
        }}
        onRowClicked={(event) => {
          // Row click behavior disabled in favor of specific link clicks on ID/Name
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
    <Modal 
      open={modal.open} 
      onClose={close} 
      title={modal.step === 1 ? (modal.mode === "add" ? "New Deal" : "Edit Deal") : "Add assets"} 
      onSave={modal.step === 1 ? () => setModal(m => ({ ...m, step: 2 })) : handleSaveDeal} 
      saveLabel={modal.step === 1 ? "Next" : (isUploading ? "Saving..." : "Save")}
      secondaryAction={modal.step === 2 ? () => setModal(m => ({ ...m, step: 1 })) : null}
      secondaryLabel="Back"
      width={580} 
      t={t} 
      isDark={isDark}
      loading={isUploading}
    >
      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32, position: "relative" }}>
        <div style={{ position: "absolute", top: "14px", left: "25%", right: "25%", height: 2, background: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6", zIndex: 0 }} />
        <div style={{ position: "absolute", top: "14px", left: "25%", width: modal.step === 2 ? "50%" : "0%", height: 2, background: t.accent, transition: "width 0.3s ease", zIndex: 1 }} />
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2, width: 80 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: modal.step > 1 ? "#34D399" : t.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${modal.step > 1 ? "#34D399" : t.accent}` }}>
            {modal.step > 1 ? <Check size={14} /> : <span style={{ fontSize: 13, fontWeight: 700 }}>1</span>}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: modal.step >= 1 ? (isDark ? "#fff" : "#1C1917") : t.textMuted }}>Deal</span>
        </div>

        <div style={{ width: "35%" }} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2, width: 80 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: modal.step === 2 ? t.accent : (isDark ? "#1e293b" : "#fff"), color: modal.step === 2 ? "#fff" : t.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, border: `2px solid ${modal.step === 2 ? t.accent : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB")}`, transition: "all 0.3s ease" }}>
            2
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: modal.step === 2 ? (isDark ? "#fff" : "#1C1917") : t.textMuted }}>Assets</span>
        </div>
      </div>

      {modal.step === 1 ? (
        <>
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
                      {selected ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
                      {f.name}
                      <span style={{ fontFamily: t.mono, fontSize: 10.5, opacity: 0.7 }}>({f.rate})</span>
                    </div>
                  );
                })}
              </div>
            </FF>
          )}
        </>
      ) : (
        <>
          <FF label="Name of property" t={t}><FIn value={modal.data.propName} onChange={e => setF("propName", e.target.value)} placeholder="Enter a name" t={t} /></FF>
          
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 12 }}>Address</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FF label="Country" t={t}><FSel value={modal.data.country} onChange={e => setF("country", e.target.value)} options={["United States of America", "Canada", "United Kingdom", "Australia"]} t={t} /></FF>
              <FF label="Street address line 1" t={t}><FIn value={modal.data.addr1} onChange={e => setF("addr1", e.target.value)} placeholder="Type to search" t={t} /></FF>
              <FF label="Street address line 2" t={t}><FIn value={modal.data.addr2} onChange={e => setF("addr2", e.target.value)} t={t} /></FF>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FF label="City" t={t}><FIn value={modal.data.city} onChange={e => setF("city", e.target.value)} t={t} /></FF>
                <FF label="State" t={t}><FIn value={modal.data.state} onChange={e => setF("state", e.target.value)} t={t} /></FF>
              </div>
              <FF label="Zip code" t={t}><FIn value={modal.data.zip} onChange={e => setF("zip", e.target.value)} t={t} /></FF>
            </div>
          </div>


          <FF label="Upload images" t={t}>
            <div 
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                const added = files.map(file => ({ file, preview: URL.createObjectURL(file), id: Math.random().toString(36).substr(2, 9) }));
                setNewFiles(prev => [...prev, ...added]);
              }}
              onClick={() => document.getElementById("file-up").click()}
              style={{ border: `2px dashed ${isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}`, borderRadius: 14, padding: "40px 20px", textAlign: "center", cursor: "pointer", background: isDark ? "rgba(255,255,255,0.01)" : "#F9FAFB", marginBottom: (newFiles.length > 0 || assetImages.length > 0) ? 20 : 0 }}>
              <input id="file-up" type="file" multiple hidden onChange={handleFileSelect} accept="image/*" />
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>🖼️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 4 }}>Drag and drop photos</div>
              <div style={{ fontSize: 13, color: t.textMuted }}>or <span style={{ color: t.accent, fontWeight: 600 }}>browse</span> to choose files</div>
            </div>

            {(newFiles.length > 0 || assetImages.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 12, marginTop: 8 }}>
                { assetImages.map(img => (
                  <div key={img.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `1px solid ${t.surfaceBorder}` }}>
                    <img src={img.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={(e) => { e.stopPropagation(); deleteExistingImage(img.id); }} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
                { newFiles.map(f => (
                  <div key={f.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `1px solid ${t.accent}`, opacity: 0.8 }}>
                    <img src={f.preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={(e) => { e.stopPropagation(); removeNewFile(f.id); }} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: t.accent, border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: t.accent, color: "#fff", fontSize: 8, textAlign: "center", padding: "2px 0", fontWeight: 700 }}>NEW</div>
                  </div>
                ))}
              </div>
            )}
          </FF>
        </>
      )}
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteDeal} label="This deal" t={t} isDark={isDark} />
    
    {/* Generate Distribution Modal */}
    <Modal open={distModal.open} onClose={() => setDistModal({ ...distModal, open: false })} title="Generate Distribution Schedule" onSave={handleGenerateDistribution} width={450} t={t} isDark={isDark} saveLabel={isUploading ? "Generating..." : "Create"} loading={isUploading}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>You have selected <strong style={{ color: t.textSecondary }}>{selectedRows.length}</strong> deals for distribution generation.</div>
        <FF label="Calculator Method" t={t}>
          <FSel value={distModal.data.calculator} onChange={e => setDistModal({ ...distModal, data: { ...distModal.data, calculator: e.target.value } })} options={["ACT/360", "30/360", "ACT/ACT", "Hybrid"]} t={t} />
        </FF>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Start Date" t={t}><FIn value={distModal.data.startDate} onChange={e => setDistModal({ ...distModal, data: { ...distModal.data, startDate: e.target.value } })} t={t} type="date" /></FF>
          <FF label="End Date" t={t}><FIn value={distModal.data.endDate} onChange={e => setDistModal({ ...distModal, data: { ...distModal.data, endDate: e.target.value } })} t={t} type="date" /></FF>
        </div>
        <FF label="Notes" t={t}><FIn value={distModal.data.notes} onChange={e => setDistModal({ ...distModal, data: { ...distModal.data, notes: e.target.value } })} placeholder="Optional processing notes..." t={t} /></FF>
      </div>
    </Modal>
  </>);
}

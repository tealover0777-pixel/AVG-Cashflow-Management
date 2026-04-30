import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from '../components/TanStackTable';
import { getDealColumns } from '../components/DealsTanStackConfig';
import { db, storage } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sortData, mkId, fmtCurr, normalizeDateAtNoon, pmtCalculator_ACT360_30360, feeCalculator_ACT360_30360, getFrequencyValue } from "../utils";
import { Bdg, StatCard, Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";
import { Check, Plus, CreditCard } from "lucide-react";

const PT_INTEREST = "INVESTOR_INTEREST_PAYMENT";
const PT_FEE = "FEE";
const PT_INV_FUND = "INVESTOR_PRINCIPAL_DEPOSIT";
const PT_INV_REPAYMENT = "INVESTOR_PRINCIPAL_PAYMENT";
const PT_BOR_DISBURSEMENT = "BORROWER_DISBURSEMENT";
const PT_BOR_RECEIVED = "BORROWER_PRINCIPAL_RECEIVED";
const PT_BOR_INTEREST = "BORROWER_INTEREST_PAYMENT";

export default function PageDeals({ t, isDark, DEALS = [], INVESTMENTS = [], SCHEDULES = [], FEES_DATA = [], DIMENSIONS = [], collectionPath = "", setActivePage, setSelectedDealId, tenantFeatures = {} }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("DEAL_CREATE");
  const canUpdate = isSuperAdmin || hasPermission("DEAL_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("DEAL_DELETE");
  const [modal, setModal] = useState({ open: false, mode: "add", step: 1, data: {} });
  const [delT, setDelT] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const [confirmDelImg, setConfirmDelImg] = useState(null);
  const [assetImages, setAssetImages] = useState([]); // { url, name, id }
  const [newFiles, setNewFiles] = useState([]); // { file, preview }
  const [isUploading, setIsUploading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [genResult, setGenResult] = useState(null);
  const [pageSize, setPageSize] = useState(30);
  const gridRef = useRef(null);
  const fetchImages = async (did, path) => {
    try {
      const p = path || `deals/${did}`;
      const snap = await getDocs(collection(db, p, "asset_images"));
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
        // Lag config
        lag_enabled: false,
        lag_type: "DAYS",
        lag_value: 0,
        lag_day: 15,
      }
    });
  };
  const openEdit = r => {
    setAssetImages([]);
    setNewFiles([]);
    fetchImages(r.id, r._path);
    const lag = r.payment_lag_config || {};
    setModal({ open: true, mode: "edit", step: 1, data: { 
      ...r,
      lag_enabled: !!lag.enabled,
      lag_type: lag.type || "DAYS",
      lag_value: lag.value || 0,
      lag_day: lag.specific_day || 15,
    } });
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
      payment_lag_config: {
        enabled: !!d.lag_enabled,
        type: d.lag_type || "DAYS",
        value: Number(d.lag_value) || 0,
        specific_day: Number(d.lag_day) || 15,
      },
      updated_at: serverTimestamp(),
    };
    try {
      setIsUploading(true);
      const dealRef = d._path ? doc(db, d._path) : doc(db, collectionPath, d.id);
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(dealRef, payload);
      } else {
        await setDoc(dealRef, { ...payload, created_at: serverTimestamp() });
      }

      // Handle new image uploads
      for (const fObj of newFiles) {
        const path = `${dealRef.path}/asset_images/${Date.now()}_${fObj.file.name}`;
        const fileRef = ref(storage, path);
        const snap = await uploadBytes(fileRef, fObj.file);
        const url = await getDownloadURL(snap.ref);

        // Save to subcollection (not synced with BQ)
        await setDoc(doc(collection(db, dealRef.path, "asset_images")), {
          url,
          name: fObj.file.name,
          created_at: serverTimestamp(),
        });
      }

      setIsUploading(false);
      close();
    } catch (err) {
      console.error("Failed to save deal:", err);
      showToast("Failed to save deal. " + err.message, "error");
      setIsUploading(false);
    }
  };

  const handleCloneDeal = async (row) => {
    try {
      const newId = nextDealId;
      const payload = {
        ...row,
        id: newId,
        name: `${row.name} (Copy)`,
        deal_name: `${row.deal_name || row.name} (Copy)`,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      // Remove metadata
      delete payload.docId;
      delete payload._path;
      
      const dealRef = doc(db, collectionPath, newId);
      await setDoc(dealRef, payload);
      showToast(`Deal cloned as ${newId}`, "success");
    } catch (err) {
      console.error("Failed to clone deal:", err);
      showToast("Failed to clone deal.", "error");
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

  const deleteExistingImage = (imgId) => setConfirmDelImg(imgId);

  const doDeleteExistingImage = async (imgId) => {
    try {
      const d = modal.data;
      const p = d._path || `${collectionPath}/${d.id || d.docId}`;
      await deleteDoc(doc(db, p, "asset_images", imgId));
      setAssetImages(prev => prev.filter(img => img.id !== imgId));
    } catch (e) { console.error(e); }
  };
  const handleDeleteDeal = async () => {
    try {
      const docRef = delT._path ? doc(db, delT._path) : (delT.docId ? doc(db, collectionPath, delT.docId) : null);
      if (docRef) {
        await deleteDoc(docRef);
        setDelT(null);
      }
    } catch (err) {
      console.error("Delete deal error:", err);
      showToast("Delete deal error: " + err.message, "error");
    }
  };



  // Dynamically calculate page size based on available vertical space
  useEffect(() => {
    const calculatePageSize = () => {
      const viewportHeight = window.innerHeight;

      // Table container matches: calc(100vh - 420px)
      const gridContainerHeight = viewportHeight - 420;
      const availableForRows = gridContainerHeight - 90; // Header + Footer + padding
      const calculatedRows = Math.floor(availableForRows / 40); // 40px estimated row height

      const newPageSize = Math.max(20, calculatedRows);
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


  // TanStack Table: Column definitions
  const permissions = { canUpdate, canDelete };

  const columnDefs = useMemo(() => getDealColumns(
    { canUpdate, canDelete },
    isDark,
    t,
    { 
      callbacks: { 
        onEdit: openEdit, 
        onDelete: (deal) => setDelT(deal), 
        onSelectDeal: (data) => {
          setSelectedDealId(data.id);
          setActivePage("Deal Summary");
        },
        onClone: handleCloneDeal,
      },
      feesData: FEES_DATA 
    }
  ), [canUpdate, canDelete, isDark, t, FEES_DATA, setSelectedDealId, handleCloneDeal, setActivePage]);

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Deals</h1>
        <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage your investment deals</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {canCreate && <Tooltip text="Create a new investment deal" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Deal</button></Tooltip>}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
      {[{ label: "Total", value: DEALS.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Active", value: DEALS.filter(p => p.status !== "Closed" && p.status !== "Liquidated").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Closed", value: DEALS.filter(p => p.status === "Closed" || p.status === "Liquidated").length, accent: isDark ? "rgba(255,255,255,0.4)" : "#6B7280", bg: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB", border: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>


    <div style={{ height: 'calc(100vh - 420px)', width: '100%', minHeight: '500px' }}>
      <TanStackTable
        ref={gridRef}
        data={DEALS}
        columns={columnDefs}
        isDark={isDark}
        t={t}
        pageSize={pageSize}
        onSelectionChange={(selected) => setSelectedRows(selected)}
      />
    </div>
    <Modal
      open={modal.open}
      onClose={close}
      title={modal.mode === "add" ? "New Deal" : "Edit Deal"}
      onSave={handleSaveDeal}
      saveLabel={isUploading ? "Saving..." : "Save Deal"}
      width={520}
      t={t}
      isDark={isDark}
      loading={isUploading}
    >
      <FF label="Deal ID" t={t}>
        <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
      </FF>
      <FF label="Deal Name" t={t}><FIn value={modal.data.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Palm Springs Villas" t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Deal Stage" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={dealStatuses} t={t} /></FF>
        <FF label="Deal Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={dealTypes} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Start Date" t={t}><FIn value={modal.data.startDate || ""} onChange={e => setF("startDate", e.target.value)} t={t} type="date" /></FF>
        <FF label="End Date" t={t}><FIn value={modal.data.endDate || ""} onChange={e => setF("endDate", e.target.value)} t={t} type="date" /></FF>
      </div>
      <FF label="Funding Target" t={t}><FIn value={modal.data.valuation || ""} onChange={e => setF("valuation", e.target.value)} placeholder="e.g. 2,500,000" t={t} /></FF>
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

        {/* Payment Lag Configuration */}
        {tenantFeatures.show_payment_lag && (
          <div style={{ marginTop: 8, padding: "14px 16px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", border: `1px solid ${t.surfaceBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: modal.data.lag_enabled ? 16 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={16} style={{ color: t.accent }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>Default Payment Lag</span>
              </div>
              <input 
                type="checkbox" 
                checked={!!modal.data.lag_enabled} 
                onChange={e => setF("lag_enabled", e.target.checked)} 
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: t.accent }} 
              />
            </div>
            {modal.data.lag_enabled && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FF label="Lag Type" t={t}>
                  <FSel 
                    value={modal.data.lag_type || "Days"} 
                    onChange={e => setF("lag_type", e.target.value)} 
                    options={(DIMENSIONS.find(d => d.name === "PaymentLag")?.items || ["Days", "Months", "Specific Day of the following Month", "Quater-End"]).map(opt => ({ id: opt, display: opt }))} 
                    t={t} 
                  />
                </FF>
                {(modal.data.lag_type?.toLowerCase() === "days" || modal.data.lag_type?.toLowerCase() === "months" || modal.data.lag_type?.toLowerCase() === "quater-end" || modal.data.lag_type?.toLowerCase() === "quarter-end" || modal.data.lag_type?.toLowerCase() === "specific day of the following month") && (
                  <FF label={
                    modal.data.lag_type?.toLowerCase() === "months" ? "Number of Months" : 
                    modal.data.lag_type?.toLowerCase() === "specific day of the following month" ? "Day of Month" :
                    modal.data.lag_type?.toLowerCase() === "quater-end" || modal.data.lag_type?.toLowerCase() === "quarter-end" ? "Day Offset" :
                    "Number of Days"
                  } t={t}>
                    <FIn type="number" value={modal.data.lag_value || ""} onChange={e => setF("lag_value", e.target.value)} placeholder="e.g. 30" t={t} />
                  </FF>
                )}
              </div>
            )}
          </div>
        )}
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteDeal} label="This deal" t={t} isDark={isDark} />


    {/* Result Modal */}
    <Modal open={!!genResult} onClose={() => setGenResult(null)} title={genResult?.title || "Result"} onSave={() => setGenResult(null)} saveLabel="OK" t={t} isDark={isDark}>
      <div style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {(genResult?.lines || []).map((line, i) => (
          <div key={i} style={{ fontSize: 13.5, color: i === 0 ? (isDark ? "#fff" : "#1C1917") : t.textMuted, lineHeight: 1.6, fontWeight: i === 0 ? 600 : 400 }}>{line}</div>
        ))}
      </div>
    </Modal>

    <DelModal open={!!confirmDelImg} onClose={() => setConfirmDelImg(null)} onDel={async () => { await doDeleteExistingImage(confirmDelImg); setConfirmDelImg(null); }} title="Delete Image?" t={t}>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.textMuted }}>Are you sure you want to delete this image? This cannot be undone.</p>
    </DelModal>

    {toast && (
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
        <span>{toast.type === "success" ? "✅" : "❌"}</span>
        <span>{toast.msg}</span>
        <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
      </div>
    )}
  </>);
}

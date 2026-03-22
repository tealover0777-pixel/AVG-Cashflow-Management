import React, { useState, useEffect, useMemo, useRef } from "react";
import { db, storage } from "../firebase";
import { doc, getDocs, collection, updateDoc, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Modal, FF, FIn, FSel, DelModal } from "../components";
import { useAuth } from "../AuthContext";
import { getDealInvestmentColumns } from "../components/DealSummaryTanStackConfig";
import { getDistributionColumns } from "../components/DistributionScheduleTanStackConfig";
import { getContactColumns } from "../components/ContactsTanStackConfig";
import { getAssetColumns } from "../components/AssetsTanStackConfig";
import TanStackTable from "../components/TanStackTable";
import { X } from "lucide-react";

export default function PageDealSummary({ t, isDark, dealId, DEALS = [], INVESTMENTS = [], CONTACTS = [], DIMENSIONS = [], FEES_DATA = [], SCHEDULES = [], USERS = [], setActivePage, investmentCollection = "investments" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canUpdate = isSuperAdmin || hasPermission("INVESTMENT_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("INVESTMENT_DELETE") || hasPermission("INVESTMENTS_DELETE");
  const canCreate = isSuperAdmin || hasPermission("INVESTMENT_CREATE");

  const deal = useMemo(() => DEALS.find(d => d.id === dealId) || {}, [dealId, DEALS]);
  const [activeTab, setActiveTab] = useState("Investments");
  const [distributionView, setDistributionView] = useState("table"); // "table" or "pivot"
  const [assetImages, setAssetImages] = useState([]);
  const [assets, setAssets] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [assetModal, setAssetModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [assetDelT, setAssetDelT] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [pageSize, setPageSize] = useState(20);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [attributes, setAttributes] = useState([]);

  useEffect(() => {
    if (deal.id) {
       getDocs(collection(db, "deals", deal.id, "asset_images")).then(snap => {
         setAssetImages(snap.docs.map(d => d.data()));
       }).catch(console.error);

       // Fetch assets
       getDocs(collection(db, "deals", deal.id, "assets")).then(snap => {
         setAssets(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
       }).catch(console.error);
    }
  }, [deal.id]);

  const dealInvestments = useMemo(() => 
    INVESTMENTS.filter(c => c.deal_id === dealId || c.deal === deal.name)
  , [dealId, deal.name, INVESTMENTS]);

  const dealContacts = useMemo(() => {
    const partyIds = new Set(dealInvestments.map(inv => inv.party_id));
    return CONTACTS.filter(c => partyIds.has(c.id) || partyIds.has(c.docId));
  }, [dealInvestments, CONTACTS]);

  const dealSchedules = useMemo(() =>
    SCHEDULES.filter(s => s.deal_id === dealId)
  , [dealId, SCHEDULES]);

  // Pivot data for distribution chart view
  const pivotData = useMemo(() => {
    if (!dealSchedules.length) return { investors: [], dates: [], data: {} };

    // Get unique investors and dates
    const investorSet = new Set();
    const dateSet = new Set();
    const dataMap = {};

    dealSchedules.forEach(schedule => {
      const investor = CONTACTS.find(c => c.id === schedule.party_id);
      const investorName = investor ? investor.name : schedule.party_id || "Unknown";
      const dueDate = schedule.dueDate || "No Date";
      const amount = Number(schedule.signed_payment_amount) || 0;

      investorSet.add(investorName);
      dateSet.add(dueDate);

      const key = `${investorName}|${dueDate}`;
      dataMap[key] = (dataMap[key] || 0) + amount;
    });

    const investors = Array.from(investorSet).sort();
    const dates = Array.from(dateSet).sort();

    return { investors, dates, data: dataMap };
  }, [dealSchedules, CONTACTS]);

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
        const docRef = d._path ? doc(db, d._path) : doc(db, investmentCollection, d.docId);
        await updateDoc(docRef, payload);
      } else {
        await addDoc(collection(db, investmentCollection), { ...payload, investment_id: d.id || "", created_at: serverTimestamp() });
      }
      setModal(m => ({ ...m, open: false }));
    } catch (err) { 
      console.error("Save investment error:", err);
      alert("Failed to save investment. " + err.message);
    }
  };

  const handleDeleteInvestment = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, investmentCollection, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete investment error:", err); }
  };

  // Asset management functions
  const openAddAsset = () => {
    setUploadedPhotos([]);
    setNewPhotoFiles([]);
    setAttributes([]);
    setAssetModal({
      open: true,
      mode: "add",
      data: {
        name: "",
        country: "United States of America",
        addr1: "",
        addr2: "",
        city: "",
        state: "",
        zip: "",
        visible_offerings: true,
        visible_deal: true
      }
    });
  };

  const openEditAsset = async (r) => {
    // Fetch photos for this asset
    try {
      const photosSnap = await getDocs(collection(db, "deals", deal.id, "assets", r.docId, "photos"));
      const photos = photosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUploadedPhotos(photos);
    } catch (e) {
      console.error("Error fetching photos:", e);
      setUploadedPhotos([]);
    }

    // Parse attributes from data
    const attrFields = ["asset_type", "property_class", "num_units", "units", "net_asset_value",
                        "acquisition_price", "acquisition_date", "exit_price", "exit_date",
                        "year_built", "year_renovated"];
    const attrs = [];
    attrFields.forEach(field => {
      if (r[field] !== undefined && r[field] !== null && r[field] !== "") {
        attrs.push({ label: field.replace(/_/g, " "), value: r[field] });
      }
    });
    setAttributes(attrs);
    setNewPhotoFiles([]);
    setAssetModal({ open: true, mode: "edit", data: { ...r } });
  };

  const closeAssetModal = () => {
    setAssetModal({ open: false, mode: "add", data: {} });
    setUploadedPhotos([]);
    setNewPhotoFiles([]);
    setAttributes([]);
  };

  const handleSaveAsset = async () => {
    const d = assetModal.data;
    const fullAddress = [d.addr1, d.addr2, d.city, d.state, d.zip, d.country]
      .filter(Boolean)
      .join(", ");

    const payload = {
      name: d.name || "",
      country: d.country || "United States of America",
      addr1: d.addr1 || "",
      addr2: d.addr2 || "",
      city: d.city || "",
      state: d.state || "",
      zip: d.zip || "",
      address: fullAddress,
      visible_offerings: d.visible_offerings !== false,
      visible_deal: d.visible_deal !== false,
      asset_type: d.asset_type || "",
      property_class: d.property_class || "",
      num_units: d.num_units || null,
      units: d.units || "",
      net_asset_value: d.net_asset_value || null,
      acquisition_price: d.acquisition_price || null,
      acquisition_date: d.acquisition_date || null,
      exit_price: d.exit_price || null,
      exit_date: d.exit_date || null,
      year_built: d.year_built || null,
      year_renovated: d.year_renovated || null,
      images: uploadedPhotos.length + newPhotoFiles.length,
      updated_at: serverTimestamp(),
    };

    try {
      let assetDocRef;
      if (assetModal.mode === "edit" && d.docId) {
        assetDocRef = doc(db, "deals", deal.id, "assets", d.docId);
        await updateDoc(assetDocRef, payload);
      } else {
        assetDocRef = await addDoc(collection(db, "deals", deal.id, "assets"), {
          ...payload,
          created_at: serverTimestamp()
        });
      }

      // Upload new photos
      if (newPhotoFiles.length > 0) {
        const assetId = assetModal.mode === "edit" ? d.docId : assetDocRef.id;
        for (const fileObj of newPhotoFiles) {
          const storageRef = ref(storage, `deals/${deal.id}/assets/${assetId}/${Date.now()}_${fileObj.file.name}`);
          const uploadResult = await uploadBytes(storageRef, fileObj.file);
          const url = await getDownloadURL(uploadResult.ref);

          await addDoc(collection(db, "deals", deal.id, "assets", assetId, "photos"), {
            url,
            name: fileObj.file.name,
            created_at: serverTimestamp()
          });
        }
      }

      // Refresh assets
      const snap = await getDocs(collection(db, "deals", deal.id, "assets"));
      setAssets(snap.docs.map(doc => ({ docId: doc.id, ...doc.data() })));

      closeAssetModal();
    } catch (err) {
      console.error("Save asset error:", err);
      alert("Failed to save asset. " + err.message);
    }
  };

  const handleDeleteAsset = async () => {
    if (!assetDelT || !assetDelT.docId) return;
    try {
      // Delete photos subcollection first
      const photosSnap = await getDocs(collection(db, "deals", deal.id, "assets", assetDelT.docId, "photos"));
      for (const photoDoc of photosSnap.docs) {
        await deleteDoc(doc(db, "deals", deal.id, "assets", assetDelT.docId, "photos", photoDoc.id));
      }

      // Delete asset document
      await deleteDoc(doc(db, "deals", deal.id, "assets", assetDelT.docId));

      // Refresh assets
      const snap = await getDocs(collection(db, "deals", deal.id, "assets"));
      setAssets(snap.docs.map(doc => ({ docId: doc.id, ...doc.data() })));

      setAssetDelT(null);
    } catch (err) {
      console.error("Delete asset error:", err);
      alert("Failed to delete asset. " + err.message);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setNewPhotoFiles(prev => [...prev, ...newFiles]);
  };

  const removeNewPhoto = (index) => {
    setNewPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeUploadedPhoto = async (photo) => {
    try {
      await deleteDoc(doc(db, "deals", deal.id, "assets", assetModal.data.docId, "photos", photo.id));
      setUploadedPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (e) {
      console.error("Error deleting photo:", e);
      alert("Failed to delete photo.");
    }
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

  const contactColumnDefs = useMemo(() => {
    // Standardized context for contact columns
    const contactContext = {
      callbacks: {
        onNameClick: (r) => { /* Optional: navigate to profile */ },
        onEdit: (r) => { /* Optional: specific logic */ },
        onDelete: (r) => { /* Optional: specific logic */ },
        onInvite: (r) => { /* Optional: specific logic */ }
      },
      invitingId: null
    };
    const contactPermissions = { canUpdate, canDelete, canInvite: false };
    return getContactColumns(contactPermissions, isDark, t, contactContext);
  }, [isDark, t, canUpdate, canDelete]);

  const assetColumnDefs = useMemo(() => {
    const assetContext = {
      callbacks: {
        onNameClick: openEditAsset,
        onEdit: openEditAsset,
        onDelete: setAssetDelT
      }
    };
    const assetPermissions = { canUpdate, canDelete };
    return getAssetColumns(assetPermissions, isDark, t, assetContext);
  }, [isDark, t, canUpdate, canDelete]);

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
             {canCreate && activeTab === "Investments" && <button onClick={openAdd} style={{ background: t.accent, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>+ Add investment</button>}
             {canCreate && activeTab === "Assets" && <button onClick={openAddAsset} style={{ background: t.accent, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>+ Add asset</button>}
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
        <div>
          {/* Distribution sub-tabs */}
          <div style={{ borderBottom: `1px solid ${t.surfaceBorder}`, marginBottom: 20, display: "flex", gap: 24 }}>
            <div
              onClick={() => setDistributionView("table")}
              style={{
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 600,
                color: distributionView === "table" ? t.text : t.textMuted,
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s ease"
              }}
            >
              Table View
              {distributionView === "table" && <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: t.accent }} />}
            </div>
            <div
              onClick={() => setDistributionView("pivot")}
              style={{
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 600,
                color: distributionView === "pivot" ? t.text : t.textMuted,
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s ease"
              }}
            >
              Pivot View
              {distributionView === "pivot" && <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: t.accent }} />}
            </div>
          </div>

          {distributionView === "table" ? (
            <div style={{ height: '500px', width: "100%", minHeight: '500px' }}>
              <TanStackTable
                data={dealSchedules}
                columns={scheduleColumnDefs}
                pageSize={pageSize}
                t={t}
                isDark={isDark}
              />
            </div>
          ) : (
            <div style={{
              background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
              border: `1px solid ${t.surfaceBorder}`,
              borderRadius: 12,
              padding: 24,
              overflowX: "auto"
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 20 }}>
                Distribution Pivot Table
              </h3>

              {pivotData.investors.length > 0 ? (
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12
                }}>
                  <thead>
                    <tr style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
                      borderBottom: `2px solid ${t.surfaceBorder}`
                    }}>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: t.text,
                        position: "sticky",
                        left: 0,
                        background: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
                        zIndex: 2
                      }}>
                        Investor Name
                      </th>
                      {pivotData.dates.map((date, idx) => (
                        <th key={idx} style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: t.text,
                          minWidth: 120
                        }}>
                          {date}
                        </th>
                      ))}
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: t.text,
                        background: isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF",
                        minWidth: 120
                      }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivotData.investors.map((investor, invIdx) => {
                      let rowTotal = 0;
                      return (
                        <tr key={invIdx} style={{
                          borderBottom: `1px solid ${t.surfaceBorder}`,
                          transition: "background 0.15s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{
                            padding: "12px 16px",
                            fontWeight: 600,
                            color: t.text,
                            position: "sticky",
                            left: 0,
                            background: isDark ? "#1a1a1a" : "#fff",
                            zIndex: 1
                          }}>
                            {investor}
                          </td>
                          {pivotData.dates.map((date, dateIdx) => {
                            const key = `${investor}|${date}`;
                            const amount = pivotData.data[key] || 0;
                            rowTotal += amount;
                            return (
                              <td key={dateIdx} style={{
                                padding: "12px 16px",
                                textAlign: "right",
                                fontFamily: t.mono,
                                fontWeight: 600,
                                color: amount > 0 ? (isDark ? "#34D399" : "#059669") : t.textMuted
                              }}>
                                {amount > 0 ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                              </td>
                            );
                          })}
                          <td style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontFamily: t.mono,
                            fontWeight: 700,
                            fontSize: 13,
                            color: isDark ? "#60A5FA" : "#2563EB",
                            background: isDark ? "rgba(96,165,250,0.05)" : "#EFF6FF"
                          }}>
                            ${rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Column totals row */}
                    <tr style={{
                      background: isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF",
                      borderTop: `2px solid ${t.surfaceBorder}`,
                      fontWeight: 700
                    }}>
                      <td style={{
                        padding: "12px 16px",
                        color: t.text,
                        position: "sticky",
                        left: 0,
                        background: isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF",
                        zIndex: 1
                      }}>
                        Total
                      </td>
                      {pivotData.dates.map((date, idx) => {
                        const colTotal = pivotData.investors.reduce((sum, inv) => {
                          const key = `${inv}|${date}`;
                          return sum + (pivotData.data[key] || 0);
                        }, 0);
                        return (
                          <td key={idx} style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontFamily: t.mono,
                            color: t.text
                          }}>
                            ${colTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                      <td style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontFamily: t.mono,
                        fontSize: 14,
                        color: t.text
                      }}>
                        ${pivotData.investors.reduce((grandTotal, inv) => {
                          return grandTotal + pivotData.dates.reduce((invTotal, date) => {
                            const key = `${inv}|${date}`;
                            return invTotal + (pivotData.data[key] || 0);
                          }, 0);
                        }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div style={{
                  padding: 40,
                  textAlign: "center",
                  color: t.textMuted
                }}>
                  No distribution data available.
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === "Assets" ? (
        <div style={{ height: '500px', width: "100%", minHeight: '500px' }}>
            <TanStackTable
                data={assets}
                columns={assetColumnDefs}
                pageSize={pageSize}
                t={t}
                isDark={isDark}
            />
        </div>
      ) : activeTab === "Contacts" ? (
        <div style={{ height: '500px', width: "100%", minHeight: '500px' }}>
            <TanStackTable
                data={dealContacts}
                columns={contactColumnDefs}
                pageSize={pageSize}
                t={t}
                isDark={isDark}
            />
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

      {/* Asset Modal */}
      <Modal
        open={assetModal.open}
        onClose={closeAssetModal}
        title={assetModal.mode === "add" ? "New Asset" : assetModal.data.name || "Edit Asset"}
        onSave={handleSaveAsset}
        width={900}
        t={t}
        isDark={isDark}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Name</h3>
              <FF label="Name of property" t={t}>
                <FIn
                  value={assetModal.data.name || ""}
                  onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))}
                  placeholder="e.g. Long Beach Clinic"
                  t={t}
                />
              </FF>
            </div>

            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Address</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <FF label="Country" t={t}>
                  <FSel
                    value={assetModal.data.country || "United States of America"}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, country: e.target.value } }))}
                    options={["United States of America", "Canada", "Mexico", "United Kingdom", "Other"]}
                    t={t}
                  />
                </FF>
                <FF label="Street address line 1" t={t}>
                  <FIn
                    value={assetModal.data.addr1 || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, addr1: e.target.value } }))}
                    placeholder="e.g. 780 Atlantic Ave"
                    t={t}
                  />
                </FF>
                <FF label="Street address line 2" t={t}>
                  <FIn
                    value={assetModal.data.addr2 || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, addr2: e.target.value } }))}
                    t={t}
                  />
                </FF>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <FF label="City" t={t}>
                    <FIn
                      value={assetModal.data.city || ""}
                      onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, city: e.target.value } }))}
                      placeholder="e.g. Long Beach"
                      t={t}
                    />
                  </FF>
                  <FF label="State" t={t}>
                    <FIn
                      value={assetModal.data.state || ""}
                      onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, state: e.target.value } }))}
                      placeholder="e.g. CA"
                      t={t}
                    />
                  </FF>
                </div>
                <FF label="Zip code" t={t}>
                  <FIn
                    value={assetModal.data.zip || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, zip: e.target.value } }))}
                    placeholder="e.g. 90813"
                    t={t}
                  />
                </FF>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Additional information</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <FF label="Asset type" t={t}>
                  <FIn
                    value={assetModal.data.asset_type || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, asset_type: e.target.value } }))}
                    placeholder="Select asset type"
                    t={t}
                  />
                </FF>
                <FF label="Property class" t={t}>
                  <FIn
                    value={assetModal.data.property_class || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, property_class: e.target.value } }))}
                    t={t}
                  />
                </FF>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <FF label="Number of units" t={t}>
                    <FIn
                      value={assetModal.data.num_units || ""}
                      onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, num_units: e.target.value } }))}
                      type="number"
                      t={t}
                    />
                  </FF>
                  <FF label="Units" t={t}>
                    <FIn
                      value={assetModal.data.units || ""}
                      onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, units: e.target.value } }))}
                      placeholder="e.g. sqft"
                      t={t}
                    />
                  </FF>
                </div>
                <FF label="Net asset value" t={t}>
                  <FIn
                    value={assetModal.data.net_asset_value || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, net_asset_value: e.target.value } }))}
                    type="number"
                    t={t}
                  />
                </FF>
                <FF label="Acquisition price" t={t}>
                  <FIn
                    value={assetModal.data.acquisition_price || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, acquisition_price: e.target.value } }))}
                    type="number"
                    t={t}
                  />
                </FF>
                <FF label="Acquisition date" t={t}>
                  <FIn
                    value={assetModal.data.acquisition_date || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, acquisition_date: e.target.value } }))}
                    type="date"
                    t={t}
                  />
                </FF>
                <FF label="Exit price" t={t}>
                  <FIn
                    value={assetModal.data.exit_price || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, exit_price: e.target.value } }))}
                    type="number"
                    t={t}
                  />
                </FF>
                <FF label="Exit date" t={t}>
                  <FIn
                    value={assetModal.data.exit_date || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, exit_date: e.target.value } }))}
                    type="date"
                    t={t}
                  />
                </FF>
                <FF label="Year built" t={t}>
                  <FIn
                    value={assetModal.data.year_built || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, year_built: e.target.value } }))}
                    type="number"
                    placeholder="e.g. 2015"
                    t={t}
                  />
                </FF>
                <FF label="Year renovated" t={t}>
                  <FIn
                    value={assetModal.data.year_renovated || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, year_renovated: e.target.value } }))}
                    type="number"
                    t={t}
                  />
                </FF>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Visibility</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <FF label="Visible in offerings?" t={t}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        checked={assetModal.data.visible_offerings === true}
                        onChange={() => setAssetModal(m => ({ ...m, data: { ...m.data, visible_offerings: true } }))}
                        style={{ accentColor: t.accent }}
                      />
                      <span style={{ fontSize: 13, color: t.text }}>Yes</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        checked={assetModal.data.visible_offerings === false}
                        onChange={() => setAssetModal(m => ({ ...m, data: { ...m.data, visible_offerings: false } }))}
                        style={{ accentColor: t.accent }}
                      />
                      <span style={{ fontSize: 13, color: t.text }}>No</span>
                    </label>
                  </div>
                </FF>
                <FF label="Visible in deal?" t={t}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        checked={assetModal.data.visible_deal === true}
                        onChange={() => setAssetModal(m => ({ ...m, data: { ...m.data, visible_deal: true } }))}
                        style={{ accentColor: t.accent }}
                      />
                      <span style={{ fontSize: 13, color: t.text }}>Yes</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        checked={assetModal.data.visible_deal === false}
                        onChange={() => setAssetModal(m => ({ ...m, data: { ...m.data, visible_deal: false } }))}
                        style={{ accentColor: t.accent }}
                      />
                      <span style={{ fontSize: 13, color: t.text }}>No</span>
                    </label>
                  </div>
                </FF>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Upload photos</h3>
              <div
                style={{
                  border: `2px dashed ${t.surfaceBorder}`,
                  borderRadius: 12,
                  padding: 40,
                  textAlign: "center",
                  background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA",
                  cursor: "pointer",
                  position: "relative"
                }}
                onClick={() => document.getElementById("photo-upload").click()}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>
                  Drag and drop photos
                </div>
                <div style={{ fontSize: 12, color: t.textMuted }}>or browse to choose files</div>
                <input
                  id="photo-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
              </div>

              {/* Photo thumbnails */}
              {(uploadedPhotos.length > 0 || newPhotoFiles.length > 0) && (
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {uploadedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        position: "relative",
                        borderRadius: 8,
                        overflow: "hidden",
                        border: `1px solid ${t.surfaceBorder}`,
                        aspectRatio: "1"
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeUploadedPhoto(photo); }}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.6)",
                          border: "none",
                          borderRadius: 4,
                          padding: 4,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <X size={14} color="#fff" />
                      </button>
                    </div>
                  ))}
                  {newPhotoFiles.map((fileObj, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        borderRadius: 8,
                        overflow: "hidden",
                        border: `1px solid ${t.surfaceBorder}`,
                        aspectRatio: "1"
                      }}
                    >
                      <img
                        src={fileObj.preview}
                        alt={fileObj.file.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeNewPhoto(idx); }}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.6)",
                          border: "none",
                          borderRadius: 4,
                          padding: 4,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <X size={14} color="#fff" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteInvestment} label="this investment" t={t} isDark={isDark} />
      <DelModal target={assetDelT} onClose={() => setAssetDelT(null)} onConfirm={handleDeleteAsset} label="this asset" t={t} isDark={isDark} />
    </div>
  );
}

import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from "../components/TanStackTable";
import { getDistributionColumns } from "../components/DistributionScheduleTanStackConfig";
import { getDealColumns } from "../components/DealsTanStackConfig";
import { db } from "../firebase";
import { doc, updateDoc, deleteDoc, serverTimestamp, setDoc, collection, addDoc } from "firebase/firestore";
import { fmtCurr, mkId, normalizeDateAtNoon, pmtCalculator_ACT360_30360, feeCalculator_ACT360_30360, getFrequencyValue } from "../utils.jsx";
import { StatCard, Bdg, Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { PieChart, Check, Plus, AlertTriangle, FileCheck } from "lucide-react";
import { useAuth } from "../AuthContext";

const PT_INTEREST = "INVESTOR_INTEREST_PAYMENT";
const PT_FEE = "FEE";
const PT_INV_FUND = "INVESTOR_PRINCIPAL_DEPOSIT";
const PT_INV_REPAYMENT = "INVESTOR_PRINCIPAL_PAYMENT";
const PT_BOR_DISBURSEMENT = "BORROWER_DISBURSEMENT";
const PT_BOR_RECEIVED = "BORROWER_PRINCIPAL_RECEIVED";
const PT_BOR_INTEREST = "BORROWER_INTEREST_PAYMENT";

export default function PageDistributionSchedule({ t, isDark, DEALS = [], INVESTMENTS = [], FEES_DATA = [], SCHEDULES = [], CONTACTS = [], DIMENSIONS = [], DISTRIBUTIONS = [], collectionPath = "", setActivePage, setSelectedDealId }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canUpdate = isSuperAdmin || hasPermission("DISTRIBUTION_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("DISTRIBUTION_DELETE");

  const [subTab, setSubTab] = useState("Distributions"); // "Distributions" | "Generate"
  const [chip, setChip] = useState("All");
  const [detailBatch, setDetailBatch] = useState(null);
  const [delT, setDelT] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [distModal, setDistModal] = useState({ open: false, data: { calculator: "ACT/360", notes: "" } });
  const [genResult, setGenResult] = useState(null);

  const gridRef = useRef(null);
  const genGridRef = useRef(null);
  const [pageSize, setPageSize] = useState(30);
  const [selSchedules, setSelSchedules] = useState(new Set());
  const [selDeals, setSelDeals] = useState(new Set());


  // Dynamically calculate page size based on available vertical space
  useEffect(() => {
    const calculatePageSize = () => {
      const rowHeight = 42; 
      const headerHeight = 56; 
      const viewportHeight = window.innerHeight;

      // Grid container matches: calc(100vh - 310px) 
      const gridContainerHeight = viewportHeight - 310;
      const availableForRows = gridContainerHeight - headerHeight;
      const calculatedRows = Math.floor(availableForRows / rowHeight);

      const newPageSize = Math.max(30, calculatedRows); 
      setPageSize(newPageSize);
    };

    const timer = setTimeout(calculatePageSize, 100);
    calculatePageSize();
    window.addEventListener('resize', calculatePageSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePageSize);
    };
  }, []);

  const columnDefs = useMemo(() => getDistributionColumns(isDark, t, CONTACTS, DEALS), [isDark, t, CONTACTS, DEALS]);

  // Deal Columns for "Generate" tab
  const dealColumnContext = useMemo(() => ({
    isDark, t, feesData: FEES_DATA,
    callbacks: {
      onSelectDeal: (data) => {
        setSelectedDealId(data.id);
        setActivePage("Deal Summary");
      }
    }
  }), [isDark, t, FEES_DATA, setSelectedDealId, setActivePage]);

  const dealColumnDefs = useMemo(() => {
    const permissions = { canUpdate: false, canDelete: false }; // Non-editable on this page
    return getDealColumns(permissions, isDark, t, dealColumnContext);
  }, [isDark, t, dealColumnContext]);


  const distributionSchedules = useMemo(() => {
    return SCHEDULES.filter(s => s.batch_id);
  }, [SCHEDULES]);

  const filteredData = useMemo(() => {
    if (chip === "All") return distributionSchedules;
    return distributionSchedules.filter(s => s.status === chip);
  }, [distributionSchedules, chip]);

  // For Generate Tab: filter deals to Active/Closed ones?
  const generationData = useMemo(() => {
    return DEALS.filter(d => d.status !== "Pipeline");
  }, [DEALS]);

  const handleGenerateDistribution = async () => {
    const selectedDealsRows = generationData.filter(d => selDeals.has(d.id));
    if (selectedDealsRows.length === 0) return;
    
    setGenerating(true);
    try {
      const batchId = mkId("DIST");
      const firstRow = selectedDealsRows[0];
      
      // Determine the tenant path from the first deal
      // On global view, collectionPath starts with GROUP:
      const tenantPath = (firstRow._path || collectionPath).split("/deals")[0];
      if (tenantPath.startsWith("GROUP:")) {
          setGenResult({ title: "Error", lines: ["Cannot generate distributions from a global group view yet. Please select a specific tenant."] });
          setGenerating(false);
          return;
      }
      
      const batchPath = `${tenantPath}/distributionBatches`;
      const schedulePath = `${tenantPath}/paymentSchedules`;
      const calcMethod = distModal.data.calculator || "ACT/360";
      const entries = [];

      for (const deal of selectedDealsRows) {
        // Robust filter for investments belonging to this deal
        const dealId = deal.id;
        const dealDocId = deal.docId;
        const dealName = deal.name;
        
        const dealInvestments = INVESTMENTS.filter(inv => 
          inv.deal_id === dealId || 
          inv.deal_id === dealDocId || 
          inv.deal === dealName ||
          inv.deal_name === dealName
        );
        
        for (const inv of dealInvestments) {
          const principal = parseFloat(String(inv.amount || 0).replace(/[^0-9.-]/g, ""));
          const rate = parseFloat(String(inv.rate || 0).replace(/[^0-9.-]/g, "")) / 100;
          const startDate = normalizeDateAtNoon(inv.start_date);
          const matDate = normalizeDateAtNoon(inv.maturity_date);

          if (!startDate || !matDate || matDate <= startDate) continue;

          // 1. Initial Investment Funding (mapped to INVESTOR_PRINCIPAL_DEPOSIT to match Investments page)
          const sIdFund = mkId("S");
          entries.push({
            schedule_id: sIdFund, version_num: 1, version_id: `${sIdFund}-V1`, payment_id: sIdFund, active_version: true,
            investment_id: inv.id, deal_id: deal.id, party_id: inv.party_id || "", 
            due_date: startDate.toISOString().slice(0, 10), payment_type: PT_INV_FUND, principal_amount: principal,
            payment_amount: principal, 
            signed_payment_amount: -Math.abs(principal), direction_from_company: "OUT",
            original_payment_amount: principal, 
            applied_to: "Principal Amount",
            term_start: startDate.toISOString().slice(0, 10), term_end: startDate.toISOString().slice(0, 10),
            status: "Due", notes: `Initial Funding [Batch: ${batchId}]`, created_at: serverTimestamp(), batch_id: batchId
          });

          // 2. Lifecycle periods for Interest and Fees
          const freqValue = getFrequencyValue(inv.freq || "Monthly");
          const fLow = (inv.freq || "").toLowerCase();
          const monthsPerPeriod = 12 / freqValue;
          
          let pStart = normalizeDateAtNoon(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
          let safety = 0;
          let periodNum = 1;

          while (pStart < matDate && safety < 1200) {
            safety++;
            let pEnd;
            if (fLow.includes("month")) {
                pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0));
            } else {
                pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), pStart.getMonth() + (monthsPerPeriod || 1), 0));
            }

            if (pEnd > matDate) pEnd = matDate;
            if (pEnd <= pStart) {
              pStart = normalizeDateAtNoon(new Date(pStart.getFullYear(), pStart.getMonth() + 1, 1));
              continue;
            }

            // Interest Payment (INVESTOR_INTEREST_PAYMENT)
            const interestAmt = pmtCalculator_ACT360_30360(pStart, pEnd, startDate, principal, rate, inv.freq || "Monthly", calcMethod);
            const roundedInterest = Math.round(interestAmt * 100) / 100;
            if (roundedInterest > 0) {
              const sIdInt = mkId("S");
              entries.push({
                schedule_id: sIdInt, version_num: 1, version_id: `${sIdInt}-V1`, payment_id: sIdInt, active_version: true,
                investment_id: inv.id, deal_id: deal.id, party_id: inv.party_id || "",
                due_date: pEnd.toISOString().slice(0, 10), payment_type: PT_INTEREST, principal_amount: principal,
                payment_amount: roundedInterest, signed_payment_amount: -Math.abs(roundedInterest), direction_from_company: "OUT",
                original_payment_amount: roundedInterest, term_start: pStart.toISOString().slice(0, 10), term_end: pEnd.toISOString().slice(0, 10),
                status: "Due", notes: `Interest Period ${periodNum} [Batch: ${batchId}]`, created_at: serverTimestamp(), batch_id: batchId
              });
            }

            // Fee Payments (based on Deal's assigned fees)
            const dealFeeIds = deal.feeIds || [];
            const dealFees = FEES_DATA.filter(f => dealFeeIds.includes(f.id));
            for (const fee of dealFees) {
              const feeAmt = feeCalculator_ACT360_30360(fee, principal, pStart, pEnd, startDate, calcMethod);
              if (feeAmt === 0 || isNaN(feeAmt)) continue;
              const roundedFee = Math.round(feeAmt * 100) / 100;
              const feeDir = fee.direction || "OUT";
              const sIdFee = mkId("S");
              entries.push({
                schedule_id: sIdFee, version_num: 1, version_id: `${sIdFee}-V1`, payment_id: sIdFee, active_version: true,
                investment_id: inv.id, deal_id: deal.id, party_id: inv.party_id || "",
                due_date: pEnd.toISOString().slice(0, 10), payment_type: PT_FEE, fee_id: fee.id,
                payment_amount: roundedFee, 
                signed_payment_amount: feeDir === "OUT" ? -Math.abs(roundedFee) : Math.abs(roundedFee), 
                direction_from_company: feeDir,
                original_payment_amount: roundedFee, term_start: pStart.toISOString().slice(0, 10), term_end: pEnd.toISOString().slice(0, 10),
                status: "Due", notes: `${fee.name} [Batch: ${batchId}]`, created_at: serverTimestamp(), batch_id: batchId
              });
            }

            // Final Repayment (INVESTOR_PRINCIPAL_PAYMENT)
            if (pEnd >= matDate) {
              const sIdRepay = mkId("S");
              entries.push({
                schedule_id: sIdRepay, version_num: 1, version_id: `${sIdRepay}-V1`, payment_id: sIdRepay, active_version: true,
                investment_id: inv.id, deal_id: deal.id, party_id: inv.party_id || "",
                due_date: pEnd.toISOString().slice(0, 10), payment_type: PT_INV_REPAYMENT, principal_amount: principal,
                payment_amount: principal, signed_payment_amount: Math.abs(principal), direction_from_company: "IN",
                original_payment_amount: principal, 
                applied_to: "Principal Amount",
                term_start: pEnd.toISOString().slice(0, 10), term_end: pEnd.toISOString().slice(0, 10),
                status: "Due", notes: `Principal Repayment [Batch: ${batchId}]`, created_at: serverTimestamp(), batch_id: batchId
              });
            }

            pStart = normalizeDateAtNoon(new Date(pEnd.getFullYear(), pEnd.getMonth() + 1, 1));
            periodNum++;
          }
        }
      }

      // Save to Firestore in batches
      for (let i = 0; i < entries.length; i += 50) {
        const chunk = entries.slice(i, i + 50);
        await Promise.all(chunk.map(e => setDoc(doc(db, schedulePath, e.version_id), e)));
      }

      // Create batch record
      await addDoc(collection(db, batchPath), {
        id: batchId,
        created_at: serverTimestamp(),
        total_amount: entries.reduce((acc, x) => acc + (x.direction_from_company === "OUT" ? x.payment_amount : 0), 0),
        recipient_count: entries.length,
        status: "Draft",
        notes: distModal.data.notes || "Auto-generated distribution schedule",
        deal_ids: selectedDealsRows.map(d => d.id)
      });

      setGenResult({
        title: "Success",
        lines: [
            `Distribution schedules generated for ${selectedDealsRows.length} deals.`,
            `Created ${entries.length} distribution entries in Batch ${batchId}.`,
            `The schedules have been added to the Active Distributions list.`
        ]
      });
      setDistModal({ ...distModal, open: false });
      setSelDeals(new Set());
      if (genGridRef.current?.resetRowSelection) genGridRef.current.resetRowSelection();
      setSubTab("Distributions");
    } catch (err) {
      console.error("Distribution generation error:", err);
      setGenResult({ title: "Error", lines: ["Failed to generate distribution:", err.message] });
    } finally {
      setGenerating(false);
    }
  };


  const stats = [
    { label: "Total Distributed", value: fmtCurr(distributionSchedules.reduce((s, b) => s + (parseFloat(String(b.payment_amount || 0).replace(/[^0-9.-]/g, "")) || 0), 0)), accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
    { label: "Due Distributions", value: distributionSchedules.filter(s => s.status === "Due").length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
    { label: "Unique Recipients", value: new Set(distributionSchedules.map(s => s.party_id)).size, accent: isDark ? "#F472B6" : "#BE185D", bg: isDark ? "rgba(244,114,182,0.08)" : "#FDF2F8", border: isDark ? "rgba(244,114,182,0.15)" : "#FBCFE8" },
    { label: "Total Batches", value: new Set(distributionSchedules.map(s => s.batch_id)).size, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" },
  ];

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Distribution Schedule</h1>
        <p style={{ fontSize: 13.5, color: t.textMuted }}>Review and manage capital distributions across deals</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {subTab === "Generate" && selDeals.size > 0 && (
          <Tooltip text="Generate distribution schedules for selected deals" t={t}>
            <button className="primary-btn" onClick={() => setDistModal({ ...distModal, open: true })} style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px rgba(16, 185, 129, 0.25)`, display: "flex", alignItems: "center", gap: 7 }}>
              <PieChart size={16} /> Generate Distribution Schedule
            </button>
          </Tooltip>
        )}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {stats.map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>

    {/* Custom Sub-Tabs for generating vs viewing */}
    <div style={{ display: "flex", gap: 32, borderBottom: `1px solid ${t.surfaceBorder}`, marginBottom: 24 }}>
      {["Distributions", "Generate"].map(tt => {
        const isA = subTab === tt;
        return (
          <div key={tt} onClick={() => setSubTab(tt)} style={{ padding: "8px 4px 12px", fontSize: 13.5, fontWeight: isA ? 700 : 500, color: isA ? t.accent : t.textMuted, borderBottom: `3px solid ${isA ? t.accent : "transparent"}`, cursor: "pointer", transition: "all 0.2s ease" }}>
            {tt === "Distributions" ? "Active Distributions" : "Generate Lifecycle"}
          </div>
        );
      })}
    </div>

    {subTab === "Distributions" ? (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["All", "Due", "Paid"].map(c => {
              const isA = chip === c;
              return <span key={c} onClick={() => setChip(c)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{c}</span>;
            })}
          </div>
          <div style={{ fontSize: 12, color: t.textMuted }}>
            <strong style={{ color: t.textSecondary }}>{filteredData.length}</strong> schedules identified
          </div>
        </div>

        <div style={{ height: 'calc(100vh - 510px)', width: '100%', minHeight: '400px' }}>
          <TanStackTable
            ref={gridRef}
            data={filteredData}
            columns={columnDefs}
            pageSize={pageSize}
            t={t}
            isDark={isDark}
            onSelectionChange={(selected) => setSelSchedules(new Set(selected.map(r => r.id)))}
          />
        </div>
      </>
    ) : (
      <>
        <div style={{ marginBottom: 16, fontSize: 13, color: t.textMuted }}>
          Select deals to generate their full distribution life-cycle (Funding, Interest, Fees, Repayment)
        </div>
        <div style={{ height: 'calc(100vh - 510px)', width: '100%', minHeight: '400px' }}>
          <TanStackTable
            ref={genGridRef}
            data={generationData}
            columns={dealColumnDefs}
            pageSize={pageSize}
            t={t}
            isDark={isDark}
            onSelectionChange={(selected) => setSelDeals(new Set(selected.map(r => r.id)))}
          />
        </div>
      </>
    )}



    {detailBatch && (
      <Modal open={true} onClose={() => setDetailBatch(null)} title={`Batch Details: ${detailBatch.batch_id}`} width={500} t={t} isDark={isDark}>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>Deals</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{detailBatch.deal_names}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>Total Amount</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.accent }}>{fmtCurr(detailBatch.amount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>Method</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{detailBatch.method}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>Recipients</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{detailBatch.recipient_count}</span>
          </div>
          <div style={{ padding: "12px 0" }}>
            <span style={{ fontSize: 13, color: t.textMuted, display: "block", marginBottom: 8 }}>Notes</span>
            <div style={{ fontSize: 12.5, color: t.textSecondary, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", padding: 12, borderRadius: 8, minHeight: 60 }}>{detailBatch.notes || "No notes provided."}</div>
          </div>
        </div>
      </Modal>
    )}

    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={async () => {
      if (!delT || !delT.docId) return;
      try {
        await deleteDoc(doc(db, collectionPath, delT.docId));
        setDelT(null);
      } catch (err) { console.error("Delete batch error:", err); }
    }} label="This distribution batch" t={t} isDark={isDark} />

    {/* Generate Distribution Modal */}
    <Modal open={distModal.open} onClose={() => setDistModal({ ...distModal, open: false })} title="Generate Distribution Schedule" onSave={handleGenerateDistribution} width={450} t={t} isDark={isDark} saveLabel={generating ? "Generating..." : "Create"} loading={generating}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>You have selected <strong style={{ color: t.textSecondary }}>{selDeals.size}</strong> deals for distribution generation.</div>
        <FF label="Calculator Method" t={t}>
          <FSel value={distModal.data.calculator} onChange={e => setDistModal({ ...distModal, data: { ...distModal.data, calculator: e.target.value } })} options={["ACT/360", "30/360", "ACT/ACT", "Hybrid"]} t={t} />
        </FF>
        <FF label="Notes" t={t}><FIn value={distModal.data.notes} onChange={e => setDistModal({ ...distModal, data: { ...distModal.data, notes: e.target.value } })} placeholder="Optional processing notes..." t={t} /></FF>
      </div>
    </Modal>

    {/* Result Modal */}
    <Modal open={!!genResult} onClose={() => setGenResult(null)} title={genResult?.title || "Result"} onSave={() => setGenResult(null)} saveLabel="OK" t={t} isDark={isDark}>
      <div style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {(genResult?.lines || []).map((line, i) => (
          <div key={i} style={{ fontSize: 13.5, color: i === 0 ? (isDark ? "#fff" : "#1C1917") : t.textMuted, lineHeight: 1.6, fontWeight: i === 0 ? 600 : 400 }}>{line}</div>
        ))}
      </div>
    </Modal>

    {/* Loading Overlay */}
    {generating && <>
      <style>{`@keyframes cfm-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, background: isDark ? "rgba(30,30,40,0.95)" : "#fff", padding: "40px 52px", borderRadius: 18, boxShadow: "0 8px 40px rgba(0,0,0,0.3)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}` }}>
          <div style={{ width: 44, height: 44, border: `4px solid ${isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}`, borderTopColor: isDark ? "#60A5FA" : "#3B82F6", borderRadius: "50%", animation: "cfm-spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917", letterSpacing: "0.2px" }}>Distribution Generation In Progress...</span>
          <span style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "#9CA3AF" }}>Please wait while lifecycle is being created</span>
        </div>
      </div>
    </>}

  </>);
}

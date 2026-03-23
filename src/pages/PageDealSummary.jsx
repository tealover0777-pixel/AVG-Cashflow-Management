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
import { X, Check, Plus, Construction, AlertTriangle, FileCheck } from "lucide-react";
import { normalizeDateAtNoon, getFrequencyValue, pmtCalculator_ACT360_30360, feeCalculator_ACT360_30360, fmtCurr } from "../utils";

export default function PageDealSummary({ t, isDark, dealId, DEALS = [], INVESTMENTS = [], CONTACTS = [], DIMENSIONS = [], FEES_DATA = [], SCHEDULES = [], USERS = [], setActivePage, investmentCollection = "investments", scheduleCollection = "paymentSchedules" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canUpdate = isSuperAdmin || hasPermission("INVESTMENT_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("INVESTMENT_DELETE") || hasPermission("INVESTMENTS_DELETE");
  const canCreate = isSuperAdmin || hasPermission("INVESTMENT_CREATE");
  const paymentMethods = (DIMENSIONS.find(d => d.name === "Payment Method" || d.name === "PaymentMethod") || {}).items || [];
  const investmentStatusOpts = (DIMENSIONS.find(d => d.name === "InvestmentStatus" || d.name === "Investment Status") || {}).items?.filter(i => i) || ["Open", "Active", "Closed"];
  const paymentStatusOpts = (DIMENSIONS.find(d => d.name === "PaymentStatus" || d.name === "Payment Status" || d.name === "ScheduleStatus" || d.name === "Schedule Status") || {}).items?.filter(i => i) || ["Due", "Paid", "Partial", "Missed", "Cancelled"];

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
  const [rowSelection, setRowSelection] = useState({});
  const [pageSize, setPageSize] = useState(30);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genConfirm, setGenConfirm] = useState(null);
  const [genResult, setGenResult] = useState(null);
  const [bulkInvestmentStatus, setBulkInvestmentStatus] = useState(investmentStatusOpts[0] || "");
  const [bulkScheduleStatus, setBulkScheduleStatus] = useState(paymentStatusOpts[0] || "");
  const [confirmAction, setConfirmAction] = useState(null); // { title: string, message: string, onConfirm: () => void }

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

  const totalFundBalance = useMemo(() => {
    let sum = 0;
    dealInvestments.forEach(inv => {
      const amt = Number(String(inv.amount || 0).replace(/[^0-9.-]/g, ""));
      const typeMatch = (inv.type || "").toUpperCase() === "INVESTOR_PRINCIPAL_PAYMENT";
      const isWithdrawal = (inv.status || "").toLowerCase().includes("withdraw"); // Handles "Withdrawl" and "Withdrawal"
      
      if (typeMatch) sum += amt;
      if (isWithdrawal) sum -= amt;
    });
    return fmtCurr(sum);
  }, [dealInvestments]);

  const dealContacts = useMemo(() => {
    const partyIds = new Set(dealInvestments.map(inv => inv.party_id));
    return CONTACTS.filter(c => partyIds.has(c.id) || partyIds.has(c.docId));
  }, [dealInvestments, CONTACTS]);

  const dealSchedules = useMemo(() =>
    SCHEDULES.filter(s => s.deal_id === dealId)
  , [dealId, SCHEDULES]);

  // Pivot data for distribution chart view
  const pivotData = useMemo(() => {
    if (!dealSchedules.length) return { rows: [], dates: [], data: {} };

    // Get unique investor+type combinations, dates, and data
    const rowSet = new Set();
    const dateSet = new Set();
    const dataMap = {};
    const rowMetadata = {};

    // Helper function to parse currency string like "$8,000.00"
    const parseCurrency = (value) => {
      if (value === undefined || value === null || value === "") return 0;
      // If it's already a number, return it
      if (typeof value === 'number') return value;
      // If it's a string, remove $, commas, and spaces, then parse
      const cleaned = String(value).replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    console.log('Processing dealSchedules for pivot:', dealSchedules.length, 'records');

    dealSchedules.forEach(schedule => {
      const investor = CONTACTS.find(c => c.id === schedule.party_id);
      const investorName = investor ? investor.name : schedule.party_id || "Unknown";
      const dueDate = schedule.dueDate || schedule.due_date || "No Date";
      let paymentType = schedule.type || schedule.payment_type || "Unknown Type";
      const hasFeeRef = schedule.fee_id || schedule.feeId || schedule.fee_name || schedule.feeName;
      if (hasFeeRef) {
        const fId = (schedule.fee_id || schedule.feeId || "");
        const fee = fId ? (FEES_DATA.find(f => f.id === fId) || FEES_DATA.find(f => f.docId === fId)) : null;
        
        // Use explicit fee_name on schedule OR lookup fee name
        let resolvedName = (schedule.fee_name || schedule.feeName || "").trim();
        if (!resolvedName && fee) {
          resolvedName = fee.name;
        }
        
        if (resolvedName) paymentType = resolvedName;
      }

      // Try multiple field name variations and parse currency
      let amount = 0;
      if (schedule.signed_payment_amount !== undefined && schedule.signed_payment_amount !== null) {
        amount = parseCurrency(schedule.signed_payment_amount);
      } else if (schedule.signedPaymentAmount !== undefined && schedule.signedPaymentAmount !== null) {
        amount = parseCurrency(schedule.signedPaymentAmount);
      } else if (schedule.amount !== undefined && schedule.amount !== null) {
        amount = parseCurrency(schedule.amount);
      } else if (schedule.payment_amount !== undefined && schedule.payment_amount !== null) {
        amount = parseCurrency(schedule.payment_amount);
      }

      const rowKey = `${investorName}|||${paymentType}`;
      rowSet.add(rowKey);
      dateSet.add(dueDate);

      if (!rowMetadata[rowKey]) {
        const inv = INVESTMENTS.find(iv => iv.id === (schedule.investment_id || schedule.investment));
        rowMetadata[rowKey] = {
          startDate: inv?.start_date || "—",
          endDate: inv?.maturity_date || "—",
          rate: inv?.rate || "—",
          paymentMethod: inv?.payment_method || investor?.payment_method || "—"
        };
      }

      const cellKey = `${rowKey}|||${dueDate}`;
      dataMap[cellKey] = (dataMap[cellKey] || 0) + amount;
    });

    // Convert row keys to objects with investor and type
    const rows = Array.from(rowSet).map(key => {
      const [investor, type] = key.split('|||');
      return { 
        investor, 
        type, 
        key,
        ...rowMetadata[key]
      };
    }).sort((a, b) => {
      // Sort by investor name first, then by type
      if (a.investor !== b.investor) return a.investor.localeCompare(b.investor);
      return a.type.localeCompare(b.type);
    });

    const dates = Array.from(dateSet).sort();

    console.log('Pivot data calculated:', { rows: rows.length, dates: dates.length, dataMap });

    return { rows, dates, data: dataMap };
  }, [dealSchedules, CONTACTS, INVESTMENTS, FEES_DATA]);

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
        calculator: "",
        payment_method: (CONTACTS.find(p => p.name === "")?.payment_method || (paymentMethods[0] || ""))
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
      payment_method: d.payment_method || "",
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        const docRef = d._path ? doc(db, d._path) : doc(db, investmentCollection, d.docId);
        await updateDoc(docRef, payload);
      } else {
        await addDoc(collection(db, investmentCollection), { ...payload, investment_id: d.id || "", created_at: serverTimestamp() });
      }
      // Also update the contact's default payment method if it changed
      if (parObj && d.payment_method) {
        const contactRef = parObj._path ? doc(db, parObj._path) : doc(db, "parties", parObj.docId || parObj.id);
        await updateDoc(contactRef, { payment_method: d.payment_method, updated_at: serverTimestamp() }).catch(e => console.error("Sync contact error:", e));
      }
      setModal(m => ({ ...m, open: false }));
    } catch (err) { 
      console.error("Save investment error:", err);
      setGenResult({ title: "Error", message: "Failed to save investment. " + err.message });
    }
  };

  const handleDeleteInvestment = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, investmentCollection, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete investment error:", err); }
  };

  const handleBulkInvestmentStatus = (status) => {
    if (!status || sel.size === 0) return;
    setConfirmAction({
      title: "Confirm Status Update",
      message: `Are you sure you want to update status to "${status}" for ${sel.size} investment(s)?`,
      onConfirm: async () => {
        try {
          await Promise.all([...sel].map(id => {
            const c = INVESTMENTS.find(c => c.id === id);
            if (c && (c._path || c.docId)) {
              const docRef = c._path ? doc(db, c._path) : doc(db, investmentCollection, c.docId);
              return updateDoc(docRef, { status, updated_at: serverTimestamp() });
            }
            return Promise.resolve();
          }));
          setSel(new Set()); setBulkInvestmentStatus("");
          setConfirmAction(null);
        } catch (err) { console.error("Bulk status update error:", err); }
      }
    });
  };

  const handleBulkInvestmentDelete = () => {
    if (sel.size === 0) return;
    setConfirmAction({
      title: "Confirm Delete",
      message: `Are you sure you want to delete ${sel.size} investment(s)? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all([...sel].map(id => {
            const c = INVESTMENTS.find(c => c.id === id);
            if (c) {
              const docRef = c._path ? doc(db, c._path) : (c.docId ? doc(db, investmentCollection, c.docId) : null);
              if (docRef) return deleteDoc(docRef);
            }
            return Promise.resolve();
          }));
          setSel(new Set());
          setConfirmAction(null);
        } catch (err) { console.error("Bulk delete error:", err); }
      }
    });
  };

  const handleBulkScheduleStatus = (status) => {
    if (!status || Object.keys(rowSelection).length === 0) return;
    setConfirmAction({
      title: "Confirm Status Update",
      message: `Update status to "${status}" for ${Object.keys(rowSelection).length} entries?`,
      onConfirm: async () => {
        try {
          await Promise.all(Object.keys(rowSelection).map(id => {
            const s = (SCHEDULES || []).find(x => x.id === id || x.docId === id || x.schedule_id === id);
            if (s && s.docId) {
              const refPath = s._path || `${scheduleCollection}/${s.docId}`;
              return updateDoc(doc(db, refPath), { status, updated_at: serverTimestamp() });
            }
            return Promise.resolve();
          }));
          setRowSelection({}); setBulkScheduleStatus("");
          setConfirmAction(null);
        } catch (err) { console.error("Bulk schedule status update error:", err); }
      }
    });
  };

  const handleBulkScheduleDelete = () => {
    if (Object.keys(rowSelection).length === 0) return;
    setConfirmAction({
      title: "Confirm Delete",
      message: `Delete ${Object.keys(rowSelection).length} selected entries?`,
      onConfirm: async () => {
        try {
          await Promise.all(Object.keys(rowSelection).map(id => {
            const s = (SCHEDULES || []).find(x => x.id === id || x.docId === id || x.schedule_id === id);
            if (s && s.docId) {
              const refPath = s._path || `${scheduleCollection}/${s.docId}`;
              return deleteDoc(doc(db, refPath));
            }
            return Promise.resolve();
          }));
          setRowSelection({});
          setConfirmAction(null);
        } catch (err) { console.error("Bulk schedule delete error:", err); }
      }
    });
  };

  const handleGenerateSchedules = () => {
    if (sel.size === 0) return;
    const selected = INVESTMENTS.filter(c => sel.has(c.id));
    setGenConfirm({ count: selected.length });
  };

  const executeGenerateSchedules = async () => {
    setGenConfirm(null);
    const selected = INVESTMENTS.filter(c => sel.has(c.id));
    if (selected.length === 0) return;

    // Load mapping from DIMENSIONS
    const findDim = n => (DIMENSIONS.find(d => d.name === n) || {}).items || [];
    const inPT = findDim("IN_PaymentType");
    const outPT = findDim("OUT_PaymentType");

    const FALLBACK_DIR = {
      BORROWER_DISBURSEMENT: "OUT",
      BORROWER_PRINCIPAL_RECEIVED: "IN",
      BORROWER_PRINCIPAL_PAYMENT: "OUT",
      BORROWER_INTEREST_PAYMENT: "IN",
      INVESTOR_PRINCIPAL_DEPOSIT: "OUT",
      INVESTOR_PRINCIPAL_PAYMENT: "IN",
      INVESTOR_INTEREST_PAYMENT: "OUT",
      FEE: "OUT",
    };
    const getDirectionAndSigned = (pt, amt) => {
      let dir = "";
      if (inPT.includes(pt)) dir = "IN";
      else if (outPT.includes(pt)) dir = "OUT";
      else if (FALLBACK_DIR[pt]) dir = FALLBACK_DIR[pt];
      const signed = dir === "OUT" ? -Math.abs(amt) : Math.abs(amt);
      return { direction: dir, signed: signed };
    };

    const PT_DEPOSIT = "INVESTOR_PRINCIPAL_DEPOSIT";
    const PT_INTEREST = "INVESTOR_INTEREST_PAYMENT";
    const PT_FEE = "FEE";
    const PT_INV_REPAYMENT = "INVESTOR_PRINCIPAL_PAYMENT";
    const PT_BOR_DISBURSEMENT = "BORROWER_DISBURSEMENT";
    const PT_BOR_RECEIVED = "BORROWER_PRINCIPAL_RECEIVED";
    const PT_BOR_INTEREST = "BORROWER_INTEREST_PAYMENT";

    const feeInfoMap = {};
    FEES_DATA.forEach(f => {
      feeInfoMap[f.id] = { name: f.name, method: f.method, rate: f.rate, frequency: f.fee_frequency, fee_charge_at: f.fee_charge_at, applied_to: f.applied_to || "Principal Amount", direction: f.direction || "IN" };
    });
    setGenerating(true);

    try {
      const schedulePath = scheduleCollection;
      // Helper for random IDs
      const mkId = (pre = "S") => `${pre}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const entries = [];
      const skipped = [];
      const parseNum = v => {
        const n = Number(String(v).replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? 0 : n;
      };

      for (const c of selected) {
        const principal = parseNum(c.amount);
        const rate = parseNum(c.rate) / 100;
        const startDate = normalizeDateAtNoon(c.start_date);
        const matDate = normalizeDateAtNoon(c.maturity_date);

        if (!startDate || !matDate || matDate <= startDate) {
          skipped.push(`${c.id} (Invalid Dates)`);
          continue;
        }
        if (principal <= 0) {
          skipped.push(`${c.id} (Zero Amount)`);
          continue;
        }

        const cTypeUpper = (c.type || "").toUpperCase();
        const isDisbursement = cTypeUpper.includes("DISBURSEMENT");

        // 1. Initial
        const initialPaymentType = isDisbursement ? PT_BOR_DISBURSEMENT : PT_DEPOSIT;
        const ds1 = getDirectionAndSigned(initialPaymentType, principal);
        const sId1 = mkId("S");
        entries.push({
          schedule_id: sId1, version_num: 1, version_id: `${sId1}-V1`, payment_id: sId1, active_version: true,
          investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
          due_date: startDate.toISOString().slice(0, 10), payment_type: initialPaymentType, fee_id: "",
          period_number: 1, principal_amount: principal, payment_amount: principal,
          signed_payment_amount: ds1.signed, direction_from_company: ds1.direction,
          original_payment_amount: principal, applied_to: "Principal Amount",
          term_start: startDate.toISOString().slice(0, 10), term_end: startDate.toISOString().slice(0, 10),
          status: "Due", notes: `Initial for ${c.id}`, created_at: serverTimestamp(),
        });

        // 2. Interest / Fees
        const freqValue = getFrequencyValue(c.freq);
        const monthsPerPeriod = 12 / freqValue;
        let pStart = normalizeDateAtNoon(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
        const cFeeIds = (c.fees || "").split(",").map(f => f.trim()).filter(Boolean);

        // One-time fees
        cFeeIds.forEach(fid => {
          const fInfo = feeInfoMap[fid];
          if (!fInfo) return;
          let feeFrequency = fInfo.frequency;
          if (!feeFrequency) feeFrequency = (fInfo.fee_charge_at || "").toLowerCase().includes("investment") ? "One_Time" : "Recurring";
          if (feeFrequency === "One_Time") {
            const feeAmt = feeCalculator_ACT360_30360(fInfo, principal, startDate, startDate, startDate);
            if (isNaN(feeAmt)) return;
            let dDate = startDate;
            if (fInfo.fee_charge_at === "Investment_End") dDate = matDate;
            const feeDir = fInfo.direction || "OUT";
            const sIdFee = mkId("S");
            entries.push({
              schedule_id: sIdFee, version_num: 1, version_id: `${sIdFee}-V1`, payment_id: sIdFee, active_version: true,
              investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
              due_date: dDate.toISOString().slice(0, 10), payment_type: PT_FEE, fee_id: fid,
              period_number: 1, principal_amount: principal, payment_amount: feeAmt,
              signed_payment_amount: feeDir === "OUT" ? -Math.abs(feeAmt) : Math.abs(feeAmt), direction_from_company: feeDir,
              original_payment_amount: feeAmt, term_start: startDate.toISOString().slice(0, 10), term_end: dDate.toISOString().slice(0, 10),
              applied_to: fInfo.applied_to || "Principal Amount", fee_name: fInfo.name || "Fee", fee_rate: fInfo.rate || "0", fee_method: fInfo.method || "Fixed Amount",
              status: "Due", notes: `One-time Fee ${fid} for ${c.id}`, created_at: serverTimestamp(),
            });
          }
        });

        let periodNum = 1; let safety = 0;
        while (pStart < matDate && safety < 1200) {
          safety++;
          let pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), pStart.getMonth() + (monthsPerPeriod || 1), 0));
          if (!pEnd || pEnd <= pStart) pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), pStart.getMonth() + 2, 0));
          const isLast = pEnd > matDate;
          let calcEnd = isLast ? matDate : pEnd;
          if (isLast) pEnd = matDate;

          let interest = principal * (rate / (freqValue || 1));
          if (c.calculator === "ACT/360+30/360") interest = pmtCalculator_ACT360_30360(pStart, calcEnd, startDate, principal, rate, c.freq);
          
          if (!isNaN(interest)) {
            const interestPT = isDisbursement ? PT_BOR_INTEREST : PT_INTEREST;
            const ds2 = getDirectionAndSigned(interestPT, interest);
            const sIdInt = mkId("S");
            entries.push({
              schedule_id: sIdInt, version_num: 1, version_id: `${sIdInt}-V1`, payment_id: sIdInt, active_version: true,
              investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
              due_date: pEnd.toISOString().slice(0, 10), payment_type: interestPT, fee_id: "",
              period_number: periodNum, principal_amount: principal, payment_amount: Math.round(interest * 100) / 100,
              signed_payment_amount: ds2.signed, direction_from_company: ds2.direction,
              original_payment_amount: Math.round(interest * 100) / 100,
              term_start: pStart.toISOString().slice(0, 10), term_end: pEnd.toISOString().slice(0, 10),
              applied_to: "Interest Amount", status: "Due", notes: `Interest Period ${periodNum} for ${c.id}`, created_at: serverTimestamp(),
            });
          }

          cFeeIds.forEach(fid => {
            const fInfo = feeInfoMap[fid];
            if (!fInfo || (fInfo.frequency !== "Recurring" && (fInfo.fee_charge_at || "").toLowerCase().includes("investment"))) return;
            const ca = (fInfo.fee_charge_at || "").toLowerCase();
            let should = ca.includes("term") || (ca.includes("start") && periodNum === 1) || (ca.includes("end") && isLast) || ca.includes("month");
            if (isLast) should = true;
            if (should) {
              const feeAmt = feeCalculator_ACT360_30360(fInfo, principal, pStart, calcEnd, startDate);
              if (!isNaN(feeAmt)) {
                const sIdRecFee = mkId("S");
                const feeDir = fInfo.direction || "OUT";
                entries.push({
                  schedule_id: sIdRecFee, version_num: 1, version_id: `${sIdRecFee}-V1`, payment_id: sIdRecFee, active_version: true,
                  investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
                  due_date: (ca.includes("start") && periodNum === 1 ? startDate : pEnd).toISOString().slice(0, 10),
                  payment_type: PT_FEE, fee_id: fid, period_number: periodNum, principal_amount: principal, payment_amount: Math.round(feeAmt * 100)/100,
                  signed_payment_amount: feeDir === "OUT" ? -Math.abs(feeAmt) : Math.abs(feeAmt), direction_from_company: feeDir,
                  original_payment_amount: Math.round(feeAmt * 100)/100, term_start: pStart.toISOString().slice(0, 10), term_end: pEnd.toISOString().slice(0, 10),
                  applied_to: fInfo.applied_to || "Principal Amount", fee_name: fInfo.name || "Fee", fee_rate: fInfo.rate || "0", fee_method: fInfo.method || "Fixed Amount",
                  status: "Due", notes: `Recurring Fee ${fid} P${periodNum} for ${c.id}`, created_at: serverTimestamp(),
                });
              }
            }
          });
          periodNum++;
          pStart = normalizeDateAtNoon(new Date(pEnd.getFullYear(), pEnd.getMonth() + 1, 1));
          if (!pStart || isLast) break;
        }

        // 3. Repayment
        const repaymentPT = isDisbursement ? PT_BOR_RECEIVED : PT_INV_REPAYMENT;
        const ds3 = getDirectionAndSigned(repaymentPT, principal);
        const sIdRepay = mkId("S");
        entries.push({
          schedule_id: sIdRepay, version_num: 1, version_id: `${sIdRepay}-V1`, payment_id: sIdRepay, active_version: true,
          investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
          due_date: matDate.toISOString().slice(0, 10), payment_type: repaymentPT, fee_id: "",
          period_number: periodNum, principal_amount: principal, payment_amount: principal,
          signed_payment_amount: ds3.signed, direction_from_company: ds3.direction,
          original_payment_amount: principal, term_start: startDate.toISOString().slice(0, 10), term_end: matDate.toISOString().slice(0, 10),
          applied_to: "Principal Amount", status: c.rollover ? "ROLLOVER" : "Due", 
          notes: c.rollover ? `Rollover for ${c.id}` : `Repayment for ${c.id}`, created_at: serverTimestamp(),
        });
      }

      // Batch write to Firestore
      let count = 0;
      const existingKeys = new Set(SCHEDULES.map(s => `${s.investment_id || s.investment}|${s.due_date || s.dueDate}|${s.payment_type || s.type}|${s.fee_id || ""}`));
      for (const entry of entries) {
        const key = `${entry.investment_id}|${entry.due_date}|${entry.payment_type}|${entry.fee_id || ""}`;
        if (!existingKeys.has(key)) {
          await addDoc(collection(db, schedulePath), entry);
          count++;
        }
      }
      setGenerating(false);
      setGenResult({ title: "Success", message: `Successfully generated ${count} schedule entries. ${skipped.length} skipped.` });
      setSel(new Set());
    } catch (err) {
      console.error("Schedule generation error:", err);
      setGenerating(false);
      setGenResult({ title: "Error", message: "Failed to generate schedules: " + err.message });
    }
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
      setGenResult({ title: "Error", message: "Failed to save asset. " + err.message });
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
      setGenResult({ title: "Error", message: "Failed to delete asset. " + err.message });
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
      setGenResult({ title: "Error", message: "Failed to delete photo." });
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
          
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* --- Investment Bulk Actions --- */}
              {activeTab === "Investments" && sel.size > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f9fa", padding: "5px 12px", borderRadius: 10, border: `1px solid ${t.surfaceBorder}`, animation: "fadeIn 0.2s ease" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>{sel.size} selected</span>
                  <FSel 
                    width={130} 
                    value={bulkInvestmentStatus} 
                    onChange={ev => setBulkInvestmentStatus(ev.target.value)} 
                    options={investmentStatusOpts} 
                    t={t} 
                    placeholder="Set Status..." 
                  />
                  <button 
                    onClick={() => handleBulkInvestmentStatus(bulkInvestmentStatus)}
                    disabled={!bulkInvestmentStatus}
                    style={{ background: bulkInvestmentStatus ? (t.accentGrad || t.accent) : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"), color: bulkInvestmentStatus ? "#fff" : t.textMuted, border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: bulkInvestmentStatus ? "pointer" : "default" }}
                  >
                    Apply
                  </button>
                  <button 
                    onClick={handleBulkInvestmentDelete}
                    style={{ background: isDark ? "rgba(248,113,113,0.1)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.2)" : "#FECACA"}`, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Delete
                  </button>
                  <button onClick={() => setSel(new Set())} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear</button>
                </div>
              )}

              {/* --- Distributions/Table Bulk Actions --- */}
              {activeTab === "Distributions" && distributionView === "table" && Object.keys(rowSelection).length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f9fa", padding: "5px 12px", borderRadius: 10, border: `1px solid ${t.surfaceBorder}`, animation: "fadeIn 0.2s ease" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>{Object.keys(rowSelection).length} selected</span>
                  <FSel 
                    width={130} 
                    value={bulkScheduleStatus} 
                    onChange={ev => setBulkScheduleStatus(ev.target.value)} 
                    options={paymentStatusOpts} 
                    t={t} 
                    placeholder="Set Status..." 
                  />
                  <button 
                    onClick={() => handleBulkScheduleStatus(bulkScheduleStatus)}
                    disabled={!bulkScheduleStatus}
                    style={{ background: bulkScheduleStatus ? (t.accentGrad || t.accent) : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"), color: bulkScheduleStatus ? "#fff" : t.textMuted, border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: bulkScheduleStatus ? "pointer" : "default" }}
                  >
                    Apply
                  </button>
                  <button 
                    onClick={handleBulkScheduleDelete}
                    style={{ background: isDark ? "rgba(248,113,113,0.1)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.2)" : "#FECACA"}`, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Delete
                  </button>
                  <button onClick={() => setRowSelection({})} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear</button>
                </div>
              )}

              {/* --- Generate Button (Unified) --- */}
              {activeTab === "Investments" && (
                <button 
                  onClick={handleGenerateSchedules}
                  disabled={generating || (activeTab === "Investments" ? sel.size === 0 : Object.keys(rowSelection).length === 0)}
                  style={{ 
                    display: "flex", alignItems: "center", gap: 7, background: t.successGrad || "#10B981", color: "#fff", 
                    border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, 
                    cursor: (generating || (activeTab === "Investments" ? sel.size === 0 : Object.keys(rowSelection).length === 0)) ? "default" : "pointer",
                    boxShadow: (activeTab === "Investments" ? sel.size > 0 : Object.keys(rowSelection).length > 0) ? "0 4px 12px rgba(16,185,129,0.2)" : "none",
                    opacity: (generating || (activeTab === "Investments" ? sel.size === 0 : Object.keys(rowSelection).length === 0)) ? 0.45 : 1
                  }}
                >
                  <span style={{ fontSize: 16 }}>▤</span>
                  Generate {(() => {
                    const count = activeTab === "Investments" ? sel.size : Object.keys(rowSelection).length;
                    return count > 0 ? `(${count})` : "";
                  })()}
                </button>
              )}

              {activeTab !== "Investments" && !(activeTab === "Distributions" && distributionView === "table") && (
                <button style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fff", border: `1px solid ${t.surfaceBorder}`, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: t.textSecondary }}>Manage deal</button>
              )}
             {canCreate && activeTab === "Investments" && <button onClick={openAdd} style={{ background: t.accent, color: "#fff", border: "none", padding: "8px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, boxShadow: `0 4px 12px ${t.accentShadow || "none"}` }}>+ Add investment</button>}
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
            <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? "#fff" : "#1C1917" }}>{totalFundBalance || "$0"}</div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ height: '1200px', width: "100%", minHeight: '1200px' }}>
              <TanStackTable
                  data={dealInvestments}
                  columns={columnDefs}
                  pageSize={pageSize}
                  t={t}
                  isDark={isDark}
                  onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.id)))}
              />
          </div>
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
            <div style={{ height: '700px', width: "100%", minHeight: '700px' }}>
              <TanStackTable
                data={dealSchedules}
                columns={scheduleColumnDefs}
                pageSize={pageSize}
                t={t}
                isDark={isDark}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
            </div>
          ) : (
            <div style={{
              background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
              border: `1px solid ${t.surfaceBorder}`,
              borderRadius: 12,
              padding: 24,
              overflow: "auto",
              maxHeight: "1300px",
              position: "relative"
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 20 }}>
                Distribution Pivot Table
              </h3>

              {pivotData.rows.length > 0 ? (
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
                        top: 0,
                        background: isDark ? "#262626" : "#F9FAFB",
                        zIndex: 10,
                        width: 180,
                        boxShadow: `inset 0 -2px 0 ${t.surfaceBorder}`
                      }}>
                        Investor Name
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: t.text,
                        position: "sticky",
                        left: 180,
                        top: 0,
                        background: isDark ? "#262626" : "#F9FAFB",
                        zIndex: 10,
                        width: 120,
                        boxShadow: `inset 0 -2px 0 ${t.surfaceBorder}`
                      }}>
                        Type
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: t.text,
                        position: "sticky",
                        left: 300,
                        top: 0,
                        background: isDark ? "#262626" : "#F9FAFB",
                        zIndex: 10,
                        width: 100,
                        boxShadow: `inset 0 -2px 0 ${t.surfaceBorder}`
                      }}>
                        Start Date
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: t.text,
                        position: "sticky",
                        left: 400,
                        top: 0,
                        background: isDark ? "#262626" : "#F9FAFB",
                        zIndex: 10,
                        width: 100,
                        boxShadow: `inset 0 -2px 0 ${t.surfaceBorder}`
                      }}>
                        End Date
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: t.text,
                        position: "sticky",
                        left: 500,
                        top: 0,
                        background: isDark ? "#262626" : "#F9FAFB",
                        zIndex: 10,
                        width: 90,
                        boxShadow: `inset 0 -2px 0 ${t.surfaceBorder}`
                      }}>
                        Interest Rate
                      </th>
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: t.text,
                        position: "sticky",
                        left: 590,
                        top: 0,
                        background: isDark ? "#262626" : "#F9FAFB",
                        zIndex: 10,
                        width: 120,
                        boxShadow: `inset 0 -2px 0 ${t.surfaceBorder}`
                      }}>
                        Payment Method
                      </th>
                      {pivotData.dates.map((date, idx) => (
                        <th key={idx} style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: t.text,
                          minWidth: 120,
                          position: "sticky",
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 5,
                          boxShadow: `inset 0 -2px 0 ${t.surfaceBorder}`
                        }}>
                          {date}
                        </th>
                      ))}
                      <th style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: t.text,
                        background: isDark ? "#1e3a8a" : "#EFF6FF",
                        minWidth: 120,
                        position: "sticky",
                        top: 0,
                        right: 0,
                        zIndex: 6,
                        boxShadow: `inset 0 -2px 0 ${t.surfaceBorder}`
                      }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivotData.rows.map((row, rowIdx) => {
                      let rowTotal = 0;
                      return (
                        <tr key={rowIdx} style={{
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
                            zIndex: 1,
                            width: 180
                          }}>
                            {row.investor}
                          </td>
                          <td style={{
                            padding: "12px 16px",
                            fontSize: 11,
                            color: t.textSecondary,
                            position: "sticky",
                            left: 180,
                            background: isDark ? "#1a1a1a" : "#fff",
                            zIndex: 1,
                            width: 120
                          }}>
                            {row.type.replace(/_/g, ' ')}
                          </td>
                          <td style={{
                            padding: "12px 16px",
                            fontSize: 11,
                            color: t.textSecondary,
                            position: "sticky",
                            left: 300,
                            background: isDark ? "#1a1a1a" : "#fff",
                            zIndex: 1,
                            width: 100
                          }}>
                            {row.startDate}
                          </td>
                          <td style={{
                            padding: "12px 16px",
                            fontSize: 11,
                            color: t.textSecondary,
                            position: "sticky",
                            left: 400,
                            background: isDark ? "#1a1a1a" : "#fff",
                            zIndex: 1,
                            width: 100
                          }}>
                            {row.endDate}
                          </td>
                          <td style={{
                            padding: "12px 16px",
                            fontSize: 11,
                            color: t.textSecondary,
                            position: "sticky",
                            left: 500,
                            background: isDark ? "#1a1a1a" : "#fff",
                            zIndex: 1,
                            width: 90
                          }}>
                            {row.rate}
                          </td>
                          <td style={{
                            padding: "12px 16px",
                            fontSize: 11,
                            color: t.textSecondary,
                            position: "sticky",
                            left: 590,
                            background: isDark ? "#1a1a1a" : "#fff",
                            zIndex: 1,
                            width: 120
                          }}>
                            {row.paymentMethod}
                          </td>
                          {pivotData.dates.map((date, dateIdx) => {
                            const cellKey = `${row.key}|||${date}`;
                            const amount = pivotData.data[cellKey] || 0;
                            rowTotal += amount;
                            const hasAmount = amount !== 0;
                            return (
                              <td key={dateIdx} style={{
                                padding: "12px 16px",
                                textAlign: "right",
                                fontFamily: t.mono,
                                fontWeight: 600,
                                color: hasAmount ? (isDark ? "#34D399" : "#059669") : t.textMuted
                              }}>
                                {hasAmount ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
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
                        zIndex: 1,
                        width: 180
                      }}>
                        Total
                      </td>
                      <td style={{
                        padding: "12px 16px",
                        position: "sticky",
                        left: 180,
                        background: isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF",
                        zIndex: 1,
                        width: 120
                      }}>
                      </td>
                      <td style={{
                        padding: "12px 16px",
                        position: "sticky",
                        left: 300,
                        background: isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF",
                        zIndex: 1,
                        width: 100
                      }}>
                      </td>
                      <td style={{
                        padding: "12px 16px",
                        position: "sticky",
                        left: 400,
                        background: isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF",
                        zIndex: 1,
                        width: 100
                      }}>
                      </td>
                      <td style={{
                        padding: "12px 16px",
                        position: "sticky",
                        left: 500,
                        background: isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF",
                        zIndex: 1,
                        width: 90
                      }}>
                      </td>
                      <td style={{
                        padding: "12px 16px",
                        position: "sticky",
                        left: 590,
                        background: isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF",
                        zIndex: 1,
                        width: 120
                      }}>
                      </td>
                      {pivotData.dates.map((date, idx) => {
                        const colTotal = pivotData.rows.reduce((sum, row) => {
                          const cellKey = `${row.key}|||${date}`;
                          return sum + (pivotData.data[cellKey] || 0);
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
                        ${pivotData.rows.reduce((grandTotal, row) => {
                          return grandTotal + pivotData.dates.reduce((rowTotal, date) => {
                            const cellKey = `${row.key}|||${date}`;
                            return rowTotal + (pivotData.data[cellKey] || 0);
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
        <FF label="Payment Method" t={t}><FSel value={modal.data.payment_method} onChange={e => setModal(m => ({ ...m, data: { ...m.data, payment_method: e.target.value } }))} options={paymentMethods} t={t} /></FF>
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

      {/* Confirmation Modal for Bulk Actions */}
      {confirmAction && (
        <Modal 
          open={!!confirmAction} 
          onClose={() => setConfirmAction(null)} 
          title={confirmAction.title} 
          onSave={confirmAction.onConfirm} 
          t={t} 
          isDark={isDark} 
          width={450}
          saveLabel="Confirm"
        >
          <div style={{ padding: "10px 0" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", background: isDark ? "rgba(239,68,68,0.05)" : "#FEF2F2", padding: 16, borderRadius: 12, border: `1px solid ${isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2"}` }}>
              <AlertTriangle size={24} color="#EF4444" />
              <div>
                <p style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
                  {confirmAction.message}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Generation Confirm Modal */}
      {genConfirm && (
        <Modal open={!!genConfirm} onClose={() => setGenConfirm(null)} title="Generate Payment Schedules" saveLabel="Execute Generation" onSave={executeGenerateSchedules} t={t} isDark={isDark} width={450}>
          <div style={{ padding: "10px 0" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", background: isDark ? "rgba(59,130,246,0.1)" : "#EFF6FF", padding: 16, borderRadius: 12, border: "1px solid rgba(59,130,246,0.2)" }}>
              <FileCheck size={24} color="#3B82F6" />
              <div>
                <div style={{ fontWeight: 700, color: t.text, marginBottom: 4 }}>Rebuild Schedules</div>
                <p style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
                  This will generate payment schedules for <strong>{genConfirm.count}</strong> selected investment(s).
                </p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: t.textMuted, marginTop: 16, fontStyle: "italic" }}>
              Note: Entries will not be duplicated if they already exist for the same date/type.
            </p>
          </div>
        </Modal>
      )}

      {/* Result Modal */}
      {genResult && (
        <Modal open={!!genResult} onClose={() => setGenResult(null)} title={genResult.title} hideFooter t={t} isDark={isDark} width={400}>
          <div style={{ padding: "10px 0", textAlign: "center" }}>
            <div style={{ 
              width: 56, height: 56, borderRadius: 28, 
              background: genResult.title === "Error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", 
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" 
            }}>
              {genResult.title === "Error" ? <AlertTriangle size={28} color="#EF4444" /> : <Check size={28} color="#22C55E" />}
            </div>
            <div style={{ fontWeight: 700, color: t.text, fontSize: 16, marginBottom: 8 }}>{genResult.title}</div>
            <p style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.5 }}>{genResult.message}</p>
            <button 
              onClick={() => setGenResult(null)}
              style={{ padding: "10px 24px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontWeight: 700, marginTop: 20, cursor: "pointer" }}
            >
              Continue
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState, useMemo, useRef, useEffect } from "react";
import { getInvestmentColumns } from '../components/InvestmentsTanStackConfig';
import TanStackTable from '../components/TanStackTable';
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { normalizeDateAtNoon, hybridDays, pmtCalculator_ACT360_30360, feeCalculator_ACT360_30360, getFrequencyValue, fmtCurr, calculateScheduledDate } from "../utils";
import { StatCard, Bdg, Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { InvestorSummaryModal } from "../components/InvestorSummaryModal";
import { useAuth } from "../AuthContext";
import { Check, Plus, Construction, AlertTriangle, FileCheck } from "lucide-react";

export default function PageInvestments({ t, isDark, INVESTMENTS = [], DEALS = [], CONTACTS = [], DIMENSIONS = [], FEES_DATA = [], SCHEDULES = [], LEDGER = [], USERS = [], collectionPath = "", schedulePath = "", tenantId = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("INVESTMENT_CREATE");
  const canUpdate = isSuperAdmin || hasPermission("INVESTMENT_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("INVESTMENT_DELETE");
  const canGenerate = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_CREATE");
  const [sel, setSel] = useState(new Set());
  const [chip, setChip] = useState("All");
  const [generating, setGenerating] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [genConfirm, setGenConfirm] = useState(null);
  const [genResult, setGenResult] = useState(null); // { title, message }
  const [drillInvestment, setDrillInvestment] = useState(null);
  const [drillOptions, setDrillOptions] = useState({ view: "simple", tab: "Capital Transactions" });
  const drillContact = useMemo(() => {
    if (!drillInvestment) return null;
    const pId = String(drillInvestment.contact_id || "").trim();
    if (!pId) return { name: drillInvestment.contact_name || drillInvestment.contact || "Unknown", first_name: drillInvestment.first_name || "", last_name: drillInvestment.last_name || "" };
    
    // Improved lookup matching App.jsx logic
    const found = CONTACTS.find(c => {
      const cId = String(c.id || "").trim();
      const cDocId = String(c.docId || "").trim();
      const cPartyId = String(c.party_id || "").trim();
      const cContactId = String(c.contact_id || "").trim();
      const cName = String(c.name || "").trim();
      const invName = String(drillInvestment.contact_name || drillInvestment.contact || "").trim();
      
      return (pId && (cId === pId || cDocId === pId || cPartyId === pId || cContactId === pId)) ||
             (invName && cName === invName);
    });
    
    if (found) return found;

    // Fallback if not found in CONTACTS list
    return { 
      name: drillInvestment.contact_name || drillInvestment.contact || "Unknown", 
      id: pId,
      first_name: drillInvestment.first_name || "",
      last_name: drillInvestment.last_name || "",
      email: drillInvestment.email || "",
      phone: drillInvestment.phone || ""
    };
  }, [drillInvestment, CONTACTS]);

  const sortedContacts = useMemo(() => {
    return [...CONTACTS].sort((a, b) => {
      const nameA = [a.first_name, a.last_name].filter(Boolean).join(" ");
      const nameB = [b.first_name, b.last_name].filter(Boolean).join(" ");
      return nameA.localeCompare(nameB);
    });
  }, [CONTACTS]);

  const handleUpdateInvestmentModal = async (updatedData) => {
    if (!updatedData.docId) return;
    try {
      const docRef = updatedData._path ? doc(db, updatedData._path) : doc(db, collectionPath, updatedData.docId);
      
      const payload = {
        investment_name: updatedData.investment_name || "",
        status: updatedData.status || "",
        amount: updatedData.amount != null ? Number(String(updatedData.amount).replace(/[^0-9.-]/g, "")) || null : null,
        interest_rate: updatedData.interest_rate != null ? Number(String(updatedData.interest_rate).replace(/[^0-9.-]/g, "")) || (updatedData.rate ? Number(String(updatedData.rate).replace(/[^0-9.-]/g, "")) : null) : null,
        payment_frequency: updatedData.payment_frequency || updatedData.freq || "",
        term_months: updatedData.term_months ? Number(updatedData.term_months) : null,
        start_date: updatedData.start_date || null,
        maturity_date: updatedData.maturity_date || null,
        updated_at: serverTimestamp(),
      };

      await updateDoc(docRef, payload);
      // We don't necessarily close the modal if they are just editing inside it
    } catch (err) {
      console.error("Error updating investment from modal:", err);
    }
  };
  const gridRef = useRef(null);
  const [pageSize, setPageSize] = useState(30);
  const [confirmAction, setConfirmAction] = useState(null); // { title: string, message: string, onConfirm: () => void }

  const openAdd = () => {
    let maxIdNum = 10000;
    INVESTMENTS.forEach(c => {
      const cid = c.investment_id || c.id;
      if (cid && cid.startsWith("I")) {
        const num = parseInt(cid.substring(1), 10);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
    const nextId = `I${maxIdNum + 1}`;

    const firstDeal = DEALS[0];
    const sd = firstDeal ? firstDeal.startDate : "";
    const ed = firstDeal ? firstDeal.endDate : "";
    let termM = "";
    if (sd && ed) { const s = new Date(sd); const e = new Date(ed); if (!isNaN(s) && !isNaN(e)) termM = String((e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth()); }
    setModal({
      open: true,
      mode: "add",
      data: {
        id: nextId,
        deal: firstDeal ? firstDeal.name : "",
        deal_id: firstDeal ? (firstDeal.deal_id || firstDeal.id) : "",
        contact: "",
        type: "",
        amount: "",
        rate: "",
        freq: "Quarterly",
        status: "Open",
        start_date: sd,
        maturity_date: ed,
        term_months: termM,
        calculator: "ACT/360+30/360",
        rollover: false,
        auto_generate: true,
        investment_name: "",
        source_of_funds: "New Principal",
        rollover_source_id: "",
        first_name: "",
        last_name: "",
        contact_id: "",
        lag_enabled: false,
        lag_type: "Days",
        lag_value: 0
      }
    });
  };
  const openEdit = r => {
    setModal({
      open: true,
      mode: "edit",
      data: {
        ...r,
        id: r.investment_id || r.id,
        deal: r.deal_name || r.deal || "",
        rate: r.interest_rate || r.rate || "",
        freq: r.payment_frequency || r.freq || "Quarterly",
        start_date: r.start_date || "",
        maturity_date: r.maturity_date || "",
        lag_enabled: r.payment_lag_config?.enabled ?? false,
        lag_type: r.payment_lag_config?.type || "Days",
        lag_value: r.payment_lag_config?.value || 0,
        contact_id: r.contact_id || "",
        first_name: r.first_name || "",
        last_name: r.last_name || ""
      }
    });
  };
  const close = () => setModal(m => ({ ...m, open: false }));
  async function handleSaveInvestment() {
    const d = modal.data;
    const dealObj = DEALS.find(p => p.name === d.deal);
    const contactObj = CONTACTS.find(p => p.id === d.contact_id || p.docId === d.contact_id);
    const payload = {
      deal_name: d.deal || "",
      deal_id: dealObj ? dealObj.id : (d.deal_id || ""),
      first_name: d.first_name || "",
      last_name: d.last_name || "",
      contact_id: contactObj ? (contactObj.id || contactObj.docId) : (d.contact_id || ""),
      investment_type: d.type || "",
      amount: d.amount ? Number(String(d.amount).replace(/[^0-9.-]/g, "")) || null : null,
      interest_rate: d.rate ? Number(String(d.rate).replace(/[^0-9.-]/g, "")) || null : null,
      payment_frequency: d.freq || "",
      term_months: d.term_months ? Number(d.term_months) : null,
      calculator: d.calculator || "",
      start_date: d.start_date || null,
      maturity_date: d.maturity_date || null,
      status: d.status || "",
      fees: (d.feeIds || []).join(","),
      rollover: !!d.rollover,
      investment_name: d.investment_name || "",
      source_of_funds: d.source_of_funds || "New Principal",
      rollover_source_id: d.rollover_source_id || "",
      payment_lag_config: {
        enabled: !!d.lag_enabled,
        type: d.lag_type || "Days",
        value: Number(d.lag_value) || 0,
      },
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        const docRef = d._path ? doc(db, d._path) : doc(db, collectionPath, d.docId);
        await updateDoc(docRef, payload);

        // SYNC Rollover to distribution schedules
        if (d.id) {
          await syncRolloverToSchedules(db, SCHEDULES, d.id, !!d.rollover, schedulePath, tenantId);
        }
      } else {
        // For new investments, we use the collectionPath
        const effectivePath = collectionPath.startsWith("GROUP:") ? collectionPath.replace("GROUP:", "") : collectionPath;
        const newDocRef = await addDoc(collection(db, effectivePath), { ...payload, investment_id: d.id || "", created_at: serverTimestamp() });
        if (d.auto_generate) {
          setTimeout(() => generateSchedulesForInvestments([d]), 500);
        }
      }
      close();
    } catch (err) { 
      console.error("Save investment error:", err);
      setGenResult({ title: "Error", message: "Failed to save investment. " + err.message });
    }
  }

  async function handleDeleteInvestment() {
    if (!delT || (!delT.docId && !delT._path)) return;
    try {
      const docRef = delT._path ? doc(db, delT._path) : doc(db, collectionPath, delT.docId);
      await deleteDoc(docRef);
      setDelT(null);
    } catch (err) { console.error("Delete investment error:", err); }
  }
  const investmentStatusOpts = (DIMENSIONS.find(d => d.name === "InvestmentStatus" || d.name === "Investment Status" || d.name === "Payment Status") || {}).items?.filter(i => i) || ["Open", "Active", "Closed"];
  const [bulkStatus, setBulkStatus] = useState(investmentStatusOpts[0] || "");
  function handleBulkStatus(status) {
    if (!status || sel.size === 0) return;
    setConfirmAction({
      title: "Update Status",
      message: `Are you sure you want to update status to "${status}" for ${sel.size} investment(s)?`,
      onConfirm: async () => {
        try {
          await Promise.all([...sel].map(id => {
            const c = INVESTMENTS.find(c => c.id === id);
            if (c && (c._path || c.docId)) {
              const docRef = c._path ? doc(db, c._path) : doc(db, collectionPath, c.docId);
              return updateDoc(docRef, { status, updated_at: serverTimestamp() });
            }
            return Promise.resolve();
          }));
          setSel(new Set()); setBulkStatus("");
          setConfirmAction(null);
        } catch (err) { console.error("Bulk status update error:", err); }
      }
    });
  }
  function handleBulkDelete() {
    if (sel.size === 0) return;
    setConfirmAction({
      title: "Confirm Delete",
      message: `Are you sure you want to delete ${sel.size} investment(s)? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all([...sel].map(id => {
            const c = INVESTMENTS.find(c => c.id === id);
            if (c) {
              const docRef = c._path ? doc(db, c._path) : (c.docId ? doc(db, collectionPath, c.docId) : null);
              if (docRef) return deleteDoc(docRef);
            }
            return Promise.resolve();
          }));
          setSel(new Set());
          setConfirmAction(null);
        } catch (err) { console.error("Bulk delete error:", err); }
      }
    });
  }
  function handleGenerate() {
    if (sel.size === 0) return;
    const selected = INVESTMENTS.filter(c => sel.has(c.id));
    setGenConfirm({ count: selected.length });
  }

  async function executeGenerate() {
    setGenConfirm(null);
    const selected = INVESTMENTS.filter(c => sel.has(c.id));
    if (selected.length === 0) return;
    await generateSchedulesForInvestments(selected);
  }

  async function generateSchedulesForInvestments(selectedList) {

    // 1. Preparation - Load mapping from DIMENSIONS
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
    function getDirectionAndSigned(pt, amt) {
      let dir = "";
      if (inPT.includes(pt)) dir = "IN";
      else if (outPT.includes(pt)) dir = "OUT";
      else if (FALLBACK_DIR[pt]) dir = FALLBACK_DIR[pt];
      const signed = dir === "OUT" ? -Math.abs(amt) : Math.abs(amt);
      return { direction: dir, signed: signed };
    }

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
    
    let totalUpdated = 0;
    let totalCreated = 0;
    let totalDeleted = 0;
    let totalSkipped = 0;

    try {
      if (!schedulePath || schedulePath.startsWith("GROUP:")) {
        throw new Error(`Invalid schedule path: "${schedulePath}". Please select a specific tenant first.`);
      }

      const mkId = (pre = "S") => `${pre}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const parseNum = v => {
        const n = Number(String(v).replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? 0 : n;
      };

      const todayStr = new Date().toLocaleDateString();

      for (const c of selectedList) {
        const principal = parseNum(c.amount);
        const rate = parseNum(c.rate) / 100;
        const startDate = normalizeDateAtNoon(c.start_date);
        const matDate = normalizeDateAtNoon(c.maturity_date);

        // --- 1a. Payment Lag Strategy ---
        // Investment config overrides Deal config if enabled.
        const deal = DEALS.find(d => d.id === c.deal_id);
        const lagConfig = (c.payment_lag_config?.enabled) 
          ? c.payment_lag_config 
          : (deal?.payment_lag_config?.enabled ? deal.payment_lag_config : null);

        const applyLag = (dateStr) => {
          if (!lagConfig) return dateStr;
          return calculateScheduledDate(dateStr, lagConfig);
        };

        if (!startDate || !matDate || matDate <= startDate || principal <= 0) {
          totalSkipped++;
          continue;
        }

        const entries = [];
        const cTypeUpper = (c.type || "").toUpperCase();
        const isDisbursement = cTypeUpper.includes("DISBURSEMENT");

        // --- 1. Initial Deposit/Disbursement ---
        const initialPaymentType = isDisbursement ? PT_BOR_DISBURSEMENT : PT_DEPOSIT;
        const ds1 = getDirectionAndSigned(initialPaymentType, principal);
        const sId1 = mkId("S");
        entries.push({
          schedule_id: sId1,
          version_num: 1,
          version_id: `${sId1}-V1`,
          payment_id: sId1,
          active_version: true,
          investment_id: c.id, deal_id: c.deal_id || "", contact_id: c.contact_id || "",
          due_date: applyLag(startDate.toISOString().slice(0, 10)), payment_type: initialPaymentType, fee_id: "",
          period_number: 1, principal_amount: principal, payment_amount: principal,
          signed_payment_amount: ds1.signed, direction_from_company: ds1.direction,
          original_payment_amount: principal,
          applied_to: "Principal Amount",
          term_start: startDate.toISOString().slice(0, 10), term_end: startDate.toISOString().slice(0, 10),
          status: "Due", notes: `Initial for ${c.id}`, 
          rollover: !!c.rollover,
          created_at: serverTimestamp(),
        });

        // --- 2. Interest and Recurring Fees ---
        const freqValue = getFrequencyValue(c.freq);
        const monthsPerPeriod = 12 / (freqValue || 1);
        let periodNum = 1;

        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        let theoreticalStartMonth = startMonth;
        const fLow = (c.freq || "").toLowerCase();
        if (fLow.includes("quart")) theoreticalStartMonth = Math.floor(startMonth / 3) * 3;
        else if (fLow.includes("semi")) theoreticalStartMonth = Math.floor(startMonth / 6) * 6;
        else if (fLow.includes("annu")) theoreticalStartMonth = 0;

        let pStart = normalizeDateAtNoon(new Date(startYear, theoreticalStartMonth, 1));
        const cFeeIds = (c.fees || "").split(",").map(f => f.trim()).filter(Boolean);

        // One-time fees
        cFeeIds.forEach(fid => {
          const fInfo = feeInfoMap[fid];
          if (!fInfo) return;
          let feeFrequency = fInfo.frequency;
          if (!feeFrequency) {
            const chargeAt = (fInfo.fee_charge_at || "").toLowerCase();
            feeFrequency = (chargeAt.includes("investment_start") || chargeAt.includes("investment_end")) ? "One_Time" : "Recurring";
          }

          if (feeFrequency === "One_Time") {
            const feeAmt = feeCalculator_ACT360_30360(fInfo, principal, startDate, startDate, startDate);
            if (isNaN(feeAmt)) return;
            let dDate = startDate;
            if (fInfo.fee_charge_at === "Investment_End") dDate = matDate;
            const feeDir = fInfo.direction || "OUT";
            const signedFeeAmt = feeDir === "OUT" ? -Math.abs(feeAmt) : Math.abs(feeAmt);
            const sIdFee = mkId("S");
            entries.push({
              schedule_id: sIdFee, version_num: 1, version_id: `${sIdFee}-V1`, payment_id: sIdFee, active_version: true,
              investment_id: c.id, deal_id: c.deal_id || "", contact_id: c.contact_id || "",
              due_date: applyLag(dDate.toISOString().slice(0, 10)), payment_type: PT_FEE, fee_id: fid,
              period_number: 1, principal_amount: principal, payment_amount: feeAmt,
              signed_payment_amount: signedFeeAmt, direction_from_company: feeDir,
              original_payment_amount: feeAmt, term_start: startDate.toISOString().slice(0, 10), term_end: dDate.toISOString().slice(0, 10),
              applied_to: fInfo.applied_to || "Principal Amount", fee_name: fInfo.name || "Fee",
              fee_rate: fInfo.rate || "0", fee_method: fInfo.method || "Fixed Amount",
              status: "Due", notes: `One-time Fee ${fid} for ${c.id}`, created_at: serverTimestamp(),
            });
          }
        });

        let safety = 0;
        while (pStart < matDate && safety < 1200) {
          safety++;
          let pEnd;
          if (fLow.includes("month")) pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0));
          else if (fLow.includes("quart")) {
            const targets = [2, 5, 8, 11];
            let nm = targets.find(m => m > pStart.getMonth());
            pEnd = nm === undefined ? normalizeDateAtNoon(new Date(pStart.getFullYear() + 1, targets[0] + 1, 0)) : normalizeDateAtNoon(new Date(pStart.getFullYear(), nm + 1, 0));
          } else if (fLow.includes("semi")) {
            const targets = [5, 11];
            let nm = targets.find(m => m > pStart.getMonth());
            pEnd = nm === undefined ? normalizeDateAtNoon(new Date(pStart.getFullYear() + 1, targets[0] + 1, 0)) : normalizeDateAtNoon(new Date(pStart.getFullYear(), nm + 1, 0));
          } else if (fLow.includes("annu")) {
            pEnd = pStart.getMonth() >= 11 ? normalizeDateAtNoon(new Date(pStart.getFullYear() + 1, 12, 0)) : normalizeDateAtNoon(new Date(pStart.getFullYear(), 12, 0));
          } else {
            pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), pStart.getMonth() + (monthsPerPeriod || 1), 0));
          }

          if (!pEnd || pEnd <= pStart) pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), pStart.getMonth() + (monthsPerPeriod || 1) + 1, 0));
          if (!pEnd) break;
          const isLast = pEnd > matDate;
          const isMonthEnd = (dt) => (dt.getDate() === new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate());
          let calcEnd = pEnd;
          if (isLast) {
            calcEnd = isMonthEnd(matDate) ? normalizeDateAtNoon(new Date(matDate.getFullYear(), matDate.getMonth() + 1, 0)) : normalizeDateAtNoon(matDate);
            pEnd = normalizeDateAtNoon(matDate);
          }
          if (!calcEnd || !pEnd) break;

          let interest = 0;
          if (c.calculator === "ACT/360+30/360") {
            interest = pmtCalculator_ACT360_30360(pStart, calcEnd, startDate, principal, rate, c.freq);
          } else {
            const expectedDays = 360 / (freqValue || 1);
            const actualDays = hybridDays(pStart, calcEnd);
            interest = (actualDays > 0 && actualDays < expectedDays) ? (principal * rate / 360) * actualDays : principal * (rate / (freqValue || 1));
          }

          if (!isNaN(interest)) {
            const interestPT = isDisbursement ? PT_BOR_INTEREST : PT_INTEREST;
            const ds2 = getDirectionAndSigned(interestPT, interest);
            const roundedInterest = Math.round(interest * 100) / 100;
            const sIdInt = mkId("S");
            entries.push({
              schedule_id: sIdInt, version_num: 1, version_id: `${sIdInt}-V1`, payment_id: sIdInt, active_version: true,
              investment_id: c.id, deal_id: c.deal_id || "", contact_id: c.contact_id || "",
              due_date: applyLag(pEnd.toISOString().slice(0, 10)), payment_type: interestPT, fee_id: "",
              period_number: periodNum, principal_amount: principal, payment_amount: roundedInterest,
              signed_payment_amount: ds2.signed, direction_from_company: ds2.direction,
              original_payment_amount: roundedInterest, term_start: pStart.toISOString().slice(0, 10), term_end: pEnd.toISOString().slice(0, 10),
              applied_to: "Interest Amount", status: "Due", notes: `Interest Period ${periodNum} for ${c.id}`, created_at: serverTimestamp(),
            });
          }

          // Recurring Fees
          cFeeIds.forEach(fid => {
            const fInfo = feeInfoMap[fid];
            if (!fInfo) return;
            let feeFrequency = fInfo.frequency;
            if (!feeFrequency) {
              const chargeAt = (fInfo.fee_charge_at || "").toLowerCase();
              feeFrequency = (chargeAt.includes("investment_start") || chargeAt.includes("investment_end")) ? "One_Time" : "Recurring";
            }
            if (feeFrequency === "Recurring") {
              const ca = (fInfo.fee_charge_at || "").toLowerCase();
              let should = isLast || ca.includes("term_start") || ca.includes("term_end") || (ca.includes("investment_start") && periodNum === 1) || (ca.includes("investment_end") && isLast) || ca.includes("month");
              if (!should) {
                 if (ca.includes("quart") && [2, 5, 8, 11].includes(pEnd.getMonth())) should = true;
                 else if (ca.includes("semi") && [5, 11].includes(pEnd.getMonth())) should = true;
                 else if (ca.includes("year_start") || ca.includes("year start")) should = pStart.getMonth() === 0 || pStart.getMonth() > pEnd.getMonth();
                 else if (ca.includes("year_end") || ca.includes("year end") || ca.includes("annu") || ca.includes("year")) should = pEnd.getMonth() === 11;
              }

              if (should) {
                const feeAmt = feeCalculator_ACT360_30360(fInfo, principal, pStart, calcEnd, startDate);
                if (!isNaN(feeAmt)) {
                  const feeDir = fInfo.direction || "OUT";
                  const signedFeeAmt = feeDir === "OUT" ? -Math.abs(feeAmt) : Math.abs(feeAmt);
                  let feeDueDate = isLast ? pEnd : (periodNum === 1 && ca.includes("start") ? startDate : (ca.includes("start") ? pStart : pEnd));
                  const roundedFeeAmt = Math.round(feeAmt * 100) / 100;
                  const sIdRecFee = mkId("S");
                  entries.push({
                    schedule_id: sIdRecFee, version_num: 1, version_id: `${sIdRecFee}-V1`, payment_id: sIdRecFee, active_version: true,
                    investment_id: c.id, deal_id: c.deal_id || "", contact_id: c.contact_id || "",
                    due_date: applyLag(feeDueDate.toISOString().slice(0, 10)), payment_type: PT_FEE, fee_id: fid,
                    period_number: periodNum, principal_amount: principal, payment_amount: roundedFeeAmt,
                    signed_payment_amount: signedFeeAmt, direction_from_company: feeDir,
                    original_payment_amount: roundedFeeAmt, term_start: pStart.toISOString().slice(0, 10), term_end: pEnd.toISOString().slice(0, 10),
                    applied_to: fInfo.applied_to || "Principal Amount", fee_name: fInfo.name || "Fee", fee_rate: fInfo.rate || "0", fee_method: fInfo.method || "Fixed Amount",
                    status: "Due", notes: `Recurring Fee ${fid} P${periodNum} for ${c.id}`, created_at: serverTimestamp(),
                  });
                }
              }
            }
          });
          periodNum++;
          pStart = normalizeDateAtNoon(new Date(pEnd.getFullYear(), pEnd.getMonth() + 1, 1));
          if (!pStart) break;
        }

        // --- 3. Principal Repayment/Received ---
        const repaymentPT = isDisbursement ? PT_BOR_RECEIVED : PT_INV_REPAYMENT;
        const ds3 = getDirectionAndSigned(repaymentPT, principal);
        const sIdRepay = mkId("S");
        entries.push({
          schedule_id: sIdRepay, version_num: 1, version_id: `${sIdRepay}-V1`, payment_id: sIdRepay, active_version: true,
          investment_id: c.id, deal_id: c.deal_id || "", contact_id: c.contact_id || "",
          due_date: applyLag(matDate.toISOString().slice(0, 10)), payment_type: repaymentPT, fee_id: "",
          period_number: periodNum, principal_amount: principal, payment_amount: principal,
          signed_payment_amount: ds3.signed, direction_from_company: ds3.direction,
          original_payment_amount: principal, term_start: startDate.toISOString().slice(0, 10), term_end: matDate.toISOString().slice(0, 10),
          applied_to: "Principal Amount", 
          status: "Due", 
          notes: c.rollover ? `Rollover for ${c.id}` : `Repayment for ${c.id}`, 
          rollover: !!c.rollover,
          created_at: serverTimestamp(),
        });

        // --- 4. Post-process Fee Merging ---
        const feeGroups = {};
        const nonFeeEntries = [];
        entries.filter(e => e.investment_id === c.id).forEach(e => {
          if (e.payment_type !== PT_FEE) { nonFeeEntries.push(e); return; }
          const key = `${e.due_date}|${e.applied_to}|${e.direction_from_company}`;
          if (!feeGroups[key]) feeGroups[key] = { ...e, fee_ids: [e.fee_id], fee_names: [e.fee_name], fee_rates: [e.fee_rate], fee_methods: [e.fee_method], payment_amounts: [e.payment_amount], signed_amounts: [e.signed_payment_amount], total_payment: e.payment_amount, total_signed: e.signed_payment_amount };
          else { feeGroups[key].fee_ids.push(e.fee_id); feeGroups[key].fee_names.push(e.fee_name); feeGroups[key].fee_rates.push(e.fee_rate); feeGroups[key].fee_methods.push(e.fee_method); feeGroups[key].payment_amounts.push(e.payment_amount); feeGroups[key].signed_amounts.push(e.signed_payment_amount); feeGroups[key].total_payment += e.payment_amount; feeGroups[key].total_signed += e.signed_payment_amount; }
        });

        const mergedFees = Object.values(feeGroups).map(g => {
          const { fee_ids, payment_amounts, signed_amounts, total_payment, total_signed, fee_names, fee_rates, fee_methods, ...rest } = g;
          const basisAmt = rest.principal_amount || 0;
          const basisLabel = rest.applied_to || "Principal Amount";
          const stepParts = fee_ids.map((id, i) => {
            const sign = signed_amounts[i] >= 0 ? "+" : "-";
            return fee_methods[i] === "% of Amount" ? `${sign}${fee_rates[i]}% of ${fmtCurr(basisAmt)} (${basisLabel}) = ${sign}${fmtCurr(Math.abs(payment_amounts[i]))}` : `${sign}Fixed amount of ${fmtCurr(Math.abs(payment_amounts[i]))}`;
          });
          return { ...rest, fee_id: fee_ids.join(","), payment_amount: Math.round(total_payment * 100) / 100, signed_payment_amount: Math.round(total_signed * 100) / 100, original_payment_amount: Math.round(total_payment * 100) / 100, notes: "Fee Breakdown: " + (stepParts.length === 1 ? stepParts[0] : stepParts.map(p => `[${p}]`).join(" ") + ` = ${fmtCurr(Math.abs(total_signed))}`) };
        });

        const finalNewEntries = [...nonFeeEntries, ...mergedFees];

        // --- 5. SAFE REFRESH LOGIC ---
        const existingSchedules = SCHEDULES.filter(s => (s.investment_id||s.investment) === c.id);
        const dueSchedules = existingSchedules.filter(s => s.status === "Due");
        const lockedSchedules = existingSchedules.filter(s => s.status !== "Due");
        const handledIds = new Set();

        for (const newEntry of finalNewEntries) {
          const existing = dueSchedules.find(s => s.due_date === newEntry.due_date && s.payment_type === newEntry.payment_type && (s.fee_id || "") === (newEntry.fee_id || ""));
          if (existing) {
            handledIds.add(existing.docId || existing.id);
            const amtChanged = Math.abs(existing.payment_amount - newEntry.payment_amount) > 0.01;
            const princChanged = Math.abs(existing.principal_amount - newEntry.principal_amount) > 0.01;
            if (amtChanged || princChanged) {
              const vNum = (existing.version_num || 1) + 1;
              const vId = `${existing.schedule_id}-V${vNum}`;
              const docRef = existing._path ? doc(db, existing._path) : doc(db, schedulePath, existing.docId || existing.id);
              await updateDoc(docRef, {
                ...newEntry,
                schedule_id: existing.schedule_id,
                version_num: vNum,
                version_id: vId,
                payment_id: existing.payment_id || existing.schedule_id,
                notes: `${newEntry.notes} (Refreshed ${todayStr})`,
                updated_at: serverTimestamp()
              });
              totalUpdated++;
            }
          } else {
            const isLocked = lockedSchedules.some(s => s.due_date === newEntry.due_date && s.payment_type === newEntry.payment_type && (s.fee_id || "") === (newEntry.fee_id || ""));
            if (!isLocked) {
              await addDoc(collection(db, schedulePath), newEntry);
              totalCreated++;
            }
          }
        }

        // Cleanup: Delete orphans
        for (const orphan of dueSchedules) {
          if (!handledIds.has(orphan.docId || orphan.id)) {
            const docRef = orphan._path ? doc(db, orphan._path) : doc(db, schedulePath, orphan.docId || orphan.id);
            await deleteDoc(docRef);
            totalDeleted++;
          }
        }
      }
      
      setSel(new Set()); gridRef.current?.resetRowSelection();
      setGenResult({ title: "Generation Complete", lines: [
        `Successfully processed ${selectedList.length} investment(s).`,
        `- Created: ${totalCreated}`,
        `- Updated: ${totalUpdated}`,
        `- Deleted: ${totalDeleted}`
      ]});
    } catch (err) {
      console.error("Generate schedules error:", err);
      setGenResult({ title: "Error", lines: ["Error generating schedules:", String(err.message || err)] });
    } finally {
      setGenerating(false);
    }
  };
  const setF = (k, v) => setModal(m => {
    const next = { ...m, data: { ...m.data, [k]: v } };
    
    if (k === "contact_id") {
      const c = CONTACTS.find(x => x.id === v || x.docId === v);
      if (c) {
        next.data.first_name = c.first_name || "";
        next.data.last_name = c.last_name || "";
      }
    }
    
    // Logic for Source of Funds
    if (k === "source_of_funds") {
      if (v === "New Principal") {
        next.data.rollover_source_id = "";
      }
    }

    if (k === "rollover_source_id" && v) {
      const sourceInv = INVESTMENTS.find(i => i.id === v);
      if (sourceInv) {
        // Lock amount to the source principal
        const amt = Number(String(sourceInv.amount || 0).replace(/[^0-9.-]/g, ""));
        next.data.amount = String(amt);
      }
    }

    if (k === "deal") {
      const deal = DEALS.find(p => p.name === v);
      if (deal) {
        next.data.deal_id = deal.deal_id || deal.id;
        if (m.mode === "add") {
          next.data.start_date = deal.startDate || next.data.start_date;
          next.data.maturity_date = deal.endDate || next.data.maturity_date;
          if (deal.startDate && deal.endDate) {
            const s = new Date(deal.startDate); const e = new Date(deal.endDate);
            if (!isNaN(s) && !isNaN(e)) next.data.term_months = String((e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth());
          }
        }
      }
    }
    // Auto-calculate maturity_date when term_months changes
    if (k === "term_months" && v && next.data.start_date) {
      const sd = new Date(next.data.start_date);
      if (!isNaN(sd)) { sd.setMonth(sd.getMonth() + parseInt(v, 10)); next.data.maturity_date = sd.toISOString().slice(0, 10); }
    }
    // Auto-calculate maturity_date when start_date changes and term_months exists
    if (k === "start_date" && v && next.data.term_months) {
      const sd = new Date(v);
      if (!isNaN(sd)) { sd.setMonth(sd.getMonth() + parseInt(next.data.term_months, 10)); next.data.maturity_date = sd.toISOString().slice(0, 10); }
    }
    // Auto-calculate term_months when maturity_date changes
    if (k === "maturity_date" && v && next.data.start_date) {
      const sd = new Date(next.data.start_date); const md = new Date(v);
      if (!isNaN(sd) && !isNaN(md)) { next.data.term_months = String((md.getFullYear() - sd.getFullYear()) * 12 + md.getMonth() - sd.getMonth()); }
    }
    return next;
  });
  const calculatorOpts = (DIMENSIONS.find(d => d.name === "Calculator") || {}).items || ["ACT/360+30/360"];
  const investorEditTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorInvestmentEditType") || {}).items || [];
  const borrowerEditTypeOpts = (DIMENSIONS.find(d => d.name === "BorrowerInvestmentEditType") || {}).items || [];
  const investorNewTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorInvestmentNewType") || {}).items || [];
  const borrowerNewTypeOpts = (DIMENSIONS.find(d => d.name === "BorrowerInvestmentNewType") || {}).items || [];
  const scheduleFrequencyOpts = (DIMENSIONS.find(d => d.name === "ScheduleFrequency" || d.name === "Schedule Frequency") || {}).items || ["Monthly", "Quarterly", "Semi-Annual", "Annual", "At Maturity"];
  const selectedContact = CONTACTS.find(p => p.id === modal.data.contact_id || p.docId === modal.data.contact_id);
  const contactRole = selectedContact ? selectedContact.role : "";
  const getTypeOpts = () => {
    const isNew = modal.mode === "add";
    const invOpts = isNew ? investorNewTypeOpts : investorEditTypeOpts;
    const borOpts = isNew ? borrowerNewTypeOpts : borrowerEditTypeOpts;
    let opts = [];
    if (contactRole === "Investor") opts = [...invOpts];
    else if (contactRole === "Borrower") opts = [...borOpts];
    else if (contactRole === "Both") opts = [...invOpts, ...borOpts.filter(o => !invOpts.includes(o))];
    else opts = [...invOpts, ...borOpts.filter(o => !invOpts.includes(o))];
    const cur = modal.data.type;
    if (cur && !opts.includes(cur)) opts = [cur, ...opts];
    return opts.length > 0 ? opts : ["Loan", "Mortgage", "Equity"];
  };
  const toggleRow = id => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const toggleAll = () => { setSel(sel.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id))); };

  // TanStack Table: Data filtering (optimized with useMemo to prevent re-render loops)
  const filtered = useMemo(() => {
    return INVESTMENTS.filter(c => {
      if (chip === "Deposit" && (c.type || "").toUpperCase() !== "DEPOSIT") return false;
      if (chip === "Disbursement" && (c.type || "").toUpperCase() !== "DISBURSEMENT") return false;
      if (chip === "Active" && c.status !== "Active") return false;
      return true;
    });
  }, [INVESTMENTS, chip]);

  // TanStack Table: Column definitions
  const permissions = { canUpdate, canDelete, canCreate };
  const columnDefs = useMemo(() => {
    return getInvestmentColumns(permissions, isDark, t, {
      feesData: FEES_DATA,
      callbacks: {
        onEdit: openEdit,
        onDelete: (target) => setDelT({ id: target.id, name: target.id, docId: target.docId, _path: target._path }),
        onDrillDown: (investment, options = {}) => {
          setDrillInvestment(investment);
          setDrillOptions({ 
            view: options.view || "simple", 
            tab: options.tab || "Capital Transactions" 
          });
        },
        onClone: async (r) => {
          try {
            const prefix = (r.investment_id || r.id || "").startsWith("L") ? "L" : "I";
            let maxIdNum = 10000;
            INVESTMENTS.forEach(c => {
              const cid = c.investment_id || c.id;
              if (cid && cid.startsWith(prefix)) {
                const num = parseInt(cid.substring(1), 10);
                if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
              }
            });
            const nextId = `${prefix}${maxIdNum + 1}`;
            
            const { id, docId, _path, created_at, updated_at, ...rest } = r;
            const payload = {
              ...rest,
              id: nextId,
              investment_id: nextId,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
              notes: `Cloned from ${id || r.investment_id || "unknown"} on ${new Date().toLocaleDateString()}.${r.notes ? ` ${r.notes}` : ""}`
            };
            
            const colRef = collectionPath ? collection(db, collectionPath) : collection(db, "tenants", tenantId, "investments");
            await addDoc(colRef, payload);
            if (typeof showToast === "function") showToast(`Investment ${nextId} created (cloned)`, "success");
          } catch (err) {
            console.error("Clone error:", err);
            if (typeof showToast === "function") showToast("Failed to clone investment", "error");
          }
        },
      }
    });
  }, [permissions, isDark, t, FEES_DATA]);
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Investments</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage investments</p></div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {sel.size > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.surfaceBorder}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{sel.size} selected</span>

          {canUpdate && <>
            <FSel 
              width={140} 
              value={bulkStatus} 
              onChange={e => setBulkStatus(e.target.value)} 
              options={investmentStatusOpts} 
              t={t} 
              placeholder="Update status..." 
            />
           <button onClick={() => handleBulkStatus(bulkStatus)} disabled={!bulkStatus || sel.size === 0} style={{ 
             fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 11, 
             background: (!bulkStatus || sel.size === 0) ? (isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb") : t.accentGrad, 
             color: (!bulkStatus || sel.size === 0) ? t.textMuted : "#fff", border: "none", 
             cursor: (!bulkStatus || sel.size === 0) ? "default" : "pointer",
             boxShadow: (!bulkStatus || sel.size === 0) ? "none" : `0 4px 12px ${t.accentShadow || "none"}`
           }}>Apply</button>
          </>}

          {canUpdate && canDelete && <div style={{ width: 1, height: 20, background: t.surfaceBorder }} />}

          {canDelete && <button onClick={handleBulkDelete} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 11, background: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "#FECACA"}`, cursor: "pointer" }}>Delete ({sel.size})</button>}
        </div>}
        {canGenerate && <button className="success-btn" onClick={handleGenerate} disabled={sel.size === 0} style={{ background: t.successGrad, color: "#fff", padding: "11px 20px", borderRadius: 11, fontSize: 13, fontWeight: 600, boxShadow: `0 4px 16px ${t.successShadow}`, display: "flex", alignItems: "center", gap: 6, opacity: sel.size === 0 ? 0.45 : 1 }}>▤ Generate Schedules{sel.size > 0 ? ` (${sel.size})` : ""}</button>}
        {canCreate && <Tooltip text="Create a new investment" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Investment</button></Tooltip>}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {(() => {
        const scope = sel.size > 0 ? filtered.filter(c => sel.has(c.id)) : filtered;
        const parseAmt = a => Number(String(a).replace(/[^0-9.-]/g, "")) || 0;
        const depositTotal = fmtCurr(scope.filter(c => c.type === "DEPOSIT").reduce((s, c) => s + parseAmt(c.amount), 0));
        const disbTotal = fmtCurr(scope.filter(c => c.type === "DISBURSEMENT").reduce((s, c) => s + parseAmt(c.amount), 0));
        const activeCount = scope.filter(c => c.status === "Active").length;
        return [
          { label: "Total", value: filtered.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
          { label: "Deposit", value: depositTotal, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
          { label: "Disbursement", value: disbTotal, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" },
          { label: "Active", value: activeCount, accent: isDark ? "#A78BFA" : "#7C3AED", bg: isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE" }
        ];
      })().map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{["All", "Deposit", "Disbursement", "Active"].map(f => {
        const isA = chip === f;
        return <span key={f} className="filter-chip" onClick={() => setChip(f)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{f}</span>;
      })}
        {sel.size > 0 && <><div style={{ width: 1, height: 18, background: t.surfaceBorder, marginLeft: 4 }} /><span onClick={() => { setSel(new Set()); gridRef.current?.resetRowSelection(); }} style={{ fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20, background: isDark ? "rgba(248,113,113,0.12)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.25)" : "#FECACA"}`, cursor: "pointer" }}>Clear</span></>}
      </div>
    </div>

    <div style={{ height: "calc(100vh - 430px)", width: "100%" }}>
      <TanStackTable
        ref={gridRef}
        data={filtered}
        columns={columnDefs}
        isDark={isDark}
        t={t}
        pageSize={pageSize}
        onSelectionChange={(selectedRows) => {
          setSel(new Set(selectedRows.map(r => r.id)));
        }}
      />
    </div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Investment" : "Edit Investment"} onSave={handleSaveInvestment} width={620} t={t} isDark={isDark}>
      {(modal.mode === "edit" || (modal.mode === "add" && modal.data.id)) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Investment ID" t={t}>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", minHeight: 41, display: 'flex', alignItems: 'center' }}>{modal.data.id || "—"}</div>
          </FF>
          <FF label="Deal ID" t={t}>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", minHeight: 41, display: 'flex', alignItems: 'center' }}>{modal.data.deal_id || "—"}</div>
          </FF>
        </div>
      )}
      <FF label="Deal name" t={t}><FSel value={modal.data.deal} onChange={e => setF("deal", e.target.value)} options={DEALS.map(p => p.name)} t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <FF label="Contact" t={t}>
          <FSel 
            value={modal.data.contact_id} 
            onChange={e => setF("contact_id", e.target.value)} 
            options={sortedContacts.map(c => ({ value: c.id || c.docId, label: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.id }))}
            t={t} 
            placeholder="Select a contact..."
          />
        </FF>
        <FF label="Source of Funds" t={t}>
          <FSel 
            value={modal.data.source_of_funds} 
            onChange={e => setF("source_of_funds", e.target.value)} 
            options={["New Principal", "Rollover Principal"]} 
            t={t} 
          />
        </FF>
      </div>

      {modal.data.source_of_funds === "Rollover Principal" && (
        <FF label="Rollover Source (Maturing Investment)" t={t}>
          <FSel 
            value={modal.data.rollover_source_id} 
            onChange={e => setF("rollover_source_id", e.target.value)} 
            placeholder="Select investment to roll over..."
            options={INVESTMENTS
              .filter(i => (i.contact_id === modal.data.contact_id || i.contact_name === modal.data.contact_name || i.contact === modal.data.contact_name) && i.rollover)
              .map(i => ({
                value: i.id,
                label: `${i.id} | ${i.deal} | ${fmtCurr(i.amount)}`
              }))
            }
            t={t}
          />
        </FF>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <FF label="Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={getTypeOpts()} t={t} /></FF>
        <FF label="Amount" t={t}>
          {modal.data.rollover_source_id ? (
            <div style={{ 
              fontFamily: t.mono, 
              fontSize: 13, 
              color: t.idText, 
              background: isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF", 
              border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "#C7D2FE"}`, 
              borderRadius: 9, 
              padding: "10px 13px", 
              minHeight: 41, 
              display: 'flex', 
              alignItems: 'center',
              fontWeight: 700 
            }}>
              {fmtCurr(modal.data.amount)}
            </div>
          ) : (
            <FIn value={modal.data.amount} onChange={e => setF("amount", e.target.value)} placeholder="$0" t={t} />
          )}
        </FF>
        <FF label="Rate" t={t}><FIn value={modal.data.rate} onChange={e => setF("rate", e.target.value)} placeholder="10%" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <FF label="Frequency" t={t}><FSel value={modal.data.freq} onChange={e => setF("freq", e.target.value)} options={scheduleFrequencyOpts} t={t} /></FF>
        <FF label="Term (months)" t={t}><FIn value={modal.data.term_months || ""} onChange={e => setF("term_months", e.target.value)} placeholder="e.g. 24" t={t} /></FF>
        <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={["Open", "Active", "Closed"]} t={t} /></FF>
        <FF label="Rollover at Maturity" t={t}>
          <div style={{ display: "flex", alignItems: "center", height: 38 }}>
            <input type="checkbox" checked={!!modal.data.rollover} onChange={e => setF("rollover", e.target.checked)} style={{ cursor: "pointer", width: 18, height: 18 }} />
            <span style={{ marginLeft: 8, fontSize: 13, color: t.textSecondary }}>Rollover Principal</span>
          </div>
        </FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Calculator" t={t}><FSel value={modal.data.calculator || ""} onChange={e => setF("calculator", e.target.value)} options={calculatorOpts} t={t} /></FF>
        {modal.mode === "add" && (
          <FF label="Schedule Gen" t={t}>
            <div style={{ display: "flex", alignItems: "center", height: 38 }}>
              <input type="checkbox" checked={!!modal.data.auto_generate} onChange={e => setF("auto_generate", e.target.checked)} style={{ cursor: "pointer", width: 18, height: 18 }} />
              <span style={{ marginLeft: 8, fontSize: 13, color: t.textSecondary }}>Auto-generate Schedule</span>
            </div>
          </FF>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Start Date" t={t}><FIn value={modal.data.start_date || ""} onChange={e => setF("start_date", e.target.value)} t={t} type="date" /></FF>
        <FF label="Maturity Date" t={t}><FIn value={modal.data.maturity_date || ""} onChange={e => setF("maturity_date", e.target.value)} t={t} type="date" /></FF>
      </div>
      <div style={{ marginTop: 24, padding: "16px 20px", background: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb", borderRadius: 14, border: `1px solid ${t.surfaceBorder}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", color: t.accent }}>
              <CreditCard size={16} />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: t.text }}>Default Payment Lag</span>
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
                options={(DIMENSIONS.find(d => d.name === "PaymentLag")?.items || ["Days", "Months", "Quarter-End"]).map(opt => ({ value: opt, label: opt }))} 
                t={t} 
              />
            </FF>
                { (modal.data.lag_type?.toLowerCase() === "days" || modal.data.lag_type?.toLowerCase() === "months" || modal.data.lag_type?.toLowerCase().includes("quater") || modal.data.lag_type?.toLowerCase().includes("quarter")) && (
                  <FF label={
                    modal.data.lag_type?.toLowerCase() === "months" ? "Number of Months" : 
                    modal.data.lag_type?.toLowerCase().includes("quater") || modal.data.lag_type?.toLowerCase().includes("quarter") ? "Day Offset" :
                    "Number of Days"
                  } t={t}>
                    <FIn type="number" value={modal.data.lag_value || ""} onChange={e => setF("lag_value", e.target.value)} placeholder="e.g. 30" t={t} />
                  </FF>
                )}
          </div>
        )}
      </div>
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteInvestment} label="This investment" t={t} isDark={isDark} />

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
    <Modal open={!!genConfirm} onClose={() => setGenConfirm(null)} title="Confirm Generate" onSave={executeGenerate} saveLabel="Generate" t={t} isDark={isDark}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "8px 0" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF", border: `1px solid ${isDark ? "rgba(96,165,250,0.25)" : "#BFDBFE"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: isDark ? "#60A5FA" : "#2563EB" }}>▤</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 8 }}>Generate Payment Schedules?</div>
          <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>This will generate payment schedules for {genConfirm?.count || 0} investment(s).</div>
        </div>
      </div>
    </Modal>
    {generating && (
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        cursor: "wait"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          background: isDark ? "#1C1917" : "#fff",
          padding: "40px 52px",
          borderRadius: 20,
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          border: `1px solid ${t.surfaceBorder}`
        }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{
            width: 44,
            height: 44,
            border: `4px solid ${isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}`,
            borderTopColor: t.accent,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 6 }}>Generating Schedules...</div>
            <div style={{ fontSize: 13, color: t.textMuted }}>Please wait while we set up the payment distribution records.</div>
          </div>
        </div>
      </div>
    )}
    {/* Result Modal */}
    {genResult && (
      <Modal open={!!genResult} onClose={() => setGenResult(null)} title={genResult.title || "Result"} hideFooter t={t} isDark={isDark} width={400}>
        <div style={{ padding: "10px 0", textAlign: "center" }}>
          <div style={{ 
            width: 56, height: 56, borderRadius: 28, 
            background: genResult.title === "Error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", 
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" 
          }}>
            {genResult.title === "Error" ? <AlertTriangle size={28} color="#EF4444" /> : <Check size={28} color="#22C55E" />}
          </div>
          <div style={{ fontWeight: 700, color: t.text, fontSize: 16, marginBottom: 8 }}>{genResult.title || "Result"}</div>
          
          <div style={{ padding: "0 10px" }}>
            {genResult.message ? (
              <p style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.5 }}>{genResult.message}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(genResult.lines || []).map((line, i) => (
                  <div key={i} style={{ fontSize: 13.5, color: i === 0 ? t.text : t.textSecondary, lineHeight: 1.5, fontWeight: i === 0 ? 600 : 400 }}>{line}</div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => setGenResult(null)}
            style={{ padding: "10px 24px", borderRadius: 8, background: t.accentGrad || t.accent, color: "#fff", border: "none", fontWeight: 700, marginTop: 24, cursor: "pointer", width: "100%" }}
          >
            Continue
          </button>
        </div>
      </Modal>
    )}
    <InvestorSummaryModal 
      contact={drillContact}
      selectedInvestmentId={drillInvestment?.investment_id || drillInvestment?.id}
      defaultView={drillOptions.view}
      initialTab={drillOptions.tab}
      onClose={() => setDrillInvestment(null)}
      isDark={isDark}
      t={t}
      INVESTMENTS={INVESTMENTS}
      SCHEDULES={SCHEDULES}
      DEALS={DEALS}
      DIMENSIONS={DIMENSIONS}
      LEDGER={LEDGER}
      USERS={USERS}
      onUpdateInvestment={handleUpdateInvestmentModal}
    />
  </>);
}

async function syncRolloverToSchedules(db, schedules, investmentId, isRollover, schedulePath, tenantId) {
  if (!db || !investmentId) return;
  const principalSchedules = (schedules || []).filter(s => s.investment === investmentId && s.type === "INVESTOR_PRINCIPAL_PAYMENT");
  if (principalSchedules.length > 0) {
    try {
      await Promise.all(principalSchedules.map(s => {
        const path = s._path || (schedulePath ? `${schedulePath}/${s.docId || s.id}` : `tenants/${tenantId}/paymentSchedules/${s.docId || s.id}`);
        return updateDoc(doc(db, path), { rollover: !!isRollover, updated_at: serverTimestamp() });
      }));
    } catch (e) {
      console.error("Principal schedule rollover sync error:", e);
    }
  }
}

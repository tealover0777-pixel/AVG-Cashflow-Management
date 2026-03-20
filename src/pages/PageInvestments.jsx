import { useState, useMemo, useRef, useEffect } from "react";
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

import 'ag-grid-community/styles/ag-grid.css';
import '../components/ag-grid/ag-grid-theme.css';
import { getColumnDefs } from '../components/ag-grid/InvestmentsGridConfig';
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { normalizeDateAtNoon, hybridDays, pmtCalculator_ACT360_30360, feeCalculator_ACT360_30360, getFrequencyValue, fmtCurr } from "../utils";
import { StatCard, Bdg, Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";

export default function PageInvestments({ t, isDark, INVESTMENTS = [], DEALS = [], CONTACTS = [], DIMENSIONS = [], FEES_DATA = [], SCHEDULES = [], collectionPath = "", schedulePath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("INVESTMENT_CREATE");
  const canUpdate = isSuperAdmin || hasPermission("INVESTMENT_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("INVESTMENT_DELETE") || hasPermission("INVESTMENTS_DELETE");
  const canGenerate = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_CREATE");
  const [sel, setSel] = useState(new Set());
  const [chip, setChip] = useState("All");
  const [generating, setGenerating] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [genConfirm, setGenConfirm] = useState(null);
  const [genResult, setGenResult] = useState(null); // { title, message }
  const [drillInvestment, setDrillInvestment] = useState(null);
  const gridRef = useRef(null);
  const [pageSize, setPageSize] = useState(30);

  // Dynamically calculate page size based on available vertical space
  useEffect(() => {
    const calculatePageSize = () => {
      const rowHeight = 42; // AG Grid default row height
      const headerHeight = 56; // AG Grid header height + padding
      const viewportHeight = window.innerHeight;

      // Grid container matches: calc(100vh - 520px)
      const gridContainerHeight = viewportHeight - 520;
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
        party: "",
        type: "",
        amount: "",
        rate: "",
        freq: "Quarterly",
        status: "Open",
        start_date: sd,
        maturity_date: ed,
        term_months: termM,
        calculator: ""
      }
    });
  };
  const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
  const close = () => setModal(m => ({ ...m, open: false }));
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
      fees: (d.feeIds || []).join(","),
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, collectionPath, d.docId), payload);
      } else {
        await addDoc(collection(db, collectionPath), { ...payload, investment_id: d.id || "", created_at: serverTimestamp() });
      }
    } catch (err) { console.error("Save investment error:", err); }
    close();
  };

  const handleDeleteInvestment = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete investment error:", err); }
  };
  const investmentStatusOpts = ["Open", "Active", "Closed"];
  const [bulkStatus, setBulkStatus] = useState("");
  const handleBulkStatus = async (status) => {
    if (!status || sel.size === 0) return;
    if (!window.confirm(`Are you sure you want to update status to "${status}" for ${sel.size} investment(s)?`)) return;
    try {
      await Promise.all([...sel].map(id => {
        const c = INVESTMENTS.find(c => c.id === id);
        if (c && c.docId) return updateDoc(doc(db, collectionPath, c.docId), { status, updated_at: serverTimestamp() });
        return Promise.resolve();
      }));
      setSel(new Set()); setBulkStatus("");
    } catch (err) { console.error("Bulk status update error:", err); }
  };
  const handleBulkDelete = async () => {
    if (sel.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${sel.size} investment(s)? This action cannot be undone.`)) return;
    try {
      await Promise.all([...sel].map(id => {
        const c = INVESTMENTS.find(c => c.id === id);
        if (c && c.docId) return deleteDoc(doc(db, collectionPath, c.docId));
        return Promise.resolve();
      }));
      setSel(new Set());
    } catch (err) { console.error("Bulk delete error:", err); }
  };
  const handleGenerate = () => {
    if (sel.size === 0) return;
    const selected = INVESTMENTS.filter(c => sel.has(c.id));
    setGenConfirm({ count: selected.length });
  };

  const executeGenerate = async () => {
    setGenConfirm(null);
    const selected = INVESTMENTS.filter(c => sel.has(c.id));
    if (selected.length === 0) return;

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
    console.log("Starting generation for investments:", selected.map(c => c.id));

    try {
      if (!schedulePath || schedulePath.startsWith("GROUP:")) {
        throw new Error(`Invalid schedule path: "${schedulePath}". Please select a specific tenant first.`);
      }

      // --- ID Generation Logic ---
      let maxIdNum = 10000;
      SCHEDULES.forEach(s => {
        const sid = s.schedule_id || s.id;
        if (sid && sid.startsWith("S")) {
          const num = parseInt(sid.substring(1), 10);
          if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
        }
      });
      let currentIdNum = maxIdNum + 1;

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
          console.warn(`Skipping investment ${c.id}: Invalid dates`, { startDate: c.start_date, matDate: c.maturity_date });
          skipped.push(`${c.id} (Invalid Dates)`);
          continue;
        }

        if (principal <= 0) {
          console.warn(`Skipping investment ${c.id}: Principal is 0 or invalid`, { principal: c.amount });
          skipped.push(`${c.id} (Zero Amount)`);
          continue;
        }

        const cTypeUpper = (c.type || "").toUpperCase();
        const isDisbursement = cTypeUpper.includes("DISBURSEMENT");

        // --- 1. Initial Deposit/Disbursement ---
        const initialPaymentType = isDisbursement ? PT_BOR_DISBURSEMENT : PT_DEPOSIT;
        const ds1 = getDirectionAndSigned(initialPaymentType, principal);
        const newEntry = {
          schedule_id: `S${currentIdNum++}`,
          investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
          due_date: startDate.toISOString().slice(0, 10), payment_type: initialPaymentType, fee_id: "",
          period_number: 1, principal_amount: principal, payment_amount: principal,
          signed_payment_amount: ds1.signed, direction_from_company: ds1.direction,
          original_payment_amount: principal,
          applied_to: "Principal Amount",
          term_start: startDate.toISOString().slice(0, 10), term_end: startDate.toISOString().slice(0, 10),
          status: "Due", notes: `Initial for ${c.id}`, created_at: serverTimestamp(),
        };
        console.log("GENERATE: Creating entry with original_payment_amount:", newEntry.original_payment_amount);
        entries.push(newEntry);

        // --- 2. Interest and Recurring Fees ---
        const freqValue = getFrequencyValue(c.freq);
        const monthsPerPeriod = 12 / freqValue;
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

          // Infer fee frequency if not set
          let feeFrequency = fInfo.frequency;
          if (!feeFrequency) {
            const chargeAt = (fInfo.fee_charge_at || "").toLowerCase();
            if (chargeAt.includes("investment_start") || chargeAt.includes("investment_end")) {
              feeFrequency = "One_Time";
            } else {
              feeFrequency = "Recurring";
            }
          }

          if (feeFrequency === "One_Time") {
            const feeAmt = feeCalculator_ACT360_30360(fInfo, principal, startDate, startDate, startDate);
            if (isNaN(feeAmt)) return;
            let dDate = startDate;
            if (fInfo.fee_charge_at === "Investment_End") dDate = matDate;
            // Use fee's direction instead of PT_FEE default
            const feeDir = fInfo.direction || "OUT";
            const signedFeeAmt = feeDir === "OUT" ? -Math.abs(feeAmt) : Math.abs(feeAmt);
            entries.push({
              schedule_id: `S${currentIdNum++}`,
              investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
              due_date: dDate.toISOString().slice(0, 10), payment_type: PT_FEE, fee_id: fid,
              period_number: 1, principal_amount: principal, payment_amount: feeAmt,
              signed_payment_amount: signedFeeAmt, direction_from_company: feeDir,
              original_payment_amount: feeAmt,
              term_start: startDate.toISOString().slice(0, 10), term_end: dDate.toISOString().slice(0, 10),
              applied_to: fInfo.applied_to || "Principal Amount",
              fee_name: fInfo.name || "Fee",
              fee_rate: fInfo.rate || "0",
              fee_method: fInfo.method || "Fixed Amount",
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
            if (nm === undefined) pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear() + 1, targets[0] + 1, 0));
            else pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), nm + 1, 0));
          } else if (fLow.includes("semi")) {
            const targets = [5, 11];
            let nm = targets.find(m => m > pStart.getMonth());
            if (nm === undefined) pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear() + 1, targets[0] + 1, 0));
            else pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), nm + 1, 0));
          } else if (fLow.includes("annu")) {
            if (pStart.getMonth() >= 11) pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear() + 1, 12, 0));
            else pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), 12, 0));
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
          if (c.calculator === "ACT/360+30/360") interest = pmtCalculator_ACT360_30360(pStart, calcEnd, startDate, principal, rate, c.freq);
          else interest = principal * (rate / 360) * 90;

          if (!isNaN(interest)) {
            const interestPT = isDisbursement ? PT_BOR_INTEREST : PT_INTEREST;
            const ds2 = getDirectionAndSigned(interestPT, interest);
            const roundedInterest = Math.round(interest * 100) / 100;
            entries.push({
              schedule_id: `S${currentIdNum++}`,
              investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
              due_date: pEnd.toISOString().slice(0, 10), payment_type: interestPT, fee_id: "",
              period_number: periodNum, principal_amount: principal, payment_amount: roundedInterest,
              signed_payment_amount: ds2.signed, direction_from_company: ds2.direction,
              original_payment_amount: roundedInterest,
              term_start: pStart.toISOString().slice(0, 10), term_end: pEnd.toISOString().slice(0, 10),
              applied_to: "Interest Amount",
              status: "Due", notes: `Interest Period ${periodNum} for ${c.id}`, created_at: serverTimestamp(),
            });
          }

          // Recurring Fees
          cFeeIds.forEach(fid => {
            const fInfo = feeInfoMap[fid];
            if (!fInfo) return;

            // Infer fee frequency if not set
            let feeFrequency = fInfo.frequency;
            if (!feeFrequency) {
              const chargeAt = (fInfo.fee_charge_at || "").toLowerCase();
              if (chargeAt.includes("investment_start") || chargeAt.includes("investment_end")) {
                feeFrequency = "One_Time";
              } else {
                feeFrequency = "Recurring";
              }
            }

            if (feeFrequency === "Recurring") {
              const ca = (fInfo.fee_charge_at || "").toLowerCase();
              let should = false;

              // Term-based (every period)
              if (ca.includes("term_start") || ca.includes("term_end")) should = true;
              // Investment start/end (only first/last period)
              else if (ca.includes("investment_start") && periodNum === 1) should = true;
              else if (ca.includes("investment_end") && isLast) should = true;
              // Monthly (every period)
              else if (ca.includes("month")) should = true;
              // Quarterly (Mar, Jun, Sep, Dec)
              else if (ca.includes("quart") && [2, 5, 8, 11].includes(pEnd.getMonth())) should = true;
              // Semi-annual (Jun, Dec)
              else if (ca.includes("semi") && [5, 11].includes(pEnd.getMonth())) should = true;
              // Year_Start (periods that include beginning of year)
              else if (ca.includes("year_start") || ca.includes("year start")) {
                // Period starts in January OR period wraps around year boundary (e.g., Dec-Mar)
                should = pStart.getMonth() === 0 || pStart.getMonth() > pEnd.getMonth();
              }
              // Year_End (periods that include end of year)
              else if (ca.includes("year_end") || ca.includes("year end")) {
                should = pEnd.getMonth() === 11;
              }
              // Generic "year" or "annu" (defaults to year end)
              else if (ca.includes("annu") || ca.includes("year")) {
                should = pEnd.getMonth() === 11;
              }

              // Always charge fee in the last period, even if fee_charge_at timing hasn't been met
              if (isLast) should = true;

              if (should) {
                const feeAmt = feeCalculator_ACT360_30360(fInfo, principal, pStart, calcEnd, startDate);
                if (!isNaN(feeAmt)) {
                  // Use fee's direction instead of PT_FEE default
                  const feeDir = fInfo.direction || "OUT";
                  const signedFeeAmt = feeDir === "OUT" ? -Math.abs(feeAmt) : Math.abs(feeAmt);

                  // Determine due date based on period and fee_charge_at
                  // This ensures fees are charged on actual investment dates, not theoretical calendar dates
                  let feeDueDate;
                  if (isLast) {
                    // Last period: always use maturity date (pEnd), regardless of fee_charge_at
                    // Example: Year_End with Jan 10 maturity → charges on Jan 10, not Dec 31
                    feeDueDate = pEnd;
                  } else if (periodNum === 1 && ca.includes("start")) {
                    // First period with "start" fees: use investment start date
                    // Example: Quarter_Start with Mar 15 start → charges on Mar 15, not Apr 1
                    feeDueDate = startDate;
                  } else {
                    // Normal periods: use standard logic based on fee_charge_at
                    feeDueDate = ca.includes("start") ? pStart : pEnd;
                  }
                  const roundedFeeAmt = Math.round(feeAmt * 100) / 100;
                  entries.push({
                    schedule_id: `S${currentIdNum++}`,
                    investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
                    due_date: feeDueDate.toISOString().slice(0, 10), payment_type: PT_FEE, fee_id: fid,
                    period_number: periodNum, principal_amount: principal, payment_amount: roundedFeeAmt,
                    signed_payment_amount: signedFeeAmt, direction_from_company: feeDir,
                    original_payment_amount: roundedFeeAmt,
                    term_start: pStart.toISOString().slice(0, 10), term_end: pEnd.toISOString().slice(0, 10),
                    applied_to: fInfo.applied_to || "Principal Amount",
                    fee_name: fInfo.name || "Fee",
                    fee_rate: fInfo.rate || "0",
                    fee_method: fInfo.method || "Fixed Amount",
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
        entries.push({
          schedule_id: `S${currentIdNum++}`,
          investment_id: c.id, deal_id: c.deal_id || "", party_id: c.party_id || "",
          due_date: matDate.toISOString().slice(0, 10), payment_type: repaymentPT, fee_id: "",
          period_number: periodNum, principal_amount: principal, payment_amount: principal,
          signed_payment_amount: ds3.signed, direction_from_company: ds3.direction,
          original_payment_amount: principal,
          term_start: startDate.toISOString().slice(0, 10), term_end: matDate.toISOString().slice(0, 10),
          applied_to: "Principal Amount",
          status: "Due", notes: `Repayment for ${c.id}`, created_at: serverTimestamp(),
        });

        // --- 4. Post-process Fee Merging for this investment ---
        const feeGroups = {}; // key: due_date|applied_to|direction
        const nonFeeEntries = [];
        const investmentEntries = entries.filter(e => e.investment_id === c.id);
        
        // Remove temporary entries from main list to rebuild
        const otherInvestmentsEntries = entries.filter(e => e.investment_id !== c.id);
        
        investmentEntries.forEach(e => {
          if (e.payment_type !== PT_FEE) {
            nonFeeEntries.push(e);
            return;
          }
          const key = `${e.due_date}|${e.applied_to}|${e.direction_from_company}`;
          if (!feeGroups[key]) {
            feeGroups[key] = {
              ...e,
              fee_ids: [e.fee_id],
              fee_names: [e.fee_name],
              fee_rates: [e.fee_rate],
              fee_methods: [e.fee_method],
              payment_amounts: [e.payment_amount],
              signed_amounts: [e.signed_payment_amount],
              total_payment: e.payment_amount,
              total_signed: e.signed_payment_amount
            };
          } else {
            feeGroups[key].fee_ids.push(e.fee_id);
            feeGroups[key].fee_names.push(e.fee_name);
            feeGroups[key].fee_rates.push(e.fee_rate);
            feeGroups[key].fee_methods.push(e.fee_method);
            feeGroups[key].payment_amounts.push(e.payment_amount);
            feeGroups[key].signed_amounts.push(e.signed_payment_amount);
            feeGroups[key].total_payment += e.payment_amount;
            feeGroups[key].total_signed += e.signed_payment_amount;
          }
        });

        const mergedFees = Object.values(feeGroups).map(g => {
          const { fee_ids, payment_amounts, signed_amounts, total_payment, total_signed, fee_names, fee_rates, fee_methods, ...rest } = g;
          // Build detailed breakdown with direction signs
          const basisAmt = rest.principal_amount || 0;
          const basisLabel = rest.applied_to || "Principal Amount";

          const stepParts = fee_ids.map((id, i) => {
            const method = fee_methods[i];
            const rate = fee_rates[i];
            const amt = payment_amounts[i];
            const signedAmt = signed_amounts[i];
            const sign = signedAmt >= 0 ? "+" : "-";
            const absAmt = Math.abs(amt);

            if (method === "% of Amount") {
              return `${sign}${rate}% of ${fmtCurr(basisAmt)} (${basisLabel}) = ${sign}${fmtCurr(absAmt)}`;
            }
            return `${sign}Fixed amount of ${fmtCurr(absAmt)}`;
          });

          let breakdown = "Fee Breakdown: ";
          if (stepParts.length === 1) {
            breakdown += stepParts[0];
          } else {
            breakdown += stepParts.map(p => `[${p}]`).join(" ") + ` = ${fmtCurr(Math.abs(total_signed))}`;
          }

          return {
            ...rest,
            fee_id: fee_ids.join(","),
            payment_amount: Math.round(total_payment * 100) / 100,
            signed_payment_amount: Math.round(total_signed * 100) / 100,
            notes: breakdown
          };
        });

        // Re-assign grouped list back to entries
        const finalInvestmentEntries = [...nonFeeEntries, ...mergedFees];
        // Clear and rebuild entries
        entries.length = 0;
        entries.push(...otherInvestmentsEntries, ...finalInvestmentEntries);
      }

      console.log(`Generated ${entries.length} entries. Skipped:`, skipped);

      // Build a set of existing schedule keys for duplicate detection
      const existingKeys = new Set();
      SCHEDULES.forEach(s => {
        const key = `${s.investment_id || s.investment}|${s.due_date || s.dueDate}|${s.payment_type || s.type}|${s.fee_id || ""}`;
        existingKeys.add(key);
      });

      // Filter out duplicates
      const newEntries = [];
      const duplicates = [];
      for (const entry of entries) {
        const key = `${entry.investment_id}|${entry.due_date}|${entry.payment_type}|${entry.fee_id || ""}`;
        if (existingKeys.has(key)) {
          duplicates.push(`${entry.investment_id} / ${entry.due_date} / ${entry.payment_type}${entry.fee_id ? ` / ${entry.fee_id}` : ""}`);
        } else {
          newEntries.push(entry);
          existingKeys.add(key); // prevent duplicate within same batch
        }
      }

      if (newEntries.length === 0 && entries.length > 0) {
        const lines = ["No new schedules were generated — all schedules already exist."];
        if (skipped.length > 0) lines.push(`Skipping investments: ${skipped.join(", ")}`);
        lines.push(`Duplicate schedules skipped: ${duplicates.length}`);
        setGenResult({ title: "No New Schedules", lines });
      } else if (newEntries.length === 0) {
        const lines = ["No entries were generated."];
        if (selected.length > 0 && skipped.length === selected.length) {
          lines.push("All selected investments were skipped. Please ensure they have a valid Amount, Start Date, and Maturity Date.");
        } else if (skipped.length > 0) {
          lines.push(`Skipping investments: ${skipped.join(", ")}`);
        }
        setGenResult({ title: "No Entries", lines });
      } else {
        console.log("Saving entries to:", schedulePath);
        for (const entry of newEntries) {
          await addDoc(collection(db, schedulePath), entry);
        }
        setSel(new Set());
        const lines = [`Successfully generated ${newEntries.length} schedule entries for ${selected.length} investment(s).`];
        if (duplicates.length > 0) {
          lines.push(`${duplicates.length} schedule(s) already existed and were skipped.`);
        }
        setGenResult({ title: "Generation Complete", lines });
      }
    } catch (err) {
      console.error("Generate schedules error:", err);
      setGenResult({ title: "Error", lines: ["Error generating schedules:", String(err.message || err)] });
    } finally {
      setGenerating(false);
    }
  };
  const setF = (k, v) => setModal(m => {
    const next = { ...m, data: { ...m.data, [k]: v } };
    // When deal changes in "add" mode, default start/maturity to deal dates
    if (k === "deal" && m.mode === "add") {
      const deal = DEALS.find(p => p.name === v);
      if (deal) {
        next.data.start_date = deal.startDate || next.data.start_date;
        next.data.maturity_date = deal.endDate || next.data.maturity_date;
        if (deal.startDate && deal.endDate) {
          const s = new Date(deal.startDate); const e = new Date(deal.endDate);
          if (!isNaN(s) && !isNaN(e)) next.data.term_months = String((e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth());
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
  const selectedContact = CONTACTS.find(p => p.name === modal.data.party);
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

  // AG Grid: Chip filtering (pre-filter data before passing to grid)
  const getFilteredData = () => {
    return INVESTMENTS.filter(c => {
      if (chip === "Deposit" && (c.type || "").toUpperCase() !== "DEPOSIT") return false;
      if (chip === "Disbursement" && (c.type || "").toUpperCase() !== "DISBURSEMENT") return false;
      if (chip === "Active" && c.status !== "Active") return false;
      return true;
    });
  };

  const filtered = getFilteredData();

  // AG Grid: Column definitions
  const permissions = { canUpdate, canDelete };
  const columnDefs = useMemo(() => {
    return getColumnDefs(permissions, isDark, t, sel, toggleRow, toggleAll, filtered.length);
  }, [permissions, isDark, t, sel, filtered.length]);

  // AG Grid: Context for cell renderers
  const context = useMemo(() => ({
    isDark,
    t,
    permissions,
    selection: sel,
    feesData: FEES_DATA,
    callbacks: {
      onEdit: openEdit,
      onDelete: (target) => setDelT({ id: target.id, name: target.id, docId: target.docId }),
      onDrillDown: (investment) => setDrillInvestment(investment),
      onToggleRow: toggleRow,
      onToggleAll: toggleAll
    }
  }), [isDark, t, permissions, sel, FEES_DATA]);
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Investments</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage investments</p></div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {sel.size > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.surfaceBorder}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{sel.size} selected</span>

          {canUpdate && <>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 7, border: `1px solid ${t.surfaceBorder}`, background: t.searchBg, color: t.searchText, cursor: "pointer" }}>
              <option value="">Update status...</option>
              {investmentStatusOpts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => handleBulkStatus(bulkStatus)} disabled={!bulkStatus} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: bulkStatus ? t.accentGrad : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"), color: bulkStatus ? "#fff" : t.textMuted, border: "none", cursor: bulkStatus ? "pointer" : "default" }}>Apply</button>
          </>}

          {canUpdate && canDelete && <div style={{ width: 1, height: 20, background: t.surfaceBorder }} />}

          {canDelete && <button onClick={handleBulkDelete} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "#FECACA"}`, cursor: "pointer" }}>Delete ({sel.size})</button>}
        </div>}
        {canGenerate && <button className="success-btn" onClick={handleGenerate} disabled={sel.size === 0} style={{ background: t.successGrad, color: "#fff", padding: "11px 20px", borderRadius: 11, fontSize: 13, fontWeight: 600, boxShadow: `0 4px 16px ${t.successShadow}`, display: "flex", alignItems: "center", gap: 6, opacity: sel.size === 0 ? 0.45 : 1 }}>▤ Generate{sel.size > 0 ? ` (${sel.size})` : ""}</button>}
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
        {sel.size > 0 && <><div style={{ width: 1, height: 18, background: t.surfaceBorder, marginLeft: 4 }} /><span onClick={() => setSel(new Set())} style={{ fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20, background: isDark ? "rgba(248,113,113,0.12)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.25)" : "#FECACA"}`, cursor: "pointer" }}>Clear</span></>}
      </div>
    </div>

    <div
      className={`ag-theme-custom ${isDark ? 'dark-mode' : 'light-mode'}`}
      style={{ height: 'calc(100vh - 520px)', minHeight: '500px' }}
    >
      <AgGridReact
        ref={gridRef}
        rowData={filtered}
        columnDefs={columnDefs}
        context={context}
        animateRows={true}
        pagination={true}
        paginationPageSize={pageSize}
        suppressPaginationPanel={true}
        suppressCellFocus={true}
        onColumnResized={(event) => {
          if (event.finished) {
            const columnState = event.api.getColumnState();
            localStorage.setItem('investmentsColumnState', JSON.stringify(columnState));
          }
        }}
        onGridReady={(params) => {
          const savedState = localStorage.getItem('investmentsColumnState');
          if (savedState) {
            params.api.applyColumnState({
              state: JSON.parse(savedState),
              applyOrder: false
            });
          }
        }}
      />
    </div>

    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textMuted }}>Showing <strong style={{ color: t.textSecondary }}>{Math.min(filtered.length, pageSize)}</strong> of <strong style={{ color: t.textSecondary }}>{filtered.length}</strong> investments{sel.size > 0 && <span style={{ color: t.accent, marginLeft: 8 }}>· {sel.size} selected</span>}</span><Pagination totalPages={Math.ceil(filtered.length / pageSize)} currentPage={1} onPageChange={(newPage) => gridRef.current?.api.paginationGoToPage(newPage - 1)} t={t} /></div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Investment" : "Edit Investment"} onSave={handleSaveInvestment} width={620} t={t} isDark={isDark}>
      {(modal.mode === "edit" || (modal.mode === "add" && modal.data.id)) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Investment ID" t={t}>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.id}</div>
          </FF>
          <FF label="Deal ID" t={t}>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.deal_id}</div>
          </FF>
        </div>
      )}
      <FF label="Deal" t={t}><FSel value={modal.data.deal} onChange={e => setF("deal", e.target.value)} options={DEALS.map(p => p.name)} t={t} /></FF>
      <FF label="Contact" t={t}><FSel value={modal.data.party} onChange={e => setF("party", e.target.value)} options={CONTACTS.map(p => p.name)} t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <FF label="Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={getTypeOpts()} t={t} /></FF>
        <FF label="Amount" t={t}><FIn value={modal.data.amount} onChange={e => setF("amount", e.target.value)} placeholder="$0" t={t} /></FF>
        <FF label="Rate" t={t}><FIn value={modal.data.rate} onChange={e => setF("rate", e.target.value)} placeholder="10%" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <FF label="Frequency" t={t}><FSel value={modal.data.freq} onChange={e => setF("freq", e.target.value)} options={["Monthly", "Quarterly", "Semi-Annual", "Annual", "At Maturity"]} t={t} /></FF>
        <FF label="Term (months)" t={t}><FIn value={modal.data.term_months || ""} onChange={e => setF("term_months", e.target.value)} placeholder="e.g. 24" t={t} /></FF>
        <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={["Open", "Active", "Closed"]} t={t} /></FF>
      </div>
      <FF label="Calculator" t={t}><FSel value={modal.data.calculator || ""} onChange={e => setF("calculator", e.target.value)} options={calculatorOpts} t={t} /></FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Start Date" t={t}><FIn value={modal.data.start_date || ""} onChange={e => setF("start_date", e.target.value)} t={t} type="date" /></FF>
        <FF label="Maturity Date" t={t}><FIn value={modal.data.maturity_date || ""} onChange={e => setF("maturity_date", e.target.value)} t={t} type="date" /></FF>
      </div>
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
                  <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                  {f.name}
                  <span style={{ fontFamily: t.mono, fontSize: 10.5, opacity: 0.7 }}>({f.rate})</span>
                </div>
              );
            })}
          </div>
        </FF>
      )}
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteInvestment} label="This investment" t={t} isDark={isDark} />
    <Modal open={!!genConfirm} onClose={() => setGenConfirm(null)} title="Confirm Generate" onSave={executeGenerate} saveLabel="Generate" t={t} isDark={isDark}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "8px 0" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF", border: `1px solid ${isDark ? "rgba(96,165,250,0.25)" : "#BFDBFE"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: isDark ? "#60A5FA" : "#2563EB" }}>▤</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 8 }}>Generate Payment Schedules?</div>
          <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>This will generate payment schedules for {genConfirm?.count || 0} investment(s).</div>
        </div>
      </div>
    </Modal>
    {generating && <>
      <style>{`@keyframes cfm-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, background: isDark ? "rgba(30,30,40,0.95)" : "#fff", padding: "40px 52px", borderRadius: 18, boxShadow: "0 8px 40px rgba(0,0,0,0.3)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}` }}>
          <div style={{ width: 44, height: 44, border: `4px solid ${isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}`, borderTopColor: isDark ? "#60A5FA" : "#3B82F6", borderRadius: "50%", animation: "cfm-spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917", letterSpacing: "0.2px" }}>Payment Schedule Generation In Progress...</span>
          <span style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "#9CA3AF" }}>Please wait while schedules are being created</span>
        </div>
      </div>
    </>}
    <Modal open={!!genResult} onClose={() => setGenResult(null)} title={genResult?.title || "Result"} onSave={() => setGenResult(null)} saveLabel="OK" t={t} isDark={isDark}>
      <div style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {(genResult?.lines || []).map((line, i) => (
          <div key={i} style={{ fontSize: 13.5, color: i === 0 ? (isDark ? "#fff" : "#1C1917") : t.textMuted, lineHeight: 1.6, fontWeight: i === 0 ? 600 : 400 }}>{line}</div>
        ))}
      </div>
    </Modal>
    {drillInvestment && (
      <Modal open={!!drillInvestment} onClose={() => setDrillInvestment(null)} title="Investment Summary" saveLabel="OK" onSave={() => setDrillInvestment(null)} width={580} t={t} isDark={isDark}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px", padding: "10px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Investment ID / Deal ID</span>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: t.mono }}>{drillInvestment.investment_id || drillInvestment.id}</span>
              <span style={{ color: t.surfaceBorder }}>|</span>
              <span style={{ fontFamily: t.mono, color: t.idText }}>{drillInvestment.deal_id || "—"}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Status</span>
            <div>{drillInvestment.status ? <Bdg status={drillInvestment.status} isDark={isDark} /> : "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Deal Name</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C" }}>{drillInvestment.deal_name || drillInvestment.deal || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Contact Name</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{drillInvestment.party_name || drillInvestment.party || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Amount</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#60A5FA" : "#2563EB", fontFamily: t.mono }}>{drillInvestment.amount || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Interest Rate / Frequency</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", fontWeight: 500 }}>{drillInvestment.interest_rate || drillInvestment.rate || "—"} / {drillInvestment.payment_frequency || drillInvestment.freq || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Term (months)</span>
            <div style={{ fontSize: 13, color: isDark ? "#fff" : "#1C1917", fontWeight: 600 }}>{drillInvestment.term_months ? `${drillInvestment.term_months} Months` : "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Investment Type</span>
            <div style={{ fontSize: 13, color: isDark ? "#fff" : "#1C1917", fontWeight: 600 }}>{drillInvestment.investment_type || drillInvestment.type || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Start Date</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", fontFamily: t.mono }}>{drillInvestment.start_date || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Maturity Date</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", fontFamily: t.mono }}>{drillInvestment.maturity_date || "—"}</div>
          </div>
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Applicable Fees</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(() => {
                const fids = String(drillInvestment.fees || drillInvestment.feeIds || "").split(",").filter(Boolean);
                return fids.length > 0 ? fids.map(fid => {
                  const f = FEES_DATA.find(x => x.id === fid);
                  return <span key={fid} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: isDark ? "rgba(52,211,153,0.12)" : "#ECFDF5", color: isDark ? "#34D399" : "#059669", border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#A7F3D0"}` }}>{f?.name || fid} {f?.rate ? `(${f.rate})` : ""}</span>;
                }) : <span style={{ fontSize: 12, color: t.textMuted, fontStyle: "italic" }}>No applicable fees</span>;
              })()}
            </div>
          </div>
        </div>
      </Modal>
    )}
  </>);
}

import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from "../components/TanStackTable";
import { getScheduleColumns } from "../components/ScheduleTanStackConfig";

import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData, badge, initials, av, pmtCalculator_ACT360_30360, getFeeFrequencyString, normalizeDateAtNoon, mkId } from "../utils";
import { StatCard, Bdg, Pagination, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";

const fmtCurr = v => {
  if (v == null || v === "") return "";
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  if (isNaN(n)) return String(v);
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ZEROING_STATUSES = ["Missed", "Cancelled", "VOID", "WAIVED", "REPLACED"];

export default function PageSchedule({ t, isDark, SCHEDULES = [], INVESTMENTS = [], CONTACTS = [], DEALS = [], DIMENSIONS = [], FEES_DATA = [], USERS = [], collectionPath = "" }) {

  const { user, hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_CREATE");
  const canDelete = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_DELETE");
  const canUpdate = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_UPDATE");
  const getNextScheduleId = () => mkId("S");
  const paymentStatusOpts = (DIMENSIONS.find(d => d.name === "ScheduleStatus" || d.name === "Schedule Status") || {}).items || ["Due", "Paid", "Partial", "Missed", "Cancelled"];
  const [hov, setHov] = useState(null); const [sel, setSel] = useState(new Set()); const [chip, setChip] = useState("All");
  const [showHistory, setShowHistory] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { title, message, onConfirm }
  const [drillSchedule, setDrillSchedule] = useState(null);
  const [drillInvestment, setDrillInvestment] = useState(null);
  const [drillFee, setDrillFee] = useState(null);
  const [detailContact, setDetailContact] = useState(null);
  const buildChain = (scheduleId) => {
    const visited = new Set();
    const chain = [];
    // Walk backward to find the root original
    let current = SCHEDULES.find(s => s.schedule_id === scheduleId);
    while (current && !visited.has(current.schedule_id)) {
      visited.add(current.schedule_id);
      chain.unshift(current);
      if (current.linked) {
        const parent = SCHEDULES.find(s => s.schedule_id === current.linked);
        if (parent && !visited.has(parent.schedule_id)) { current = parent; } else break;
      } else break;
    }
    // Walk forward to find replacements
    let lastId = chain[chain.length - 1]?.schedule_id;
    let safety = 0;
    while (lastId && safety++ < 50) {
      const child = SCHEDULES.find(s => s.linked === lastId && !visited.has(s.schedule_id));
      if (child) { visited.add(child.schedule_id); chain.push(child); lastId = child.schedule_id; }
      else break;
    }
    return chain.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  };
  const hasLink = (s) => s.linked || SCHEDULES.some(x => x.linked === s.schedule_id);
  const [sort, setSort] = useState({ key: "dueDate", direction: "asc" });
  const [page, setPage] = useState(1);
  const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const openAdd = () => {
    const sId = getNextScheduleId();
    setModal({
      open: true, mode: "add", data: {
        schedule_id: sId,
        version_num: 1,
        version_id: `${sId}-V1`,
        payment_id: sId,
        active_version: true,
        investment: "",
        dueDate: "",
        type: "Interest",
        payment: "",
        status: "Due",
        notes: "New Manual Schedule ",
        fee_ids: [],
        basePayment: 0
      }
    });
  };
  const openEdit = r => {
    const fee_ids = r.fee_id ? String(r.fee_id).split(",").filter(Boolean) : [];
    let basePayment = 0;
    let partialPaid = "";
    if (r.linked) {
      const orig = SCHEDULES.find(s => s.schedule_id === r.linked);
      if (orig) basePayment = Math.abs(Number(String(orig.payment || 0).replace(/[^0-9.-]/g, "")));
    }
    // For standard schedules, the base is the current payment minus any already selected fees (approximated or just current payment)
    if (!basePayment) {
      basePayment = Math.abs(Number(String(r.payment || 0).replace(/[^0-9.-]/g, "")));
    }

    const noteMatch = (r.notes || "").match(/replacement for.*\$(\d+(\.\d+)?)/i);
    if (noteMatch) {
      const extracted = Number(noteMatch[1]);
      if (!basePayment) basePayment = extracted;
      const isP = (r.notes || "").toLowerCase().includes("partial");
      if (isP && basePayment > extracted) partialPaid = String(basePayment - extracted);
    }
    const applied_to = r.applied_to || (fee_ids[0] ? (FEES_DATA.find(f => f.id === fee_ids[0])?.applied_to || "") : "");
    const zeroing = ["Missed", "Cancelled", "VOID", "WAIVED", "REPLACED"];
    let modalData = { ...r, fee_ids, basePayment, partialPaid, applied_to, originalStatus: r.status };
    if (zeroing.includes(r.status)) {
      modalData.payment = "$0.00";
      modalData.signed_payment_amount = "$0.00";
    }
    setModal({ open: true, mode: "edit", data: modalData });
  };

  const recalcReplacement = (currentData, newFeeIds, newPartialPaid = null) => {
    const noteLower = (currentData.notes || "").toLowerCase();
    const isP = noteLower.includes("partial") || modal.mode === "add_partial";
    const isL = noteLower.includes("late") || noteLower.includes("missed") || noteLower.includes("cancelled") || noteLower.includes("replacement") || modal.mode === "add_late";
    const linkedId = currentData.linked || "";

    // Fallback to current typed payment if basePayment is missing to prevent reset to $0
    const rawTyping = String(currentData.payment || "").replace(/[^0-9.-]/g, "");
    const baseAmt = currentData.basePayment !== undefined ? currentData.basePayment : (Number(rawTyping) || 0);
    const paidVal = newPartialPaid !== null ? newPartialPaid : (currentData.partialPaid || "");
    const paidNum = Number(String(paidVal).replace(/[^0-9.]/g, "")) || 0;
    let unpaid = isP ? Math.max(baseAmt - paidNum, 0) : baseAmt;

    // For FEE payment types, the payment amount is the sum of fees only (no base payment)
    const isFeePaymentType = (currentData.payment_type || currentData.type || "").toUpperCase() === "FEE";
    if (isFeePaymentType && newFeeIds.length > 0) {
      unpaid = 0;
    }

    // Find the related investment for this schedule entry
    // Check multiple possible field names: investment_id, investment, investmentId
    const investmentIdField = currentData.investment_id || currentData.investment || currentData.investmentId;
    const relatedInvestment = INVESTMENTS.find(c =>
      c.id === investmentIdField ||
      c.investment_id === investmentIdField ||
      c.investmentId === investmentIdField ||
      (c.investment_id && String(c.investment_id).toLowerCase() === String(investmentIdField).toLowerCase()) ||
      (c.id && String(c.id).toLowerCase() === String(investmentIdField).toLowerCase())
    );
    const investmentCalculator = relatedInvestment?.calculator || "ACT/360+30/360";
    const investmentStartDate = relatedInvestment?.start_date || currentData.term_start;

    const feeAmts = newFeeIds.map(fid => {
      const fee = FEES_DATA.find(ff => ff.id === fid);
      if (!fee) return 0;


      let unsignedAmt = 0;

      // Infer fee frequency if not set
      // If fee_charge_at is Investment_Start/Investment_End, treat as One_Time
      // Otherwise, treat as Recurring
      let feeFrequency = fee.fee_frequency || fee.frequency; // Check both field names
      if (!feeFrequency) {
        const chargeAt = (fee.fee_charge_at || "").toLowerCase();
        if (chargeAt.includes("investment_start") || chargeAt.includes("investment_end")) {
          feeFrequency = "One_Time";
        } else {
          feeFrequency = "Recurring";
        }
      }

      // Use investment's calculator and frequency for recurring fees
      const isRecurring = feeFrequency === "Recurring";
      const hasDates = !!(currentData.term_start && currentData.term_end);

      if (isRecurring && hasDates) {
        const rateNum = Number(String(fee.rate).replace(/[^0-9.]/g, "")) || 0;

        // Check if this is a Fixed Amount fee
        if (fee.method === "Fixed Amount") {
          // For Fixed Amount fees, just use the rate value directly
          unsignedAmt = rateNum;
        } else {
          // For Percentage fees, calculate based on the period and basis amount
          // Determine the basis amount based on applied_to field
          const appliedTo = (fee.applied_to || "").toLowerCase();
          let basisAmt = Math.abs(unpaid); // Default to payment amount

          if (appliedTo.includes("principal")) {
            const principalAmt = Number(String(currentData.principal_amount || "").replace(/[^0-9.-]/g, "")) || 0;
            basisAmt = Math.abs(principalAmt);
          }

          const periodStart = normalizeDateAtNoon(currentData.term_start);
          const periodEnd = normalizeDateAtNoon(currentData.term_end);
          const investDate = normalizeDateAtNoon(investmentStartDate);

          if (investmentCalculator === "ACT/360+30/360") {
            const feeFreqStr = getFeeFrequencyString(fee.fee_charge_at);
            unsignedAmt = pmtCalculator_ACT360_30360(periodStart, periodEnd, investDate, basisAmt, rateNum / 100, feeFreqStr);
          } else {
            // Use simple calculation: basis * (rate / 360) * 90
            unsignedAmt = basisAmt * (rateNum / 100 / 360) * 90;
          }
        }
      } else {
        // For one-time fees or when period dates not available, use simple calculation
        const rateNum = Number(String(fee.rate).replace(/[^0-9.]/g, "")) || 0;

        // Determine the basis amount for percentage calculation
        let basisForCalc = Math.abs(unpaid);
        const appliedTo = (fee.applied_to || "").toLowerCase();

        if (appliedTo.includes("principal")) {
          // Use principal amount for fees applied to principal
          const principalAmt = Number(String(currentData.principal_amount || "").replace(/[^0-9.-]/g, "")) || 0;
          basisForCalc = Math.abs(principalAmt);
        }

        unsignedAmt = fee.method === "Fixed Amount" ? rateNum : basisForCalc * rateNum / 100;
      }

      // Apply fee's direction: IN fees are positive (added), OUT fees are negative (subtracted)
      const feeDir = fee.direction || "IN";
      const finalAmt = feeDir === "OUT" ? -unsignedAmt : unsignedAmt;
      return finalAmt;
    });


    const totalFees = feeAmts.reduce((a, b) => a + b, 0);
    const absBase = Math.abs(unpaid);
    // For FEE payment types, final amount is just the sum of fees (no base payment)
    const finalAmtAbs = isFeePaymentType && newFeeIds.length > 0 ? Math.abs(totalFees) : Math.abs(absBase + totalFees);
    const dir = currentData.direction;

    // Rule 1: Signed Amount = -1 * Payment Amount
    // Rule 2: IN direction: Signed (+), Payment (-)
    // Rule 3: OUT direction: Signed (-), Payment (+)
    const signedAmt = (dir === "IN") ? finalAmtAbs : -finalAmtAbs;
    const paymentAmt = -signedAmt;

    let notes = (currentData.notes || "");
    if (linkedId && (isP || isL)) {
      // Logic for Replacement Schedules
      let prefix = isP ? "Partial payment replacement for" : "Late payment replacement for";
      if (isL && noteLower.includes("cancelled")) {
        prefix = "Cancelled payment replacement for";
      } else if (isL && noteLower.includes("missed")) {
        prefix = "Missed payment replacement for";
      } else if (isL && noteLower.includes("replacement") && !noteLower.includes("late")) {
        prefix = "Replacement payment for";
      }

      if (newFeeIds.length === 0) {
        notes = `${prefix} ${linkedId}${isP ? `. Unpaid: ${fmtCurr(unpaid)}` : ""}`;
      } else {
        const parts = [fmtCurr(unpaid)];
        feeAmts.forEach(a => {
          if (a >= 0) parts.push(`+ ${fmtCurr(a)}`);
          else parts.push(`- ${fmtCurr(Math.abs(a))}`);
        });
        notes = `${prefix} ${linkedId} | Fee Breakdown: ${parts.join(" ")} = ${fmtCurr(finalAmtAbs)}`;
      }
    } else {
      // Logic for Standard Schedules (General fee addition)
      // Strip old breakdown if exists to avoid doubling up
      let cleanNote = notes;
      // Handle both formats: " | Fee Breakdown:" (with prefix) and "Fee Breakdown:" (at start)
      if (cleanNote.includes(" | Fee Breakdown:")) {
        cleanNote = cleanNote.split(" | Fee Breakdown:")[0];
      } else if (cleanNote.startsWith("Fee Breakdown:")) {
        cleanNote = "";
      }

      if (newFeeIds.length > 0) {
        // Build detailed breakdown with calculation info for each fee
        const stepParts = newFeeIds.map((fid, i) => {
          const fee = FEES_DATA.find(ff => ff.id === fid);
          const feeAmt = feeAmts[i]; // Keep the sign (positive for IN, negative for OUT)
          const absAmt = Math.abs(feeAmt);

          if (!fee) return feeAmt >= 0 ? `+${fmtCurr(absAmt)}` : `-${fmtCurr(absAmt)}`;

          const method = fee.method || "Fixed Amount";
          const rate = fee.rate || "0";
          const sign = feeAmt >= 0 ? "+" : "-";

          if (method === "% of Amount") {
            // Determine the correct basis amount for this specific fee
            const appliedTo = fee.applied_to || "Principal Amount";
            let basisAmt = Math.abs(unpaid);

            if (appliedTo.toLowerCase().includes("principal")) {
              const principalAmt = Number(String(currentData.principal_amount || "").replace(/[^0-9.-]/g, "")) || 0;
              basisAmt = Math.abs(principalAmt);
            }

            return `${sign}${rate}% of ${fmtCurr(basisAmt)} (${appliedTo}) = ${sign}${fmtCurr(absAmt)}`;
          }
          return `${sign}Fixed amount of ${fmtCurr(absAmt)}`;
        });

        // Calculate the signed total (sum of fees with their signs)
        const signedTotal = totalFees;

        let breakdown;
        if (stepParts.length === 1) {
          breakdown = `Fee Breakdown: ${stepParts[0]}`;
        } else {
          breakdown = `Fee Breakdown: ${stepParts.map(p => `[${p}]`).join(" ")} = ${fmtCurr(Math.abs(signedTotal))}`;
        }

        notes = cleanNote ? `${cleanNote} | ${breakdown}` : breakdown;
      } else {
        notes = cleanNote;
      }
    }

    const updates = { fee_ids: newFeeIds, notes, signed_payment_amount: fmtCurr(signedAmt), basePayment: baseAmt };

    // Status-based zeroing override
    if (ZEROING_STATUSES.includes(currentData.status)) {
      updates.signed_payment_amount = "$0.00";
      // We preserve updates.payment (intended amount) for the Schedule Chain display
      // even if the cashflow (signed amount) is zeroed out.
    } else {
      if (currentData.isTyping !== "payment") {
        updates.payment = fmtCurr(paymentAmt);
      }
    }

    if (currentData.isTyping !== "partialPaid") {
      updates.partialPaid = paidVal;
    }
    return updates;
  };
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleUndo = async (s) => {
    if (!s) return;

    const isVersioned = Number(s.version_num || 1) > 1;
    const isReplacement = !!s.linked;
    const hasSnapshot = !!s._undo_snapshot;

    if (!isVersioned && !isReplacement && !hasSnapshot) return;

    // Check if this schedule has a subsequent linked schedule (e.g. from replacement workflow)
    const childId = s.linked_schedule_id;
    const childSchedule = childId ? SCHEDULES.find(x => x.schedule_id === childId) : null;

    if (childSchedule && (childSchedule.linked_schedule_id || SCHEDULES.some(x => x.linked === childSchedule.schedule_id))) {
      alert(`Cannot undo ${s.schedule_id} because it has subsequent linked records. Please undo those first.`);
      return;
    }

    let message = `Are you sure you want to undo the last action for ${s.schedule_id}?`;
    let title = "Undo Action";

    if (isVersioned) {
      title = "Revert to Previous Version";
      message = `This will delete current (V${s.version_num}) and reactivate previous version (V${Number(s.version_num) - 1}). Are you sure?`;
    } else if (hasSnapshot) {
      message = `This will restore ${s.schedule_id} to its previous state.`;
    } else if (isReplacement) {
      message = `This will DELETE this replacement schedule (${s.schedule_id}) and revert any links.`;
    }

    setConfirmAction({
      title,
      message,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          console.log("[Undo] Starting for:", s.schedule_id, "mode:", isVersioned ? "Version" : hasSnapshot ? "Snapshot" : "Replacement");
          
          if (isVersioned && s.previous_version_id) {
            // 1. Find the predecessor
            const prev = SCHEDULES.find(x => x.docId === s.previous_version_id || x.version_id === s.previous_version_id);
            if (!prev) {
              console.error("[Undo] Predecessor not found in SCHEDULES for id:", s.previous_version_id);
              alert(`Undo failed: Could not find the previous version (ID: ${s.previous_version_id}) in the local data cache. Please try refreshing.`);
              return;
            }

            console.log("[Undo] Found predecessor:", prev.docId, "Status was:", prev.status);

            // 2. Reactivate the predecessor
            const prevRef = prev._path ? doc(db, prev._path) : doc(db, collectionPath, prev.docId);
            await updateDoc(prevRef, {
              active_version: true,
              status: (prev.status === "REPLACED") ? "Due" : prev.status, 
              updated_at: serverTimestamp()
            });
            console.log("[Undo] Predecessor reactivated:", prev.docId);

            // 3. Delete the current version
            const currRef = s._path ? doc(db, s._path) : doc(db, collectionPath, s.docId);
            await deleteDoc(currRef);
            console.log("[Undo] Current version deleted:", s.docId);
            
            alert(`Succeeded! Reverted ${s.schedule_id} to V${prev.version_num}.`);
          } 
          else if (hasSnapshot) {
            console.log("[Undo] Snapshot-based revert for:", s.docId);
            const ref = s._path ? doc(db, s._path) : doc(db, collectionPath, s.docId);
            await updateDoc(ref, { ...s._undo_snapshot, _undo_snapshot: null, updated_at: serverTimestamp() });
            if (childSchedule && childSchedule.docId) {
              const childRef = childSchedule._path ? doc(db, childSchedule._path) : doc(db, collectionPath, childSchedule.docId);
              await deleteDoc(childRef);
            }
            alert(`Succeeded! Restored ${s.schedule_id} to snapshot state.`);
          } 
          else if (isReplacement) {
            console.log("[Undo] Replacement-based deletion for:", s.docId);
            const ref = s._path ? doc(db, s._path) : doc(db, collectionPath, s.docId);
            await deleteDoc(ref);
            if (s.linked) {
              const p = SCHEDULES.find(x => x.schedule_id === s.linked);
              if (p) {
                const pRef = p._path ? doc(db, p._path) : doc(db, collectionPath, p.docId);
                await updateDoc(pRef, { linked_schedule_id: "", updated_at: serverTimestamp() });
              }
            }
            alert(`Succeeded! Deleted replacement schedule ${s.schedule_id}.`);
          }
        } catch (err) {
          console.error("[Undo] Critical error during undo:", err);
          alert(`Undo failed: ${err.message}`);
        }
      }
    });
  };

  const handleSaveSchedule = async () => {
    const d = modal.data;
    const docRefId = d.docId || d.id;

    const unformat = v => {
      if (v == null || v === "") return null;
      const n = Number(String(v).replace(/[^0-9.-]/g, ""));
      return isNaN(n) ? null : n;
    };

    const payload = {
      schedule_id: d.schedule_id || docRefId || mkId("S"),
      investment_id: d.investment || "",
      deal_id: d.deal_id || "",
      party_id: d.party_id || "",
      due_date: d.dueDate || null,
      payment_type: d.type || "",
      direction_from_company: d.direction || "",
      period_number: d.period_number ? Number(d.period_number) : null,
      principal_amount: unformat(d.principal_amount),
      payment_amount: unformat(d.payment),
      signed_payment_amount: unformat(d.signed_payment_amount),
      fee_id: Array.isArray(d.fee_ids) ? d.fee_ids.join(",") : (d.fee_id || null),
      status: d.status || "Due",
      notes: d.notes || "",
      applied_to: d.applied_to || "",
      term_start: d.term_start || null,
      term_end: d.term_end || null,
      version_num: d.version_num || 1,
      version_id: d.version_id || `${d.schedule_id || docRefId}-V${d.version_num || 1}`,
      payment_id: d.payment_id || d.schedule_id || docRefId,
      original_payment_amount: d.original_payment_amount || d.payment || null,
      active_version: d.active_version !== undefined ? d.active_version : true,
      updated_at: serverTimestamp(),
    };

    // Set original_payment_amount for all schedules (if not already set)
    const original = SCHEDULES.find(x => x.docId === d.docId || x.schedule_id === d.schedule_id);
    if (["add", "add_late", "add_partial"].includes(modal.mode) || (original && !original.original_payment_amount)) {
      // For new schedules or existing ones without original_payment_amount
      let paymentValue = unformat(d.payment);

      // If we are zeroing it out right now, use the previous payment value
      if (modal.mode === "edit" && d._prevPayment) {
        paymentValue = unformat(d._prevPayment);
      }

      // For zeroed schedules, try to get original amount from replacement schedule or basePayment
      if ((!paymentValue || paymentValue === 0) && ZEROING_STATUSES.includes(d.status)) {
        // Try to get from replacement schedule
        const replacement = SCHEDULES.find(s => s.linked === d.schedule_id);
        if (replacement) {
          paymentValue = replacement.basePayment || replacement.payment_amount;
        }
        // Fallback to basePayment from modal data
        if (!paymentValue && d.basePayment) {
          paymentValue = d.basePayment;
        }
      }

      if (paymentValue && paymentValue !== 0) {
        payload.original_payment_amount = paymentValue;
      }
    }

    // Add link fields for replacement schedules
    if (modal.mode === "add_late" || modal.mode === "add_partial") {
      payload.linked_to_parent = d.linked || null; // Backward link to parent
      payload.linked_schedule_id = null; // Forward link (will be set when child is created)
    }

    // Snapshot logic for Undo
    if (modal.mode === "edit") {
      const original = SCHEDULES.find(x => x.docId === d.docId || x.schedule_id === d.schedule_id);
      if (original) {
        // Unformat amounts for Firestore storage
        const unformat = v => {
          if (v == null || v === "") return null;
          const n = Number(String(v).replace(/[^0-9.-]/g, ""));
          return isNaN(n) ? null : n;
        };
        payload._undo_snapshot = {
          status: original.status || "Due",
          signed_payment_amount: unformat(original.signed_payment_amount),
          principal_amount: unformat(original.principal_amount),
          notes: original.notes || "",
          applied_to: original.applied_to || "",
          linked_to_parent: original.linked || null,
          linked_schedule_id: original.linked_schedule_id || null,
          fee_id: original.fee_id || null,
          due_date: original.dueDate || null,
          term_start: original.term_start || null,
          term_end: original.term_end || null,
          payment_type: original.type || null,
          deal_id: original.deal_id || null,
          party_id: original.party_id || null,
          investment_id: original.investment || null,
          period_number: original.period_number ? Number(original.period_number) : null,
        };
      }
    }

    // Calculate next term due date based on investment frequency
    const getNextTermDate = (currentDueDate, investmentId) => {
      if (!currentDueDate) return "";
      const investment = INVESTMENTS.find(c => c.id === investmentId);
      const freq = investment ? (investment.freq || "").toLowerCase() : "";
      let monthsToAdd = 1;
      if (freq.includes("quart")) monthsToAdd = 3;
      else if (freq.includes("semi")) monthsToAdd = 6;
      else if (freq.includes("annu") || freq.includes("year")) monthsToAdd = 12;

      const dt = new Date(currentDueDate + "T12:00:00");
      if (isNaN(dt.getTime())) return "";
      const origDay = dt.getDate();
      const isMonthEnd = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate() === origDay;

      // Calculate target month and year before adding (to handle overflow correctly)
      const targetMonth = dt.getMonth() + monthsToAdd;
      const targetYear = dt.getFullYear() + Math.floor(targetMonth / 12);
      const targetMonthIndex = targetMonth % 12;

      dt.setMonth(dt.getMonth() + monthsToAdd);

      if (isMonthEnd) {
        // Set to last day of TARGET month, not overflowed month (e.g. Mar 31 + 3mo = Jun 30, not Jul 31)
        dt.setFullYear(targetYear);
        dt.setMonth(targetMonthIndex);
        dt.setDate(new Date(targetYear, targetMonthIndex + 1, 0).getDate());
      } else if (dt.getDate() !== origDay) {
        // Handle month overflow (e.g. Jan 31 -> Feb 28)
        dt.setDate(0);
      }
      return dt.toISOString().split("T")[0];
    };

    const getNextDay = (dateStr) => {
      if (!dateStr) return "";
      const dt = new Date(dateStr + "T12:00:00");
      if (isNaN(dt.getTime())) return "";
      dt.setDate(dt.getDate() + 1);
      return dt.toISOString().split("T")[0];
    };

    // Missed Payment Workflow (only Missed now, Cancelled removed)
    if (modal.mode === "edit" && d.status === "Missed" && d.status !== d.originalStatus) {
      setConfirmAction({
        title: "Replacement Schedule",
        message: `Do you want to set "Missed" payment and book a replacement schedule?`,
        onConfirm: async () => {
          setConfirmAction(null);
          try {
            // Get original payment amount from original_payment_amount field or current payment
            const originalSchedule = SCHEDULES.find(x => x.docId === d.docId || x.schedule_id === d.schedule_id);
            const rawOrigAmt = originalSchedule?.original_payment_amount ||
              originalSchedule?.payment_amount ||
              originalSchedule?.payment || d.payment || 0;
            const origPaymentNum = Math.abs(Number(String(rawOrigAmt).replace(/[^0-9.-]/g, "")));
            const formattedOrigAmt = `$${origPaymentNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const ref = d._path ? doc(db, d._path) : doc(db, collectionPath, docRefId);
            
            // Replaces updateDoc with Versioning logic
            const newVersionNum = Number(d.version_num || 1) + 1;
            await addDoc(ref.parent, {
              ...payload,
              version_num: newVersionNum,
              version_id: `${payload.schedule_id}-V${newVersionNum}`,
              active_version: true,
              previous_version_id: d.version_id || docRefId,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
              updated_by: user?.uid || "system"
            });
            await updateDoc(ref, { 
              active_version: false, 
              status: "REPLACED", 
              replaced_at: serverTimestamp(),
              replaced_by: user?.uid || "system",
              updated_at: serverTimestamp() 
            });

            const lateId = getNextScheduleId();
            const nextDueDate = getNextTermDate(d.dueDate, d.investment);
            const initialData = {
              ...d,
              schedule_id: lateId,
              linked: d.schedule_id,
              fee_ids: [],
              status: "Due",
              dueDate: nextDueDate,
              term_start: getNextDay(d.dueDate),
              term_end: nextDueDate,
              basePayment: Math.abs(origPaymentNum),
              payment_amount: originalSchedule?.payment_amount || originalSchedule?.original_payment_amount || d.payment || "$0.00",
              original_payment_amount: originalSchedule?.original_payment_amount || originalSchedule?.payment_amount || d.payment || "$0.00",
              notes: `Missed payment replacement for ${d.schedule_id} ${formattedOrigAmt}`,
            };
            const updates = recalcReplacement(initialData, []);
            setModal({
              open: true,
              mode: "add_late",
              originalDocId: d.docId,
              data: { ...initialData, ...updates }
            });
            if (modal.mode === "edit" || modal.mode === "add_late" || modal.mode === "add_partial") {
              const tenantPath = ref.path.split('/paymentSchedules')[0];
              const ledgerRef = collection(db, tenantPath, 'ledger');
              await addDoc(ledgerRef, {
                entity_type: "Schedule",
                entity_id: d.schedule_id,
                amount: payload.payment_amount,
                currency: "USD",
                notes: `Schedule ${d.schedule_id} ${modal.mode === "edit" ? "updated" : "replacement created"} - Status: ${payload.status}`,
                created_at: serverTimestamp(),
                user_id: user?.uid || "system"
              });
            }
            alert(`Missed status versioned to V${newVersionNum}. Now booking replacement...`);
          } catch (err) { 
            console.error("Save schedule error:", err);
            alert(`Workflow failed: ${err.message}`);
          }
        }
      });
      return;
    }

    // Partial Payment Workflow
    if (modal.mode === "edit" && d.status === "Partial" && d.status !== d.originalStatus) {
      setConfirmAction({
        title: "Partial Replacement",
        message: `Do you want to set "Partial" payment and book a partial replacement schedule?`,
        onConfirm: async () => {
          setConfirmAction(null);
          try {
            // Get original payment amount from original_payment_amount field or current payment
            const originalSchedule = SCHEDULES.find(x => x.docId === d.docId || x.schedule_id === d.schedule_id);
            const rawOrigAmt = originalSchedule?.original_payment_amount ||
              originalSchedule?.payment_amount ||
              originalSchedule?.payment || d.payment || 0;
            const origPaymentNum = Math.abs(Number(String(rawOrigAmt).replace(/[^0-9.-]/g, "")));
            const formattedOrigAmt = `$${origPaymentNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const ref = d._path ? doc(db, d._path) : doc(db, collectionPath, docRefId);

            // Replaces updateDoc with Versioning logic
            const newVersionNum = Number(d.version_num || 1) + 1;
            await addDoc(ref.parent, {
              ...payload,
              version_num: newVersionNum,
              version_id: `${payload.schedule_id}-V${newVersionNum}`,
              active_version: true,
              previous_version_id: d.version_id || docRefId,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
              updated_by: user?.uid || "system"
            });
            await updateDoc(ref, { 
              active_version: false, 
              status: "REPLACED", 
              replaced_at: serverTimestamp(),
              replaced_by: user?.uid || "system",
              updated_at: serverTimestamp() 
            });

            const partialId = getNextScheduleId();
            const nextDueDatePartial = getNextTermDate(d.dueDate, d.investment);
            const initialDataPartial = {
              ...d,
              schedule_id: partialId,
              linked: d.schedule_id,
              fee_ids: [],
              status: "Due",
              dueDate: nextDueDatePartial,
              term_start: getNextDay(d.dueDate),
              term_end: nextDueDatePartial,
              partialPaid: "",
              basePayment: Math.abs(origPaymentNum),
              payment_amount: originalSchedule?.payment_amount || originalSchedule?.original_payment_amount || d.payment || "$0.00",
              original_payment_amount: originalSchedule?.original_payment_amount || originalSchedule?.payment_amount || d.payment || "$0.00",
              notes: `Partial payment replacement for ${d.schedule_id} ${formattedOrigAmt}`,
            };
            const updatesPartial = recalcReplacement(initialDataPartial, []);
            setModal({
              open: true,
              mode: "add_partial",
              originalDocId: d.docId,
              data: { ...initialDataPartial, ...updatesPartial }
            });
          } catch (err) { console.error("Update partial error:", err); }
        }
      });
      return;
    }

    try {
      if (modal.mode === "edit" && docRefId) {
        // Versioning Logic:
        // Instead of updating the document in place, we create a new version 
        // and mark the old one as "replaced" and inactive.
        
        const oldRef = d._path ? doc(db, d._path) : doc(db, collectionPath, docRefId);
        const newVersionNum = Number(d.version_num || 1) + 1;
        
        // 1. Create the new version
        const newPayload = {
          ...payload,
          version_num: newVersionNum,
          version_id: `${payload.schedule_id}-V${newVersionNum}`,
          active_version: true,
          previous_version_id: d.version_id || docRefId,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          updated_by: user?.uid || "system"
        };
        
        // Use the same collection as the predecessor for the new version
        const collectionRef = oldRef.parent;
        await addDoc(collectionRef, newPayload);

        // 2. Mark the old version as replaced and inactive
        await updateDoc(oldRef, { 
          active_version: false, 
          status: "REPLACED", 
          replaced_at: serverTimestamp(),
          replaced_by: user?.uid || "system",
          updated_at: serverTimestamp() 
        });
      } else {
        const docRef = await addDoc(collection(db, collectionPath), { ...payload, created_at: serverTimestamp() });
        // If this was a late payment, link back to original
        if ((modal.mode === "add_late" || modal.mode === "add_partial") && modal.originalDocId) {
          const orig = SCHEDULES.find(s => s.docId === modal.originalDocId);
          const ref = orig && orig._path ? doc(db, orig._path) : doc(db, collectionPath, modal.originalDocId);

          const updates = { linked_schedule_id: payload.schedule_id, updated_at: serverTimestamp() };

          // Sync partial amount back to original schedule
          if (modal.mode === "add_partial" && d.partialPaid) {
            const partialPaidNum = Number(String(d.partialPaid).replace(/[^0-9.]/g, "")) || 0;
            const baseAmt = d.basePayment || 0;
            const unpaidAmt = Math.max(baseAmt - partialPaidNum, 0);
            const dir = orig.direction || d.direction;
            const signedAmt = (dir === "IN") ? partialPaidNum : -partialPaidNum;
            updates.signed_payment_amount = signedAmt;
            updates.notes = `partial amount of ${fmtCurr(partialPaidNum)} paid and partial unpaid amount of ${fmtCurr(unpaidAmt)} will be scheduled`;
          }

          await updateDoc(ref, updates);
        }
      }
    } catch (err) {
      console.error("Failed to save schedule:", err);
      alert(`Failed to save schedule: ${err.message || 'Unknown error'}`);
    }
    close();
  };

  const handleDeleteSchedule = async () => {
    console.log("[DELETE] delT:", JSON.stringify(delT));
    console.log("[DELETE] collectionPath:", collectionPath);
    if (!delT || !delT.docId) {
      console.error("[DELETE] ABORTED: missing delT or delT.docId", delT);
      alert("Delete failed: schedule reference is missing. Check console for details.");
      return;
    }
    try {
      const path = delT._path || `${collectionPath}/${delT.docId}`;
      console.log("[DELETE] Deleting doc at path:", path);
      const ref = delT._path ? doc(db, delT._path) : doc(db, collectionPath, delT.docId);
      await deleteDoc(ref);
      console.log("[DELETE] deleteDoc succeeded for:", path);
      // Then clean up linked parent (non-blocking)
      try {
        const s = SCHEDULES.find(x => x.docId === delT.docId || x.schedule_id === delT.schedule_id);
        if (s && s.linked) {
          const linkedSched = SCHEDULES.find(ls => ls.schedule_id === s.linked);
          if (linkedSched) {
            const lRef = linkedSched._path ? doc(db, linkedSched._path) : doc(db, collectionPath, linkedSched.docId);
            await updateDoc(lRef, { linked_schedule_id: "", updated_at: serverTimestamp() });
          }
        }
      } catch (linkErr) { console.error("[DELETE] Failed to unlink parent schedule:", linkErr); }
      setDelT(null);
    } catch (err) {
      console.error("[DELETE] deleteDoc FAILED:", err.code, err.message, err);
      alert(`Delete failed: ${err.code || err.message}. Check browser console (F12) for details.`);
    }
  };
  const [bulkStatus, setBulkStatus] = useState("");
  const handleBulkStatus = (status) => {
    if (!status || sel.size === 0) return;
    setConfirmAction({
      title: "Update Status",
      message: `Are you sure you want to update status to "${status}" for ${sel.size} schedule(s)?`,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await Promise.all([...sel].map(sid => {
            const s = SCHEDULES.find(s => s.schedule_id === sid);
            if (s && s.docId) {
              const ref = s._path ? doc(db, s._path) : doc(db, collectionPath, s.docId);
              return updateDoc(ref, { status, updated_at: serverTimestamp() });
            }
            return Promise.resolve();
          }));
          setSel(new Set()); setBulkStatus("");
        } catch (err) { console.error("Bulk status update error:", err); }
      }
    });
  };
  const handleBulkDelete = () => {
    if (sel.size === 0) return;
    setConfirmAction({
      title: "Delete Schedules",
      message: `Are you sure you want to delete ${sel.size} schedule(s)? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await Promise.all([...sel].map(sid => {
            const s = SCHEDULES.find(s => s.schedule_id === sid);
            if (s && s.docId) {
              const ref = s._path ? doc(db, s._path) : doc(db, collectionPath, s.docId);
              return deleteDoc(ref);
            }
            return Promise.resolve();
          }));
          setSel(new Set());
        } catch (err) {
          console.error("Bulk delete error:", err);
          alert("Failed to delete schedule(s). You may not have permission to perform this action.");
        }
      }
    });
  };
  // AG Grid setup
  const [pageSize, setPageSize] = useState(30);

  // Dynamically calculate page size based on available vertical space
  useEffect(() => {
    const calculatePageSize = () => {
      const rowHeight = 42;
      const headerHeight = 56;
      const viewportHeight = window.innerHeight;
      const gridContainerHeight = viewportHeight - 500; // Adjusted for schedule page layout
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


  // Filter data for AG Grid
  const rowData = useMemo(() => {
    let filtered = SCHEDULES.filter(s => {
      // If history is OFF, only show active versions
      if (!showHistory && s.active_version === false) return false;
      // Status chip filter
      if (chip !== "All" && s.status !== chip) return false;
      return true;
    });

    if (showHistory) {
      // Group by schedule_id, then sort by version_num DESC within each group
      // Keep the active version at the top of its schedule group
      filtered.sort((a, b) => {
        if (a.schedule_id !== b.schedule_id) {
          return a.schedule_id.localeCompare(b.schedule_id);
        }
        // Within same schedule_id group
        if (a.active_version && !b.active_version) return -1;
        if (!a.active_version && b.active_version) return 1;
        return (b.version_num || 0) - (a.version_num || 0);
      });
    }

    return filtered;
  }, [SCHEDULES, showHistory, chip]);

  // Column definitions
  const permissions = { canUpdate, canDelete };
  const context = useMemo(() => ({
    isDark,
    t,
    permissions,
    feesData: FEES_DATA,
    callbacks: {
      hasLink,
      onScheduleClick: setDrillSchedule,
      onLinkedClick: (linkedId) => {
        const linked = SCHEDULES.find(x => x.schedule_id === linkedId);
        if (linked) setDrillSchedule(linked);
      },
      onInvestmentClick: (investmentId) => {
        const investment = INVESTMENTS.find(x => (x.investment_id || x.id) === investmentId);
        if (investment) setDrillInvestment(investment);
      },
      onContactClick: (partyId) => {
        const contact = CONTACTS.find(x => x.id === partyId);
        if (contact) setDetailContact(contact);
      },
      onFeeClick: (feeId) => {
        const fids = String(feeId).split(",").filter(Boolean);
        if (fids.length > 0) {
          const fees = fids.map(id => FEES_DATA.find(x => x.id === id)).filter(Boolean);
          if (fees.length > 0) setDrillFee(fees);
        }
      },
      onEdit: openEdit,
      onDelete: setDelT,
      onUndo: handleUndo
    },
    USERS
  }), [isDark, t, permissions, FEES_DATA, SCHEDULES, INVESTMENTS, CONTACTS, USERS]);

  const columnDefs = useMemo(() => {
    return getScheduleColumns(permissions, isDark, t, context);
  }, [permissions, isDark, t, context]);

  const statsData = [{ label: "Total", value: SCHEDULES.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Due", value: SCHEDULES.filter(s => s.status === "Due").length, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" }, { label: "Paid", value: SCHEDULES.filter(s => s.status === "Paid").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Missed", value: SCHEDULES.filter(s => s.status === "Missed").length, accent: isDark ? "#F87171" : "#DC2626", bg: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2", border: isDark ? "rgba(248,113,113,0.15)" : "#FECACA" }];
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Payment Schedule</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage payment schedules and statuses</p></div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {sel.size > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.surfaceBorder}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{sel.size} selected</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 7, border: `1px solid ${t.surfaceBorder}`, background: t.searchBg, color: t.searchText, cursor: "pointer" }}>
            <option value="">Update status...</option>
            {paymentStatusOpts.filter(s => s !== "Missed" && s !== "Partial").map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => handleBulkStatus(bulkStatus)} disabled={!bulkStatus} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: bulkStatus ? t.accentGrad : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"), color: bulkStatus ? "#fff" : t.textMuted, border: "none", cursor: bulkStatus ? "pointer" : "default" }}>Apply</button>
          <div style={{ width: 1, height: 20, background: t.surfaceBorder }} />
          {canDelete && <button onClick={handleBulkDelete} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "#FECACA"}`, cursor: "pointer" }}>Delete ({sel.size})</button>}
        </div>}
        {canCreate && <Tooltip text="Add a manual payment schedule entry" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Schedule</button></Tooltip>}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>{statsData.map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}</div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{["All", "Due", "Paid", "Missed"].map(f => { const isA = chip === f; return <span key={f} className="filter-chip" onClick={() => setChip(f)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{f}</span>; })}
        {sel.size > 0 && <><div style={{ width: 1, height: 18, background: t.surfaceBorder, marginLeft: 4 }} /><span onClick={() => setSel(new Set())} style={{ fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20, background: isDark ? "rgba(248,113,113,0.12)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.25)" : "#FECACA"}`, cursor: "pointer" }}>Clear</span></>}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>Show Version History</span>
        <div onClick={() => setShowHistory(!showHistory)} style={{ width: 34, height: 18, borderRadius: 20, background: showHistory ? t.accent : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"), position: "relative", cursor: "pointer", transition: "all 0.2s" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: showHistory ? 18 : 2, transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </div>
      </div>
    </div>
    <div style={{ height: "calc(100vh - 430px)", width: "100%" }}>
      <TanStackTable
        data={rowData}
        columns={columnDefs}
        isDark={isDark}
        t={t}
        pageSize={pageSize}
        rowStyle={(data) => {
          if (data.active_version === false) {
            return { 
              opacity: 0.5, 
              background: isDark ? 'rgba(255,255,255,0.01)' : '#F9F8F6',
              fontStyle: 'italic'
            };
          }
          return {};
        }}
        onSelectionChange={(selectedRows) => {
          setSel(new Set(selectedRows.map(r => r.schedule_id)));
        }}
      />
    </div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Schedule Entry" : modal.mode === "add_late" ? "Replacement Payment Schedule" : modal.mode === "add_partial" ? "Partial Payment Schedule" : "Edit Schedule Entry"} onSave={handleSaveSchedule} width={620} t={t} isDark={isDark}>
      {(() => {
        const freeze = [...ZEROING_STATUSES, "Partial"].includes(modal.data.status);
        return (<>
          {modal.mode === "edit" && (
            <FF label="Schedule ID" t={t}>
              <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.schedule_id}</div>
            </FF>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FF label="Investment ID" t={t}><FSel value={modal.data.investment} onChange={e => setF("investment", e.target.value)} options={INVESTMENTS.map(c => c.id)} t={t} disabled={freeze} /></FF>
            <FF label="Deal ID" t={t}><FIn value={modal.data.deal_id || ""} onChange={e => setF("project_id", e.target.value)} placeholder="P10000" t={t} disabled={freeze} /></FF>
            <FF label="Contact ID" t={t}><FIn value={modal.data.party_id || ""} onChange={e => setF("party_id", e.target.value)} placeholder="M10000" t={t} disabled={freeze} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FF label="Due Date" t={t}><FIn value={modal.data.dueDate || ""} onChange={e => setF("dueDate", e.target.value)} t={t} type="date" disabled={freeze} /></FF>
            <FF label="Period Number" t={t}><FIn value={modal.data.period_number || ""} onChange={e => setF("period_number", e.target.value)} placeholder="1" t={t} disabled={freeze} /></FF>
            <FF label="Status" t={t}>
              <FSel value={modal.data.status} onChange={e => {
                const newStatus = e.target.value;
                const oldStatus = modal.data.status;
                const isNewZero = ZEROING_STATUSES.includes(newStatus);
                const isOldZero = ZEROING_STATUSES.includes(oldStatus);

                let updates = { status: newStatus };
                if (isNewZero && !isOldZero) {
                  updates._prevPayment = modal.data.payment;
                  updates._prevSignedAmt = modal.data.signed_payment_amount;
                  updates.payment = "$0.00";
                  updates.signed_payment_amount = "$0.00";
                } else if (!isNewZero && isOldZero) {
                  if (modal.data._prevPayment !== undefined) updates.payment = modal.data._prevPayment;
                  if (modal.data._prevSignedAmt !== undefined) updates.signed_payment_amount = modal.data._prevSignedAmt;
                }

                if (newStatus === "Missed") {
                  updates.notes = "payment is missed so $0 now. Replacement is scheduled.";
                } else if (newStatus === "Cancelled") {
                  updates.notes = "payment is cancelled so $0 now.";
                }
                setModal(m => ({ ...m, data: { ...m.data, ...updates } }));
              }} options={paymentStatusOpts} t={t} />
            </FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FF label="Term Start" t={t}><FIn value={modal.data.term_start || ""} onChange={e => setF("term_start", e.target.value)} t={t} type="date" disabled={freeze} /></FF>
            <FF label="Term End" t={t}><FIn value={modal.data.term_end || ""} onChange={e => setF("term_end", e.target.value)} t={t} type="date" disabled={freeze} /></FF>
            <FF label="Direction" t={t}><FSel value={modal.data.direction} onChange={e => {
              const dir = e.target.value;
              const updates = recalcReplacement({ ...modal.data, direction: dir }, modal.data.fee_ids || []);
              setModal(m => ({ ...m, data: { ...m.data, direction: dir, ...updates } }));
            }} options={["IN", "OUT"]} t={t} disabled={freeze} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
            <FF label="Payment Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={["INVESTOR_PRINCIPAL_DEPOSIT", "INVESTOR_INTEREST_PAYMENT", "INVESTOR_PRINCIPAL_PAYMENT", "BORROWER_PRINCIPAL_RECEIVED", "BORROWER_INTEREST_PAYMENT", "BORROWER_PRINCIPAL_PAYMENT", "FEE"]} t={t} disabled={freeze} /></FF>
            <FF label="Applied To" t={t}><FSel value={modal.data.applied_to || "Principal Amount"} onChange={e => setF("applied_to", e.target.value)} options={["Principal Amount", "Interest Amount", "Total Amount", "Balance"]} t={t} disabled={freeze} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FF label="Payment Amount" t={t}><FIn value={(ZEROING_STATUSES.includes(modal.data.status) && modal.data.payment !== "$0.00") ? "$0.00" : (modal.data.payment || "")} onChange={e => {
              const val = e.target.value;
              const raw = Number(String(val).replace(/[^0-9.-]/g, "")) || 0;
              const base = Math.abs(raw);
              const updates = recalcReplacement({ ...modal.data, payment: val, basePayment: base, isTyping: "payment" }, modal.data.fee_ids || []);
              setModal(m => ({ ...m, data: { ...m.data, payment: val, basePayment: base, ...updates } }));
            }} onBlur={() => {
              const updates = recalcReplacement({ ...modal.data, isTyping: false }, modal.data.fee_ids || []);
              setModal(m => ({ ...m, data: { ...m.data, ...updates } }));
            }} placeholder="$0" t={t} disabled={freeze} /></FF>
            <FF label="Principal Amount" t={t}><FIn value={modal.data.principal_amount || ""} onChange={e => setF("principal_amount", e.target.value)} placeholder="$0" t={t} disabled={freeze} /></FF>
            <FF label="Signed Amount" t={t}><FIn value={modal.data.signed_payment_amount || ""} onChange={e => setF("signed_payment_amount", e.target.value)} placeholder="$0" t={t} disabled={freeze} /></FF>
          </div>
          {modal.mode === "add_late" ? (<>
            <FF label="Fee Selection" t={t}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 120, overflowY: "auto", padding: 2 }}>
                {FEES_DATA.map(f => {
                  const selected = (modal.data.fee_ids || []).includes(f.id);
                  const toggle = () => {
                    const cur = modal.data.fee_ids || [];
                    const newFeeIds = selected ? cur.filter(x => x !== f.id) : [...cur, f.id];
                    const nextAppliedTo = !selected && f.applied_to ? f.applied_to : (modal.data.applied_to || "");
                    const updates = recalcReplacement(modal.data, newFeeIds);
                    setModal(m => ({ ...m, data: { ...m.data, ...updates, applied_to: nextAppliedTo } }));
                  };
                  return (
                    <div key={f.id} onClick={toggle} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, fontWeight: selected ? 600 : 400, padding: "6px 12px", borderRadius: 12, cursor: "pointer", transition: "all 0.15s ease", background: selected ? (isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2") : t.chipBg, color: selected ? (isDark ? "#F87171" : "#DC2626") : t.textSecondary, border: `1px solid ${selected ? (isDark ? "rgba(248,113,113,0.4)" : "#FECACA") : t.chipBorder}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                        {f.name} <span style={{ fontFamily: t.mono, fontSize: 10, opacity: 0.6 }}>({f.rate})</span>
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.7, paddingLeft: 17 }}>Applied to: {f.applied_to || "Principal Amount"}</div>
                    </div>
                  );
                })}
                {FEES_DATA.length === 0 && <span style={{ fontSize: 12, color: t.textMuted }}>No fees available</span>}
              </div>
            </FF>
            <FF label="Linked Schedule" t={t}><FIn value={modal.data.linked || ""} onChange={e => setF("linked", e.target.value)} placeholder="S00001" t={t} /></FF>
          </>) : modal.mode === "add_partial" ? (<>
            {(() => {
              const baseAmt = modal.data.basePayment || 0;
              const paidNum = Number(String(modal.data.partialPaid || 0).replace(/[^0-9.]/g, "")) || 0;
              const partialUnpaid = Math.max(baseAmt - paidNum, 0).toFixed(2);
              const recalcPartial = (newPaid, newFeeIds) => recalcReplacement(modal.data, newFeeIds, newPaid);
              return (<>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ marginBottom: 16, background: isDark ? "rgba(251,191,36,0.06)" : "#FFFBEB", border: `1.5px solid ${isDark ? "rgba(251,191,36,0.35)" : "#FDE68A"}`, borderRadius: 11, padding: "10px 12px 12px" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: isDark ? "#FBBF24" : "#D97706", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7, fontFamily: t.mono, display: "flex", alignItems: "center", gap: 6 }}>Partial Amount Paid <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 0, textTransform: "none", opacity: 0.8 }}>(required)</span></div>
                    <input value={modal.data.partialPaid || ""} onChange={e => {
                      const val = e.target.value;
                      const updates = recalcPartial(val, modal.data.fee_ids || []);
                      setModal(m => ({ ...m, data: { ...m.data, partialPaid: val, isTyping: "partialPaid", ...updates } }));
                    }} onBlur={() => {
                      setModal(m => ({ ...m, data: { ...m.data, isTyping: false } }));
                    }} placeholder="Enter amount paid..." style={{ width: "100%", background: isDark ? "rgba(251,191,36,0.08)" : "#fff", border: `1.5px solid ${isDark ? "rgba(251,191,36,0.4)" : "#FCD34D"}`, borderRadius: 9, padding: "10px 13px", color: isDark ? "#FBBF24" : "#92400E", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <FF label="Partial Unpaid" t={t}>
                    <div style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 600, color: isDark ? "#FBBF24" : "#D97706", background: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: `1px solid ${isDark ? "rgba(251,191,36,0.2)" : "#FDE68A"}`, borderRadius: 9, padding: "10px 13px" }}>${partialUnpaid}</div>
                  </FF>
                </div>
                <FF label="Fee Selection" t={t}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 120, overflowY: "auto", padding: 2 }}>
                    {FEES_DATA.map(f => {
                      const selected = (modal.data.fee_ids || []).includes(f.id);
                      const toggle = () => {
                        const cur = modal.data.fee_ids || [];
                        const newFeeIds = selected ? cur.filter(x => x !== f.id) : [...cur, f.id];
                        const nextAppliedTo = !selected && f.applied_to ? f.applied_to : (modal.data.applied_to || "");
                        const updates = recalcPartial(modal.data.partialPaid, newFeeIds);
                        setModal(m => ({ ...m, data: { ...m.data, fee_ids: newFeeIds, applied_to: nextAppliedTo, ...updates } }));
                      };
                      return (
                        <div key={f.id} onClick={toggle} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, fontWeight: selected ? 600 : 400, padding: "6px 12px", borderRadius: 12, cursor: "pointer", transition: "all 0.15s ease", background: selected ? (isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB") : t.chipBg, color: selected ? (isDark ? "#FBBF24" : "#D97706") : t.textSecondary, border: `1px solid ${selected ? (isDark ? "rgba(251,191,36,0.4)" : "#FDE68A") : t.chipBorder}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                            {f.name} <span style={{ fontFamily: t.mono, fontSize: 10, opacity: 0.6 }}>({f.rate})</span>
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.7, paddingLeft: 17 }}>Applied to: {f.applied_to || "Principal Amount"}</div>
                        </div>
                      );
                    })}
                    {FEES_DATA.length === 0 && <span style={{ fontSize: 12, color: t.textMuted }}>No fees available</span>}
                  </div>
                </FF>
                <FF label="Linked Schedule" t={t}><FIn value={modal.data.linked || ""} onChange={e => setF("linked", e.target.value)} placeholder="S00001" t={t} /></FF>
              </>);
            })()}
          </>) : (
            <>
              <FF label="Linked Schedule" t={t}>
                <FIn value={modal.data.linked || ""} onChange={e => setF("linked", e.target.value)} placeholder="Linked Sched (e.g. S00001)" t={t} disabled={freeze} />
              </FF>
              <FF label="Fee Selection" t={t}>
                <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FDFDFC", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 120, overflowY: "auto", padding: 2 }}>
                    {FEES_DATA.map(f => {
                      const selected = (modal.data.fee_ids || []).includes(f.id);
                      const toggle = () => {
                        const cur = modal.data.fee_ids || [];
                        const next = selected ? cur.filter(x => x !== f.id) : [...cur, f.id];
                        const nextAppliedTo = !selected && f.applied_to ? f.applied_to : (modal.data.applied_to || "");
                        const updates = recalcReplacement(modal.data, next);
                        setModal(m => ({ ...m, data: { ...m.data, ...updates, fee_ids: next, applied_to: nextAppliedTo } }));
                      };
                      return (
                        <div key={f.id} onClick={freeze ? null : toggle} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, fontWeight: selected ? 600 : 400, padding: "6px 12px", borderRadius: 12, cursor: freeze ? "not-allowed" : "pointer", transition: "all 0.15s ease", background: selected ? (isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF") : t.chipBg, color: selected ? (isDark ? "#60A5FA" : "#2563EB") : t.textSecondary, border: `1px solid ${selected ? (isDark ? "rgba(96,165,250,0.4)" : "#BFDBFE") : t.chipBorder}`, opacity: freeze ? 0.7 : 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                            {f.name} <span style={{ fontFamily: t.mono, fontSize: 10, opacity: 0.6 }}>({f.rate})</span>
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.7, paddingLeft: 17 }}>Applied to: {f.applied_to || "Principal Amount"}</div>
                        </div>
                      );
                    })}
                    {FEES_DATA.length === 0 && <span style={{ fontSize: 12, color: t.textMuted }}>No fees available</span>}
                  </div>
                </div>
              </FF>
            </>
          )}
          <FF label="Notes" t={t}><textarea value={modal.data.notes || ""} onChange={e => setF("notes", e.target.value)} placeholder="Any remarks..." rows={2} style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} /></FF>
        </>);
      })()}
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteSchedule} label="This schedule entry" t={t} isDark={isDark} />
    <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.title || "Confirm"} onSave={confirmAction?.onConfirm} saveLabel="Confirm" t={t} isDark={isDark}>
      <div style={{ padding: "12px 0", fontSize: 14, color: t.textSecondary, lineHeight: 1.6, textAlign: "center" }}>{confirmAction?.message}</div>
    </Modal>
    {drillSchedule && (() => {
      const chain = buildChain(drillSchedule.schedule_id);
      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 18, padding: 0, maxWidth: 680, width: "92%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.3)", border: `1px solid ${t.surfaceBorder}` }}>
            {/* Header */}
            <div style={{ padding: "22px 28px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", fontFamily: t.titleFont }}>Schedule Chain</div>
                <div style={{ fontSize: 12, color: t.textMuted, display: "flex", gap: 10, marginTop: 4 }}>
                  <span style={{ fontFamily: t.mono }}>{drillSchedule.investment}</span>
                  <span style={{ fontFamily: t.mono }}>{drillSchedule.party_id || ""}</span>
                  <span style={{ fontWeight: 600, color: drillSchedule.direction === "IN" ? (isDark ? "#34D399" : "#059669") : (isDark ? "#F87171" : "#DC2626") }}>{drillSchedule.direction}</span>
                </div>
              </div>
              <button onClick={() => setDrillSchedule(null)} style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", color: t.textMuted }}>×</button>
            </div>
            {/* Chain Body */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
              {chain.map((cs, idx) => {
                const [sbg, sc, sbrd] = badge(cs.status, isDark);
                const isActive = cs.schedule_id === drillSchedule.schedule_id;
                const isOriginal = idx === 0 && chain.length > 1 && !cs.linked;
                const feeIds = cs.fee_id ? String(cs.fee_id).split(",").filter(Boolean) : [];
                return (
                  <div key={cs.schedule_id}>
                    {/* Connector line */}
                    {idx > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
                        <div style={{ width: 2, height: 28, background: isDark ? "rgba(96,165,250,0.3)" : "#BFDBFE" }} />
                      </div>
                    )}
                    {/* Schedule card */}
                    <div style={{
                      padding: "16px 18px",
                      borderRadius: 14,
                      border: `1.5px solid ${isActive ? (isDark ? "rgba(96,165,250,0.5)" : "#93C5FD") : t.surfaceBorder}`,
                      background: isActive ? (isDark ? "rgba(96,165,250,0.06)" : "#EFF6FF") : (isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9"),
                    }}>
                      {/* Card header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#1C1917" }}>{cs.schedule_id}</span>
                          <Bdg status={cs.status} isDark={isDark} />
                          {isOriginal && <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: isDark ? "rgba(96,165,250,0.12)" : "#DBEAFE", color: isDark ? "#60A5FA" : "#2563EB", border: `1px solid ${isDark ? "rgba(96,165,250,0.3)" : "#93C5FD"}`, letterSpacing: "0.02em" }}>ORIGINAL</span>}
                          {idx > 0 && <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: isDark ? "rgba(251,191,36,0.12)" : "#FEF3C7", color: isDark ? "#FBBF24" : "#D97706", border: `1px solid ${isDark ? "rgba(251,191,36,0.3)" : "#FDE68A"}`, letterSpacing: "0.02em" }}>REPLACEMENT</span>}
                        </div>
                        <div style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: isDark ? "#60A5FA" : "#4F46E5" }}>
                          {(() => {
                            const isReplacedStatus = [...ZEROING_STATUSES, "Partial"].includes(cs.status);
                            let origAmount = cs.original_payment_amount;

                            if (isReplacedStatus && origAmount != null && origAmount !== "") {
                              return `Original Payment: ${String(origAmount)}`;
                            }

                            // Otherwise show current payment amount normally
                            let displayAmount = cs.payment && cs.payment !== "$0.00" ? cs.payment : (cs.signed_payment_amount || "$0.00");

                            // Add parenthesis for negative OUT amounts
                            if (String(displayAmount).includes("-")) {
                              return String(displayAmount).replace("-", "(") + ")";
                            }
                            return displayAmount;
                          })()}
                        </div>
                      </div>
                      {/* Card details */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, color: t.textMuted }}>
                        <div><span style={{ fontWeight: 600, color: t.textSecondary }}>Due: </span>{cs.dueDate || "—"}</div>
                        <div><span style={{ fontWeight: 600, color: t.textSecondary }}>Term: </span>{cs.term_start || "—"} ~ {cs.term_end || "—"}</div>
                        <div><span style={{ fontWeight: 600, color: t.textSecondary }}>Type: </span>{cs.type || "—"}</div>
                        <div><span style={{ fontWeight: 600, color: t.textSecondary }}>Applied To: </span>{cs.applied_to || (feeIds[0] ? (FEES_DATA.find(f => f.id === feeIds[0])?.applied_to || "—") : "—")}</div>
                      </div>
                      {(() => {
                        const isZeroed = ZEROING_STATUSES.includes(cs.status);
                        if (cs.principal_amount || isZeroed) {
                          return (
                            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, display: "flex", gap: 15 }}>
                              <div><span style={{ fontWeight: 600, color: t.textSecondary }}>Principal: </span>{cs.principal_amount || dash}</div>
                              <div><span style={{ fontWeight: 600, color: t.textSecondary }}>Total Payment Amount: </span>{
                                (() => {
                                  const isReplacedStatus = [...ZEROING_STATUSES, "Partial"].includes(cs.status);
                                  let origAmount = cs.original_payment_amount;

                                  if (isReplacedStatus && origAmount != null && origAmount !== "") {
                                    return String(origAmount);
                                  }

                                  // Otherwise show current payment amount
                                  let totalAmt = cs.payment && cs.payment !== "$0.00" ? cs.payment : (cs.signed_payment_amount || "$0.00");

                                  // Add parenthesis for negative amounts
                                  if (String(totalAmt).includes("-")) {
                                    return String(totalAmt).replace("-", "(") + ")";
                                  }
                                  return totalAmt;
                                })()
                              }</div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {/* Fee details */}
                      {feeIds.length > 0 && (
                        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6, fontFamily: t.mono }}>Fees</div>
                          {feeIds.map(fid => {
                            const fee = FEES_DATA.find(f => f.id === fid);
                            return (
                              <div key={fid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 11 }}>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <span style={{ fontFamily: t.mono, color: t.idText, fontWeight: 600 }}>{fid}</span>
                                  <span style={{ color: t.textMuted }}>{fee?.name || ""}</span>
                                  {fee?.fee_type && <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6", color: t.textMuted }}>{fee.fee_type}</span>}
                                </div>
                                <span style={{ fontFamily: t.mono, fontSize: 11, color: t.textSecondary, fontWeight: 600 }}>{fee?.method === "Fixed Amount" ? fmtCurr(fee?.rate) : `${fee?.rate || ""}%`}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Notes */}
                      {cs.notes && (
                        <div style={{ marginTop: 8, fontSize: 11, color: t.textMuted, fontStyle: "italic", lineHeight: 1.5 }}>{cs.notes}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    })()}
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
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Project Name</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C" }}>{drillInvestment.project_name || drillInvestment.project || "—"}</div>
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
                  return <span key={fid} style={{ fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 20, background: isDark ? "rgba(52,211,153,0.12)" : "#ECFDF5", color: isDark ? "#34D399" : "#059669", border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#A7F3D0"}` }}>{f?.name || fid} {f?.rate ? `(${f.rate})` : ""} · {f?.applied_to || "No applied to"}</span>;
                }) : <span style={{ fontSize: 12, color: t.textMuted, fontStyle: "italic" }}>No applicable fees</span>;
              })()}
            </div>
          </div>
        </div>
      </Modal>
    )}
    {drillFee && (
      <Modal open={!!drillFee} onClose={() => setDrillFee(null)} title="Fee Summary" saveLabel="OK" onSave={() => setDrillFee(null)} width={500} t={t} isDark={isDark}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "10px 0" }}>
          {drillFee.map((f, i) => (
            <div key={f.id} style={{ borderBottom: i < drillFee.length - 1 ? `1px solid ${t.surfaceBorder}` : "none", paddingBottom: i < drillFee.length - 1 ? 20 : 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
                <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Fee Name / ID</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", display: "flex", gap: 8, alignItems: "center" }}>
                    <span>{f.name || "Fee"}</span>
                    <span style={{ color: t.surfaceBorder }}>|</span>
                    <span style={{ fontFamily: t.mono, color: t.idText }}>{f.id}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Calculation Method</span>
                  <div style={{ fontSize: 13, color: isDark ? "#fff" : "#1C1917", fontWeight: 600 }}>{f.method || "—"}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Rate / Amount</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? "#60A5FA" : "#2563EB", fontFamily: t.mono }}>
                    {(() => {
                      const val = f.rate || "0";
                      if (f.method === "% of Amount") {
                        return String(val).endsWith("%") ? val : `${val}%`;
                      }
                      return fmtCurr(val);
                    })()}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Applied To</span>
                  <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C" }}>{f.applied_to || "—"}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Direction</span>
                  <div style={{ fontSize: 11, fontWeight: 700, color: f.direction === "IN" ? (isDark ? "#34D399" : "#059669") : f.direction === "OUT" ? (isDark ? "#F87171" : "#DC2626") : t.textMuted }}>{f.direction || "—"}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Charge At</span>
                  <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C" }}>{f.fee_charge_at || "—"}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Frequency</span>
                  <div style={{ fontSize: 13, color: isDark ? "#fff" : "#1C1917" }}>{f.fee_frequency || "Once"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    )}
    {detailContact && (() => {
      const dp = detailContact;
      const dpId = String(dp.id || "").trim();
      const dpDocId = String(dp.docId || "").trim();
      const partyInvestments = INVESTMENTS.filter(c => {
        const cPId = String(c.party_id || "").trim();
        return (cPId === dpId || (dpDocId && cPId === dpDocId));
      });
      const partySchedules = SCHEDULES.filter(s => {
        const sPId = String(s.party_id || "").trim();
        const isMatched = sPId === dpId || (dpDocId && sPId === dpDocId);
        return isMatched || partyInvestments.some(c => c.id === s.investment);
      }).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
      const totalValue = partyInvestments.reduce((sum, c) => sum + Number(String(c.amount || 0).replace(/[^0-9.-]/g, "")), 0);
      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 18, padding: 0, maxWidth: 720, width: "92%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.3)", border: `1px solid ${t.surfaceBorder}` }}>
            {/* Header */}
            <div style={{ padding: "22px 28px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {(() => { const a2 = av(dp.name, isDark); return <div style={{ width: 42, height: 42, borderRadius: 12, background: a2.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: a2.c, border: `1px solid ${a2.c}22` }}>{initials(dp.name)}</div>; })()}
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917" }}>{dp.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, display: "flex", gap: 10, marginTop: 2 }}>
                    <span style={{ fontFamily: t.mono }}>{dp.id}</span>
                    <span><Bdg status={dp.role} isDark={isDark} /></span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailContact(null)} style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", color: t.textMuted }}>×</button>
            </div>
            {/* Body */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
              {/* Investments grouped by project */}
              {(() => {
                const investmentsByProject = {};
                partyInvestments.forEach(c => {
                  const key = c.project || "Unassigned";
                  (investmentsByProject[key] = investmentsByProject[key] || []).push(c);
                });
                const projectNames = Object.keys(investmentsByProject);
                return (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Investments ({partyInvestments.length})</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.accent }}>{fmtCurr(totalValue)}</span>
                    </div>
                    {partyInvestments.length === 0 && <div style={{ fontSize: 12, color: t.textMuted, padding: "12px 0" }}>No investments found</div>}
                    {projectNames.map(projName => (
                      <div key={projName} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, marginBottom: 6, padding: "4px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>{projName}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {investmentsByProject[projName].map(c => {
                            const [bg, color, brd] = badge(c.status, isDark);
                            return (
                              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"}` }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                    <span style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{c.id}</span>
                                    <Bdg status={c.status} isDark={isDark} />
                                  </div>
                                  <div style={{ fontSize: 11, color: t.textMuted }}>{c.type || "—"} · {c.rate || "—"} · {c.freq || "—"} · {c.start_date || "—"} ~ {c.maturity_date || "—"}</div>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", flexShrink: 0 }}>{c.amount}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* Payment Schedules grouped by project */}
              {(() => {
                const schedulesByProject = {};
                partySchedules.forEach(s => {
                  const investment = partyInvestments.find(c => c.id === s.investment);
                  const proj = DEALS.find(p => p.id === s.deal_id);
                  const key = investment?.project || proj?.name || "Unassigned";
                  (schedulesByProject[key] = schedulesByProject[key] || []).push(s);
                });
                const projectNames = Object.keys(schedulesByProject);
                return (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 10 }}>Payment Schedules ({partySchedules.length})</div>
                    {partySchedules.length === 0 && <div style={{ fontSize: 12, color: t.textMuted, padding: "12px 0" }}>No payment schedules</div>}
                    {projectNames.map(projName => (
                      <div key={projName} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, marginBottom: 6, padding: "4px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>{projName}</div>
                        <div style={{ borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA" }}>
                              <tr>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>INVESTMENT</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>DUE DATE</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>TYPE</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>DIR</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>AMOUNT</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>STATUS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedulesByProject[projName].map((s, i) => {
                                const arr = schedulesByProject[projName];
                                const [sbg, sc, sbrd] = badge(s.status, isDark);
                                return (
                                  <tr key={s.schedule_id || i} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${t.surfaceBorder}` : "none" }}>
                                    <td style={{ padding: "10px 14px", fontSize: 11.5, fontFamily: t.mono, fontWeight: 500 }}>{s.investment}</td>
                                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: t.mono, color: t.textMuted }}>{s.dueDate}</td>
                                    <td style={{ padding: "10px 14px", fontSize: 11, color: t.textSecondary }}>{s.type}{s.fee_id ? ` · ${s.fee_id}` : ""}</td>
                                    <td style={{ padding: "10px 14px", fontSize: 10, fontWeight: 600, color: s.direction === "IN" ? "#10B981" : "#EF4444" }}>{s.direction}</td>
                                    <td style={{ padding: "10px 14px", fontSize: 11.5, fontWeight: 600 }}>{s.signed_payment_amount}</td>
                                    <td style={{ padding: "10px 14px" }}><Bdg status={s.status} isDark={isDark} /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      );
    })()}
  </>);
}

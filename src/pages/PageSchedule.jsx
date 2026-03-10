import { useState } from "react";
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData, badge } from "../utils";
import { StatCard, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";
import { useAuth } from "../AuthContext";

const fmtCurr = v => { if (v == null || v === "") return ""; const n = Number(String(v).replace(/[^0-9.-]/g, "")); if (isNaN(n)) return String(v); return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

export default function PageSchedule({ t, isDark, SCHEDULES = [], CONTRACTS = [], DIMENSIONS = [], FEES_DATA = [], collectionPath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_CREATE");
  const canDelete = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_DELETE");
  const getNextScheduleId = () => {
    let maxNum = 10000;
    SCHEDULES.forEach(s => {
      if (s.schedule_id && s.schedule_id.startsWith("S")) {
        const num = parseInt(s.schedule_id.substring(1), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `S${maxNum + 1}`;
  };
  const paymentStatusOpts = (DIMENSIONS.find(d => d.name === "Payment Status" || d.name === "PaymentStatus") || {}).items || ["Due", "Paid", "Partial", "Missed", "Cancelled"];
  const [hov, setHov] = useState(null); const [sel, setSel] = useState(new Set()); const [chip, setChip] = useState("All");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { title, message, onConfirm }
  const [drillSchedule, setDrillSchedule] = useState(null);
  const [drillContract, setDrillContract] = useState(null);
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
    return chain;
  };
  const hasLink = (s) => s.linked || SCHEDULES.some(x => x.linked === s.schedule_id);
  const [sort, setSort] = useState({ key: "dueDate", direction: "asc" });
  const [page, setPage] = useState(1);
  const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const openAdd = () => setModal({ open: true, mode: "add", data: { schedule_id: getNextScheduleId(), contract: "C10000", dueDate: "", type: "Interest", payment: "", status: "Due", notes: "", fee_ids: [], basePayment: 0 } });
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
    setModal({ open: true, mode: "edit", data: { ...r, fee_ids, basePayment, partialPaid, originalStatus: r.status } });
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
    const unpaid = isP ? Math.max(baseAmt - paidNum, 0) : baseAmt;

    const feeAmts = newFeeIds.map(fid => {
      const fee = FEES_DATA.find(ff => ff.id === fid);
      if (!fee) return 0;
      const rateNum = Number(String(fee.rate).replace(/[^0-9.]/g, "")) || 0;
      return fee.method === "Fixed Amount" ? rateNum : Math.abs(unpaid) * rateNum / 100;
    });

    const totalFees = feeAmts.reduce((a, b) => a + b, 0);
    const absBase = Math.abs(unpaid);
    const finalAmtAbs = absBase + totalFees;
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
        const parts = [fmtCurr(unpaid), ...feeAmts.map(a => fmtCurr(a))].join(" + ");
        notes = `${prefix} ${linkedId} | Fee Breakdown: ${parts} = ${fmtCurr(finalAmtAbs)}`;
      }
    } else {
      // Logic for Standard Schedules (General fee addition)
      // Strip old breakdown if exists to avoid doubling up
      const cleanNote = notes.split(" | Fee Breakdown:")[0];
      if (newFeeIds.length > 0) {
        const parts = [fmtCurr(unpaid), ...feeAmts.map(a => fmtCurr(a))].join(" + ");
        notes = `${cleanNote} | Fee Breakdown: ${parts} = ${fmtCurr(finalAmtAbs)}`;
      } else {
        notes = cleanNote;
      }
    }

    const updates = { fee_ids: newFeeIds, notes, signed_payment_amount: fmtCurr(signedAmt), basePayment: baseAmt };
    if (currentData.isTyping !== "payment") {
      updates.payment = fmtCurr(paymentAmt);
    }
    if (currentData.isTyping !== "partialPaid") {
      updates.partialPaid = paidVal;
    }
    return updates;
  };
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleUndo = async (s) => {
    if (!s || !s._undo_snapshot) return;
    const snap = s._undo_snapshot;
    setConfirmAction({
      title: "Undo Last Action",
      message: "Are you sure you want to undo the last action? This will restore original values and delete any linked repayment schedules.",
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const ref = s._path ? doc(db, s._path) : doc(db, collectionPath, s.docId);
          // 1. Restore the original state and clear snapshot
          const restorePayload = {
            ...snap,
            _undo_snapshot: null,
            updated_at: serverTimestamp()
          };
          await updateDoc(ref, restorePayload);

          // 2. Identify and delete the child (repayment/replacement) schedule if it exists
          // Since the child was created and its ID was stored in linked_schedule_id (current state)
          const childId = s.linked_schedule_id || s.linked; // linked_schedule_id is from Firestore, linked might be from local mapping
          if (childId) {
            const childDoc = SCHEDULES.find(x => x.schedule_id === childId);
            if (childDoc && childDoc.docId) {
              const childRef = childDoc._path ? doc(db, childDoc._path) : doc(db, collectionPath, childDoc.docId);
              await deleteDoc(childRef);
            }
          }
        } catch (err) {
          console.error("Undo error:", err);
          alert("Failed to undo action: " + err.message);
        }
      }
    });
  };

  const handleSaveSchedule = async () => {
    const d = modal.data;
    const payload = {
      schedule_id: d.schedule_id || "",
      contract_id: d.contract || "",
      project_id: d.project_id || "",
      party_id: d.party_id || "",
      due_date: d.dueDate || null,
      payment_type: d.type || "",
      direction_from_company: d.direction || "",
      period_number: d.period_number ? Number(d.period_number) : null,
      principal_amount: d.principal_amount ? Number(String(d.principal_amount).replace(/[^0-9.-]/g, "")) || null : null,
      signed_payment_amount: d.signed_payment_amount ? Number(String(d.signed_payment_amount).replace(/[^0-9.-]/g, "")) || null : null,
      fee_id: Array.isArray(d.fee_ids) ? d.fee_ids.join(",") : (d.fee_id || null),
      linked_schedule_id: d.linked || null,
      status: d.status || "Due",
      notes: d.notes || "",
      term_start: d.term_start || null,
      term_end: d.term_end || null,
      updated_at: serverTimestamp(),
    };

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
          linked_schedule_id: original.linked_schedule_id || original.linked || null,
          fee_id: original.fee_id || null,
          due_date: original.dueDate || null,
          term_start: original.term_start || null,
          term_end: original.term_end || null,
          payment_type: original.type || null,
          project_id: original.project_id || null,
          party_id: original.party_id || null,
          contract_id: original.contract || null,
          period_number: original.period_number ? Number(original.period_number) : null,
        };
      }
    }

    // Calculate next term due date based on contract frequency
    const getNextTermDate = (currentDueDate, contractId) => {
      if (!currentDueDate) return "";
      const contract = CONTRACTS.find(c => c.id === contractId);
      const freq = contract ? (contract.freq || "").toLowerCase() : "";
      let monthsToAdd = 1;
      if (freq.includes("quart")) monthsToAdd = 3;
      else if (freq.includes("semi")) monthsToAdd = 6;
      else if (freq.includes("annu") || freq.includes("year")) monthsToAdd = 12;

      const dt = new Date(currentDueDate + "T12:00:00");
      if (isNaN(dt.getTime())) return "";
      const origDay = dt.getDate();
      const isMonthEnd = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate() === origDay;

      dt.setMonth(dt.getMonth() + monthsToAdd);

      if (isMonthEnd) {
        // Carry over month-end alignment (e.g. Sep 30 -> Dec 31)
        dt.setDate(new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate());
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

    // Missed or Cancelled Payment Workflow
    if (modal.mode === "edit" && (d.status === "Missed" || d.status === "Cancelled") && d.status !== d.originalStatus) {
      setConfirmAction({
        title: "Replacement Schedule",
        message: `Do you want to set "${d.status}" payment and book a replacement schedule?`,
        onConfirm: async () => {
          setConfirmAction(null);
          try {
            const ref = d._path ? doc(db, d._path) : doc(db, collectionPath, d.docId);
            await updateDoc(ref, payload);
            const lateId = getNextScheduleId();
            const nextDueDate = getNextTermDate(d.dueDate, d.contract);
            setModal({
              open: true,
              mode: "add_late",
              originalDocId: d.docId,
              data: {
                ...d,
                schedule_id: lateId,
                linked: d.schedule_id,
                fee_ids: [],
                status: "Due",
                dueDate: nextDueDate,
                term_start: getNextDay(d.dueDate),
                term_end: nextDueDate,
                basePayment: Math.abs(Number(String(d.payment || d.signed_payment_amount || 0).replace(/[^0-9.-]/g, "")) || 0),
                notes: `${d.status} payment replacement for ${d.schedule_id}`,
              }
            });
          } catch (err) { console.error("Update missed error:", err); }
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
            const ref = d._path ? doc(db, d._path) : doc(db, collectionPath, d.docId);
            await updateDoc(ref, payload);
            const partialId = getNextScheduleId();
            const nextDueDatePartial = getNextTermDate(d.dueDate, d.contract);
            setModal({
              open: true,
              mode: "add_partial",
              originalDocId: d.docId,
              data: {
                ...d,
                schedule_id: partialId,
                linked: d.schedule_id,
                fee_ids: [],
                status: "Due",
                dueDate: nextDueDatePartial,
                term_start: getNextDay(d.dueDate),
                term_end: nextDueDatePartial,
                partialPaid: "",
                basePayment: Math.abs(Number(String(d.payment || d.signed_payment_amount || 0).replace(/[^0-9.-]/g, "")) || 0),
                notes: `Partial payment replacement for ${d.schedule_id}`,
              }
            });
          } catch (err) { console.error("Update partial error:", err); }
        }
      });
      return;
    }

    try {
      if (modal.mode === "edit" && d.docId) {
        const ref = d._path ? doc(db, d._path) : doc(db, collectionPath, d.docId);
        await updateDoc(ref, payload);
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
            // Also update the formatted payment mapping with specific note
            updates.notes = `partial amount of ${fmtCurr(partialPaidNum)} paid and partial unpaid amount of ${fmtCurr(unpaidAmt)} will be scheduled`;
          }

          await updateDoc(ref, updates);
        }
      }
    } catch (err) {
      console.error("Failed to save schedule:", err);
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
  const cols = [{ l: "", w: "36px" }, { l: "SCHEDULE ID", w: "80px", k: "schedule_id" }, { l: "LINKED", w: "80px", k: "linked" }, { l: "CONTRACT", w: "85px", k: "contract" }, { l: "PROJECT ID", w: "85px", k: "project_id" }, { l: "PARTY ID", w: "80px", k: "party_id" }, { l: "PERIOD", w: "58px", k: "period_number" }, { l: "DUE DATE", w: "98px", k: "dueDate" }, { l: "TYPE", w: "minmax(60px, 0.33fr)", k: "type" }, { l: "FEE", w: "260px", k: "fee_id" }, { l: "DIR", w: "50px", k: "direction" }, { l: "SIGNED AMT", w: "110px", k: "signed_payment_amount" }, { l: "PRINCIPAL", w: "110px", k: "principal_amount" }, { l: "STATUS", w: "90px", k: "status" }, { l: "NOTES", w: "minmax(80px, 1fr)", k: "notes" }, { l: "ACTIONS", w: "76px" }];
  const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
  const [colFilters, setColFilters] = useState({});
  const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const filtered = SCHEDULES.filter(s => chip === "All" || s.status === chip).filter(s => cols.every(c => { if (!c.k || !colFilters[c.k]) return true; return String(s[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase()); }));
  const sorted = sortData(filtered, sort);
  const paginated = sorted.slice((page - 1) * 20, page * 20);
  const totalPages = Math.ceil(sorted.length / 20);
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
        {canCreate && <button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Schedule</button>}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>{statsData.map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}</div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{["All", "Due", "Paid", "Missed"].map(f => { const isA = chip === f; return <span key={f} className="filter-chip" onClick={() => setChip(f)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{f}</span>; })}
        {sel.size > 0 && <><div style={{ width: 1, height: 18, background: t.surfaceBorder, marginLeft: 4 }} /><span onClick={() => setSel(new Set())} style={{ fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20, background: isDark ? "rgba(248,113,113,0.12)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.25)" : "#FECACA"}`, cursor: "pointer" }}>Clear</span></>}
      </div>
    </div>
    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
      <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart}>
        <input type="checkbox" checked={sel.size === filtered.length && filtered.length > 0} onChange={() => setSel(sel.size === filtered.length ? new Set() : new Set(filtered.map(s => s.schedule_id)))} style={{ accentColor: t.checkActive, width: 14, height: 14 }} />
      </TblHead>
      <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
        {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} /> : <div key={c.l || "nofilter"} />)}
      </div>
      {paginated.map((s, i) => {
        const isHov = hov === s.schedule_id; const isSel = sel.has(s.schedule_id); const [bg, color, border] = badge(s.status, isDark);
        const dash = <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>;
        return (<div key={s.schedule_id} className="data-row" onMouseEnter={() => setHov(s.schedule_id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isSel ? (isDark ? "rgba(52,211,153,0.04)" : "#F0FDF4") : isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
          <input type="checkbox" checked={isSel} onChange={() => { const n = new Set(sel); n.has(s.schedule_id) ? n.delete(s.schedule_id) : n.add(s.schedule_id); setSel(n); }} style={{ accentColor: t.checkActive, width: 14, height: 14 }} onClick={e => e.stopPropagation()} />
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{hasLink(s) ? <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); setDrillSchedule(s); }} style={{ color: isDark ? "#60A5FA" : "#4F46E5", textDecoration: "none", fontWeight: 600 }}>{s.schedule_id}</a> : s.schedule_id}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{s.linked ? <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); const linked = SCHEDULES.find(x => x.schedule_id === s.linked); if (linked) setDrillSchedule(linked); }} style={{ color: isDark ? "#60A5FA" : "#4F46E5", textDecoration: "none" }}>{s.linked}</a> : dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 500 }}>
            <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); const c = CONTRACTS.find(x => (x.contract_id || x.id) === s.contract); if (c) setDrillContract(c); }} style={{ color: "inherit", textDecoration: "none" }}>{s.contract}</a>
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{s.project_id || dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{s.party_id || dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: t.textMuted, textAlign: "center" }}>{s.period_number || dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: isDark ? "rgba(255,255,255,0.7)" : "#44403C" }}>{s.dueDate}</div>
          <div style={{ fontSize: 11.5, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.type}</div>
          <div style={{ fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.fee_id
              ? String(s.fee_id).split(",").filter(Boolean).map((fid, idx, arr) => (
                <span key={fid}>
                  <span style={{ fontFamily: t.mono, color: t.idText }}>{fid}</span>
                  <span style={{ color: t.textMuted }}> - {(FEES_DATA.find(f => f.id === fid) || {}).name || ""}</span>
                  {idx < arr.length - 1 ? "; " : ""}
                </span>
              ))
              : dash}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: s.direction === "IN" ? (isDark ? "#34D399" : "#059669") : s.direction === "OUT" ? (isDark ? "#F87171" : "#DC2626") : t.textMuted }}>{s.direction || dash}</div>
          <div style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 700, color: isDark ? "#60A5FA" : "#4F46E5" }}>
            {s.signed_payment_amount && s.direction === "OUT" && String(s.signed_payment_amount).includes("-")
              ? String(s.signed_payment_amount).replace("-", "(") + ")"
              : (s.signed_payment_amount || dash)}
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: t.textMuted }}>{s.principal_amount || dash}</div>
          <div><span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 20, background: bg, color, border: `1px solid ${border}` }}>{s.status}</span></div>
          <div style={{ fontSize: 11.5, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{s.notes || dash}</div>
          {s.schedule_id === "S10028" && console.log("Rendering S10028 snapshot:", s._undo_snapshot)}
          <ActBtns show={isHov} t={t} onEdit={() => openEdit(s)} onDel={canDelete ? (() => setDelT({ schedule_id: s.schedule_id, name: s.schedule_id, docId: s.docId, _path: s._path })) : null} onUndo={s._undo_snapshot ? () => handleUndo(s) : null} />
          <span style={{ fontSize: 10 }}>{s._undo_snapshot ? "✅" : "❌"}</span>
        </div>);
      })}
    </div>
    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{paginated.length}</strong> of <strong style={{ color: t.textSecondary }}>{sorted.length}</strong> schedules{sel.size > 0 && <span style={{ color: t.accent, marginLeft: 8 }}>· {sel.size} selected</span>}</span><Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} t={t} /></div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Schedule Entry" : modal.mode === "add_late" ? "Replacement Payment Schedule" : modal.mode === "add_partial" ? "Partial Payment Schedule" : "Edit Schedule Entry"} onSave={handleSaveSchedule} width={620} t={t} isDark={isDark}>
      {(() => {
        const freeze = modal.mode === "edit" && ["Partial", "Missed"].includes(modal.data.status);
        return (<>
          {modal.mode === "edit" && (
            <FF label="Schedule ID" t={t}>
              <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.schedule_id}</div>
            </FF>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FF label="Contract" t={t}><FSel value={modal.data.contract} onChange={e => setF("contract", e.target.value)} options={CONTRACTS.map(c => c.id)} t={t} disabled={freeze} /></FF>
            <FF label="Project ID" t={t}><FIn value={modal.data.project_id || ""} onChange={e => setF("project_id", e.target.value)} placeholder="P10000" t={t} disabled={freeze} /></FF>
            <FF label="Party ID" t={t}><FIn value={modal.data.party_id || ""} onChange={e => setF("party_id", e.target.value)} placeholder="M10000" t={t} disabled={freeze} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FF label="Due Date" t={t}><FIn value={modal.data.dueDate || ""} onChange={e => setF("dueDate", e.target.value)} t={t} type="date" disabled={freeze} /></FF>
            <FF label="Period Number" t={t}><FIn value={modal.data.period_number || ""} onChange={e => setF("period_number", e.target.value)} placeholder="1" t={t} disabled={freeze} /></FF>
            <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e => setF("status", e.target.value)} options={["Due", "Paid", "Partial", "Missed", "Cancelled"]} t={t} /></FF>
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
          <FF label="Payment Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={["INVESTOR_PRINCIPAL_DEPOSIT", "INVESTOR_INTEREST_PAYMENT", "INVESTOR_PRINCIPAL_PAYMENT", "BORROWER_PRINCIPAL_RECEIVED", "BORROWER_INTEREST_PAYMENT", "BORROWER_PRINCIPAL_PAYMENT", "FEE"]} t={t} disabled={freeze} /></FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FF label="Payment Amount" t={t}><FIn value={modal.data.payment || ""} onChange={e => {
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
                    const updates = recalcReplacement(modal.data, newFeeIds);
                    setModal(m => ({ ...m, data: { ...m.data, ...updates } }));
                  };
                  return (
                    <div key={f.id} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: selected ? 600 : 400, padding: "5px 12px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease", background: selected ? (isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2") : t.chipBg, color: selected ? (isDark ? "#F87171" : "#DC2626") : t.textSecondary, border: `1px solid ${selected ? (isDark ? "rgba(248,113,113,0.4)" : "#FECACA") : t.chipBorder}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                      {f.name} <span style={{ fontFamily: t.mono, fontSize: 10, opacity: 0.6 }}>({f.rate})</span>
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
              const partialUnpaid = Math.max(baseAmt - paidNum, 0);
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
                        const updates = recalcPartial(modal.data.partialPaid, newFeeIds);
                        setModal(m => ({ ...m, data: { ...m.data, fee_ids: newFeeIds, ...updates } }));
                      };
                      return (
                        <div key={f.id} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: selected ? 600 : 400, padding: "5px 12px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease", background: selected ? (isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB") : t.chipBg, color: selected ? (isDark ? "#FBBF24" : "#D97706") : t.textSecondary, border: `1px solid ${selected ? (isDark ? "rgba(251,191,36,0.4)" : "#FDE68A") : t.chipBorder}` }}>
                          <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                          {f.name} <span style={{ fontFamily: t.mono, fontSize: 10, opacity: 0.6 }}>({f.rate})</span>
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
                <FIn value={modal.data.linked || ""} onChange={e => setF("linked", e.target.value)} placeholder="Linked Sched (e.g. S00001)" t={t} />
              </FF>
              <FF label="Fee Selection" t={t}>
                <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FDFDFC", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 120, overflowY: "auto", padding: 2 }}>
                    {FEES_DATA.map(f => {
                      const selected = (modal.data.fee_ids || []).includes(f.id);
                      const toggle = () => {
                        const cur = modal.data.fee_ids || [];
                        const next = selected ? cur.filter(x => x !== f.id) : [...cur, f.id];
                        const updates = recalcReplacement(modal.data, next);
                        setModal(m => ({ ...m, data: { ...m.data, ...updates, fee_ids: next } }));
                      };
                      return (
                        <div key={f.id} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: selected ? 600 : 400, padding: "5px 12px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease", background: selected ? (isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF") : t.chipBg, color: selected ? (isDark ? "#60A5FA" : "#2563EB") : t.textSecondary, border: `1px solid ${selected ? (isDark ? "rgba(96,165,250,0.4)" : "#BFDBFE") : t.chipBorder}` }}>
                          <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                          {f.name} <span style={{ fontFamily: t.mono, fontSize: 10, opacity: 0.6 }}>({f.rate})</span>
                        </div>
                      );
                    })}
                    {FEES_DATA.length === 0 && <span style={{ fontSize: 12, color: t.textMuted }}>No fees available</span>}
                  </div>
                </div>
              </FF>
            </>
          )}
          <FF label="Notes" t={t}><textarea value={modal.data.notes || ""} onChange={e => setF("notes", e.target.value)} placeholder="Any remarks..." rows={2} disabled={freeze} style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: freeze ? "none" : "vertical", boxSizing: "border-box", opacity: freeze ? 0.6 : 1, cursor: freeze ? "not-allowed" : "text" }} /></FF>
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
                  <span style={{ fontFamily: t.mono }}>{drillSchedule.contract}</span>
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
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: sbg, color: sc, border: `1px solid ${sbrd}` }}>{cs.status}</span>
                          {isOriginal && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: isDark ? "rgba(96,165,250,0.12)" : "#DBEAFE", color: isDark ? "#60A5FA" : "#2563EB", border: `1px solid ${isDark ? "rgba(96,165,250,0.3)" : "#93C5FD"}` }}>ORIGINAL</span>}
                          {idx > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: isDark ? "rgba(251,191,36,0.12)" : "#FEF3C7", color: isDark ? "#FBBF24" : "#D97706", border: `1px solid ${isDark ? "rgba(251,191,36,0.3)" : "#FDE68A"}` }}>REPLACEMENT</span>}
                        </div>
                        <div style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: isDark ? "#60A5FA" : "#4F46E5" }}>
                          {cs.signed_payment_amount && cs.direction === "OUT" && String(cs.signed_payment_amount).includes("-")
                            ? String(cs.signed_payment_amount).replace("-", "(") + ")"
                            : (cs.signed_payment_amount || cs.payment || "")}
                        </div>
                      </div>
                      {/* Card details */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, color: t.textMuted }}>
                        <div><span style={{ fontWeight: 600, color: t.textSecondary }}>Due: </span>{cs.dueDate || "—"}</div>
                        <div><span style={{ fontWeight: 600, color: t.textSecondary }}>Term: </span>{cs.term_start || "—"} ~ {cs.term_end || "—"}</div>
                        <div><span style={{ fontWeight: 600, color: t.textSecondary }}>Type: </span>{cs.type || "—"}</div>
                      </div>
                      {cs.principal_amount && (
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}><span style={{ fontWeight: 600, color: t.textSecondary }}>Principal: </span>{cs.principal_amount}</div>
                      )}
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
    {drillContract && (
      <Modal open={!!drillContract} onClose={() => setDrillContract(null)} title="Contract Summary" saveLabel="OK" onSave={() => setDrillContract(null)} width={580} t={t} isDark={isDark}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px", padding: "10px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Contract ID / Project ID</span>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: t.mono }}>{drillContract.contract_id || drillContract.id}</span>
              <span style={{ color: t.surfaceBorder }}>|</span>
              <span style={{ fontFamily: t.mono, color: t.idText }}>{drillContract.project_id || "—"}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Status</span>
            <div>{drillContract.status ? <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 12px", borderRadius: 20, ...(() => { const [bg, c, br] = badge(drillContract.status, isDark); return { background: bg, color: c, border: `1px solid ${br}` }; })() }}>{drillContract.status}</span> : "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Project Name</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C" }}>{drillContract.project_name || drillContract.project || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Party Name</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{drillContract.party_name || drillContract.party || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Amount</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#60A5FA" : "#2563EB", fontFamily: t.mono }}>{drillContract.amount || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Interest Rate / Frequency</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", fontWeight: 500 }}>{drillContract.interest_rate || drillContract.rate || "—"} / {drillContract.payment_frequency || drillContract.freq || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Term (months)</span>
            <div style={{ fontSize: 13, color: isDark ? "#fff" : "#1C1917", fontWeight: 600 }}>{drillContract.term_months ? `${drillContract.term_months} Months` : "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Contract Type</span>
            <div style={{ fontSize: 13, color: isDark ? "#fff" : "#1C1917", fontWeight: 600 }}>{drillContract.contract_type || drillContract.type || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Start Date</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", fontFamily: t.mono }}>{drillContract.start_date || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Maturity Date</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", fontFamily: t.mono }}>{drillContract.maturity_date || "—"}</div>
          </div>
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Applicable Fees</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(() => {
                const fids = String(drillContract.fees || drillContract.feeIds || "").split(",").filter(Boolean);
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

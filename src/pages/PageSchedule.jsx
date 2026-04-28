import React, { useState, useMemo, useEffect, useRef } from "react";
import TanStackTable from "../components/TanStackTable";
import { getScheduleColumns } from "../components/ScheduleTanStackConfig";
import { getDistributionMemoColumns } from "../components/DistributionMemoTanStackConfig";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, TextRun } from "docx";
import { Download, ChevronDown, Table as TableIcon, LayoutPanelLeft } from "lucide-react";

import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { sortData, badge, initials, av, pmtCalculator_ACT360_30360, getFeeFrequencyString, normalizeDateAtNoon, mkId, fmtCurr as fmtCurrency, splitInvestorName } from "../utils";
import { StatCard, Bdg, Pagination, Modal, FF, FIn, FSel, FMultiSel, DelModal, Tooltip } from "../components";
import { InvestorSummaryModal } from "../components/InvestorSummaryModal";
import { useAuth } from "../AuthContext";

const fmtCurr = v => {
  if (v == null || v === "") return "";
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  if (isNaN(n)) return String(v);
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ZEROING_STATUSES = ["Missed", "Cancelled", "VOID", "WAIVED", "REPLACED", "Rollover"];

export default function PageSchedule({ t, isDark, SCHEDULES = [], INVESTMENTS = [], CONTACTS = [], DEALS = [], DIMENSIONS = [], FEES_DATA = [], USERS = [], LEDGER = [], collectionPath = "", setActivePage, setSelectedDealId, tenantId }) {

  const { user, hasPermission, isSuperAdmin } = useAuth();
  const canCreate = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_CREATE");
  const canDelete = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_DELETE");
  const canUpdate = isSuperAdmin || hasPermission("PAYMENT_SCHEDULE_UPDATE");
  const getNextScheduleId = () => mkId("S");
  const paymentStatusOpts = (DIMENSIONS.find(d => d.name === "ScheduleStatus" || d.name === "Schedule Status" || d.name === "Payment Status" || d.name === "PaymentStatus") || {}).items
    ?.map(i => String(i || "").trim())
    ?.filter(i => i !== "") || ["Paid", "Due", "Partial", "Hold", "Not Paid", "Reinvested"];
  const paymentMethods = (DIMENSIONS.find(d => d.name === "Payment Method" || d.name === "PaymentMethod") || {}).items || [];
  const [hov, setHov] = useState(null); const [sel, setSel] = useState(new Set()); const [activeFilter, setActiveFilter] = useState("All");
  const [distMemoSel, setDistMemoSel] = useState(new Set());
  const [distMemoBulkStatus, setDistMemoBulkStatus] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [dialog, setDialog] = useState(null); // { title, message, onConfirm, type: 'alert' | 'confirm', saveLabel }
  const showDialog = (message, title = "Notification", type = "alert", onConfirm = null, saveLabel = "OK") => {
    setDialog({ message, title, type, onConfirm, saveLabel });
  };
  const [drillSchedule, setDrillSchedule] = useState(null);
  const [drillInvestment, setDrillInvestment] = useState(null);
  const [drillFee, setDrillFee] = useState(null);
  const [detailContact, setDetailContact] = useState(null);

  const [scheduleView, setScheduleView] = useState("table"); // "memo", "table" or "pivot"

  // Distribution Memos
  const [distMemos, setDistMemos] = useState([]);
  const [distMemoDrillDown, setDistMemoDrillDown] = useState({ open: false, memo: null, schedules: [] });
  const distMemoCollectionPath = tenantId ? `tenants/${tenantId}/distributionMemos` : null;

  const fetchDistMemos = React.useCallback(async () => {
    if (!distMemoCollectionPath) return;
    try {
      const snap = await getDocs(collection(db, distMemoCollectionPath));
      const items = snap.docs.map(d => ({ docId: d.id, _path: `${distMemoCollectionPath}/${d.id}`, ...d.data() }));
      setDistMemos(items);
    } catch (err) {
      console.error("Failed to fetch distribution memos:", err);
    }
  }, [distMemoCollectionPath]);

  useEffect(() => { fetchDistMemos(); }, [fetchDistMemos]);

  const [distMemoModal, setDistMemoModal] = useState({ open: false, mode: "add", data: {} });
  const [distMemoDelT, setDistMemoDelT] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const paymentTypeOpts = useMemo(() => {
    const fromDim = [
      ...((DIMENSIONS.find(d => d.name === "IN_PaymentType") || {}).items || []),
      ...((DIMENSIONS.find(d => d.name === "OUT_PaymentType") || {}).items || []),
    ].filter(Boolean);
    if (fromDim.length) return [...new Set(fromDim)];
    return [...new Set(SCHEDULES.map(s => s.type || s.payment_type || "").filter(Boolean))].sort();
  }, [DIMENSIONS, SCHEDULES]);

  const handleSaveDistMemo = async () => {
    const d = distMemoModal.data;
    console.log("handleSaveDistMemo data:", d);
    
    if (!d.memo) { showToast("Memo name is required", "error"); return; }
    if (!d.deal_id) { showToast("Deal selection is required", "error"); return; }
    
    try {
      const generatedBatchId = d.batch_id || `B${Date.now().toString().slice(-6)}`;
      
      const payload = {
        deal_id: d.deal_id,
        memo: d.memo || "",
        status: d.status || "",
        payment_type: d.payment_type || "",
        payment_method: d.payment_method || "",
        period_start: d.period_start || "",
        period_end: d.period_end || "",
        batch_id: generatedBatchId,
        updated_at: serverTimestamp(),
        updated_by: user?.uid || "system",
      };

      let memoId = d.docId || d.id;
      if (distMemoModal.mode === "add") {
        payload.created_at = serverTimestamp();
        const docRef = await addDoc(collection(db, distMemoCollectionPath), payload);
        memoId = docRef.id;
        showToast("Distribution memo created", "success");
      } else {
        const path = d._path || `${distMemoCollectionPath}/${memoId}`;
        console.log("Updating memo at path:", path);
        await updateDoc(doc(db, path), payload);
        showToast("Distribution memo updated", "success");
      }

      // Link Matching Schedules
      const types = Array.isArray(d.payment_type) ? d.payment_type.map(x => x.toLowerCase()) : (d.payment_type ? [d.payment_type.toLowerCase()] : []);
      const statuses = Array.isArray(d.status) ? d.status.map(x => x.toLowerCase()) : (d.status ? [d.status.toLowerCase()] : []);
      const methods = Array.isArray(d.payment_method) ? d.payment_method.map(x => x.toLowerCase()) : (d.payment_method ? [d.payment_method.toLowerCase()] : []);
      
      const matchingSchedules = SCHEDULES.filter(s => {
        if (s.deal_id !== d.deal_id) return false;
        const sType = (s.type || s.payment_type || "").toLowerCase();
        const due = s.dueDate || s.due_date || "";
        const inv = INVESTMENTS.find(iv => iv.id === s.investment_id || iv.docId === s.investment_id);
        const investor = CONTACTS.find(c => c.id === s.contact_id || c.docId === s.contact_id);
        const sMethod = (s.payment_method || inv?.payment_method || investor?.payment_method || "").toLowerCase();

        const typeMatch = types.length === 0 || types.includes(sType);
        const statusMatch = statuses.length === 0 || statuses.includes((s.status || "").toLowerCase());
        const methodMatch = methods.length === 0 || methods.includes(sMethod);
        return typeMatch && statusMatch && methodMatch && due >= d.period_start && due <= d.period_end;
      });

      // Update matching schedules
      const schedulePath = `tenants/${tenantId}/paymentSchedules`;
      for (const s of matchingSchedules) {
        const sRef = s._path ? doc(db, s._path) : doc(db, schedulePath, s.docId || s.id);
        await updateDoc(sRef, {
          batch_id: generatedBatchId,
          dist_memo_id: memoId,
          updated_at: serverTimestamp()
        });
      }

      // Sync with ACH Batches
      const achBatchPath = `tenants/${tenantId}/achBatches`;
      const achSnap = await getDocs(query(collection(db, achBatchPath), where("dist_memo_id", "==", memoId)));
      
      const achPayload = {
        batch_id: generatedBatchId,
        memo: d.memo,
        deal_id: d.deal_id,
        dist_memo_id: memoId,
        updated_at: serverTimestamp()
      };

      if (achSnap.empty) {
        await addDoc(collection(db, achBatchPath), {
          ...achPayload,
          status: "VERSION_CREATED",
          notes: `Auto-generated from Distribution Memo: ${d.memo}`,
          created_at: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, achBatchPath, achSnap.docs[0].id), achPayload);
      }

      // Sync with Ledger
      const ledgerPath = `tenants/${tenantId}/ledger`;
      await addDoc(collection(db, ledgerPath), {
        entity_type: "DistributionMemo",
        entity_id: memoId,
        batch_id: generatedBatchId,
        deal_id: d.deal_id,
        note: `Distribution Memo saved: ${d.memo}. ${matchingSchedules.length} schedules linked.`,
        created_at: serverTimestamp()
      });

      setDistMemoModal({ open: false, mode: "add", data: {} });
      fetchDistMemos();
    } catch (err) {
      console.error("handleSaveDistMemo error:", err);
      showToast("Failed to save: " + err.message, "error");
    }
  };

  const handleDeleteDistMemo = async () => {
    if (!distMemoDelT?._path) return;
    try {
      await deleteDoc(doc(db, distMemoDelT._path));
      showToast("Distribution memo deleted", "success");
      setDistMemoDelT(null);
      fetchDistMemos();
    } catch (err) {
      showToast("Failed to delete: " + err.message, "error");
    }
  };

  const handleCloneDistMemo = async (memo) => {
    try {
      const { docId, _path, created_at, updated_at, ...rest } = memo;
      await addDoc(collection(db, distMemoCollectionPath), {
        ...rest,
        memo: `${rest.memo} (Copy)`,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        updated_by: user?.uid || "system"
      });
      showToast("Memo cloned", "success");
      fetchDistMemos();
    } catch (err) {
      showToast("Failed to clone: " + err.message, "error");
    }
  };
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  const [pivotColWidths, setPivotColWidths] = useState([120, 120, 130, 100, 100, 80, 70, 100, 120]); // First Name, Last Name, Type, Start, End, Freq, Rate, Schedule, Method
  const [pivotDateWidth, setPivotDateWidth] = useState(120);
  const [pivotFilters, setPivotFilters] = useState({
    firstName: "",
    lastName: "",
    type: "",
    startDate: "",
    endDate: "",
    freq: "",
    rate: "",
    schedule: "",
    paymentMethod: ""
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportMenuRef]);

  const handleUpdateInvestment = async (inv) => {
    if (!inv.id) return;
    const { id, ...rest } = inv;
    const payload = {
      ...rest,
      amount: rest.amount ? Number(String(rest.amount).replace(/[^0-9.-]/g, "")) || null : null,
      rate: rest.rate ? Number(String(rest.rate).replace(/[^0-9.-]/g, "")) || null : null,
      interest_rate: rest.rate ? Number(String(rest.rate).replace(/[^0-9.-]/g, "")) || null : null,
      term_months: rest.term_months ? Number(rest.term_months) || null : null,
      updated_at: serverTimestamp()
    };
    delete payload.docId;
    delete payload._path;
    
    try {
      const docRef = inv._path ? doc(db, inv._path) : doc(db, "tenants", tenantId, "investments", id);
      await updateDoc(docRef, payload);

      const tenantPath = docRef.path.split("/investments")[0];
      const ledgerRef = collection(db, tenantPath, "ledger");
      await addDoc(ledgerRef, {
        entity_type: "Investment",
        entity_id: id,
        note: `Investment ${id} updated: ${Object.keys(rest).join(", ")}`,
        created_at: serverTimestamp(),
        user_id: user?.uid || "system"
      });
    } catch (err) {
      console.error("Update investment error:", err);
      throw err;
    }
  };

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
    return chain.sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return da - db;
    });
  };

  const handleExport = (format) => {
    const isPivot = scheduleView === "pivot";
    let data = [];
    let headers = [];
    let title = `PaymentSchedule_${isPivot ? "Pivot" : "Table"}_${new Date().toISOString().split('T')[0]}`;

    if (isPivot) {
      headers = ["First Name", "Last Name", "Type", "Start Date", "Payment Date", "Freq", "Rate", "Schedule", "Payment Method", ...pivotData.dates, "Total"];
      data = filteredPivotRows.map(row => {
        let rowTotal = 0;
        const rowData = [
          row.firstName,
          row.lastName,
          (row.type || "").replace(/_/g, ' '),
          row.startDate,
          row.endDate,
          row.freq,
          (row.rate || 0) + "%",
          row.scheduleId,
          row.paymentMethod
        ];
        pivotData.dates.forEach(date => {
          const val = pivotData.data[`${row.key}|||${date}`]?.amount || 0;
          rowTotal += val;
          rowData.push(fmtCurrency(val));
        });
        rowData.push(fmtCurrency(rowTotal));
        return rowData;
      });
    } else {
      headers = ["First Name", "Last Name", "Deal Name", "Start Date", "Payment Date", "Type", "Freq", "Amount", "Status", "Notes"];
      data = rowData.map(s => {
        const contact = CONTACTS.find(x => x.id === s.contact_id);
        const dealObj = DEALS.find(x => x.id === s.deal_id);
        const inv = INVESTMENTS.find(x => x.id === s.investment_id || x.id === s.investment);
        const name = contact?.name || s.contact_name || s.investor || "";
        const { firstName, lastName } = contact?.first_name ? { firstName: contact.first_name, lastName: contact.last_name || "" } : splitInvestorName(name);
        const dealName = dealObj ? (dealObj.deal_name || dealObj.name) : (s.deal_id || "—");
        const type = (s.payment_type || s.type || "").replace(/_/g, ' ');
        const isPrincipalPayment = type.toLowerCase() === "investor principal payment";
        const startDate = isPrincipalPayment ? (s.dueDate || s.due_date || "—") : (() => {
          const val = s.term_start || "—";
          const start = inv?.start_date;
          return (start && val !== "—" && val < start) ? start : val;
        })();
        const paymentDate = (() => {
          const val = s.dueDate || s.due_date || "—";
          const end = inv?.maturity_date;
          return (end && val !== "—" && val > end) ? end : val;
        })();
        const freq = s.frequency || inv?.freq || inv?.payment_frequency || s.freq || "—";
        return [
          firstName,
          lastName,
          dealName,
          startDate,
          paymentDate,
          type,
          freq,
          fmtCurrency(s.signed_payment_amount || 0),
          s.status || "—",
          s.notes || "—"
        ];
      });
    }

    if (format === 'csv') {
      const csvContent = [headers, ...data].map(e => e.map(f => `"${String(f || "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${title}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Schedules");
      XLSX.writeFile(wb, `${title}.xlsx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text(`Payment Schedule (${isPivot ? "Pivot" : "Table"})`, 14, 15);
      doc.setFontSize(10);
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 22,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        margin: { top: 20 }
      });
      doc.save(`${title}.pdf`);
    } else if (format === 'docx') {
      const tableRows = data.map(rowData => new TableRow({
        children: rowData.map(cell => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(cell || ""), size: 16 })] })],
          width: { size: 100 / headers.length, type: WidthType.PERCENTAGE }
        }))
      }));

      const headerRow = new TableRow({
        children: headers.map(h => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
          shading: { fill: "4F46E5" },
          width: { size: 100 / headers.length, type: WidthType.PERCENTAGE }
        }))
      });

      const docObj = new Document({
        sections: [{
          properties: { page: { size: { orientation: "landscape" } } },
          children: [
            new Paragraph({ text: `Payment Schedule`, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [headerRow, ...tableRows]
            })
          ]
        }]
      });

      Packer.toBlob(docObj).then(blob => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `${title}.docx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  };

  const pivotOffsets = useMemo(() => {
    const offsets = [0];
    let current = 0;
    for (let i = 0; i < pivotColWidths.length - 1; i++) {
      current += pivotColWidths[i];
      offsets.push(current);
    }
    return offsets;
  }, [pivotColWidths]);

  const handleResize = (index, e) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = pivotColWidths[index];

    const onMouseMove = (moveEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
      setPivotColWidths(prev => {
        const next = [...prev];
        next[index] = newWidth;
        return next;
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleDateResize = (e) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = pivotDateWidth;

    const onMouseMove = (moveEvent) => {
      const newWidth = Math.max(60, startWidth + (moveEvent.pageX - startX));
      setPivotDateWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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
        basePayment: 0,
        term_start: "",
        term_end: ""
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
    // Round to 2 decimals to avoid floating point precision errors
    const signedAmt = Number(((dir === "IN") ? finalAmtAbs : -finalAmtAbs).toFixed(2));
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

    const updates = { fee_ids: newFeeIds, notes, signed_payment_amount: signedAmt, basePayment: baseAmt };

    // Status-based zeroing override
    if (ZEROING_STATUSES.includes(currentData.status)) {
      updates.signed_payment_amount = 0;
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

    // Safety: don't undo if there's a newer version (prevent inconsistent state)
    const newerVersion = SCHEDULES.find(x => x.previous_version_id === s.docId || (x.schedule_id === s.schedule_id && Number(x.version_num) > Number(s.version_num)));
    if (newerVersion && newerVersion.active_version) {
      showDialog(`Cannot undo V${s.version_num} because there is a newer active version (V${newerVersion.version_num}). Please undo the latest version first.`);
      return;
    }

    let title = "Undo Action";
    let message = `Are you sure you want to undo the last action for ${s.schedule_id}?`;

    if (isVersioned) {
      title = "Revert to Previous Version";
      message = `This will delete current (V${s.version_num}) and reactivate previous version (V${Number(s.version_num) - 1}) with its original data. Are you sure?`;
    }

    const onConfirmUndo = async () => {
      setDialog(null);
      try {
        console.log("[Undo] Starting for:", s.schedule_id, "v:", s.version_num);
        if (!s.docId && !s._path) {
          showDialog("Undo failed: Document ID not found", "Error");
          return;
        }

        const ref = s._path ? doc(db, s._path) : doc(db, collectionPath, s.docId);

        if (isVersioned && s.previous_version_id) {
          const prev = SCHEDULES.find(x => x.docId === s.previous_version_id || x.version_id === s.previous_version_id);
          if (!prev) {
            showDialog(`Undo failed: Could not find the previous version record in the cache. Please refresh.`, "Error");
            return;
          }

          const prevRef = prev._path ? doc(db, prev._path) : doc(db, collectionPath, prev.docId);
          const restorePayload = {
            active_version: true,
            updated_at: serverTimestamp(),
            replaced_at: null,
            replaced_by: null,
            linked_schedule_id: ""
          };
          
          if (s._undo_snapshot) {
            Object.assign(restorePayload, s._undo_snapshot);
          } else {
            restorePayload.status = (prev.status === "REPLACED") ? "Due" : prev.status;
          }

          await updateDoc(prevRef, restorePayload);

          // Cleanup: delete any child replacement created by the undone version
          // Check both the current version and the predecessor for the link
          const childId = s.linked_schedule_id || prev.linked_schedule_id;
          if (childId) {
            const childReplacement = SCHEDULES.find(x => x.schedule_id === childId);
            if (childReplacement) {
              const cRef = childReplacement._path ? doc(db, childReplacement._path) : doc(db, collectionPath, childReplacement.docId);
              await deleteDoc(cRef);
            }
          }
          // Robust cleanup: find any other schedules that link to this one as their parent/source
          const orphanChildren = SCHEDULES.filter(x => x.linked === s.schedule_id);
          for (const child of orphanChildren) {
             const cRef = child._path ? doc(db, child._path) : doc(db, collectionPath, child.docId);
             await deleteDoc(cRef);
          }

          await deleteDoc(ref);
          showDialog(`Succeeded! Reverted ${s.schedule_id} to V${prev.version_num}.`, "Success");
        } 
        else if (isReplacement) {
           await deleteDoc(ref);
           if (s.linked) {
              const parent = SCHEDULES.find(x => x.schedule_id === s.linked);
              if (parent) {
                 const pRef = parent._path ? doc(db, parent._path) : doc(db, collectionPath, parent.docId);
                 await updateDoc(pRef, { linked_schedule_id: "", updated_at: serverTimestamp() });
              }
           }
           showDialog(`Succeeded! Deleted replacement schedule ${s.schedule_id}.`, "Success");
        }
        else if (hasSnapshot) {
          await updateDoc(ref, { ...s._undo_snapshot, _undo_snapshot: null, updated_at: serverTimestamp() });
          showDialog(`Succeeded! Restored ${s.schedule_id} to previous state.`, "Success");
        }
      } catch (err) {
        console.error("[Undo] Error:", err);
        showDialog(`Undo failed: ${err.message}`, "Error");
      }
    };

    showDialog(message, title, "confirm", onConfirmUndo);
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
      contact_id: d.contact_id || "",
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
      rollover: !!d.rollover,
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
          contact_id: original.contact_id || null,
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

    // Rollover Workflow
    if (modal.mode === "edit" && d.status === "Rollover" && d.status !== d.originalStatus) {
      const onConfirmRollover = async () => {
        setDialog(null);
        try {
          const originalSchedule = SCHEDULES.find(x => x.docId === docRefId || x.schedule_id === d.schedule_id);
          if (!originalSchedule) { showDialog("Could not find original schedule.", "Error"); return; }

          const ref = originalSchedule._path ? doc(db, originalSchedule._path) : doc(db, collectionPath, originalSchedule.docId);
          const newVersionNum = Number(originalSchedule.version_num || 1) + 1;

          let previousVersionId = originalSchedule.version_id;
          if (!previousVersionId) previousVersionId = `${originalSchedule.schedule_id}-V1`;

          const v2 = {
            schedule_id: originalSchedule.schedule_id,
            investment_id: originalSchedule.investment || "",
            deal_id: originalSchedule.deal_id || "",
            contact_id: originalSchedule.contact_id || "",
            due_date: originalSchedule.dueDate || null,
            payment_type: originalSchedule.type || "",
            direction_from_company: originalSchedule.direction || "",
            period_number: originalSchedule.period_number ? Number(originalSchedule.period_number) : null,
            principal_amount: 0,
            payment_amount: 0,
            signed_payment_amount: 0,
            fee_id: originalSchedule.fee_id || null,
            status: "Rollover",
            notes: d.notes || `Rollover for ${originalSchedule.schedule_id}`,
            applied_to: originalSchedule.applied_to || "",
            term_start: originalSchedule.term_start || null,
            term_end: originalSchedule.term_end || null,
            version_num: newVersionNum,
            version_id: `${originalSchedule.schedule_id}-V${newVersionNum}`,
            payment_id: originalSchedule.schedule_id,
            original_payment_amount: originalSchedule.original_payment_amount || originalSchedule.payment || 0,
            active_version: true,
            rollover: true,
            previous_version_id: previousVersionId,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            updated_by: user?.displayName || user?.email || user?.uid || "system"
          };

          await addDoc(ref.parent, v2);
          await updateDoc(ref, {
            active_version: false,
            status: "REPLACED",
            replaced_at: serverTimestamp(),
            replaced_by: user?.uid || "system",
            updated_at: serverTimestamp()
          });

          showDialog(`Rollover V${newVersionNum} created for ${originalSchedule.schedule_id}.`, "Success");
        } catch (err) {
          console.error("Rollover error:", err);
          showDialog(`Rollover failed: ${err.message}`, "Error");
        }
      };

      showDialog(`Create a Rollover record (V${Number(d.version_num || 1) + 1}) for ${d.schedule_id}? The original will be marked as Replaced.`, "Rollover Principal", "confirm", onConfirmRollover);
      return;
    }

    // Missed Payment Workflow (only Missed now, Cancelled removed)
    if (modal.mode === "edit" && d.status === "Missed" && d.status !== d.originalStatus) {
        const onConfirmMissed = async () => {
        setDialog(null);
        try {
          const originalSchedule = SCHEDULES.find(x => x.docId === d.docId || x.schedule_id === d.schedule_id);
          const rawOrigAmt = originalSchedule?.original_payment_amount ||
            originalSchedule?.payment_amount ||
            originalSchedule?.payment || d.payment || 0;
          const origPaymentNum = Math.abs(Number(String(rawOrigAmt).replace(/[^0-9.-]/g, "")));
          const formattedOrigAmt = `$${origPaymentNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          const ref = d._path ? doc(db, d._path) : doc(db, collectionPath, docRefId);
          const newVersionNum = Number(d.version_num || 1) + 1;

          let previousVersionId = d.version_id;
          if (!previousVersionId && Number(d.version_num || 1) === 1) {
            previousVersionId = `${d.schedule_id}-V1`;
          }
          if (!previousVersionId) {
            previousVersionId = docRefId;
          }

          const newVerRef = await addDoc(ref.parent, {
            ...payload,
            version_num: newVersionNum,
            version_id: `${payload.schedule_id}-V${newVersionNum}`,
            active_version: true,
            previous_version_id: previousVersionId,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            updated_by: user?.displayName || user?.email || user?.uid || "system"
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
            payment_amount: originalSchedule?.payment_amount || originalSchedule?.original_payment_amount || d.payment || 0,
            original_payment_amount: originalSchedule?.original_payment_amount || originalSchedule?.payment_amount || d.payment || 0,
            notes: `Missed payment replacement for ${d.schedule_id} ${formattedOrigAmt}`,
          };
          const updates = recalcReplacement(initialData, []);
          setModal({
            open: true,
            mode: "add_late",
            originalDocId: newVerRef.id,
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
          showDialog(`Missed status versioned to V${newVersionNum}. Now booking replacement...`, "Success");
        } catch (err) { 
          console.error("Save schedule error:", err);
          showDialog(`Workflow failed: ${err.message}`, "Error");
        }
      };

      showDialog(`Do you want to set "Missed" payment and book a replacement schedule?`, "Replacement Schedule", "confirm", onConfirmMissed);
      return;
    }

    // Partial Payment Workflow
    if (modal.mode === "edit" && d.status === "Partial" && d.status !== d.originalStatus) {
        const onConfirmPartial = async () => {
        setDialog(null);
        try {
          const originalSchedule = SCHEDULES.find(x => x.docId === d.docId || x.schedule_id === d.schedule_id);
          const rawOrigAmt = originalSchedule?.original_payment_amount ||
            originalSchedule?.payment_amount ||
            originalSchedule?.payment || d.payment || 0;
          const origPaymentNum = Math.abs(Number(String(rawOrigAmt).replace(/[^0-9.-]/g, "")));
          const formattedOrigAmt = `$${origPaymentNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          const ref = d._path ? doc(db, d._path) : doc(db, collectionPath, docRefId);
          const newVersionNum = Number(d.version_num || 1) + 1;

          let previousVersionId = d.version_id;
          if (!previousVersionId && Number(d.version_num || 1) === 1) {
            previousVersionId = `${d.schedule_id}-V1`;
          }
          if (!previousVersionId) {
            previousVersionId = docRefId;
          }

          const newVerRef = await addDoc(ref.parent, {
            ...payload,
            version_num: newVersionNum,
            version_id: `${payload.schedule_id}-V${newVersionNum}`,
            active_version: true,
            previous_version_id: previousVersionId,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            updated_by: user?.displayName || user?.email || user?.uid || "system"
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
            payment_amount: originalSchedule?.payment_amount || originalSchedule?.original_payment_amount || d.payment || 0,
            original_payment_amount: originalSchedule?.original_payment_amount || originalSchedule?.payment_amount || d.payment || 0,
            notes: `Partial payment replacement for ${d.schedule_id} ${formattedOrigAmt}`,
          };
          const updatesPartial = recalcReplacement(initialDataPartial, []);
          setModal({
            open: true,
            mode: "add_partial",
            originalDocId: newVerRef.id,
            data: { ...initialDataPartial, ...updatesPartial }
          });
        } catch (err) { console.error("Update partial error:", err); }
      };

      showDialog(`Do you want to set "Partial" payment and book a partial replacement schedule?`, "Partial Replacement", "confirm", onConfirmPartial);
      return;
    }

    try {
      if (modal.mode === "edit" && docRefId) {
        // Versioning Logic:
        // Instead of updating the document in place, we create a new version
        // and mark the old one as "replaced" and inactive.

        console.log("[Save Edit] Debug:", {
          "d.version_id": d.version_id,
          "d.docId": d.docId,
          "d.id": d.id,
          "docRefId": docRefId,
          "d.schedule_id": d.schedule_id,
          "d.version_num": d.version_num
        });

        const oldRef = d._path ? doc(db, d._path) : doc(db, collectionPath, docRefId);
        const newVersionNum = Number(d.version_num || 1) + 1;

        // Determine the correct previous_version_id
        // Priority: 1) d.version_id (preferred), 2) construct from schedule_id if version_num=1, 3) fallback to docRefId
        let previousVersionId = d.version_id;
        if (!previousVersionId && Number(d.version_num || 1) === 1) {
          // If this is upgrading V1 to V2, construct the V1 version_id
          previousVersionId = `${d.schedule_id}-V1`;
        }
        if (!previousVersionId) {
          // Final fallback to Firestore docId
          previousVersionId = docRefId;
        }

        console.log("[Save Edit] Computed previous_version_id:", previousVersionId);

        // 1. Create the new version
        const newPayload = {
          ...payload,
          version_num: newVersionNum,
          version_id: `${payload.schedule_id}-V${newVersionNum}`,
          active_version: true,
          previous_version_id: previousVersionId,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          updated_by: user?.displayName || user?.email || user?.uid || "system"
        };
        
        // Use the same collection as the predecessor for the new version
        const collectionRef = oldRef.parent;
        await addDoc(collectionRef, newPayload);

        // SYNC Rollover back to Investment
        if (d.type === "INVESTOR_PRINCIPAL_PAYMENT" && d.investment) {
          const inv = INVESTMENTS.find(i => i.id === d.investment || i.investment_id === d.investment);
          if (inv) {
            // Determine investment collection (investments or tenant-specific)
            let rawPath = inv._path || `investments/${inv.docId || inv.id}`;
            // If the schedule path is tenants/XXX/schedules, the investment path might be tenants/XXX/investments
            if (oldRef.path.startsWith("tenants/")) {
              const tenantPart = oldRef.path.split("/")[1];
              rawPath = `tenants/${tenantPart}/investments/${inv.docId || inv.id}`;
            }
            await updateDoc(doc(db, rawPath), { rollover: !!d.rollover, updated_at: serverTimestamp() }).catch(e => console.error("Sync inv rollover error:", e));
          }
        }

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
      showDialog(`Failed to save schedule: ${err.message || 'Unknown error'}`, "Error");
    }
    close();
  };

  const handleDeleteSchedule = async () => {
    console.log("[DELETE] delT:", JSON.stringify(delT));
    console.log("[DELETE] collectionPath:", collectionPath);
    if (!delT || !delT.docId) {
      console.error("[DELETE] ABORTED: missing delT or delT.docId", delT);
      showDialog("Delete failed: schedule reference is missing. Check console for details.", "Error");
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
      showDialog(`Delete failed: ${err.code || err.message}. Check browser console (F12) for details.`, "Error");
    }
  };
  const [bulkStatus, setBulkStatus] = useState("");
  const handleBulkStatus = (status) => {
    if (!status || sel.size === 0) return;
    showDialog(`Are you sure you want to update status to "${status}" for ${sel.size} schedule(s)?`, "Update Status", "confirm", async () => {
      setDialog(null);
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
      } catch (err) { 
        console.error("Bulk status update error:", err); 
      }
    }
    );
  };
  const handleBulkDelete = () => {
    if (sel.size === 0) return;
    showDialog(`Are you sure you want to delete ${sel.size} schedule(s)? This action cannot be undone.`, "Delete Schedules", "confirm", async () => {
      setDialog(null);
      try {
        const deletePromises = [];
        [...sel].forEach(sid => {
          const versions = SCHEDULES.filter(s => s.schedule_id === sid);
          versions.forEach(v => {
            const ref = v._path ? doc(db, v._path) : doc(db, collectionPath, v.docId);
            deletePromises.push(deleteDoc(ref));
          });
        });
        await Promise.all(deletePromises);
        setSel(new Set());
      } catch (err) {
        console.error("Bulk delete error:", err);
        showDialog("Failed to delete schedule(s). You may not have permission to perform this action.", "Error");
      }
    }
    );
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
      
      // Combined Filter Logic
      const ty = (s.payment_type || s.type || "").toLowerCase();
      const st = (s.status || "").toLowerCase();

      if (activeFilter === "Interest") {
        if (!(ty.includes("interest") || ty.includes("distribution") || (ty.includes("payment") && !ty.includes("principal")))) return false;
      } else if (activeFilter === "Principal") {
        if (!(ty.includes("principal") || ty.includes("deposit") || ty.includes("received") || ty.includes("disbursement"))) return false;
      } else if (activeFilter === "Fee") {
        if (!(ty.includes("fee") || s.fee_id || s.feeId)) return false;
      } else if (activeFilter === "Due") {
        if (st !== "due") return false;
      } else if (activeFilter === "Withdrawal") {
        const isWithdrawal = ty.includes("withdrawal") || ty.includes("withdrawl") || st.includes("withdrawal") || st.includes("withdrawl");
        if (!isWithdrawal) return false;
      } else if (activeFilter === "Missed") {
        if (st !== "missed") return false;
      }

      return true;
    });

    if (showHistory) {
      // Mark inactive records that are genuine older versions of a schedule
      // (i.e., there's an active record with the same schedule_id in the current view)
      const activeScheduleIds = new Set(
        filtered.filter(s => s.active_version !== false).map(s => s.schedule_id)
      );
      filtered = filtered.map(s =>
        s.active_version === false
          ? { ...s, _is_replaced_version: activeScheduleIds.has(s.schedule_id) }
          : s
      );

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
  }, [SCHEDULES, showHistory, activeFilter]);

  // Pivot data for distribution chart view
  const pivotData = useMemo(() => {
    if (!rowData.length) return { rows: [], dates: [], data: {} };

    // Get unique investor+type combinations, dates, and data
    const rowSet = new Set();
    const dateSet = new Set();
    const dataMap = {};
    const rowMetadata = {};

    // Helper function to parse currency string like "$8,000.00"
    const parseCurrency = (value) => {
      if (value === undefined || value === null || value === "") return 0;
      if (typeof value === 'number') return value;
      const cleaned = String(value).replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    rowData.forEach(schedule => {
      const investor = CONTACTS.find(c => c.id === schedule.contact_id || c.docId === schedule.contact_id);
      const contactId = investor?.id || investor?.docId || schedule.contact_id || "unknown";

      const inv = INVESTMENTS.find(iv => iv.id === (schedule.investment_id || schedule.investment));
      const invStart = inv?.start_date || "";
      const invEnd = inv?.maturity_date || "";

      let rawDueDate = schedule.dueDate || schedule.due_date || "No Date";
      if (invEnd && rawDueDate !== "No Date" && rawDueDate > invEnd) rawDueDate = invEnd;
      const dueDate = rawDueDate;
      let paymentType = schedule.type || schedule.payment_type || "Unknown Type";
      const hasFeeRef = schedule.fee_id || schedule.feeId || schedule.fee_name || schedule.feeName;
      if (hasFeeRef) {
        const fId = (schedule.fee_id || schedule.feeId || "");
        const fee = fId ? (FEES_DATA.find(f => f.id === fId) || FEES_DATA.find(f => f.docId === fId)) : null;
        let resolvedName = (schedule.fee_name || schedule.feeName || "").trim();
        if (!resolvedName && fee) resolvedName = fee.name;
        if (resolvedName) paymentType = resolvedName;
      }

      let amount = parseCurrency(schedule.signed_payment_amount || schedule.signedPaymentAmount || schedule.amount || schedule.payment_amount);

      const freq = inv?.freq || "—";
      const rate = (inv?.rate || schedule?.rate || "—");
      const paymentMethod = inv?.payment_method || investor?.payment_method || "—";

      const rowKey = `${String(contactId).trim()}|||${String(paymentType).trim()}|||${String(freq).trim()}|||${String(rate).trim()}|||${String(paymentMethod).trim()}`;
      rowSet.add(rowKey);
      dateSet.add(dueDate);

      if (!rowMetadata[rowKey]) {
        const { firstName, lastName } = investor?.first_name ? { firstName: investor.first_name, lastName: investor.last_name || "" } : splitInvestorName(investor?.name || schedule.contact_id || "");
        rowMetadata[rowKey] = {
          firstName,
          lastName,
          startDate: inv?.start_date || "—",
          endDate: inv?.maturity_date || "—",
          freq,
          rate,
          paymentMethod,
          scheduleId: schedule.investment_id || schedule.investment || "—",
          contactId
        };
      }

      const cellKey = `${rowKey}|||${dueDate}`;
      if (!dataMap[cellKey]) dataMap[cellKey] = { amount: 0, records: [] };
      dataMap[cellKey].amount += amount;

      let termStart = schedule.term_start || "—";
      if (invStart && termStart !== "—" && termStart < invStart) termStart = invStart;

      let finalTermStart = termStart;
      const typeStr = (paymentType || "").toString().toLowerCase().replace(/_/g, " ");
      if (typeStr === "investor principal payment") finalTermStart = dueDate;

      dataMap[cellKey].records.push({
        ...schedule,
        startDate: finalTermStart,
        rate: rowMetadata[rowKey].rate,
        freq: rowMetadata[rowKey].freq
      });
    });

    const rows = Array.from(rowSet).map(key => {
      const meta = rowMetadata[key];
      return {
        firstName: meta.firstName,
        lastName: meta.lastName,
        type: key.split('|||')[1],
        key,
        ...meta
      };
    }).sort((a, b) => {
      if (a.firstName !== b.firstName) return a.firstName.localeCompare(b.firstName);
      if (a.lastName !== b.lastName) return a.lastName.localeCompare(b.lastName);
      return a.type.localeCompare(b.type);
    });

    const dates = Array.from(dateSet).sort();
    return { rows, dates, data: dataMap };
  }, [rowData, CONTACTS, INVESTMENTS, FEES_DATA]);

  const filteredPivotRows = useMemo(() => {
    const filtered = pivotData.rows.filter(row => {
      const matchFirstName = !pivotFilters.firstName || row.firstName?.toLowerCase().includes(pivotFilters.firstName.toLowerCase());
      const matchLastName = !pivotFilters.lastName || row.lastName?.toLowerCase().includes(pivotFilters.lastName.toLowerCase());
      const matchType = !pivotFilters.type || row.type?.replace(/_/g, ' ').toLowerCase().includes(pivotFilters.type.replace(/_/g, ' ').toLowerCase());
      const matchStart = !pivotFilters.startDate || row.startDate?.toLowerCase().includes(pivotFilters.startDate.toLowerCase());
      const matchEnd = !pivotFilters.endDate || row.endDate?.toLowerCase().includes(pivotFilters.endDate.toLowerCase());
      const matchFreq = !pivotFilters.freq || row.freq?.toLowerCase().includes(pivotFilters.freq.toLowerCase());
      const matchRate = !pivotFilters.rate || String(row.rate)?.toLowerCase().includes(pivotFilters.rate.toLowerCase());
      const matchSchedule = !pivotFilters.schedule || row.scheduleId?.toLowerCase().includes(pivotFilters.schedule.toLowerCase());
      const matchMethod = !pivotFilters.paymentMethod || row.paymentMethod?.toLowerCase().includes(pivotFilters.paymentMethod.toLowerCase());

      return matchFirstName && matchLastName && matchType && matchStart && matchEnd && matchFreq && matchRate && matchSchedule && matchMethod;
    });

    let currentInv = null;
    let currentIdx = -1;
    return filtered.map(r => {
      const fullName = r.firstName + " " + r.lastName;
      if (fullName !== currentInv) {
        currentInv = fullName;
        currentIdx++;
      }
      return { ...r, groupIndex: currentIdx };
    });
  }, [pivotData.rows, pivotFilters]);

  // Column definitions
  const permissions = { canUpdate, canDelete };
  const context = useMemo(() => ({
    isDark,
    t,
    permissions,
    feesData: FEES_DATA,
    INVESTMENTS,
    CONTACTS,
    DEALS,
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
      onContactClick: (contactId) => {
        const contact = CONTACTS.find(x => x.id === contactId);
        if (contact) setDetailContact(contact);
      },
      onFeeClick: (feeId) => {
        const fids = String(feeId).split(",").filter(Boolean);
        if (fids.length > 0) {
          const fees = fids.map(id => FEES_DATA.find(x => x.id === id)).filter(Boolean);
          if (fees.length > 0) setDrillFee(fees);
        }
      },
      onDealClick: (dealId) => {
        if (dealId && setSelectedDealId && setActivePage) {
          setSelectedDealId(dealId);
          setActivePage("Deal Summary");
        }
      },
      onEdit: openEdit,
      onDelete: setDelT,
      onUndo: handleUndo
    },
    USERS
  }), [isDark, t, permissions, FEES_DATA, SCHEDULES, INVESTMENTS, CONTACTS, DEALS, USERS]);

  const columnDefs = useMemo(() => {
    return getScheduleColumns(permissions, isDark, t, context);
  }, [permissions, isDark, t, context]);

  const memoDrillDownColumnDefs = useMemo(() => {
    return columnDefs.map(col => {
      if (col.id === 'status') {
        return {
          ...col,
          cell: ({ row }) => {
            const val = row.original.status;
            return (
              <select
                value={val || ""}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  const s = row.original;
                  if (s && s.docId) {
                    try {
                      const ref = s._path ? doc(db, s._path) : doc(db, collectionPath, s.docId);
                      await updateDoc(ref, { status: newStatus, updated_at: serverTimestamp() });
                    } catch (err) {
                      console.error("Update error:", err);
                    }
                  }
                }}
                style={{ 
                  fontSize: 11, 
                  fontWeight: 600,
                  padding: "4px 8px", 
                  borderRadius: 6, 
                  border: `1px solid ${t.surfaceBorder}`, 
                  background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                  color: t.text,
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {paymentStatusOpts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            );
          }
        };
      }
      return col;
    });
  }, [columnDefs, isDark, t, paymentStatusOpts]);

  const handleDistMemoBulkStatus = (status) => {
    if (!status || distMemoSel.size === 0) return;
    showDialog(`Update status to "${status}" for ${distMemoSel.size} selected schedule(s)?`, "Bulk Status Update", "confirm", async () => {
      setDialog(null);
      try {
        await Promise.all([...distMemoSel].map(sid => {
          const s = distMemoDrillDown.schedules.find(s => s.schedule_id === sid);
          if (s && s.docId) {
            const ref = s._path ? doc(db, s._path) : doc(db, collectionPath, s.docId);
            return updateDoc(ref, { status, updated_at: serverTimestamp() });
          }
          return Promise.resolve();
        }));
        setDistMemoSel(new Set());
        setDistMemoBulkStatus("");
      } catch (err) {
        console.error("Bulk status update error:", err);
        showDialog("Failed to update status for selected schedules.", "Error");
      }
    });
  };

  const statsBaseData = useMemo(() => {
    return SCHEDULES.filter(s => {
      if (!showHistory && s.active_version === false) return false;
      
      const ty = (s.payment_type || s.type || "").toLowerCase();
      const st = (s.status || "").toLowerCase();

      if (activeFilter === "Interest") {
        if (!(ty.includes("interest") || ty.includes("distribution") || (ty.includes("payment") && !ty.includes("principal")))) return false;
      } else if (activeFilter === "Principal") {
        if (!(ty.includes("principal") || ty.includes("deposit") || ty.includes("received") || ty.includes("disbursement"))) return false;
      } else if (activeFilter === "Fee") {
        if (!(ty.includes("fee") || s.fee_id || s.feeId)) return false;
      } else if (activeFilter === "Due") {
        if (st !== "due") return false;
      } else if (activeFilter === "Withdrawal") {
        const isWithdrawal = ty.includes("withdrawal") || ty.includes("withdrawl") || st.includes("withdrawal") || st.includes("withdrawl");
        if (!isWithdrawal) return false;
      } else if (activeFilter === "Missed") {
        if (st !== "missed") return false;
      }

      return true;
    });
  }, [SCHEDULES, showHistory, activeFilter]);

  const statsData = [
    { label: "Total", value: statsBaseData.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
    { label: "Due", value: statsBaseData.filter(s => s.status === "Due").length, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" },
    { label: "Paid", value: statsBaseData.filter(s => s.status === "Paid").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
    { label: "Missed", value: statsBaseData.filter(s => s.status === "Missed").length, accent: isDark ? "#F87171" : "#DC2626", bg: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2", border: isDark ? "rgba(248,113,113,0.15)" : "#FECACA" }
  ];
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Payment Schedule</h1>
        <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage payment schedules and statuses</p>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {sel.size > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.surfaceBorder}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{sel.size} selected</span>
          <button onClick={() => setSel(new Set())} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.textMuted, border: `1px solid ${t.surfaceBorder}`, cursor: "pointer", marginRight: 8 }}>Clear</button>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 7, border: `1px solid ${t.surfaceBorder}`, background: t.searchBg, color: t.searchText, cursor: "pointer" }}>
            <option value="" disabled>Update status...</option>
            {paymentStatusOpts.filter(s => s !== "Missed" && s !== "Partial" && s !== "").map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => handleBulkStatus(bulkStatus)} disabled={!bulkStatus} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 11, background: bulkStatus ? t.accentGrad : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"), color: bulkStatus ? "#fff" : t.textMuted, border: "none", cursor: bulkStatus ? "pointer" : "default", boxShadow: bulkStatus ? `0 4px 12px ${t.accentShadow || "none"}` : "none" }}>Apply</button>
          <div style={{ width: 1, height: 20, background: t.surfaceBorder }} />
          {canDelete && <button onClick={handleBulkDelete} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 11, background: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "#FECACA"}`, cursor: "pointer" }}>Delete ({sel.size})</button>}
        </div>}
        {canCreate && <Tooltip text="Add a manual payment schedule entry" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Schedule</button></Tooltip>}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>{statsData.map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}</div>

    {/* Tab & Filter Consolidation Row */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 20, borderBottom: `1px solid ${t.surfaceBorder}` }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 24, alignSelf: "flex-end" }}>
        {[
          { key: "memo", label: "Distribution View" },
          { key: "table", label: "Table View" },
          { key: "pivot", label: "Pivot View" },
        ].map(({ key, label }) => (
          <div
            key={key}
            onClick={() => setScheduleView(key)}
            style={{
              padding: "10px 0 12px 0",
              fontSize: 15,
              fontWeight: 600,
              color: scheduleView === key ? t.text : t.textMuted,
              cursor: "pointer",
              position: "relative",
              transition: "all 0.2s ease"
            }}
          >
            {label}
            {scheduleView === key && <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: t.accent }} />}
          </div>
        ))}
      </div>

      {/* Unified Filters */}
      {scheduleView !== "memo" ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, justifyContent: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginRight: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Filter By:</span>
        {["All", "Interest", "Principal", "Fee", "Due", "Withdrawal", "Missed"].map(f => {
          const isA = activeFilter === f;
          return (
            <span
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.2s",
                background: isA ? t.accent : t.chipBg,
                color: isA ? "#fff" : t.textSecondary,
                border: `1px solid ${isA ? t.accent : t.chipBorder}`,
                boxShadow: isA ? `0 2px 8px ${t.accent}40` : "none"
              }}
            >
              {f}
            </span>
          );
        })}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, justifyContent: "flex-end", marginRight: 20 }}>
           <button 
             onClick={() => setDistMemoModal({ open: true, mode: "add", data: { deal_id: selectedDealId, status: paymentStatusOpts, payment_method: "" } })} 
             style={{ 
               background: t.accentGrad || t.accent, 
               color: "#fff", 
               border: "none", 
               padding: "10px 20px", 
               borderRadius: 11, 
               fontSize: 13, 
               fontWeight: 600, 
               boxShadow: `0 4px 16px ${t.accentShadow || "none"}`, 
               display: "flex", 
               alignItems: "center", 
               gap: 7 
             }}
           >
             <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Distribution Memo
           </button>
        </div>
      )}

      {/* Export Dropdown */}
      {scheduleView !== "memo" && (
        <div style={{ position: "relative" }} ref={exportMenuRef}>
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
            color: t.text, border: `1px solid ${t.surfaceBorder}`, cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s"
          }}
        >
          <Download size={16} /> Export <ChevronDown size={14} style={{ transform: showExportMenu ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }} />
        </button>
        {showExportMenu && (
          <div style={{
            position: "absolute", top: "110%", right: 0, zIndex: 100, width: 220, background: isDark ? "#1A1A1A" : "#fff",
            border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", padding: "8px 0", overflow: "hidden"
          }}>
            <div style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Export Data</div>
            {[
              { id: 'excel', label: 'Excel File (.xlsx)' },
              { id: 'pdf', label: 'PDF Report (.pdf)' },
              { id: 'word', label: 'Word Document (.docx)' }
            ].map(opt => (
              <div
                key={opt.id}
                onClick={() => { handleExport(opt.id); setShowExportMenu(false); }}
                style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: t.text, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10 }}
                onMouseEnter={e => e.target.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"}
                onMouseLeave={e => e.target.style.background = "transparent"}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>Show Version History</span>
        <div onClick={() => setShowHistory(!showHistory)} style={{ width: 34, height: 18, borderRadius: 20, background: showHistory ? t.accent : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"), position: "relative", cursor: "pointer", transition: "all 0.2s" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: showHistory ? 18 : 2, transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </div>
      </div>
    </div>

    {scheduleView === "memo" ? (
      <div style={{ height: "calc(100vh - 430px)", width: "100%" }}>
        <TanStackTable
          key="dist-memo-table"
          data={distMemos}
          columns={getDistributionMemoColumns(isDark, t, {
            SCHEDULES,
            INVESTMENTS,
            CONTACTS,
            callbacks: {
              onMemoClick: (memo, linked) => setDistMemoDrillDown({ open: true, memo, schedules: linked }),
              onEdit: (row) => setDistMemoModal({ open: true, mode: "edit", data: { ...row } }),
              onDelete: (row) => setDistMemoDelT(row),
              onClone: (row) => handleCloneDistMemo(row),
            }
          })}
          pageSize={50}
          t={t}
          isDark={isDark}
        />
      </div>
    ) : scheduleView === "table" ? (
      <div style={{ height: "calc(100vh - 430px)", width: "100%" }}>
        <TanStackTable
          data={rowData}
          columns={columnDefs}
          isDark={isDark}
          t={t}
          pageSize={pageSize}
          initialSorting={[{ id: 'dueDate', desc: false }]}
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
    ) : (
      <div style={{
        background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
        border: `1px solid ${t.surfaceBorder}`,
        borderRadius: 12,
        padding: 24,
        overflow: "auto",
        maxHeight: "calc(100vh - 280px)",
        position: "relative"
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 20 }}>
          Payment Pivot Table
        </h3>

        {pivotData.rows.length > 0 ? (
          <div style={{ overflow: "auto", maxHeight: "calc(100vh - 500px)", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, background: isDark ? "#121212" : "#fff" }}>
            <table style={{
              width: "max-content",
              minWidth: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 12
            }}>
              <thead>
                <tr style={{
                  background: isDark ? "#262626" : "#F9FAFB",
                }}>
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: t.text,
                    position: "sticky",
                    left: pivotOffsets[0],
                    top: 0,
                    background: isDark ? "#262626" : "#F9FAFB",
                    zIndex: 50,
                    width: pivotColWidths[0],
                    minWidth: pivotColWidths[0],
                    maxWidth: pivotColWidths[0],
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    borderRight: `1px solid ${t.surfaceBorder}`,
                  }}>
                    <div style={{ marginBottom: 8 }}>First Name</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={pivotFilters.firstName}
                      onChange={(e) => setPivotFilters({ ...pivotFilters, firstName: e.target.value })}
                      style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                    />
                    <div onMouseDown={(e) => handleResize(0, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                  </th>
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: t.text,
                    position: "sticky",
                    left: pivotOffsets[1],
                    top: 0,
                    background: isDark ? "#262626" : "#F9FAFB",
                    zIndex: 50,
                    width: pivotColWidths[1],
                    minWidth: pivotColWidths[1],
                    maxWidth: pivotColWidths[1],
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    borderRight: `1px solid ${t.surfaceBorder}`,
                  }}>
                    <div style={{ marginBottom: 8 }}>Last Name</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={pivotFilters.lastName}
                      onChange={(e) => setPivotFilters({ ...pivotFilters, lastName: e.target.value })}
                      style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                    />
                    <div onMouseDown={(e) => handleResize(1, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                  </th>
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: t.text,
                    position: "sticky",
                    left: pivotOffsets[2],
                    top: 0,
                    background: isDark ? "#262626" : "#F9FAFB",
                    zIndex: 50,
                    width: pivotColWidths[2],
                    minWidth: pivotColWidths[2],
                    maxWidth: pivotColWidths[2],
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    borderRight: `1px solid ${t.surfaceBorder}`,
                  }}>
                    <div style={{ marginBottom: 8 }}>Type</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={pivotFilters.type}
                      onChange={(e) => setPivotFilters({ ...pivotFilters, type: e.target.value })}
                      style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                    />
                    <div onMouseDown={(e) => handleResize(2, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                  </th>
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: t.text,
                    position: "sticky",
                    left: pivotOffsets[3],
                    top: 0,
                    background: isDark ? "#262626" : "#F9FAFB",
                    zIndex: 50,
                    width: pivotColWidths[3],
                    minWidth: pivotColWidths[3],
                    maxWidth: pivotColWidths[3],
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    borderRight: `1px solid ${t.surfaceBorder}`,
                  }}>
                    <div style={{ marginBottom: 8 }}>Start Date</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={pivotFilters.startDate}
                      onChange={(e) => setPivotFilters({ ...pivotFilters, startDate: e.target.value })}
                      style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                    />
                    <div onMouseDown={(e) => handleResize(3, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                  </th>
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: t.text,
                    position: "sticky",
                    left: pivotOffsets[4],
                    top: 0,
                    background: isDark ? "#262626" : "#F9FAFB",
                    zIndex: 50,
                    width: pivotColWidths[4],
                    minWidth: pivotColWidths[4],
                    maxWidth: pivotColWidths[4],
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    borderRight: `1px solid ${t.surfaceBorder}`,
                  }}>
                    <div style={{ marginBottom: 8 }}>Maturity Date</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={pivotFilters.endDate}
                      onChange={(e) => setPivotFilters({ ...pivotFilters, endDate: e.target.value })}
                      style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                    />
                    <div onMouseDown={(e) => handleResize(4, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                  </th>
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: t.text,
                    position: "sticky",
                    left: pivotOffsets[5],
                    top: 0,
                    background: isDark ? "#262626" : "#F9FAFB",
                    zIndex: 50,
                    width: pivotColWidths[5],
                    minWidth: pivotColWidths[5],
                    maxWidth: pivotColWidths[5],
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    borderRight: `1px solid ${t.surfaceBorder}`,
                  }}>
                    <div style={{ marginBottom: 8 }}>Freq</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={pivotFilters.freq}
                      onChange={(e) => setPivotFilters({ ...pivotFilters, freq: e.target.value })}
                      style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                    />
                    <div onMouseDown={(e) => handleResize(5, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                  </th>
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: t.text,
                    position: "sticky",
                    left: pivotOffsets[6],
                    top: 0,
                    background: isDark ? "#262626" : "#F9FAFB",
                    zIndex: 50,
                    width: pivotColWidths[6],
                    minWidth: pivotColWidths[6],
                    maxWidth: pivotColWidths[6],
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    borderRight: `1px solid ${t.surfaceBorder}`,
                  }}>
                    <div style={{ marginBottom: 8 }}>Rate</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={pivotFilters.rate}
                      onChange={(e) => setPivotFilters({ ...pivotFilters, rate: e.target.value })}
                      style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                    />
                    <div onMouseDown={(e) => handleResize(6, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                  </th>
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: t.text,
                    position: "sticky",
                    left: pivotOffsets[7],
                    top: 0,
                    background: isDark ? "#262626" : "#F9FAFB",
                    zIndex: 50,
                    width: pivotColWidths[7],
                    minWidth: pivotColWidths[7],
                    maxWidth: pivotColWidths[7],
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    borderRight: `1px solid ${t.surfaceBorder}`,
                  }}>
                    <div style={{ marginBottom: 8 }}>Schedule</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={pivotFilters.schedule}
                      onChange={(e) => setPivotFilters({ ...pivotFilters, schedule: e.target.value })}
                      style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                    />
                    <div onMouseDown={(e) => handleResize(7, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                  </th>
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: t.text,
                    position: "sticky",
                    left: pivotOffsets[8],
                    top: 0,
                    background: isDark ? "#262626" : "#F9FAFB",
                    zIndex: 50,
                    width: pivotColWidths[8],
                    minWidth: pivotColWidths[8],
                    maxWidth: pivotColWidths[8],
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    borderRight: `2px solid ${t.surfaceBorder}`,
                  }}>
                    <div style={{ marginBottom: 8 }}>Method</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={pivotFilters.paymentMethod}
                      onChange={(e) => setPivotFilters({ ...pivotFilters, paymentMethod: e.target.value })}
                      style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                    />
                    <div onMouseDown={(e) => handleResize(8, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                  </th>

                  {pivotData.dates.map((date, idx) => (
                    <th key={date} style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: t.text,
                      background: isDark ? "#262626" : "#F9FAFB",
                      borderBottom: `2px solid ${t.surfaceBorder}`,
                      borderRight: `1px solid ${t.surfaceBorder}`,
                      width: pivotDateWidth,
                      minWidth: pivotDateWidth,
                      maxWidth: pivotDateWidth,
                      position: "sticky",
                      top: 0,
                      zIndex: 40
                    }}>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>Payment Date</div>
                      <div>{date}</div>
                      {idx === pivotData.dates.length - 1 && (
                        <div onMouseDown={handleDateResize} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                      )}
                    </th>
                  ))}
                  <th style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: t.text,
                    background: isDark ? "#262626" : "#F9FAFB",
                    borderBottom: `2px solid ${t.surfaceBorder}`,
                    width: 120,
                    minWidth: 120,
                    position: "sticky",
                    top: 0,
                    right: 0,
                    zIndex: 50,
                    boxShadow: "-2px 0 5px rgba(0,0,0,0.1)"
                  }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPivotRows.map((row, idx) => {
                  let rowTotal = 0;
                  const nextRow = filteredPivotRows[idx + 1];
                  const isLastInGroup = idx === filteredPivotRows.length - 1 || (nextRow.firstName + " " + nextRow.lastName) !== (row.firstName + " " + row.lastName);

                  return (
                    <tr key={row.key} style={{
                      background: isDark ? (idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                      transition: "background 0.2s"
                    }}>
                      <td style={{
                        padding: "12px",
                        fontWeight: 600,
                        color: t.text,
                        position: "sticky",
                        left: pivotOffsets[0],
                        background: isDark ? (idx % 2 === 0 ? "#121212" : "#1a1a1a") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                        zIndex: 30,
                        borderRight: `1px solid ${t.surfaceBorder}`,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        width: pivotColWidths[0],
                        minWidth: pivotColWidths[0],
                        maxWidth: pivotColWidths[0],
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {row.firstName}
                      </td>
                      <td style={{
                        padding: "12px",
                        fontWeight: 600,
                        color: t.text,
                        position: "sticky",
                        left: pivotOffsets[1],
                        background: isDark ? (idx % 2 === 0 ? "#121212" : "#1a1a1a") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                        zIndex: 30,
                        borderRight: `1px solid ${t.surfaceBorder}`,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        width: pivotColWidths[1],
                        minWidth: pivotColWidths[1],
                        maxWidth: pivotColWidths[1],
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {row.lastName}
                      </td>
                      <td style={{
                        padding: "12px",
                        color: t.textSecondary,
                        position: "sticky",
                        left: pivotOffsets[2],
                        background: isDark ? (idx % 2 === 0 ? "#121212" : "#1a1a1a") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                        zIndex: 30,
                        borderRight: `1px solid ${t.surfaceBorder}`,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        width: pivotColWidths[2],
                        minWidth: pivotColWidths[2],
                        maxWidth: pivotColWidths[2],
                        textTransform: "capitalize"
                      }}>
                        {row.type.replace(/_/g, ' ')}
                      </td>
                      <td style={{
                        padding: "12px",
                        color: t.textMuted,
                        position: "sticky",
                        left: pivotOffsets[3],
                        background: isDark ? (idx % 2 === 0 ? "#121212" : "#1a1a1a") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                        zIndex: 30,
                        borderRight: `1px solid ${t.surfaceBorder}`,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        width: pivotColWidths[3],
                        minWidth: pivotColWidths[3],
                        maxWidth: pivotColWidths[3]
                      }}>
                        {row.startDate}
                      </td>
                      <td style={{
                        padding: "12px",
                        color: t.textMuted,
                        position: "sticky",
                        left: pivotOffsets[4],
                        background: isDark ? (idx % 2 === 0 ? "#121212" : "#1a1a1a") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                        zIndex: 30,
                        borderRight: `1px solid ${t.surfaceBorder}`,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        width: pivotColWidths[4],
                        minWidth: pivotColWidths[4],
                        maxWidth: pivotColWidths[4]
                      }}>
                        {row.endDate}
                      </td>
                      <td style={{
                        padding: "12px",
                        color: t.textMuted,
                        position: "sticky",
                        left: pivotOffsets[5],
                        background: isDark ? (idx % 2 === 0 ? "#121212" : "#1a1a1a") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                        zIndex: 30,
                        borderRight: `1px solid ${t.surfaceBorder}`,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        width: pivotColWidths[5],
                        minWidth: pivotColWidths[5],
                        maxWidth: pivotColWidths[5]
                      }}>
                        {row.freq}
                      </td>
                      <td style={{
                        padding: "12px",
                        color: t.textMuted,
                        position: "sticky",
                        left: pivotOffsets[6],
                        background: isDark ? (idx % 2 === 0 ? "#121212" : "#1a1a1a") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                        zIndex: 30,
                        borderRight: `1px solid ${t.surfaceBorder}`,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        width: pivotColWidths[6],
                        minWidth: pivotColWidths[6],
                        maxWidth: pivotColWidths[6]
                      }}>
                        {row.rate}%
                      </td>
                      <td style={{
                        padding: "12px",
                        color: t.textMuted,
                        position: "sticky",
                        left: pivotOffsets[7],
                        background: isDark ? (idx % 2 === 0 ? "#121212" : "#1a1a1a") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                        zIndex: 30,
                        borderRight: `1px solid ${t.surfaceBorder}`,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        width: pivotColWidths[7],
                        minWidth: pivotColWidths[7],
                        maxWidth: pivotColWidths[7]
                      }}>
                        {row.scheduleId}
                      </td>
                      <td style={{
                        padding: "12px",
                        color: t.textMuted,
                        position: "sticky",
                        left: pivotOffsets[8],
                        background: isDark ? (idx % 2 === 0 ? "#121212" : "#1a1a1a") : (idx % 2 === 0 ? "#fff" : "#F9FAFB"),
                        zIndex: 30,
                        borderRight: `2px solid ${t.surfaceBorder}`,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        width: pivotColWidths[8],
                        minWidth: pivotColWidths[8],
                        maxWidth: pivotColWidths[8]
                      }}>
                        {row.paymentMethod}
                      </td>

                      {pivotData.dates.map(date => {
                        const cell = pivotData.data[`${row.key}|||${date}`];
                        const amount = cell?.amount || 0;
                        rowTotal += amount;
                        return (
                          <td key={date} 
                              onClick={() => cell?.records?.length > 0 && setDrillSchedule(cell.records[0])}
                              style={{
                            padding: "12px",
                            textAlign: "right",
                            color: amount === 0 ? t.textMuted : (amount < 0 ? "#ef4444" : (isDark ? "#34D399" : "#059669")),
                            fontWeight: amount === 0 ? 400 : 700,
                            fontFamily: t.mono,
                            borderRight: `1px solid ${t.surfaceBorder}`,
                            borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                            cursor: cell?.records?.length > 0 ? "pointer" : "default",
                            background: cell?.records?.length > 0 ? (isDark ? "rgba(96,165,250,0.05)" : "rgba(79,70,229,0.02)") : "transparent"
                          }}>
                            {amount === 0 ? "—" : fmtCurr(amount)}
                          </td>
                        );
                      })}
                      <td style={{
                        padding: "12px",
                        textAlign: "right",
                        fontWeight: 800,
                        color: rowTotal < 0 ? "#ef4444" : (isDark ? "#34D399" : "#059669"),
                        fontFamily: t.mono,
                        background: isDark ? "#1a1a1a" : "#F9FAFB",
                        position: "sticky",
                        right: 0,
                        zIndex: 30,
                        borderBottom: isLastInGroup ? `1.5px solid ${t.surfaceBorder}` : `1px solid ${t.surfaceBorder}`,
                        boxShadow: "-2px 0 5px rgba(0,0,0,0.1)"
                      }}>
                        {fmtCurr(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0", color: t.textMuted }}>
            No payment data available.
          </div>
        )}
      </div>
    )}
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
            <FF label="Investment ID" t={t}><FSel value={modal.data.investment} onChange={e => {
              const invId = e.target.value;
              const inv = INVESTMENTS.find(x => (x.investment_id || x.id) === invId);
              let updates = { investment: invId };
              if (inv) {
                if (inv.deal_id) updates.deal_id = inv.deal_id;
                if (inv.contact_id) updates.contact_id = inv.contact_id;
              }
              setModal(m => ({ ...m, data: { ...m.data, ...updates } }));
            }} options={INVESTMENTS.map(c => c.id)} t={t} disabled={freeze} /></FF>
            <FF label="Deal ID" t={t}><FIn value={modal.data.deal_id || ""} onChange={e => setF("deal_id", e.target.value)} placeholder="P10000" t={t} disabled={freeze} /></FF>
            <FF label="Contact ID" t={t}><FIn value={modal.data.contact_id || ""} onChange={e => setF("contact_id", e.target.value)} placeholder="M10000" t={t} disabled={freeze} /></FF>
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
                } else if (newStatus === "Rollover") {
                  updates.notes = `Rollover for ${modal.data.schedule_id}. Principal rolled over to next term.`;
                }
                setModal(m => ({ ...m, data: { ...m.data, ...updates } }));
              }} options={modal.data.rollover 
                ? Array.from(new Set(["Rollover", modal.data.status]))
                : (DIMENSIONS.find(d => d.name === "Payment Status")?.items || ["Due", "Paid", "Missed", "Partial", "Cancelled", "Waived", "Rollover", "Withdrawal"])
              } t={t} disabled={freeze} />
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <FF label="Payment Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={["INVESTOR_PRINCIPAL_DEPOSIT", "INVESTOR_INTEREST_PAYMENT", "INVESTOR_PRINCIPAL_PAYMENT", "BORROWER_PRINCIPAL_RECEIVED", "BORROWER_INTEREST_PAYMENT", "BORROWER_PRINCIPAL_PAYMENT", "FEE"]} t={t} disabled={freeze} /></FF>
              {modal.data.type === "INVESTOR_PRINCIPAL_PAYMENT" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
                  <input 
                    type="checkbox" 
                    id="rollover_chk"
                    checked={!!modal.data.rollover} 
                    onChange={e => setF("rollover", e.target.checked)} 
                    style={{ cursor: "pointer", width: 16, height: 16, accentColor: t.accent }} 
                  />
                  <label htmlFor="rollover_chk" style={{ fontSize: 13, color: t.textSecondary, cursor: "pointer", fontWeight: 500 }}>Rollover Principal</label>
                </div>
              )}
            </div>
            <FF label="Applied To" t={t}><FSel value={modal.data.applied_to || "Principal Amount"} onChange={e => setF("applied_to", e.target.value)} options={["Principal Amount", "Interest Amount", "Total Amount", "Balance"]} t={t} disabled={freeze} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FF label="Payment Amount" t={t}><FIn value={(ZEROING_STATUSES.includes(modal.data.status) && modal.data.payment !== "$0.00") ? "$0.00" : (modal.data.isTyping === "payment" ? modal.data.payment : fmtCurr(modal.data.payment))} onChange={e => {
              const val = e.target.value;
              const raw = Number(String(val).replace(/[^0-9.-]/g, "")) || 0;
              const base = Math.abs(raw);
              const updates = recalcReplacement({ ...modal.data, payment: val, basePayment: base, isTyping: "payment" }, modal.data.fee_ids || []);
              setModal(m => ({ ...m, data: { ...m.data, payment: val, basePayment: base, ...updates } }));
            }} onBlur={() => {
              const updates = recalcReplacement({ ...modal.data, isTyping: false }, modal.data.fee_ids || []);
              setModal(m => ({ ...m, data: { ...m.data, ...updates } }));
            }} placeholder="$0" t={t} disabled={freeze} /></FF>
            <FF label="Principal Amount" t={t}><FIn value={modal.data.isTyping === "principal" ? modal.data.principal_amount : fmtCurr(modal.data.principal_amount)} onChange={e => {
              const val = e.target.value;
              setModal(m => ({ ...m, data: { ...m.data, principal_amount: val, isTyping: "principal" } }));
            }} onBlur={() => {
              const updates = recalcReplacement({ ...modal.data, isTyping: false }, modal.data.fee_ids || []);
              setModal(m => ({ ...m, data: { ...m.data, ...updates } }));
            }} placeholder="$0" t={t} disabled={freeze} /></FF>
            <FF label="Signed Amount" t={t}><FIn value={fmtCurr(modal.data.signed_payment_amount)} onChange={e => setF("signed_payment_amount", e.target.value)} placeholder="$0" t={t} disabled={freeze} /></FF>
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
                    <div style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 600, color: isDark ? "#FBBF24" : "#D97706", background: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: `1px solid ${isDark ? "rgba(251,191,36,0.2)" : "#FDE68A"}`, borderRadius: 9, padding: "10px 13px" }}>{fmtCurr(partialUnpaid)}</div>
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
    <DelModal target={distMemoDelT} onClose={() => setDistMemoDelT(null)} onConfirm={handleDeleteDistMemo} label="this distribution memo" t={t} isDark={isDark} />

    {/* Add / Edit Distribution Memo Modal */}
    <Modal
      open={distMemoModal.open}
      onClose={() => setDistMemoModal({ open: false, mode: "add", data: {} })}
      title={distMemoModal.mode === "edit" ? "Edit Distribution Memo" : "Add Distribution Memo"}
      onSave={handleSaveDistMemo}
      width={780}
      t={t}
      isDark={isDark}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FF label="Select Deal" t={t}>
          <FSel
            value={distMemoModal.data.deal_id || ""}
            options={DEALS.map(d => ({ label: d.deal_name || d.name || d.id, value: d.id }))}
            onChange={e => setDistMemoModal(m => ({ ...m, data: { ...m.data, deal_id: e.target.value } }))}
            t={t}
            placeholder="Choose a deal..."
          />
        </FF>
        <FF label="Memo" t={t}>
          <FIn
            value={distMemoModal.data.memo || ""}
            onChange={e => setDistMemoModal(m => ({ ...m, data: { ...m.data, memo: e.target.value } }))}
            placeholder="e.g. Q1 2025 Interest Distribution"
            t={t}
          />
        </FF>
        <FF label="Select Payment Status to Filter. Select none includeds all" t={t}>
          <FMultiSel
            value={Array.isArray(distMemoModal.data.status) ? distMemoModal.data.status : (distMemoModal.data.status ? [distMemoModal.data.status] : [])}
            options={paymentStatusOpts}
            onChange={v => setDistMemoModal(m => ({ ...m, data: { ...m.data, status: v } }))}
            t={t}
            showSelectAll
          />
        </FF>
        <FF label="Select Payment Type to Filter. Select none includes all" t={t}>
          <FMultiSel
            value={Array.isArray(distMemoModal.data.payment_type) ? distMemoModal.data.payment_type : (distMemoModal.data.payment_type ? [distMemoModal.data.payment_type] : [])}
            options={paymentTypeOpts}
            onChange={v => setDistMemoModal(m => ({ ...m, data: { ...m.data, payment_type: v } }))}
            t={t}
            showSelectAll
          />
        </FF>
        <FF label="Select Payment Method to Filter" t={t}>
          <FSel
            value={distMemoModal.data.payment_method || ""}
            options={paymentMethods.map(m => ({ label: m, value: m }))}
            onChange={e => setDistMemoModal(m => ({ ...m, data: { ...m.data, payment_method: e.target.value } }))}
            t={t}
            placeholder="All Methods (No Filter)"
          />
        </FF>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FF label="Period Start Date" t={t}>
            <FIn
              type="date"
              value={distMemoModal.data.period_start || ""}
              onChange={e => setDistMemoModal(m => ({ ...m, data: { ...m.data, period_start: e.target.value } }))}
              t={t}
            />
          </FF>
          <FF label="Period End Date" t={t}>
            <FIn
              type="date"
              value={distMemoModal.data.period_end || ""}
              onChange={e => setDistMemoModal(m => ({ ...m, data: { ...m.data, period_end: e.target.value } }))}
              t={t}
            />
          </FF>
        </div>
        {distMemoModal.data.period_start && distMemoModal.data.period_end && distMemoModal.data.deal_id && (
          <div style={{ padding: "10px 14px", background: isDark ? "rgba(59,130,246,0.08)" : "#EFF6FF", border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "#BFDBFE"}`, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#93C5FD" : "#1D4ED8" }}>
              {(() => {
                const types = Array.isArray(distMemoModal.data.payment_type) ? distMemoModal.data.payment_type.map(x => x.toLowerCase()) : [];
                const statuses = Array.isArray(distMemoModal.data.status) ? distMemoModal.data.status.map(x => x.toLowerCase()) : [];
                const methods = distMemoModal.data.payment_method ? [distMemoModal.data.payment_method.toLowerCase()] : [];

                const count = SCHEDULES.filter(s => {
                  if (s.deal_id !== distMemoModal.data.deal_id) return false;
                  const sType = (s.type || s.payment_type || "").toLowerCase();
                  const due = s.dueDate || s.due_date || "";
                  const inv = INVESTMENTS.find(iv => iv.id === s.investment_id || iv.docId === s.investment_id);
                  const investor = CONTACTS.find(c => c.id === s.contact_id || c.docId === s.contact_id);
                  const sMethod = (s.payment_method || inv?.payment_method || investor?.payment_method || "").toLowerCase();

                  const typeMatch = types.length === 0 || types.includes(sType);
                  const statusMatch = statuses.length === 0 || statuses.includes((s.status || "").toLowerCase());
                  const methodMatch = methods.length === 0 || methods.includes(sMethod);

                  return typeMatch && statusMatch && methodMatch && due >= distMemoModal.data.period_start && due <= distMemoModal.data.period_end;
                }).length;
                return `${count} schedule${count !== 1 ? "s" : ""} will be linked with these criteria`;
              })()}
            </div>
          </div>
        )}
      </div>
    </Modal>
    <Modal open={!!dialog} onClose={() => setDialog(null)} title={dialog?.title || "Notification"} onSave={dialog?.onConfirm || (() => setDialog(null))} saveLabel={dialog?.saveLabel || (dialog?.type === "confirm" ? "Confirm" : "OK")} showCancel={dialog?.type === "confirm"} t={t} isDark={isDark}>
      <div style={{ padding: "12px 0", fontSize: 14, color: t.textSecondary, lineHeight: 1.6, textAlign: "center" }}>{dialog?.message}</div>
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
                  <span style={{ fontFamily: t.mono }}>{drillSchedule.contact_id || ""}</span>
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
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Deal Name</span>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C" }}>{drillInvestment.deal_name || drillInvestment.deal || DEALS.find(d => d.id === drillInvestment.deal_id)?.name || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>First Name</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{drillInvestment.first_name || "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: t.mono }}>Last Name</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{drillInvestment.last_name || "—"}</div>
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
    <InvestorSummaryModal
      contact={detailContact}
      onClose={() => setDetailContact(null)}
      isDark={isDark}
      t={t}
      INVESTMENTS={INVESTMENTS}
      SCHEDULES={SCHEDULES}
      DEALS={DEALS}
      DIMENSIONS={DIMENSIONS}
      tenantId={tenantId}
      LEDGER={LEDGER}
      USERS={USERS}
      currentUser={user}
      onUpdateInvestment={async (inv) => {
        console.log("Updating investment:", inv);
        await handleUpdateInvestment(inv);
      }}
      onAddNote={async ({ text }) => {
        const contactId = detailContact?.docId || detailContact?.id;
        if (!contactId || !tenantId) throw new Error("Missing contact or tenant ID");
        const noteRef = await addDoc(
          collection(db, "tenants", tenantId, "contacts", contactId, "notes"),
          { text, created_at: serverTimestamp(), author: "" }
        );
        return { id: noteRef.id, text, created_at: new Date().toISOString(), author: "" };
      }}
      onUpdate={async (updatedData) => {
        const d = updatedData;
        const payload = {
          contact_name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || d.name || "",
          first_name: d.first_name || "",
          last_name: d.last_name || "",
          contact_type: d.contact_type || d.type || "Individual",
          role_type: d.role_type || d.role || "Investor",
          email: d.email || "",
          phone: d.phone || "",
          address: d.address || "",
          bank_information: d.bank_information || "",
          bank_address: d.bank_address || "",
          bank_routing_number: d.bank_routing_number || "",
          bank_account_number: d.bank_account_number || "",
          tax_id: d.tax_id || "",
          payment_method: d.payment_method || "",
          updatedAt: serverTimestamp()
        };
        try {
          const docId = d.docId || d.id;
          if (!docId) throw new Error("Missing document ID");
          await updateDoc(doc(db, "tenants", tenantId, "contacts", docId), payload);
          setDetailContact({ ...d, ...payload });
        } catch (err) {
          console.error("Update error:", err);
          showDialog("Failed to update contact: " + err.message, "Error", "alert");
        }
      }}
    />
      {/* Distribution Memo Drilldown Modal */}
      {distMemoDrillDown.open && (
        <Modal
          open={distMemoDrillDown.open}
          onClose={() => {
            setDistMemoDrillDown({ open: false, memo: null, schedules: [] });
            setDistMemoSel(new Set());
            setDistMemoBulkStatus("");
          }}
          title={`Distribution Memo  ${distMemoDrillDown.memo?.period_start || ""}  ~  ${distMemoDrillDown.memo?.period_end || ""}`}
          width={1350}
          titleFont={t.titleFont}
          t={t}
          isDark={isDark}
          showCancel={false}
        >
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              {[
                { label: "Linked Schedules", val: distMemoDrillDown.schedules.length },
                { label: "Total Amount", val: fmtCurr(distMemoDrillDown.schedules.reduce((s, r) => s + (Number(r.signed_payment_amount || r.payment_amount || 0) || 0), 0)) },
                { label: "Period", val: `${distMemoDrillDown.memo?.period_start || "—"} → ${distMemoDrillDown.memo?.period_end || "—"}` },
              ].map((stat, i) => (
                <div key={i} style={{ flex: 1, padding: "14px 18px", background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{stat.val}</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 400, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                {distMemoSel.size > 0 && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", padding: "6px 12px", borderRadius: 10, border: `1px solid ${t.surfaceBorder}` }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary }}>{distMemoSel.size} selected</span>
                    <select 
                      value={distMemoBulkStatus} 
                      onChange={e => setDistMemoBulkStatus(e.target.value)} 
                      style={{ fontSize: 11, padding: "4px 8px", borderRadius: 7, border: `1px solid ${t.surfaceBorder}`, background: t.searchBg, color: t.searchText, cursor: "pointer" }}
                    >
                      <option value="" disabled>Bulk status...</option>
                      {paymentStatusOpts.filter(s => s !== "Missed" && s !== "Partial" && s !== "").map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button 
                      onClick={() => handleDistMemoBulkStatus(distMemoBulkStatus)} 
                      disabled={!distMemoBulkStatus} 
                      style={{ fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8, background: distMemoBulkStatus ? t.accentGrad : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"), color: distMemoBulkStatus ? "#fff" : t.textMuted, border: "none", cursor: distMemoBulkStatus ? "pointer" : "default" }}
                    >
                      Apply
                    </button>
                    <button onClick={() => setDistMemoSel(new Set())} style={{ fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8, background: "none", color: t.textMuted, border: `1px solid ${t.surfaceBorder}`, cursor: "pointer" }}>Clear</button>
                  </div>
                )}
              </div>
              <TanStackTable
                data={distMemoDrillDown.schedules}
                columns={memoDrillDownColumnDefs}
                pageSize={50}
                t={t}
                isDark={isDark}
                initialSorting={[{ id: 'dueDate', desc: false }]}
                onSelectionChange={(selectedRows) => {
                  setDistMemoSel(new Set(selectedRows.map(r => r.schedule_id)));
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#450a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
        </div>
      )}
  </>);
}

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { db, storage } from "../firebase";
import { doc, getDocs, collection, addDoc, updateDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Modal, FF, FIn, FSel, FMultiSel, DelModal, Bdg, ConfirmModal } from "../components";
import { InvestorSummaryModal } from "../components/InvestorSummaryModal";
import { useAuth } from "../AuthContext";
import { getDealInvestmentColumns } from "../components/DealSummaryTanStackConfig";
import { getDistributionColumns } from "../components/DistributionScheduleTanStackConfig";
import { getContactColumns } from "../components/ContactsTanStackConfig";
import { getAssetColumns } from "../components/AssetsTanStackConfig";
import { getDistributionMemoColumns } from "../components/DistributionMemoTanStackConfig";
import TanStackTable from "../components/TanStackTable";
import DocumentsTab from "../components/DocumentsTab";
import { X, Check, Plus, Construction, AlertTriangle, FileCheck, Download, ChevronDown } from "lucide-react";
import { normalizeDateAtNoon, getFrequencyValue, pmtCalculator_ACT360_30360, feeCalculator_ACT360_30360, fmtCurr, initials, av, badge } from "../utils";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, TextRun } from "docx";

export default function PageDealSummary({ t, isDark, dealId, DEALS = [], INVESTMENTS = [], CONTACTS = [], DIMENSIONS = [], FEES_DATA = [], SCHEDULES = [], USERS = [], LEDGER = [], setActivePage, investmentCollection = "investments", scheduleCollection = "paymentSchedules", tenantId }) {
  const { hasPermission, isSuperAdmin, user } = useAuth();
  const canUpdate = isSuperAdmin || hasPermission("INVESTMENT_UPDATE");
  const canDelete = isSuperAdmin || hasPermission("INVESTMENT_DELETE") || hasPermission("INVESTMENTS_DELETE");
  const canCreate = isSuperAdmin || hasPermission("INVESTMENT_CREATE");

  const canAssetView   = isSuperAdmin || hasPermission("DEAL_VIEW") || hasPermission("DEAL_CREATE") || hasPermission("DEAL_UPDATE") || hasPermission("DEAL_DELETE");
  const canAssetCreate = isSuperAdmin || hasPermission("DEAL_CREATE");
  const canAssetUpdate = isSuperAdmin || hasPermission("DEAL_UPDATE");
  const canAssetDelete = isSuperAdmin || hasPermission("DEAL_DELETE");
  const paymentMethods = (DIMENSIONS.find(d => d.name === "Payment Method" || d.name === "PaymentMethod") || {}).items || [];
  const investmentStatusOpts = (DIMENSIONS.find(d => d.name === "InvestmentStatus" || d.name === "Investment Status") || {}).items?.filter(i => i) || ["Open", "Active", "Closed"];
  const paymentStatusOpts = (DIMENSIONS.find(d => d.name === "PaymentStatus" || d.name === "Payment Status" || d.name === "ScheduleStatus" || d.name === "Schedule Status") || {}).items?.filter(i => i) || ["Due", "Paid", "Partial", "Missed", "Cancelled"];
  const paymentTypeOpts = useMemo(() => {
    const fromDim = [
      ...((DIMENSIONS.find(d => d.name === "IN_PaymentType") || {}).items || []),
      ...((DIMENSIONS.find(d => d.name === "OUT_PaymentType") || {}).items || []),
    ].filter(Boolean);
    if (fromDim.length) return [...new Set(fromDim)];
    return [...new Set(SCHEDULES.map(s => s.type || s.payment_type || "").filter(Boolean))].sort();
  }, [DIMENSIONS, SCHEDULES]);

  const deal = useMemo(() => DEALS.find(d => d.id === dealId) || {}, [dealId, DEALS]);
  const dealPath = useMemo(() => {
    if (deal._path) return deal._path;
    if (deal.id && tenantId) return `tenants/${tenantId}/deals/${deal.id}`;
    if (deal.id) return `deals/${deal.id}`;
    return "";
  }, [deal._path, deal.id, tenantId]);
  const [activeTab, setActiveTab] = useState("Investments");
  const [distributionView, setDistributionView] = useState("memo"); // "memo", "table", or "pivot"
  const [distMemos, setDistMemos] = useState([]);
  const [distMemoModal, setDistMemoModal] = useState({ open: false, mode: "add", data: {} });
  const [distMemoDelT, setDistMemoDelT] = useState(null);
  const [distMemoDrillDown, setDistMemoDrillDown] = useState({ open: false, memo: null, schedules: [] });
  const [assetImages, setAssetImages] = useState([]);
  const [assets, setAssets] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [assetModal, setAssetModal] = useState({ open: false, mode: "add", data: {} });
  const [detailContact, setDetailContact] = useState(null);
  const [delT, setDelT] = useState(null);
  const [assetDelT, setAssetDelT] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [rowSelection, setRowSelection] = useState({});
  const [pageSize, setPageSize] = useState(30);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const photoInputRef = useRef(null);
  const dealCoverPhotoRef = useRef(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [attributes, setAttributes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genConfirm, setGenConfirm] = useState(null);
  const [genResult, setGenResult] = useState(null);
  const [bulkInvestmentStatus, setBulkInvestmentStatus] = useState(investmentStatusOpts[0] || "");
  const [bulkScheduleStatus, setBulkScheduleStatus] = useState(paymentStatusOpts[0] || "");
  const [scheduleModal, setScheduleModal] = useState({ open: false, data: {} });
  const [contactDelT, setContactDelT] = useState(null);
  const [contactModal, setContactModal] = useState({ open: false, mode: "existing", data: {} });
  const [duplicateConfirm, setDuplicateConfirm] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { title: string, message: string, onConfirm: () => void }
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const roleOpts = (DIMENSIONS.find(d => d.name === "ContactRole") || {}).items || ["Investor", "Borrower"];
  const contactTypeOpts = (DIMENSIONS.find(d => d.name === "ContactType") || {}).items || ["Individual", "Company", "Trust", "Partnership"];
  const investorTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorType") || {}).items || ["Fixed", "Equity", "Both"];
  const assetTypeOpts = (DIMENSIONS.find(d => d.name === "AssetType") || {}).items || ["Multi-family", "Retail", "Industrial", "Office", "Mixed-Use", "Other"];

  const [pivotColWidths, setPivotColWidths] = useState([180, 130, 100, 100, 80, 70, 100, 120]); // Name, Type, Start, End, Freq, Rate, Schedule, Method
  const [columnFilters, setColumnFilters] = useState([]);
  const [distColumnFilters, setDistColumnFilters] = useState([]);
  const [pivotFilters, setPivotFilters] = useState({
    investor: "",
    type: "",
    startDate: "",
    endDate: "",
    freq: "",
    rate: "",
    schedule: "",
    paymentMethod: ""
  });
  const [drillDown, setDrillDown] = useState({ open: false, records: [], title: "" });
  const [distFilter, setDistFilter] = useState("All");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportMenuRef]);

  const sortedContacts = useMemo(() => {
    return [...CONTACTS].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [CONTACTS]);

  // Distribution Memos
  const distMemoCollectionPath = tenantId ? `tenants/${tenantId}/distributionMemos` : null;

  const fetchDistMemos = useCallback(async () => {
    if (!distMemoCollectionPath || !dealId) return;
    try {
      const snap = await getDocs(collection(db, distMemoCollectionPath));
      const items = snap.docs
        .map(d => ({ docId: d.id, _path: `${distMemoCollectionPath}/${d.id}`, ...d.data() }))
        .filter(m => m.deal_id === dealId);
      setDistMemos(items);
    } catch (err) {
      console.error("Failed to fetch distribution memos:", err);
    }
  }, [distMemoCollectionPath, dealId]);

  useEffect(() => { fetchDistMemos(); }, [fetchDistMemos]);

  const handleSaveDistMemo = async () => {
    const d = distMemoModal.data;
    if (!d.memo) { showToast("Memo name is required", "error"); return; }
    try {
      const payload = {
        deal_id: dealId,
        memo: d.memo || "",
        status: d.status || "",
        payment_type: d.payment_type || "",
        period_start: d.period_start || "",
        period_end: d.period_end || "",
        updated_at: serverTimestamp(),
        updated_by: user?.uid || "system",
      };
      if (distMemoModal.mode === "add") {
        payload.created_at = serverTimestamp();
        await addDoc(collection(db, distMemoCollectionPath), payload);
        showToast("Distribution memo created", "success");
      } else {
        await updateDoc(doc(db, d._path), payload);
        showToast("Distribution memo updated", "success");
      }
      setDistMemoModal({ open: false, mode: "add", data: {} });
      fetchDistMemos();
    } catch (err) {
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
        updated_by: user?.uid || "system",
      });
      showToast("Memo cloned", "success");
      fetchDistMemos();
    } catch (err) {
      showToast("Failed to clone: " + err.message, "error");
    }
  };

  const handleExport = (format) => {
    const isPivot = distributionView === "pivot";
    let data = [];
    let headers = [];
    let title = `Distributions_${deal.name || "Deal"}_${isPivot ? "Pivot" : "Table"}_${new Date().toISOString().split('T')[0]}`;

    if (isPivot) {
      headers = ["Investor Name", "Type", "Start Date", "Payment Date", "Freq", "Rate", "Schedule", "Payment Method", ...pivotData.dates, "Total"];
      data = filteredPivotRows.map(row => {
        let rowTotal = 0;
        const rowData = [
          row.investor,
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
      headers = ["Investor Name", "Deal Name", "Start Date", "Payment Date", "Type", "Freq", "Amount", "Status", "Notes"];
      data = filteredDealSchedules.map(s => {
        const contact = CONTACTS.find(x => x.id === s.contact_id);
        const dealObj = DEALS.find(x => x.id === s.deal_id);
        const inv = INVESTMENTS.find(x => x.id === s.investment_id || x.id === s.investment);
        const investorName = contact ? contact.name : (s.contact_name || s.investor || "—");
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
          investorName,
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
      XLSX.utils.book_append_sheet(wb, ws, "Distributions");
      XLSX.writeFile(wb, `${title}.xlsx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text(`${deal.name || "Deal"} - Distributions (${isPivot ? "Pivot" : "Table"})`, 14, 15);
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
            new Paragraph({ text: `${deal.name || "Deal"} - Distributions`, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
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

  const [pivotDateWidth, setPivotDateWidth] = useState(120);

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

  useEffect(() => {
    if (!deal.id) return;
    const legacyPath = `deals/${deal.id}`;
    const isNewPath = dealPath !== legacyPath;

    const loadImages = async () => {
      const [snap, legacySnap] = await Promise.all([
        getDocs(collection(db, dealPath, "asset_images")).catch(() => ({ docs: [] })),
        isNewPath ? getDocs(collection(db, legacyPath, "asset_images")).catch(() => ({ docs: [] })) : Promise.resolve({ docs: [] })
      ]);
      const seen = new Set();
      const combined = [...snap.docs, ...legacySnap.docs]
        .filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; })
        .map(d => ({ id: d.id, ...d.data() }));
      setAssetImages(combined);
    };

    const loadAssets = async () => {
      const [snap, legacySnap] = await Promise.all([
        getDocs(collection(db, dealPath, "assets")).catch(() => ({ docs: [] })),
        isNewPath ? getDocs(collection(db, legacyPath, "assets")).catch(() => ({ docs: [] })) : Promise.resolve({ docs: [] })
      ]);
      const seen = new Set();
      const combined = [...snap.docs, ...legacySnap.docs]
        .filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; })
        .map(d => ({ docId: d.id, ...d.data() }));
      setAssets(combined);
    };

    loadImages();
    loadAssets();
  }, [deal.id, dealPath]);
  const allDealInvestments = useMemo(() => INVESTMENTS.filter(inv => inv.deal_id === dealId || inv.deal === deal.name), [INVESTMENTS, dealId, deal.name]);

  const dealInvestments = useMemo(() => {
    return allDealInvestments.filter(c => !(c.investment_id || c.id || "").startsWith("L"));
  }, [allDealInvestments]);

  const dealLendings = useMemo(() => {
    return allDealInvestments.filter(c => (c.investment_id || c.id || "").startsWith("L"));
  }, [allDealInvestments]);

  const hasScheduleForInvestment = useCallback(
    (inv) => (SCHEDULES || []).some(s => 
      (s.active_version === true) && 
      (s.investment_id === (inv.investment_id || inv.id) || s.investment === (inv.investment_id || inv.id)) &&
      (s.deal_id === inv.deal_id)
    ),
    [SCHEDULES]
  );

  const pendingScheduleGenerationCount = useMemo(
    () => allDealInvestments.filter(inv => !hasScheduleForInvestment(inv)).length,
    [allDealInvestments, hasScheduleForInvestment]
  );

  // Fund balance calculation moved to dealSchedules useMemo

  const dealContacts = useMemo(() => {
    const contactIds = new Set(allDealInvestments.map(inv => inv.contact_id));
    return CONTACTS.filter(c => contactIds.has(c.id) || contactIds.has(c.docId));
  }, [allDealInvestments, CONTACTS]);

  const dealSchedules = useMemo(() =>
    SCHEDULES.filter(s => s.deal_id === dealId)
    , [dealId, SCHEDULES]);

  // Filter to only active versions for table view
  const activeDealSchedules = useMemo(() =>
    dealSchedules.filter(s => s.active_version === true)
    , [dealSchedules]);
    
  const filteredDealSchedules = useMemo(() => {
    if (distFilter === "All") return activeDealSchedules;
    return activeDealSchedules.filter(s => {
      const ty = (s.payment_type || s.type || "").toLowerCase();
      if (distFilter === "Interest") {
        return ty.includes("interest") || ty.includes("distribution") || (ty.includes("payment") && !ty.includes("principal"));
      }
      if (distFilter === "Principal") {
        return ty.includes("principal") || ty.includes("deposit") || ty.includes("received") || ty.includes("disbursement");
      }
      if (distFilter === "Fee") return ty.includes("fee") || s.fee_id || s.feeId;
      return true;
    });
  }, [activeDealSchedules, distFilter]);

  const totalFundBalance = useMemo(() => {
    let sum = 0;
    dealSchedules.forEach(sch => {
      // Use original numeric amount if available, or parse from signed_payment_amount string
      const amt = Number(String(sch.signed_payment_amount || 0).replace(/[^0-9.-]/g, "")) || 0;
      const ut = (sch.payment_type || sch.type || "").toUpperCase();

      if (ut === "INVESTOR_PRINCIPAL_DEPOSIT") {
        sum += amt;
      }

      if ((sch.status || "").toLowerCase().includes("withdraw")) {
        sum -= amt;
      }
    });
    return fmtCurr(sum);
  }, [dealSchedules]);

  // Pivot data for distribution chart view
  const pivotData = useMemo(() => {
    if (!filteredDealSchedules.length) return { rows: [], dates: [], data: {} };

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

    filteredDealSchedules.forEach(schedule => {

      const investor = CONTACTS.find(c => c.id === schedule.contact_id);
      const investorName = investor ? investor.name : schedule.contact_id || "Unknown";

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

      const scheduleId = schedule.investment_id || schedule.investment || "—";
      const rowKey = `${investorName}|||${paymentType}|||${scheduleId}`;
      rowSet.add(rowKey);
      dateSet.add(dueDate);

      if (!rowMetadata[rowKey]) {
        rowMetadata[rowKey] = {
          startDate: inv?.start_date || "—",
          endDate: inv?.maturity_date || "—",
          freq: inv?.freq || "—",
          rate: (inv?.rate || schedule?.rate || "—"),
          paymentMethod: inv?.payment_method || investor?.payment_method || "—",
          scheduleId: scheduleId
        };
      }

      const rowMeta = rowMetadata[rowKey];
      const cellKey = `${rowKey}|||${dueDate}`;
      if (!dataMap[cellKey]) dataMap[cellKey] = { amount: 0, records: [] };
      dataMap[cellKey].amount += amount;
      let termStart = schedule.term_start || "—";
      if (invStart && termStart !== "—" && termStart < invStart) termStart = invStart;

      // Special rule: Investor Principal Payment should have Start Date same as Due Date
      let finalTermStart = termStart;
      const typeStr = (paymentType || "").toString().toLowerCase().replace(/_/g, " ");
      if (typeStr === "investor principal payment") {
        finalTermStart = dueDate;
      }

      dataMap[cellKey].records.push({
        ...schedule,
        startDate: finalTermStart,
        rate: rowMeta.rate,
        freq: rowMeta.freq
      });
    });

    const rows = Array.from(rowSet).map(key => {
      const parts = key.split('|||');
      const investor = parts[0];
      const type = parts[1];
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
    return { rows, dates, data: dataMap };
  }, [filteredDealSchedules, CONTACTS, INVESTMENTS, FEES_DATA]);

  const drillDownColumns = useMemo(() => [
    { header: "Start Date", accessorKey: "startDate", size: 100 },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      size: 100,
      cell: ({ row }) => row.original.dueDate || row.original.due_date || "—"
    },
    {
      header: "Type",
      accessorKey: "type",
      size: 180,
      cell: ({ row }) => {
        let type = row.original.type || row.original.payment_type || "Unknown";
        const hasFeeRef = row.original.fee_id || row.original.feeId || row.original.fee_name || row.original.feeName;
        if (hasFeeRef) {
          const fId = (row.original.fee_id || row.original.feeId || "");
          const fee = fId ? (FEES_DATA.find(f => f.id === fId) || FEES_DATA.find(f => f.docId === fId)) : null;
          let resolvedName = (row.original.fee_name || row.original.feeName || "").trim();
          if (!resolvedName && fee) resolvedName = fee.name;
          if (resolvedName) type = resolvedName;
        }
        return type.replace(/_/g, ' ');
      }
    },
    { header: "Rate", accessorKey: "rate", size: 80 },
    { header: "Frequency", accessorKey: "freq", size: 100 },
    { header: "Period", accessorKey: "period_number", size: 80 },
    {
      header: "Amount",
      accessorKey: "signed_payment_amount",
      size: 120,
      cell: ({ row }) => {
        const val = row.original.signed_payment_amount || row.original.signedPaymentAmount || row.original.amount || 0;
        const amt = typeof val === 'number' ? val : (parseFloat(String(val).replace(/[$,\s]/g, '')) || 0);
        return <div style={{ textAlign: 'right', fontWeight: 600, color: amt < 0 ? "#ef4444" : (isDark ? "#34D399" : "#059669"), fontFamily: t.mono }}>
          ${Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      }
    },
    { header: "Status", accessorKey: "status", size: 100 },
  ], [isDark, FEES_DATA, t]);

  const filteredPivotRows = useMemo(() => {
    const filtered = pivotData.rows.filter(row => {
      const matchInvestor = !pivotFilters.investor || row.investor?.toLowerCase().includes(pivotFilters.investor.toLowerCase());
      const matchType = !pivotFilters.type || row.type?.replace(/_/g, ' ').toLowerCase().includes(pivotFilters.type.replace(/_/g, ' ').toLowerCase());
      const matchStart = !pivotFilters.startDate || row.startDate?.toLowerCase().includes(pivotFilters.startDate.toLowerCase());
      const matchEnd = !pivotFilters.endDate || row.endDate?.toLowerCase().includes(pivotFilters.endDate.toLowerCase());
      const matchFreq = !pivotFilters.freq || row.freq?.toLowerCase().includes(pivotFilters.freq.toLowerCase());
      const matchRate = !pivotFilters.rate || String(row.rate)?.toLowerCase().includes(pivotFilters.rate.toLowerCase());
      const matchSchedule = !pivotFilters.schedule || row.scheduleId?.toLowerCase().includes(pivotFilters.schedule.toLowerCase());
      const matchMethod = !pivotFilters.paymentMethod || row.paymentMethod?.toLowerCase().includes(pivotFilters.paymentMethod.toLowerCase());

      return matchInvestor && matchType && matchStart && matchEnd && matchFreq && matchRate && matchSchedule && matchMethod;
    });

    let currentInv = null;
    let currentIdx = -1;
    return filtered.map(r => {
      if (r.investor !== currentInv) {
        currentInv = r.investor;
        currentIdx++;
      }
      return { ...r, groupIndex: currentIdx };
    });
  }, [pivotData.rows, pivotFilters]);

  const gridRef = useRef();
  const tabs = ["Investments", ...(canAssetView ? ["Assets"] : []), "Distributions", "Documents", "Valuation forms", "Lending", "Contacts"];

  const calculatorOpts = (DIMENSIONS.find(d => d.name === "Calculator") || {}).items || ["ACT/360+30/360"];
  const investorEditTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorInvestmentEditType") || {}).items || [];
  const borrowerEditTypeOpts = (DIMENSIONS.find(d => d.name === "BorrowerInvestmentEditType") || {}).items || [];
  const investorNewTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorInvestmentNewType") || {}).items || [];
  const borrowerNewTypeOpts = (DIMENSIONS.find(d => d.name === "BorrowerInvestmentNewType") || {}).items || [];
  const scheduleFrequencyOpts = (DIMENSIONS.find(d => d.name === "ScheduleFrequency" || d.name === "Schedule Frequency") || {}).items || ["Monthly", "Quarterly", "Semi-Annual", "Annual", "At Maturity"];

  const selectedContact = CONTACTS.find(p => p.name === modal.data.contact);
  const contactRole = selectedContact ? selectedContact.role : "";
  const getTypeOpts = () => {
    const isLending = activeTab === "Lending";
    if (isLending) return borrowerNewTypeOpts.length > 0 ? borrowerNewTypeOpts : ["Loan", "Mortgage", "Equity"];

    const isNew = modal.mode === "add";
    const invOpts = investorNewTypeOpts;
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

  const setF = (k, v) => {
    setModal(prev => {
      const next = { ...prev, data: { ...prev.data, [k]: v } };
      // Auto-calculate maturity_date
      if (k === "start_date" && v && next.data.term_months) {
        const sd = new Date(v);
        if (!isNaN(sd)) { sd.setMonth(sd.getMonth() + parseInt(next.data.term_months, 10)); next.data.maturity_date = sd.toISOString().slice(0, 10); }
      }
      // Auto-calculate term_months
      if (k === "maturity_date" && v && next.data.start_date) {
        const sd = new Date(next.data.start_date); const md = new Date(v);
        if (!isNaN(sd) && !isNaN(md)) { next.data.term_months = String((md.getFullYear() - sd.getFullYear()) * 12 + md.getMonth() - sd.getMonth()); }
      }
      return next;
    });
  };

  const openAdd = () => {
    const isLending = activeTab === "Lending";
    const prefix = isLending ? "L" : "I";
    let maxIdNum = 10000;
    INVESTMENTS.forEach(c => {
      const cid = c.investment_id || c.id;
      if (cid && cid.startsWith(prefix)) {
        const num = parseInt(cid.substring(1), 10);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
    setModal({
      open: true,
      mode: "add",
      data: {
        id: `${prefix}${maxIdNum + 1}`,
        deal: deal.name || "",
        deal_id: deal.id || "",
        contact: "",
        type: isLending ? (borrowerNewTypeOpts[0] || "Loan") : "DEPOSIT",
        amount: "",
        rate: "",
        freq: "Quarterly",
        status: "Open",
        start_date: deal.startDate || "",
        maturity_date: deal.endDate || "",
        term_months: "",
        calculator: "ACT/360+30/360",
        rollover: false,
        generateSchedule: true,
        feeIds: [],
        investment_name: "",
        payment_method: (CONTACTS.find(p => p.name === "")?.payment_method || (paymentMethods[0] || ""))
      }
    });
  };

  const openEdit = (r) => {
    const feeIds = r.fees ? String(r.fees).split(",").filter(Boolean) : [];
    setModal({ open: true, mode: "edit", data: { ...r, id: r.investment_id || r.id, feeIds } });
  };

  const openAddContactModal = () => setContactModal({ open: true, mode: "existing", data: { type: "Individual", role: "Investor", investor_type: "Fixed", marketing_emails: "Subscribed" } });

  const handleRemoveContactFromDeal = async () => {
    if (!contactDelT) return;
    try {
      const contactDocId = contactDelT.docId || contactDelT.id;
      if (!contactDocId) throw new Error("Contact document ID not found");
      await deleteDoc(doc(db, "tenants", tenantId, "contacts", contactDocId));
      setContactDelT(null);
      showToast("Contact deleted", "success");
    } catch (err) {
      console.error("Delete contact error:", err);
      showToast("Failed to delete contact: " + err.message, "error");
    }
  };

  const handleSaveContactToDeal = async (skipDuplicateCheck = false) => {
    try {
      let contactId = "";
      let contactName = "";
      const mode = contactModal.mode;
      const isNew = mode === "new";
      const isEdit = mode === "edit";

      if (isEdit) {
        contactId = contactModal.data.id || contactModal.data.docId;
        if (!contactId) throw new Error("Missing contact ID");

        contactName = (contactModal.data.type === "Company" && contactModal.data.company_name)
          ? contactModal.data.company_name
          : `${contactModal.data.first_name} ${contactModal.data.last_name}`.trim();

        const contactPathPrefix = investmentCollection.includes("/")
          ? investmentCollection.substring(0, investmentCollection.lastIndexOf("/")) + "/contacts"
          : "contacts";

        const docRef = doc(db, contactPathPrefix, contactId);
        await updateDoc(docRef, {
          contact_name: contactName,
          first_name: contactModal.data.first_name || "",
          last_name: contactModal.data.last_name || "",
          email: contactModal.data.email || "",
          phone: contactModal.data.phone || "",
          contact_type: contactModal.data.type || "Individual",
          role_type: contactModal.data.role || "Investor",
          investor_type: contactModal.data.investor_type || "Fixed",
          address: contactModal.data.address || "",
          bank_information: contactModal.data.bank_information || "",
          bank_address: contactModal.data.bank_address || "",
          bank_routing_number: contactModal.data.bank_routing_number || "",
          bank_account_number: contactModal.data.bank_account_number || "",
          tax_id: contactModal.data.tax_id || "",
          company_name: contactModal.data.company_name || "",
          payment_method: contactModal.data.payment_method || "",
          notes: contactModal.data.notes || "",
          marketing_emails: contactModal.data.marketing_emails || "Subscribed",
          updated_at: serverTimestamp(),
        });
        setContactModal({ open: false, mode: "existing", data: {} });
        showToast("Contact updated", "success");
        return;
      }

      if (isNew) {
        if (!contactModal.data.first_name || !contactModal.data.last_name || !contactModal.data.email) {
          showToast("Please fill in first name, last name, and email.", "error");
          return;
        }

        const newFirst = (contactModal.data.first_name || "").toLowerCase().trim();
        const newLast = (contactModal.data.last_name || "").toLowerCase().trim();
        const isDuplicate = CONTACTS.find(c => {
          if (contactModal.data.type === "Company") {
            return (c.company_name || "").toLowerCase().trim() === (contactModal.data.company_name || "").toLowerCase().trim();
          }
          if ((c.contact_type || c.type) === "Company") return false;
          const cFirst = (c.first_name || "").toLowerCase().trim();
          const cLast = (c.last_name || "").toLowerCase().trim();
          if (!cFirst && !cLast && c.name) {
            const parts = c.name.trim().toLowerCase().split(/\s+/);
            return (parts[0] || "") === newFirst && (parts.slice(1).join(" ") || "") === newLast;
          }
          return cFirst === newFirst && cLast === newLast;
        });

        if (isDuplicate && !skipDuplicateCheck) {
          setDuplicateConfirm(true);
          return;
        }

        const maxNum = Math.max(10000, ...CONTACTS.map(p => { 
          const m = String(p.id).match(/^M(\d+)$/); 
          return m ? Number(m[1]) : 0; 
        }));
        contactId = "M" + (maxNum + 1);
        contactName = (contactModal.data.type === "Company" && contactModal.data.company_name)
          ? contactModal.data.company_name
          : `${contactModal.data.first_name} ${contactModal.data.last_name}`.trim();

        const contactPathPrefix = investmentCollection.includes("/")
          ? investmentCollection.substring(0, investmentCollection.lastIndexOf("/")) + "/contacts"
          : "contacts";

        const docRef = doc(db, contactPathPrefix, contactId);
        await setDoc(docRef, {
          id: contactId,
          contact_id: contactId,
          doc_id: contactId,
          contact_name: contactName,
          first_name: contactModal.data.first_name || "",
          last_name: contactModal.data.last_name || "",
          email: contactModal.data.email || "",
          phone: contactModal.data.phone || "",
          contact_type: contactModal.data.type || "Individual",
          role_type: contactModal.data.role || "Investor",
          investor_type: contactModal.data.investor_type || "Fixed",
          address: contactModal.data.address || "",
          bank_information: contactModal.data.bank_information || "",
          bank_address: contactModal.data.bank_address || "",
          bank_routing_number: contactModal.data.bank_routing_number || "",
          bank_account_number: contactModal.data.bank_account_number || "",
          tax_id: contactModal.data.tax_id || "",
          company_name: contactModal.data.company_name || "",
          payment_method: contactModal.data.payment_method || "",
          notes: contactModal.data.notes || "",
          marketing_emails: contactModal.data.marketing_emails || "Subscribed",
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      } else {
        if (!contactModal.data.selectedContactId) {
          showToast("Please select a contact.", "error");
          return;
        }
        contactId = contactModal.data.selectedContactId;
        const contact = CONTACTS.find(p => p.id === contactId || p.docId === contactId);
        contactName = contact ? contact.name : contactId;
      }

      // Create $0 investment record
      const isLending = activeTab === "Lending";
      const prefix = isLending ? "L" : "I";
      let maxIdNum = 10000;
      INVESTMENTS.forEach(c => {
        const cid = c.investment_id || c.id;
        if (cid && cid.startsWith(prefix)) {
          const num = parseInt(cid.substring(1), 10);
          if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
        }
      });
      const invId = `${prefix}${maxIdNum + 1}`;

      const newInv = {
        id: invId,
        investment_id: invId,
        doc_id: invId,
        amount: 0,
        deal_id: deal.id,
        deal_name: deal.name,
        contact_id: contactId,
        contact_name: contactName,
        investment_type: isLending ? "Borrower" : "Investor",
        status: "Active",
        start_date: deal.startDate || "",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      const invRef = doc(db, investmentCollection, invId);
      await setDoc(invRef, newInv);

      setContactModal({ open: false, mode: "existing", data: {} });
    } catch (err) {
      console.error(err);
      showToast("Failed to add contact: " + (err.message || String(err)), "error");
    }
  };

  async function handleSaveInvestment() {
    const d = modal.data;
    const dealObj = DEALS.find(p => p.name === d.deal);
    const contactObj = CONTACTS.find(p => p.name === d.contact);
    const payload = {
      deal_name: d.deal || "",
      deal_id: dealObj ? dealObj.id : (d.deal_id || ""),
      contact_name: d.contact || "",
      contact_id: contactObj ? contactObj.id : (d.contact_id || ""),
      investment_type: d.type || "",
      amount: d.amount ? Number(String(d.amount).replace(/[^0-9.-]/g, "")) || null : null,
      interest_rate: d.rate ? Number(String(d.rate).replace(/[^0-9.-]/g, "")) || null : null,
      rate: d.rate ? Number(String(d.rate).replace(/[^0-9.-]/g, "")) || null : null,
      payment_frequency: d.freq || "",
      term_months: d.term_months ? Number(d.term_months) : null,
      calculator: d.calculator || "",
      start_date: d.start_date || null,
      maturity_date: d.maturity_date || null,
      status: d.status || "",
      payment_method: d.payment_method || "",
      fees: (d.feeIds || []).join(","),
      rollover: !!d.rollover,
      investment_name: d.investment_name || "",
      updated_at: serverTimestamp(),
    };
    try {
      let safeInvestmentCollection = investmentCollection;
      if (safeInvestmentCollection === "investments" && dealPath && dealPath.startsWith("tenants/")) {
        const tenantPart = dealPath.split("/")[1];
        safeInvestmentCollection = `tenants/${tenantPart}/investments`;
      }

      if (!safeInvestmentCollection || safeInvestmentCollection === "investments" || safeInvestmentCollection.startsWith("GROUP:")) {
        throw new Error(`Execution blocked: Invalid investment path "${safeInvestmentCollection}".`);
      }

      let investmentIdForGen = "";
      if (modal.mode === "edit" && d.docId) {
        const docRef = d._path ? doc(db, d._path) : doc(db, safeInvestmentCollection, d.docId);
        await updateDoc(docRef, payload);
        investmentIdForGen = d.id;
      } else {
        const docRef = await addDoc(collection(db, safeInvestmentCollection), { ...payload, investment_id: d.id || "", created_at: serverTimestamp() });
        investmentIdForGen = d.id || "";
      }
      // Also update the contact's default payment method if it changed
      if (contactObj && d.payment_method) {
        const contactRef = contactObj._path ? doc(db, contactObj._path) : doc(db, "contacts", contactObj.docId || contactObj.id);
        await updateDoc(contactRef, { payment_method: d.payment_method, updated_at: serverTimestamp() }).catch(e => console.error("Sync contact error:", e));
      }

      // ZERO OUT SOURCE DISTRIBUTION IF ROLLOVER (Versioned Upgrade)
      if (d.rolloverDistributionId) {
        const dist = (SCHEDULES || []).find(s => s.id === d.rolloverDistributionId || s.docId === d.rolloverDistributionId);
        if (dist) {
          const distCollection = dist._path ? dist._path.split('/').slice(0, -1).join('/') : scheduleCollection;
          const oldRef = dist._path ? doc(db, dist._path) : doc(db, scheduleCollection, dist.docId || dist.id);
          
          const vNum = Number(dist.version_num || 1);
          const newVNum = vNum + 1;
          const versionId = `${dist.schedule_id || dist.payment_id || "S"}-V${newVNum}`;

          // 1. Deactivate old version
          await updateDoc(oldRef, {
            active_version: false,
            status: "REPLACED",
            replaced_at: serverTimestamp(),
            replaced_by: user?.email || "system",
            linked_schedule_id: versionId
          }).catch(e => console.error("Deactivate old version error:", e));

          // 2. Create new version (V2+) with 0 amount
          const newDocRef = doc(collection(db, distCollection));
          const { docId, id, _path, ...cleanOldData } = dist; // Remove metadata
          
          const newVersionData = {
            ...cleanOldData,
            investment_id: dist.investment_id || dist.investment || "",
            due_date: dist.due_date || dist.dueDate || "",
            type: dist.type || dist.payment_type || "",
            contact_id: dist.contact_id || "",
            deal_id: dist.deal_id || dealId || "",
            version_num: newVNum,
            version_id: versionId,
            previous_version_id: dist.docId || dist.id,
            payment_amount: 0,
            signed_payment_amount: 0,
            status: "Rollover",
            active_version: true,
            rollover: true,
            notes: (dist.notes || "") + ` (Rolled over to new investment ${investmentIdForGen})`,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          };

          await setDoc(newDocRef, newVersionData).catch(e => console.error("Create V2 version error:", e));
        }
      }

      // SYNC Rollover to distribution schedules
      const currentInvId = d.id || investmentIdForGen;
      if (currentInvId) {
        await syncRolloverToSchedules(db, SCHEDULES, currentInvId, !!d.rollover, scheduleCollection, tenantId);
      }

      setModal(m => ({ ...m, open: false }));

      // Run Generate Schedule if requested
      if (d.generateSchedule && investmentIdForGen) {
        // We need to pass the actual investment record that matching what executeGenerateSchedules expects
        const newInvForGen = {
          ...payload,
          id: investmentIdForGen,
          type: payload.investment_type, // Normalize field names as expected by generator
          freq: payload.payment_frequency, 
          fees: payload.fees,
        };
        executeGenerateSchedules([newInvForGen]);
      }
    } catch (err) {
      console.error("Save investment error:", err);
      setGenResult({ title: "Error", message: "Failed to save investment. " + err.message });
    }
  }

  const handleDeleteInvestment = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, investmentCollection, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete investment error:", err); }
  };

  function handleBulkInvestmentStatus(status) {
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
  }

  function handleBulkInvestmentDelete() {
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
  }

  async function handleUpdateInvestmentModal(inv) {
    if (!inv.id) return;
    const { id, ...rest } = inv;
    const payload = {
      ...rest,
      amount: rest.amount ? Number(String(rest.amount).replace(/[^0-9.-]/g, "")) || null : null,
      rate: rest.rate ? Number(String(rest.rate).replace(/[^0-9.-]/g, "")) || null : null,
      interest_rate: rest.rate ? Number(String(rest.rate).replace(/[^0-9.-]/g, "")) || null : null,
      term_months: rest.term_months ? Number(rest.term_months) || null : null,
      fees: (rest.feeIds || []).join(","),
      updated_at: serverTimestamp()
    };
    delete payload.docId;
    delete payload._path;

    // Human-readable field labels for diff
    const FIELD_LABELS = {
      investment_name: "Investment Name", type: "Type", amount: "Amount",
      rate: "Rate", freq: "Frequency", status: "Status", calculator: "Calculator",
      term_months: "Term (months)", start_date: "Start Date", maturity_date: "Maturity Date",
      payment_method: "Payment Method", rollover: "Rollover", deal: "Deal", fees: "Fees",
    };
    const SKIP = new Set(["docId", "_path", "id", "docId", "deal_id", "contact_id", "contact",
      "investment_id", "interest_rate", "payment_frequency", "feeIds", "created_at", "updated_at"]);

    const original = INVESTMENTS.find(i => i.id === id) || {};
    const changes = Object.entries(FIELD_LABELS)
      .filter(([key]) => {
        if (SKIP.has(key)) return false;
        const oldVal = String(original[key] ?? "").trim();
        const newVal = String(rest[key] ?? "").trim();
        return oldVal !== newVal;
      })
      .map(([key, label]) => {
        const oldVal = original[key] ?? "—";
        const newVal = rest[key] ?? "—";
        return `${label}: "${oldVal}" → "${newVal}"`;
      });

    const note = changes.length > 0
      ? `Investment updated:\n${changes.join("\n")}`
      : "Investment saved (no field changes detected)";

    try {
      const docRef = inv._path ? doc(db, inv._path) : doc(db, "tenants", tenantId, "investments", id);
      await updateDoc(docRef, payload);

      const tenantPath = docRef.path.split("/investments")[0];
      await addDoc(collection(db, tenantPath, "ledger"), {
        entity_type: "Investment",
        entity_id: id,
        note,
        created_at: serverTimestamp(),
        user_id: user?.uid || "system"
      });
    } catch (err) {
      console.error("Update investment modal error:", err);
      throw err;
    }
  }

  function handleBulkScheduleStatus(status) {
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
  }

  function handleBulkScheduleDelete() {
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
  }

  function handleGenerateSchedules() {
    if (sel.size === 0) return;
    const selected = INVESTMENTS.filter(c => sel.has(c.id));
    setGenConfirm({ count: selected.length });
  }

  async function executeGenerateSchedules(targetInvestments = null) {
    setGenConfirm(null);
    const selected = (Array.isArray(targetInvestments) ? targetInvestments : null) || INVESTMENTS.filter(c => sel.has(c.id));
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
      // 2. Logic Safeguard - Ensure tenant-specific path
      let schedulePath = scheduleCollection;
      
      // If we're in GLOBAL/Consolidated mode, derived safe path from dealPath if possible
      if ((!schedulePath || schedulePath === "paymentSchedules" || schedulePath.startsWith("GROUP:")) && dealPath && dealPath.startsWith("tenants/")) {
        const tenantPart = dealPath.split("/")[1];
        schedulePath = `tenants/${tenantPart}/paymentSchedules`;
      }

      if (!schedulePath || schedulePath === "paymentSchedules" || schedulePath.startsWith("GROUP:")) {
        throw new Error(`Execution blocked: Invalid schedule path "${schedulePath}". Operations must be scoped to a specific tenant.`);
      }

      const mkId = (pre = "S") => `${pre}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const parseNum = v => {
        const n = Number(String(v).replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? 0 : n;
      };

      const todayStr = new Date().toLocaleDateString();

      for (const c of selected) {
        const principal = parseNum(c.amount);
        const rate = parseNum(c.rate) / 100;
        const startDate = normalizeDateAtNoon(c.start_date);
        const matDate = normalizeDateAtNoon(c.maturity_date);

        if (!startDate || !matDate || matDate <= startDate || principal <= 0) {
          totalSkipped++;
          continue;
        }

        const entries = [];
        const cTypeUpper = (c.type || "").toUpperCase();
        const isDisbursement = cTypeUpper.includes("DISBURSEMENT") || (c.investment_id || c.id || "").startsWith("L");

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
          investment_id: c.investment_id || c.id, deal_id: dealId, contact_id: c.contact_id || "",
          due_date: startDate.toISOString().slice(0, 10), payment_type: initialPaymentType, type: initialPaymentType, fee_id: "",
          period_number: 1, principal_amount: principal, payment_amount: principal,
          signed_payment_amount: ds1.signed, direction_from_company: ds1.direction,
          original_payment_amount: principal,
          applied_to: "Principal Amount",
          term_start: startDate.toISOString().slice(0, 10), term_end: startDate.toISOString().slice(0, 10),
          status: "Due", notes: `Initial for ${c.id}`, 
          rollover: false,
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
              investment_id: c.investment_id || c.id, deal_id: dealId, contact_id: c.contact_id || "",
              due_date: dDate.toISOString().slice(0, 10), payment_type: PT_FEE, type: PT_FEE, fee_id: fid,
              period_number: 1, principal_amount: principal, payment_amount: feeAmt,
              signed_payment_amount: signedFeeAmt, direction_from_company: feeDir,
              original_payment_amount: feeAmt, term_start: startDate.toISOString().slice(0, 10), term_end: dDate.toISOString().slice(0, 10),
              applied_to: fInfo.applied_to || "Principal Amount", fee_name: fInfo.name || "Fee", fee_rate: fInfo.rate || "0", fee_method: fInfo.method || "Fixed Amount",
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
              investment_id: c.investment_id || c.id, deal_id: dealId, contact_id: c.contact_id || "",
              due_date: pEnd.toISOString().slice(0, 10), payment_type: interestPT, type: interestPT, fee_id: "",
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
                    investment_id: c.investment_id || c.id, deal_id: dealId, contact_id: c.contact_id || "",
                    due_date: feeDueDate.toISOString().slice(0, 10), payment_type: PT_FEE, type: PT_FEE, fee_id: fid,
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
          investment_id: c.investment_id || c.id, deal_id: dealId, contact_id: c.contact_id || "",
          due_date: matDate.toISOString().slice(0, 10), payment_type: repaymentPT, type: repaymentPT, fee_id: "",
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
        const existingSchedules = SCHEDULES.filter(s => (s.investment_id || s.investment) === c.id);
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

      setGenResult({ title: "Success", message: `Successfully processed ${selected.length} investment(s). Created: ${totalCreated}, Updated: ${totalUpdated}, Deleted: ${totalDeleted}` });
      setSel(new Set());
      setRowSelection({});
    } catch (err) {
      console.error("Schedule generation error:", err);
      setGenResult({ title: "Error", message: "Failed to generate schedules: " + err.message });
    } finally {
      setGenerating(false);
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
      const photosSnap = await getDocs(collection(db, dealPath, "assets", r.docId, "photos"));
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
      num_units: d.num_units ? Number(d.num_units) : null,
      units: d.units || "",
      net_asset_value: d.net_asset_value ? Number(String(d.net_asset_value).replace(/[^0-9.-]/g, "")) : null,
      acquisition_price: d.acquisition_price ? Number(String(d.acquisition_price).replace(/[^0-9.-]/g, "")) : null,
      acquisition_date: d.acquisition_date || null,
      exit_price: d.exit_price ? Number(String(d.exit_price).replace(/[^0-9.-]/g, "")) : null,
      exit_date: d.exit_date || null,
      year_built: d.year_built ? Number(d.year_built) : null,
      year_renovated: d.year_renovated ? Number(d.year_renovated) : null,
      images: uploadedPhotos.length + newPhotoFiles.length,
      updated_at: serverTimestamp(),
    };

    try {
      let assetDocRef;
      if (assetModal.mode === "edit" && d.docId) {
        assetDocRef = doc(db, dealPath, "assets", d.docId);
        await updateDoc(assetDocRef, payload);
      } else {
        assetDocRef = await addDoc(collection(db, dealPath, "assets"), {
          ...payload,
          created_at: serverTimestamp()
        });
      }

      // Upload new photos
      if (newPhotoFiles.length > 0) {
        const assetId = assetModal.mode === "edit" ? d.docId : assetDocRef.id;
        for (const fileObj of newPhotoFiles) {
          const path = `deals/${deal.id}/assets/${assetId}/${Date.now()}_${fileObj.file.name}`;
          const storageRef = ref(storage, path);
          const uploadResult = await uploadBytes(storageRef, fileObj.file);
          const url = await getDownloadURL(uploadResult.ref);

          await addDoc(collection(db, dealPath, "assets", assetId, "photos"), {
            url,
            path,
            name: fileObj.file.name,
            created_at: serverTimestamp()
          });
        }
      }

      // Refresh assets
      const snap = await getDocs(collection(db, dealPath, "assets"));
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
      const photosSnap = await getDocs(collection(db, dealPath, "assets", assetDelT.docId, "photos"));
      for (const photoDoc of photosSnap.docs) {
        await deleteDoc(doc(db, dealPath, "assets", assetDelT.docId, "photos", photoDoc.id));
      }

      // Delete asset document
      await deleteDoc(doc(db, dealPath, "assets", assetDelT.docId));

      // Refresh assets
      const snap = await getDocs(collection(db, dealPath, "assets"));
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

  const handleDealCoverUpload = async (e) => {
    if (!deal || !deal.id) {
      showToast("Please ensure the deal is saved before uploading photos.", "error");
      return;
    }
    const files = Array.from(e.target.files || e.dataTransfer?.files || []);
    if (!files.length) return;
    setUploadingCover(true);
    try {
      for (const file of files) {
        const path = `deals/${deal.id}/asset_images/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        await addDoc(collection(db, dealPath, "asset_images"), {
          url,
          path,
          name: file.name,
          created_at: serverTimestamp()
        });
      }
      const snap = await getDocs(collection(db, dealPath, "asset_images"));
      setAssetImages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      showToast("Failed to upload deal cover photo", "error");
    } finally {
      setUploadingCover(false);
    }
  };

  const removeDealCoverPhoto = async (photo) => {
    try {
      if (photo.id) {
        await deleteDoc(doc(db, dealPath, "asset_images", photo.id));
      }
      if (photo.path) {
        try { await deleteObject(ref(storage, photo.path)); } catch (_) { }
      }
      setAssetImages(prev => prev.filter(p => p.id !== photo.id));
    } catch (err) {
      console.error("Error removing photo:", err);
      showToast("Failed to remove cover photo", "error");
    }
  };

  const removeUploadedPhoto = async (photo) => {
    try {
      await deleteDoc(doc(db, dealPath, "assets", assetModal.data.docId, "photos", photo.id));
      if (photo.path) {
        try { await deleteObject(ref(storage, photo.path)); } catch (_) { }
      }
      setUploadedPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (e) {
      console.error("Error deleting photo:", e);
      setGenResult({ title: "Error", message: "Failed to delete photo." });
    }
  };

  const permissions = { canUpdate, canDelete };
  const callbacks = {
    onEdit: openEdit,
    onDelete: setDelT,
    onContactClick: (r) => {
      const cp = CONTACTS.find(x => x.name === r.contact || x.id === r.contact_id || x.docId === r.contact_id);
      if (cp) setDetailContact({ data: cp, view: "simple" });
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
        
        const colRef = collection(db, "tenants", tenantId, "investments");
        await addDoc(colRef, payload);
        showToast(`${prefix === "L" ? "Lending" : "Investment"} ${nextId} created (cloned)`, "success");
      } catch (err) {
        console.error("Clone error:", err);
        showToast("Failed to clone record", "error");
      }
    }
  };
  const context = { CONTACTS, FEES_DATA, SCHEDULES, callbacks, permissions, isDark, t };
  const columnDefs = useMemo(() => {
    return getDealInvestmentColumns(permissions, isDark, t, context, 'investment');
  }, [permissions, isDark, t, CONTACTS, FEES_DATA, SCHEDULES]);

  const lendingColumnDefs = useMemo(() => {
    return getDealInvestmentColumns(permissions, isDark, t, context, 'lending');
  }, [permissions, isDark, t, CONTACTS, FEES_DATA, SCHEDULES]);

  const investmentRowStyle = useCallback((row) => {
    if (!hasScheduleForInvestment(row)) {
      // Use exact notification colors requested
      return { background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB' };
    }
    return {};
  }, [hasScheduleForInvestment, isDark]);

  const distRowStyle = useCallback((row) => {
    if (row.rollover === true) {
      // Premium purple highlight for rollovers
      return { background: isDark ? 'rgba(147, 51, 234, 0.08)' : '#F5F3FF' };
    }
    return {};
  }, [isDark]);

  const scheduleColumnDefs = useMemo(() => {
    return getDistributionColumns(isDark, t, CONTACTS, DEALS, INVESTMENTS, {
      onEdit: (s) => setScheduleModal({ open: true, data: { ...s } }),
      onClone: async (s) => {
        try {
          const mkId = (pre = "S") => `${pre}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const newSId = mkId("S");
          // Remove unique identifiers and internal markers
          const { id, docId, _path, schedule_id, payment_id, version_id, created_at, updated_at, ...rest } = s;
          
          const newData = {
            ...rest,
            schedule_id: newSId,
            payment_id: newSId,
            version_id: `${newSId}-V1`,
            version_num: 1,
            active_version: true,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            notes: `Cloned from ${schedule_id || ""} — ${rest.notes || ""}`
          };
          
          const targetCollection = s._path 
            ? s._path.split('/').slice(0, -1).join('/') 
            : scheduleCollection;

          await addDoc(collection(db, targetCollection), newData);
          showToast(`Succeeded! Entry cloned.`, "success");
        } catch (err) {
          console.error("Clone schedule error:", err);
          showToast("Failed to clone entry.", "error");
        }
      },
      onDelete: (s) => {
        setConfirmAction({
          title: "Confirm Delete",
          message: `Are you sure you want to delete entry ${s.schedule_id}? This will remove it entirely from this deal's records.`,
          onConfirm: async () => {
            try {
              const refPath = s._path || `${scheduleCollection}/${s.docId || s.id}`;
              await deleteDoc(doc(db, refPath));
              setConfirmAction(null);
            } catch (err) { console.error("Schedule delete error:", err); }
          }
        });
      },
      onUndo: async (s) => {
        const isVersioned = Number(s.version_num || 1) > 1;
        const prevId = s.previous_version_id;

        setConfirmAction({
          title: isVersioned ? "Revert to Previous Version" : "Undo Action",
          message: isVersioned
            ? `This will delete current (V${s.version_num}) and reactivate the previous version. Are you sure?`
            : `Are you sure you want to revert last action for ${s.schedule_id || s.payment_id}?`,
          onConfirm: async () => {
            try {
              setConfirmAction(null);
              const refPath = s._path || `${scheduleCollection}/${s.docId || s.id}`;
              const ref = doc(db, refPath);

              if (isVersioned && prevId) {
                // 1. Find the predecessor in the global SCHEDULES array
                const prev = (SCHEDULES || []).find(x => x.docId === prevId || x.version_id === prevId);
                if (prev) {
                  const prevRef = prev._path ? doc(db, prev._path) : doc(db, scheduleCollection, prev.docId);
                  // Reactivate predecessor
                  const restorePayload = {
                    active_version: true,
                    updated_at: serverTimestamp(),
                    replaced_at: null,
                    replaced_by: null,
                    linked_schedule_id: ""
                  };
                  // If current version carries a snapshot, use it
                  if (s._undo_snapshot) {
                    Object.assign(restorePayload, s._undo_snapshot);
                  } else {
                    restorePayload.status = (prev.status === "REPLACED") ? "Due" : prev.status;
                  }
                  await updateDoc(prevRef, restorePayload);
                }
                // 2. Delete current
                await deleteDoc(ref);
                showToast(`Succeeded! Reverted ${s.schedule_id} to previous version.`, "success");
              } else if (s._undo_snapshot) {
                // Snapshot revert for non-versioned
                await updateDoc(ref, { ...s._undo_snapshot, _undo_snapshot: null, updated_at: serverTimestamp() });
                showToast(`Succeeded! Restored ${s.schedule_id} to previous state.`, "success");
              } else {
                // Basic delete fallback
                await deleteDoc(ref);
                showToast(`Succeeded! Entry ${s.schedule_id} removed.`, "success");
              }
            } catch (e) {
              console.error("Undo error:", e);
              showToast(`Undo failed: ${e.message}`, "error");
            }
          }
        });
      },
      onContactClick: (id) => {
        const c = (CONTACTS || []).find(x => x.id === id);
        if (c) setDetailContact({ data: c, view: "simple" });
      },
      onDealClick: (id) => setActivePage("Deals", { dealId: id })
    });
  }, [isDark, t, CONTACTS, DEALS, INVESTMENTS, scheduleCollection]);

  const contactColumnDefs = useMemo(() => {
    // Standardized context for contact columns
    const contactContext = {
      callbacks: {
        onNameClick: (r) => setDetailContact({ data: r, view: "detail" }),
        onEdit: (r) => setContactModal({ open: true, mode: "edit", data: { ...r } }),
        onDelete: (r) => setContactDelT(r),
        onInvite: (r) => { /* Optional: specific logic */ },
        onClone: async (r) => {
          try {
            let maxNum = 10000;
            CONTACTS.forEach(p => {
              const m = String(p.id).match(/^M(\d+)$/);
              if (m) {
                const num = Number(m[1]);
                if (num > maxNum) maxNum = num;
              }
            });
            const nextContactId = "M" + (maxNum + 1);
            
            const { id, docId, _path, created_at, updated_at, ...rest } = r;
            const payload = {
              ...rest,
              id: nextContactId,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
              notes: `Cloned from ${id || "unknown"} on ${new Date().toLocaleDateString()}.${r.notes ? ` ${r.notes}` : ""}`
            };
            
            const docRef = doc(db, "tenants", tenantId, "contacts", nextContactId);
            await setDoc(docRef, payload);

            // Also add to current deal
            const isLending = activeTab === "Lending";
            const prefix = isLending ? "L" : "I";
            let maxInvNum = 10000;
            INVESTMENTS.forEach(c => {
              const cid = c.investment_id || c.id;
              if (cid && cid.startsWith(prefix)) {
                const num = parseInt(cid.substring(1), 10);
                if (!isNaN(num) && num > maxInvNum) maxInvNum = num;
              }
            });
            const invId = `${prefix}${maxInvNum + 1}`;
            const newInv = {
              id: invId,
              investment_id: invId,
              doc_id: invId,
              amount: 0,
              deal_id: deal.id,
              deal_name: deal.name,
              contact_id: nextContactId,
              contact_name: (payload.type === "Company" && payload.company_name) ? payload.company_name : `${payload.first_name} ${payload.last_name}`.trim(),
              investment_type: isLending ? "Borrower" : "Investor",
              status: "Active",
              start_date: deal.startDate || "",
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            };
            await setDoc(doc(db, investmentCollection, invId), newInv);

            showToast(`Contact ${nextContactId} created (cloned) and added to deal`, "success");
          } catch (err) {
            console.error("Clone error:", err);
            showToast("Failed to clone contact", "error");
          }
        }
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
    const assetPermissions = { canUpdate: canAssetUpdate, canDelete: canAssetDelete };
    return getAssetColumns(assetPermissions, isDark, t, assetContext);
  }, [isDark, t, canAssetUpdate, canAssetDelete]);

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
        @keyframes spin { to { transform: rotate(360deg); } }
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
            {(activeTab === "Investments" || activeTab === "Lending") && sel.size > 0 && (
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
                  style={{ background: bulkScheduleStatus ? (t.accentGrad || t.accent) : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"), color: bulkScheduleStatus ? "#fff" : t.textMuted, border: "none", padding: "8px 16px", borderRadius: 11, fontSize: 12, fontWeight: 600, cursor: bulkScheduleStatus ? "pointer" : "default", boxShadow: bulkScheduleStatus ? `0 4px 12px ${t.accentShadow || "none"}` : "none" }}
                >
                  Apply
                </button>
                <button
                  onClick={handleBulkScheduleDelete}
                  style={{ background: isDark ? "rgba(248,113,113,0.1)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.2)" : "#FECACA"}`, padding: "8px 16px", borderRadius: 11, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Delete
                </button>
                <button onClick={() => setRowSelection({})} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear</button>
              </div>
            )}

            {/* --- Generate Button (Unified) --- */}
            {(activeTab === "Investments" || activeTab === "Lending") && (
              <button
                onClick={handleGenerateSchedules}
                disabled={generating || ((activeTab === "Investments" || activeTab === "Lending") ? sel.size === 0 : Object.keys(rowSelection).length === 0)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, background: t.successGrad || "#10B981", color: "#fff",
                  border: "none", padding: "11px 20px", borderRadius: 11, fontSize: 13, fontWeight: 600,
                  cursor: (generating || ((activeTab === "Investments" || activeTab === "Lending") ? sel.size === 0 : Object.keys(rowSelection).length === 0)) ? "default" : "pointer",
                  boxShadow: ((activeTab === "Investments" || activeTab === "Lending") ? sel.size > 0 : Object.keys(rowSelection).length > 0) ? `0 4px 16px ${t.successShadow || "rgba(16,185,129,0.2)"}` : "none",
                  opacity: (generating || ((activeTab === "Investments" || activeTab === "Lending") ? sel.size === 0 : Object.keys(rowSelection).length === 0)) ? 0.45 : 1
                }}
              >
                ▤ {generating ? "Generating..." : ((activeTab === "Investments" || activeTab === "Lending") ? (sel.size > 0 ? `Generate Schedules (${sel.size})` : "Generate Schedules") : (Object.keys(rowSelection).length > 0 ? `Generate Schedules (${Object.keys(rowSelection).length})` : "Generate Schedules"))}
              </button>
            )}


            {canCreate && (activeTab === "Investments" || activeTab === "Lending") && (
              <button 
                onClick={openAdd} 
                style={{ 
                  background: t.accentGrad || t.accent, 
                  color: "#fff", 
                  border: "none", 
                  padding: "11px 22px", 
                  borderRadius: 11, 
                  fontSize: 13.5, 
                  fontWeight: 600, 
                  boxShadow: `0 4px 16px ${t.accentShadow || "none"}`, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 7 
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> 
                {activeTab === "Lending" ? "New Lending" : "New investment"}
              </button>
            )}
            {canAssetCreate && activeTab === "Assets" && <button onClick={openAddAsset} style={{ background: t.accentGrad || t.accent, color: "#fff", border: "none", padding: "11px 20px", borderRadius: 11, fontSize: 13, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow || "none"}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add asset</button>}
            {canCreate && activeTab === "Contacts" && <button onClick={openAddContactModal} style={{ background: t.accentGrad || t.accent, color: "#fff", border: "none", padding: "11px 20px", borderRadius: 11, fontSize: 13, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow || "none"}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Contact</button>}
            {activeTab === "Distributions" && distributionView === "memo" && <button onClick={() => setDistMemoModal({ open: true, mode: "add", data: { deal_id: dealId } })} style={{ background: t.accentGrad || t.accent, color: "#fff", border: "none", padding: "11px 20px", borderRadius: 11, fontSize: 13, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow || "none"}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Distribution Memo</button>}
          </div>
        </div>
      </div>

      {pendingScheduleGenerationCount > 0 && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
            padding: "14px 18px",
            borderRadius: 12,
            border: isDark ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid #FDE68A",
            background: isDark ? "rgba(245, 158, 11, 0.1)" : "#FFFBEB",
            color: isDark ? "#FBBF24" : "#B45309",
          }}
        >
          <AlertTriangle size={22} style={{ flexShrink: 0 }} aria-hidden />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
              {(() => {
                const total = dealInvestments.length;
                const pending = pendingScheduleGenerationCount;
                const generated = total - pending;
                
                let text = pending === 1
                  ? "1 investment still needs payment schedule generation"
                  : `${pending} investments still need payment schedule generation`;
                  
                text += `, ${generated} ${generated === 1 ? "is" : "are"} generated.`;
                return text;
              })()}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.9 }}>
              Select investments on the Investments tab and use Generate Schedules to create rows.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("Investments")}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              color: t.accent,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
              padding: "4px 0",
            }}
          >
            Go to Investments
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8 }}>Fund Raising Progress</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? "#fff" : "#1C1917" }}>
            {fmtCurrency(deal.fundraisingAmount || 0)} <span style={{ fontSize: 16, color: t.accent }}>({(deal.fundraisingProgress || 0).toFixed(1)}%)</span>
          </div>
        </div>
        <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8 }}>Fund Balance</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? "#fff" : "#1C1917" }}>{totalFundBalance || "$0"}</div>
        </div>
        <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8 }}>Fund Raising Target</div>
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
        <div></div>
      </div>

      {activeTab === "Investments" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ height: '1200px', width: "100%", minHeight: '1200px' }}>
            <TanStackTable
              key="investments-table"
              data={dealInvestments}
              columns={columnDefs}
              pageSize={pageSize}
              t={t}
              isDark={isDark}
              rowStyle={investmentRowStyle}
              onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.id)))}
            />
          </div>
        </div>
      ) : activeTab === "Lending" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ height: '1200px', width: "100%", minHeight: '1200px' }}>
            <TanStackTable
              key="lending-table"
              data={dealLendings}
              columns={lendingColumnDefs}
              pageSize={pageSize}
              t={t}
              isDark={isDark}
              rowStyle={investmentRowStyle}
              onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.id)))}
            />
          </div>
        </div>
      ) : activeTab === "Distributions" ? (
        <div>
          {/* Distribution sub-tabs */}
          <div style={{ borderBottom: `1px solid ${t.surfaceBorder}`, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 24 }}>
            {[
              { key: "memo", label: "Distribution View" },
              { key: "table", label: "Table View" },
              { key: "pivot", label: "Pivot View" },
            ].map(({ key, label }) => (
              <div
                key={key}
                onClick={() => setDistributionView(key)}
                style={{
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  color: distributionView === key ? t.text : t.textMuted,
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s ease"
                }}
              >
                {label}
                {distributionView === key && <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: t.accent }} />}
              </div>
            ))}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, justifyContent: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Filter By</span>
              {["All", "Interest", "Principal", "Fee"].map(f => (
                <button
                  key={f}
                  onClick={() => setDistFilter(f)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: distFilter === f ? (t.accentGrad || t.accent) : (isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"),
                    color: distFilter === f ? "#fff" : t.textMuted,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: distFilter === f ? `0 4px 10px ${t.accentShadow}` : "none",
                    transform: distFilter === f ? "translateY(-1px)" : "none"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

          <div style={{ position: "relative" }} ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{ background: t.accentGrad || t.accent, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 4px 12px ${t.accentShadow || "none"}` }}
            >
              <Download size={16} /> Export <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <div style={{ position: "absolute", top: "100%", right: 0, mt: 8, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 1000, overflow: "hidden", minWidth: 160, transform: "translateY(8px)" }}>
                {[
                  { id: 'csv', label: 'CSV File (.csv)' },
                  { id: 'xlsx', label: 'Excel File (.xlsx)' },
                  { id: 'pdf', label: 'PDF Report (.pdf)' },
                  { id: 'docx', label: 'Word Document (.docx)' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => { handleExport(opt.id); setShowExportMenu(false); }}
                    style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: t.text, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => e.target.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"}
                    onMouseLeave={e => e.target.style.background = "transparent"}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 20 }} />

        {distributionView === "memo" ? (
          <div style={{ height: '1000px', width: "100%", minHeight: '1000px' }}>
            <TanStackTable
              key="dist-memo-table"
              data={distMemos}
              columns={getDistributionMemoColumns(isDark, t, {
                SCHEDULES: activeDealSchedules,
                dealId,
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
        ) : distributionView === "table" ? (
          <div style={{ height: '1000px', width: "100%", minHeight: '1000px' }}>
            <TanStackTable
              key="distributions-table"
                data={filteredDealSchedules}
                columns={scheduleColumnDefs}
                pageSize={100}
                initialSorting={[{ id: 'dueDate', desc: false }]}
                t={t}
                isDark={isDark}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                rowStyle={distRowStyle}
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
                Distribution Pivot Table
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
                          <div style={{ marginBottom: 8 }}>Investor Name</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.investor}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, investor: e.target.value })}
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
                          <div style={{ marginBottom: 8 }}>Type</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.type}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, type: e.target.value })}
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
                          <div style={{ marginBottom: 8 }}>Start Date</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.startDate}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, startDate: e.target.value })}
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
                          <div style={{ marginBottom: 8 }}>Payment Date</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.endDate}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, endDate: e.target.value })}
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
                          <div style={{ marginBottom: 8 }}>Freq</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.freq}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, freq: e.target.value })}
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
                          <div style={{ marginBottom: 8 }}>Rate</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.rate}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, rate: e.target.value })}
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
                          <div style={{ marginBottom: 8 }}>Schedule</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.schedule}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, schedule: e.target.value })}
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
                          borderRight: `2px solid ${t.surfaceBorder}`,
                        }}>
                          <div style={{ marginBottom: 8 }}>Payment Method</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.paymentMethod}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, paymentMethod: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: `1px solid ${t.surfaceBorder}` }}
                          />
                          <div onMouseDown={(e) => handleResize(7, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>
                        {pivotData.dates.map((date, idx) => (
                          <th key={idx} style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: t.text,
                            width: pivotDateWidth,
                            minWidth: pivotDateWidth,
                            maxWidth: pivotDateWidth,
                            position: "sticky",
                            top: 0,
                            background: isDark ? "#262626" : "#F9FAFB",
                            zIndex: 20,
                            borderBottom: `2px solid ${t.surfaceBorder}`,
                          }}>
                            {date}
                            <div onMouseDown={(e) => handleDateResize(e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                          </th>
                        ))}
                        <th style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: t.text,
                          background: isDark ? "#1e3a8a" : "#EFF6FF",
                          width: pivotDateWidth,
                          minWidth: pivotDateWidth,
                          maxWidth: pivotDateWidth,
                          position: "sticky",
                          top: 0,
                          right: 0,
                          zIndex: 40,
                          borderBottom: `2px solid ${t.surfaceBorder}`,
                        }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPivotRows.map((row, rowIdx) => {
                        let rowTotal = 0;
                        const rowBg = row.groupIndex % 2 === 0
                          ? (isDark ? "#121212" : "#fff")
                          : (isDark ? "#1a1a1a" : "#f5f5f5");
                        return (
                          <tr key={rowIdx} style={{
                            background: rowBg,
                            transition: "background 0.15s ease"
                          }}>
                            <td style={{
                              padding: "12px 16px",
                              fontWeight: 600,
                              color: t.text,
                              position: "sticky",
                              left: pivotOffsets[0],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[0],
                              minWidth: pivotColWidths[0],
                              maxWidth: pivotColWidths[0],
                              borderBottom: `1px solid ${t.surfaceBorder}`,
                              borderRight: `1px solid ${t.surfaceBorder}`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              <span
                                onClick={() => {
                                  const inv = CONTACTS.find(c => c.name === row.investor);
                                  if (inv) setDetailContact({ data: inv, view: "simple" });
                                }}
                                style={{
                                  cursor: "pointer",
                                  color: isDark ? "#60A5FA" : "#4F46E5",
                                  fontWeight: 600
                                }}
                              >
                                {row.investor}
                              </span>
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[1],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[1],
                              minWidth: pivotColWidths[1],
                              maxWidth: pivotColWidths[1],
                              borderBottom: `1px solid ${t.surfaceBorder}`,
                              borderRight: `1px solid ${t.surfaceBorder}`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                            {row.type.replace(/_/g, ' ')}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[2],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[2],
                              minWidth: pivotColWidths[2],
                              maxWidth: pivotColWidths[2],
                              borderBottom: `1px solid ${t.surfaceBorder}`,
                              borderRight: `1px solid ${t.surfaceBorder}`
                            }}>
                              {row.startDate}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[3],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[3],
                              minWidth: pivotColWidths[3],
                              maxWidth: pivotColWidths[3],
                              borderBottom: `1px solid ${t.surfaceBorder}`,
                              borderRight: `1px solid ${t.surfaceBorder}`
                            }}>
                              {row.endDate}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[4],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[4],
                              minWidth: pivotColWidths[4],
                              maxWidth: pivotColWidths[4],
                              borderBottom: `1px solid ${t.surfaceBorder}`,
                              borderRight: `1px solid ${t.surfaceBorder}`
                            }}>
                              {row.freq}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[5],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[5],
                              minWidth: pivotColWidths[5],
                              maxWidth: pivotColWidths[5],
                              borderBottom: `1px solid ${t.surfaceBorder}`,
                              borderRight: `1px solid ${t.surfaceBorder}`
                            }}>
                              {row.rate}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[6],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[6],
                              minWidth: pivotColWidths[6],
                              maxWidth: pivotColWidths[6],
                              borderBottom: `1px solid ${t.surfaceBorder}`,
                              borderRight: `1px solid ${t.surfaceBorder}`
                            }}>
                              {row.scheduleId}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[7],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[7],
                              minWidth: pivotColWidths[7],
                              maxWidth: pivotColWidths[7],
                              borderBottom: `1px solid ${t.surfaceBorder}`,
                              borderRight: `2px solid ${t.surfaceBorder}`
                            }}>
                              {row.paymentMethod}
                            </td>
                            {pivotData.dates.map((date, dateIdx) => {
                              const cellKey = `${row.key}|||${date}`;
                              const cellData = pivotData.data[cellKey];
                              const amount = cellData?.amount || 0;
                              rowTotal += amount;
                              const hasAmount = amount !== 0;
                              return (
                                <td key={dateIdx} style={{
                                  padding: "12px 16px",
                                  textAlign: "right",
                                  fontFamily: t.mono,
                                  fontWeight: 600,
                                  width: pivotDateWidth,
                                  minWidth: pivotDateWidth,
                                  maxWidth: pivotDateWidth,
                                  color: amount < 0 ? "#ef4444" : (hasAmount ? (isDark ? "#34D399" : "#059669") : t.textMuted),
                                  borderBottom: `1px solid ${t.surfaceBorder}`,
                                  background: rowBg
                                }}>
                                  {hasAmount ? (
                                    <span
                                      onClick={() => {
                                        const recs = [...(cellData?.records || [])].sort((a, b) => (a.dueDate || a.due_date || "").localeCompare(b.dueDate || b.due_date || ""));
                                        setDrillDown({
                                          open: true,
                                          records: recs,
                                          title: `${row.investor} - ${row.type.replace(/_/g, ' ')} (${date})`
                                        });
                                      }}
                                      style={{ cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                                    >
                                      ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  ) : "—"}
                                </td>
                              );
                            })}
                            <td style={{
                              padding: "12px 16px",
                              textAlign: "right",
                              fontFamily: t.mono,
                              fontWeight: 700,
                              fontSize: 13,
                              color: rowTotal < 0 ? "#ef4444" : (isDark ? "#60A5FA" : "#2563EB"),
                              background: isDark ? "#1e3a8a" : "#EFF6FF",
                              position: "sticky",
                              right: 0,
                              zIndex: 30,
                              width: 120,
                              minWidth: 120,
                              borderBottom: `1px solid ${t.surfaceBorder}`
                            }}>
                              <span
                                onClick={() => {
                                  const allRecs = pivotData.dates.flatMap(d => pivotData.data[`${row.key}|||${d}`]?.records || [])
                                    .sort((a, b) => (a.dueDate || a.due_date || "").localeCompare(b.dueDate || b.due_date || ""));
                                  setDrillDown({
                                    open: true,
                                    records: allRecs,
                                    title: `${row.investor} - ${row.type.replace(/_/g, ' ')} (Total)`
                                  });
                                }}
                                style={{ cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                              >
                                ${rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Column totals row */}
                      <tr style={{
                        background: isDark ? "#1e3a8a" : "#EFF6FF",
                        fontWeight: 700
                      }}>
                        <td style={{
                          padding: "12px 16px",
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[0],
                          bottom: 0,
                          background: isDark ? "#1e3a8a" : "#DBEAFE",
                          zIndex: 45,
                          width: pivotColWidths[0],
                          borderTop: `2px solid ${t.surfaceBorder}`,
                        }}>
                          Total
                        </td>
                        <td style={{
                          padding: "12px 16px",
                          position: "sticky",
                          bottom: 0,
                          left: pivotOffsets[1],
                          background: isDark ? "#1e3a8a" : "#DBEAFE",
                          zIndex: 45,
                          width: pivotColWidths[1],
                          borderTop: `2px solid ${t.surfaceBorder}`,
                        }} />
                        <td style={{
                          padding: "12px 16px",
                          position: "sticky",
                          bottom: 0,
                          left: pivotOffsets[2],
                          background: isDark ? "#1e3a8a" : "#DBEAFE",
                          zIndex: 45,
                          width: pivotColWidths[2],
                          borderTop: `2px solid ${t.surfaceBorder}`,
                        }} />
                        <td style={{
                          padding: "12px 16px",
                          position: "sticky",
                          bottom: 0,
                          left: pivotOffsets[3],
                          background: isDark ? "#1e3a8a" : "#DBEAFE",
                          zIndex: 45,
                          width: pivotColWidths[3],
                          borderTop: `2px solid ${t.surfaceBorder}`,
                        }} />
                        <td style={{
                          padding: "12px 16px",
                          position: "sticky",
                          bottom: 0,
                          left: pivotOffsets[4],
                          background: isDark ? "#1e3a8a" : "#DBEAFE",
                          zIndex: 45,
                          width: pivotColWidths[4],
                          borderTop: `2px solid ${t.surfaceBorder}`,
                        }} />
                        <td style={{
                          padding: "12px 16px",
                          position: "sticky",
                          bottom: 0,
                          left: pivotOffsets[5],
                          background: isDark ? "#1e3a8a" : "#DBEAFE",
                          zIndex: 45,
                          width: pivotColWidths[5],
                          borderTop: `2px solid ${t.surfaceBorder}`,
                        }} />
                        <td style={{
                          padding: "12px 16px",
                          position: "sticky",
                          bottom: 0,
                          left: pivotOffsets[6],
                          background: isDark ? "#1e3a8a" : "#DBEAFE",
                          zIndex: 45,
                          width: pivotColWidths[6],
                          borderTop: `2px solid ${t.surfaceBorder}`,
                        }} />
                        <td style={{
                          padding: "12px 16px",
                          position: "sticky",
                          bottom: 0,
                          left: pivotOffsets[7],
                          background: isDark ? "#1e3a8a" : "#DBEAFE",
                          zIndex: 45,
                          width: pivotColWidths[7],
                          borderTop: `2px solid ${t.surfaceBorder}`,
                          boxShadow: `1px 0 0 ${t.surfaceBorder}`
                        }} />
                        {pivotData.dates.map((date, idx) => {
                          const colTotal = filteredPivotRows.reduce((sum, row) => {
                            const cellKey = `${row.key}|||${date}`;
                            return sum + (pivotData.data[cellKey]?.amount || 0);
                          }, 0);
                          return (
                            <td key={idx} style={{
                              padding: "12px 16px",
                              textAlign: "right",
                              fontFamily: t.mono,
                              color: colTotal < 0 ? "#ef4444" : t.text,
                              position: "sticky",
                              bottom: 0,
                              background: isDark ? "#111827" : "#F3F4F6",
                              zIndex: 20,
                              borderTop: `2px solid ${t.surfaceBorder}`,
                            }}>
                              <span
                                onClick={() => {
                                  const allRecs = filteredPivotRows.flatMap(r => pivotData.data[`${r.key}|||${date}`]?.records || [])
                                    .sort((a, b) => (a.dueDate || a.due_date || "").localeCompare(b.dueDate || b.due_date || ""));
                                  setDrillDown({
                                    open: true,
                                    records: allRecs,
                                    title: `All Distributions - ${date}`
                                  });
                                }}
                                style={{ cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                              >
                                ${colTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                          );
                        })}
                        <td style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontFamily: t.mono,
                          fontSize: 14,
                          color: filteredPivotRows.reduce((gt, r) => gt + pivotData.dates.reduce((rt, d) => rt + (pivotData.data[`${r.key}|||${d}`]?.amount || 0), 0), 0) < 0 ? "#ef4444" : t.text,
                          position: "sticky",
                          bottom: 0,
                          right: 0,
                          background: isDark ? "#1e3a8a" : "#BFDBFE",
                          zIndex: 50,
                          borderTop: `2px solid ${t.surfaceBorder}`,
                        }}>
                          <span
                            onClick={() => {
                              const allRecs = filteredPivotRows.flatMap(r => pivotData.dates.flatMap(d => pivotData.data[`${r.key}|||${d}`]?.records || []))
                                .sort((a, b) => (a.dueDate || a.due_date || "").localeCompare(b.dueDate || b.due_date || ""));
                              setDrillDown({
                                open: true,
                                records: allRecs,
                                title: "Grand Total"
                              });
                            }}
                            style={{ cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                          >
                            ${filteredPivotRows.reduce((grandTotal, row) => {
                              return grandTotal + pivotData.dates.reduce((rowTotal, date) => {
                                const cellKey = `${row.key}|||${date}`;
                                return rowTotal + (pivotData.data[cellKey]?.amount || 0);
                              }, 0);
                            }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, paddingBottom: 40 }}>
          <div style={{ width: "100%", minHeight: '300px' }}>
            <TanStackTable
              data={assets}
              columns={assetColumnDefs}
              pageSize={pageSize}
              t={t}
              isDark={isDark}
            />
          </div>
          <div style={{ border: `1px solid ${t.surfaceBorder || "rgba(0,0,0,0.1)"}`, borderRadius: 12, padding: 24, background: isDark ? "rgba(255,255,255,0.02)" : "#fff" }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 180 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: 0 }}>Deal cover photo</h3>
              </div>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5, flex: 1, maxWidth: 600 }}>
                Upload your asset cover photo(s) here. For property-specific photos, add them to each asset.<br />
                Recommended: 16:9 for single photo or 4:3 for multiple photos. Minimum 1000px width.
              </p>
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div
                style={{
                  border: `2px dashed ${t.surfaceBorder || "rgba(0,0,0,0.2)"}`,
                  borderRadius: 12,
                  padding: "30px 20px",
                  textAlign: "center",
                  background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA",
                  cursor: "pointer",
                  position: "relative",
                  width: 180,
                  boxSizing: "border-box"
                }}
                onClick={() => dealCoverPhotoRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleDealCoverUpload({ target: { files: e.dataTransfer.files } });
                  }
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>
                  {uploadingCover ? "Uploading..." : "Drag and drop photos"}
                </div>
                {!uploadingCover && <div style={{ fontSize: 12, color: t.textMuted }}>or browse to choose files</div>}
                <input
                  ref={dealCoverPhotoRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleDealCoverUpload}
                  style={{ display: "none" }}
                />
              </div>
              {assetImages.length > 0 && (
                <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 16 }}>
                  {assetImages.map((photo, i) => (
                    <div
                      key={photo.id || i}
                      style={{
                        position: "relative",
                        borderRadius: 12,
                        overflow: "hidden",
                        border: `1px solid ${t.surfaceBorder || "rgba(0,0,0,0.1)"}`,
                        width: 200,
                        aspectRatio: "16/9"
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.name || "Cover"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeDealCoverPhoto(photo); }}
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "rgba(0,0,0,0.6)",
                          border: "none",
                          borderRadius: 6,
                          padding: 6,
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
      ) : activeTab === "Documents" ? (
        <div style={{ minHeight: '500px' }}>
          <DocumentsTab t={t} isDark={isDark} dealId={dealId} dealPath={dealPath} />
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA", borderRadius: 12 }}>
          Section "{activeTab}" is coming soon.
        </div>
      )}
      <Modal
        open={modal.open}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        title={modal.mode === "add" ? (activeTab === "Lending" ? "New Lending" : "New Investment") : (activeTab === "Lending" ? "Edit Lending" : "Edit Investment")}
        onSave={handleSaveInvestment}
        width={620}
        t={t}
        isDark={isDark}
      >
        {(modal.mode === "edit" || (modal.mode === "add" && modal.data.id)) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FF label={activeTab === "Lending" ? "Lending ID" : "Investment ID"} t={t}>
              <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", minHeight: 41, display: 'flex', alignItems: 'center' }}>{modal.data.id || "—"}</div>
            </FF>
            <FF label="Deal ID" t={t}>
              <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", minHeight: 41, display: 'flex', alignItems: 'center' }}>{modal.data.deal_id || "—"}</div>
            </FF>
          </div>
        )}
        <FF label="Deal name" t={t}><FSel value={modal.data.deal} onChange={e => setF("deal", e.target.value)} options={DEALS.map(p => p.name)} t={t} /></FF>
        <FF label="Contact" t={t}>
          <FSel 
            value={modal.data.contact} 
            onChange={e => setF("contact", e.target.value)} 
            options={activeTab === "Lending" 
              ? sortedContacts.filter(p => p.role === "Borrower" || p.role === "Both").map(p => p.name)
              : sortedContacts.map(p => p.name)
            } 
            t={t} 
          />
        </FF>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <FF label="Type" t={t}><FSel value={modal.data.type} onChange={e => setF("type", e.target.value)} options={getTypeOpts()} t={t} /></FF>
          <FF label="Amount" t={t}>
            {modal.data.lockedAmount ? (
              <div style={{ 
                fontFamily: t.mono, 
                fontSize: 13, 
                fontWeight: 700,
                color: isDark ? "#A5B4FC" : "#4338CA", 
                background: isDark ? "rgba(99,102,241,0.1)" : "#EEF2FF", 
                border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "#C7D2FE"}`, 
                borderRadius: 9, 
                padding: "10px 13px", 
                minHeight: 41, 
                display: 'flex', 
                alignItems: 'center' 
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
          {activeTab !== "Lending" && (
            <FF label="Rollover at Maturity" t={t}>
              <div style={{ display: "flex", alignItems: "center", height: 38 }}>
                <input type="checkbox" checked={!!modal.data.rollover} onChange={e => setF("rollover", e.target.checked)} style={{ cursor: "pointer", width: 18, height: 18 }} />
                <span style={{ marginLeft: 8, fontSize: 13, color: t.textSecondary }}>Rollover Principal</span>
              </div>
            </FF>
          )}
          {modal.mode === "add" && (
            <FF label="Generate Schedule" t={t}>
              <div style={{ display: "flex", alignItems: "center", height: 38 }}>
                <input type="checkbox" checked={!!modal.data.generateSchedule} onChange={e => setF("generateSchedule", e.target.checked)} style={{ cursor: "pointer", width: 18, height: 18 }} />
                <span style={{ marginLeft: 8, fontSize: 13, color: t.textSecondary }}>Generate automatically</span>
              </div>
            </FF>
          )}
        </div>
        <FF label="Calculator" t={t}><FSel value={modal.data.calculator || ""} onChange={e => setF("calculator", e.target.value)} options={calculatorOpts} t={t} /></FF>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Start Date" t={t}><FIn value={modal.data.start_date || ""} onChange={e => setF("start_date", e.target.value)} t={t} type="date" /></FF>
          <FF label="Maturity Date" t={t}><FIn value={modal.data.maturity_date || ""} onChange={e => setF("maturity_date", e.target.value)} t={t} type="date" /></FF>
        </div>
        <FF label="Payment Method" t={t}><FSel value={modal.data.payment_method} onChange={e => setF("payment_method", e.target.value)} options={paymentMethods} t={t} /></FF>
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

      {/* Add Contact Modal */}
      <Modal
        open={contactModal.open}
        onClose={() => setContactModal({ open: false, mode: "existing", data: {} })}
        title={contactModal.mode === "edit" ? "Edit Contact" : (contactModal.mode === "existing" ? "Add Existing Contact" : "Create New Contact")}
        onSave={handleSaveContactToDeal}
        width={600}
        t={t}
        isDark={isDark}
      >
        {contactModal.mode !== "edit" && (
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setContactModal(prev => ({ ...prev, mode: "existing" }))}
              style={{ flex: 1, padding: "8px 16px", borderRadius: 8, border: `1px solid ${contactModal.mode === "existing" ? t.accent : t.surfaceBorder}`, background: contactModal.mode === "existing" ? (isDark ? "rgba(59,130,246,0.1)" : "#EFF6FF") : "transparent", color: contactModal.mode === "existing" ? t.accent : t.text, fontWeight: 600, cursor: "pointer" }}
            >
              Select Existing Contact
            </button>
            <button
              type="button"
              onClick={() => setContactModal(prev => ({ ...prev, mode: "new" }))}
              style={{ flex: 1, padding: "8px 16px", borderRadius: 8, border: `1px solid ${contactModal.mode === "new" ? t.accent : t.surfaceBorder}`, background: contactModal.mode === "new" ? (isDark ? "rgba(59,130,246,0.1)" : "#EFF6FF") : "transparent", color: contactModal.mode === "new" ? t.accent : t.text, fontWeight: 600, cursor: "pointer" }}
            >
              Create New Contact
            </button>
          </div>
        )}

        {contactModal.mode === "existing" ? (
          <FF label="Select Contact" t={t}>
            <select
              value={contactModal.data.selectedContactId || ""}
              onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, selectedContactId: e.target.value } }))}
              style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: contactModal.data.selectedContactId ? t.searchText : (t.textMuted), fontSize: 13.5, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
            >
              <option value="">Select an existing contact...</option>
              {sortedContacts.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.email || c.role || c.type || "Unknown"})</option>
              ))}
            </select>
          </FF>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FF label="First Name" t={t}><FIn value={contactModal.data.first_name || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, first_name: e.target.value } }))} placeholder="e.g. John" t={t} /></FF>
              <FF label="Last Name" t={t}><FIn value={contactModal.data.last_name || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, last_name: e.target.value } }))} placeholder="e.g. Doe" t={t} /></FF>
            </div>
            {contactModal.data.type === "Company" && (
              <FF label="Company Name" t={t}><FIn value={contactModal.data.company_name || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, company_name: e.target.value } }))} placeholder="e.g. Acme Corp" t={t} /></FF>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FF label="Contact Type" t={t}><FSel value={contactModal.data.type || "Individual"} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, type: e.target.value } }))} options={contactTypeOpts} t={t} /></FF>
              <FF label="Role" t={t}><FSel value={contactModal.data.role || "Investor"} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, role: e.target.value } }))} options={roleOpts} t={t} /></FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FF label="Investor Type" t={t}><FSel value={contactModal.data.investor_type || "Fixed"} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, investor_type: e.target.value } }))} options={investorTypeOpts} t={t} /></FF>
              <FF label="Email" t={t}><FIn value={contactModal.data.email || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, email: e.target.value } }))} placeholder="email@example.com" t={t} type="email" /></FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FF label="Phone" t={t}><FIn value={contactModal.data.phone || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, phone: e.target.value } }))} placeholder="e.g. 555-123-4567" t={t} /></FF>
              <FF label="Tax ID" t={t}><FIn value={contactModal.data.tax_id || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, tax_id: e.target.value } }))} placeholder="e.g. 12-3456789" t={t} /></FF>
            </div>
            <FF label="Address" t={t}><FIn value={contactModal.data.address || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, address: e.target.value } }))} placeholder="Full address" t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FF label="Bank Name" t={t}><FIn value={contactModal.data.bank_information || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, bank_information: e.target.value } }))} placeholder="e.g. Citibank" t={t} /></FF>
              <FF label="Bank Address" t={t}><FIn value={contactModal.data.bank_address || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, bank_address: e.target.value } }))} placeholder="Bank branch address" t={t} /></FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FF label="Bank Routing Number" t={t}><FIn value={contactModal.data.bank_routing_number || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, bank_routing_number: e.target.value } }))} placeholder="9-digit routing #" t={t} /></FF>
              <FF label="Bank Account Number" t={t}><FIn value={contactModal.data.bank_account_number || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, bank_account_number: e.target.value } }))} placeholder="Account #" t={t} /></FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FF label="Payment Method" t={t}><FSel value={contactModal.data.payment_method || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, payment_method: e.target.value } }))} options={paymentMethods} t={t} /></FF>
              <FF label="Marketing Emails?" t={t}><FSel value={contactModal.data.marketing_emails || "Subscribed"} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, marketing_emails: e.target.value } }))} options={["Subscribed", "Unsubscribed"]} t={t} /></FF>
            </div>
            <FF label="Notes" t={t}><textarea value={contactModal.data.notes || ""} onChange={e => setContactModal(prev => ({ ...prev, data: { ...prev.data, notes: e.target.value } }))} placeholder="Additional notes..." rows={3} style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} /></FF>
          </>
        )}
      </Modal>

      <ConfirmModal 
        open={duplicateConfirm} 
        onClose={() => setDuplicateConfirm(false)} 
        onConfirm={() => {
          setDuplicateConfirm(false);
          handleSaveContactToDeal(true);
        }}
        title="Duplicate Name"
        message={`A contact with the name "${contactModal.data.first_name} ${contactModal.data.last_name}" already exists. Do you still want to proceed?`}
        t={t}
        isDark={isDark}
      />


      {/* Schedule Edit Modal */}
      <Modal
        open={scheduleModal.open}
        onClose={() => setScheduleModal(m => ({ ...m, open: false }))}
        title={`Edit Entry ${scheduleModal.data.schedule_id || ""}`}
        onSave={async () => {
          try {
            const s = scheduleModal.data;
            const refPath = s._path || `${scheduleCollection}/${s.docId || s.id}`;
            const dataToSave = {
              dueDate: s.dueDate || "",
              payment_amount: Number(String(s.payment_amount || 0).replace(/[^0-9.-]/g, "")) || 0,
              signed_payment_amount: Number(String(s.signed_payment_amount || 0).replace(/[^0-9.-]/g, "")) || 0,
              status: s.status || "Due",
              rollover: s.rollover || false,
              notes: s.notes || "",
              updated_at: serverTimestamp()
            };
            await updateDoc(doc(db, refPath), dataToSave);
            
            // SYNC Rollover back to Investment
            if (s.type === "INVESTOR_PRINCIPAL_PAYMENT" && s.investment) {
              const inv = INVESTMENTS.find(i => i.id === s.investment || i.investment_id === s.investment);
              if (inv) {
                const invPath = inv._path || `${investmentCollection}/${inv.docId || inv.id}`;
                await updateDoc(doc(db, invPath), { rollover: !!s.rollover, updated_at: serverTimestamp() }).catch(e => console.error("Sync inv rollover error:", e));
              }
            }

            // TRIGGER NEW INVESTMENT MODAL IF STATUS IS ROLLOVER
            if (s.status === "Rollover") {
              const absAmount = Math.abs(dataToSave.signed_payment_amount || dataToSave.payment_amount || 0);
              const contactRef = (CONTACTS || []).find(c => c.id === s.contact_id);
              
              setScheduleModal({ open: false, data: {} });
              // Small delay to let first modal close
              setTimeout(() => {
                setModal({
                  open: true,
                  mode: "add",
                  data: {
                    amount: absAmount,
                    deal: s.deal_name || (DEALS.find(d => d.id === s.deal_id)?.name || ""),
                    contact: contactRef ? contactRef.name : (s.party_id || ""),
                    type: "DEPOSIT", // Pre-fill with standard new type
                    source_of_funds: "Rollover Principal",
                    rollover_source_id: s.investment || "",
                    rolloverDistributionId: s.id || s.docId, // Reference for later zero-out
                    lockedAmount: true,
                    status: "Open"
                  }
                });
              }, 150);
              return;
            }
            
            setScheduleModal({ open: false, data: {} });
          } catch (err) { console.error("Save schedule error:", err); }
        }}
        width={500}
        t={t}
        isDark={isDark}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Due Date" t={t}><FIn value={scheduleModal.data.dueDate || ""} onChange={e => setScheduleModal(m => ({ ...m, data: { ...m.data, dueDate: e.target.value } }))} t={t} type="date" /></FF>
          <FF label="Status" t={t}>
            <FSel 
              value={scheduleModal.data.status} 
              onChange={e => setScheduleModal(m => ({ ...m, data: { ...m.data, status: e.target.value } }))} 
              options={scheduleModal.data.rollover 
                ? Array.from(new Set(["Rollover", scheduleModal.data.status])) 
                : paymentStatusOpts
              } 
              t={t} 
            />
          </FF>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Payment Amount" t={t}><FIn value={scheduleModal.data.payment_amount} onChange={e => setScheduleModal(m => ({ ...m, data: { ...m.data, payment_amount: e.target.value } }))} placeholder="e.g. 100.00" t={t} /></FF>
          <FF label="Signed Amount" t={t}><FIn value={scheduleModal.data.signed_payment_amount} onChange={e => setScheduleModal(m => ({ ...m, data: { ...m.data, signed_payment_amount: e.target.value } }))} placeholder="e.g. -100.00" t={t} /></FF>
        </div>
        
        {scheduleModal.data.type === "INVESTOR_PRINCIPAL_PAYMENT" && (
          <div style={{ marginTop: 12, marginBottom: 12, padding: "12px", background: isDark ? "rgba(147, 51, 234, 0.08)" : "#F5F3FF", borderRadius: 12, border: `1px solid ${isDark ? "rgba(147, 51, 234, 0.2)" : "#DDD6FE"}` }}>
            <h4 style={{ fontSize: 10, fontWeight: 700, color: isDark ? "#A855F7" : "#7E22CE", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Rollover at Maturity</h4>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={scheduleModal.data.rollover || false}
                onChange={e => setScheduleModal(m => ({ ...m, data: { ...m.data, rollover: e.target.checked } }))}
                style={{ width: 18, height: 18, accentColor: "#9333EA", cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Rollover Principal</span>
            </label>
          </div>
        )}

        <FF label="Notes" t={t}><FIn value={scheduleModal.data.notes || ""} onChange={e => setScheduleModal(m => ({ ...m, data: { ...m.data, notes: e.target.value } }))} placeholder="Edit notes..." t={t} /></FF>
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
                  <FSel
                    value={assetModal.data.asset_type || ""}
                    onChange={e => setAssetModal(m => ({ ...m, data: { ...m.data, asset_type: e.target.value } }))}
                    options={assetTypeOpts}
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
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handlePhotoUpload({ target: { files: e.dataTransfer.files } });
                  }
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>
                  Drag and drop photos
                </div>
                <div style={{ fontSize: 12, color: t.textMuted }}>or browse to choose files</div>
                <input
                  ref={photoInputRef}
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
      <DelModal target={contactDelT} onClose={() => setContactDelT(null)} onConfirm={handleRemoveContactFromDeal} label="this contact" t={t} isDark={isDark} />
      <DelModal target={distMemoDelT} onClose={() => setDistMemoDelT(null)} onConfirm={handleDeleteDistMemo} label="this distribution memo" t={t} isDark={isDark} />

      {/* Add / Edit Distribution Memo Modal */}
      <Modal
        open={distMemoModal.open}
        onClose={() => setDistMemoModal({ open: false, mode: "add", data: {} })}
        title={distMemoModal.mode === "edit" ? "Edit Distribution Memo" : "Add Distribution Memo"}
        onSave={handleSaveDistMemo}
        width={520}
        t={t}
        isDark={isDark}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FF label="Memo" t={t}>
            <FIn
              value={distMemoModal.data.memo || ""}
              onChange={e => setDistMemoModal(m => ({ ...m, data: { ...m.data, memo: e.target.value } }))}
              placeholder="e.g. Q1 2025 Interest Distribution"
              t={t}
            />
          </FF>
          <FF label="Payment Status" t={t}>
            <FMultiSel
              value={Array.isArray(distMemoModal.data.status) ? distMemoModal.data.status : (distMemoModal.data.status ? [distMemoModal.data.status] : [])}
              options={paymentStatusOpts}
              onChange={v => setDistMemoModal(m => ({ ...m, data: { ...m.data, status: v } }))}
              t={t}
            />
          </FF>
          <FF label="Payment Type" t={t}>
            <FMultiSel
              value={Array.isArray(distMemoModal.data.payment_type) ? distMemoModal.data.payment_type : (distMemoModal.data.payment_type ? [distMemoModal.data.payment_type] : [])}
              options={paymentTypeOpts}
              onChange={v => setDistMemoModal(m => ({ ...m, data: { ...m.data, payment_type: v } }))}
              t={t}
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
          {distMemoModal.data.period_start && distMemoModal.data.period_end && (
            <div style={{ padding: "10px 14px", background: isDark ? "rgba(59,130,246,0.08)" : "#EFF6FF", border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "#BFDBFE"}`, borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#93C5FD" : "#1D4ED8" }}>
                {(() => {
                  const types = Array.isArray(distMemoModal.data.payment_type) ? distMemoModal.data.payment_type.map(x => x.toLowerCase()) : [];
                  const count = activeDealSchedules.filter(s => {
                    const sType = (s.type || s.payment_type || "").toLowerCase();
                    const due = s.dueDate || s.due_date || "";
                    const typeMatch = types.length === 0 || types.includes(sType);
                    return typeMatch && due >= distMemoModal.data.period_start && due <= distMemoModal.data.period_end;
                  }).length;
                  return `${count} schedule${count !== 1 ? "s" : ""} will be linked with these criteria`;
                })()}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Distribution Memo Drilldown Modal */}
      {distMemoDrillDown.open && (
        <Modal
          open={distMemoDrillDown.open}
          onClose={() => setDistMemoDrillDown({ open: false, memo: null, schedules: [] })}
          title={distMemoDrillDown.memo?.memo || "Linked Schedules"}
          width={900}
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
            <div style={{ height: 400 }}>
              <TanStackTable
                data={distMemoDrillDown.schedules}
                columns={scheduleColumnDefs}
                pageSize={50}
                t={t}
                isDark={isDark}
                initialSorting={[{ id: 'dueDate', desc: false }]}
              />
            </div>
          </div>
        </Modal>
      )}

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

      {/* Generation Loading Overlay */}
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

      {/* Distribution Drill-Down Modal */}
      <Modal
        open={drillDown.open}
        onClose={() => setDrillDown(prev => ({ ...prev, open: false }))}
        title={`Distribution Summary: ${drillDown.title}`}
        width={850}
        t={t}
        isDark={isDark}
        onSave={() => setDrillDown(prev => ({ ...prev, open: false }))}
        saveLabel="Close"
        showCancel={false}
      >
        <div style={{ height: 450, width: "100%", padding: "10px 0" }}>
          <TanStackTable
            data={drillDown.records}
            columns={drillDownColumns}
            pageSize={50}
            t={t}
            isDark={isDark}
          />
        </div>
      </Modal>

      <InvestorSummaryModal
        contact={detailContact?.data || detailContact}
        defaultView={detailContact?.view || "simple"}
        onClose={() => setDetailContact(null)}
        isDark={isDark}
        t={t}
        INVESTMENTS={INVESTMENTS}
        SCHEDULES={SCHEDULES}
        DEALS={DEALS}
        DIMENSIONS={DIMENSIONS}
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
            // If tenantId is not provided, try to extract from investmentCollection path
            let tId = tenantId;
            if (!tId && investmentCollection.includes("tenants/")) {
              tId = investmentCollection.split("/")[1];
            }
            if (!tId) throw new Error("Missing tenant ID");


            await updateDoc(doc(db, "tenants", tId, "contacts", docId), payload);
            setDetailContact({ ...detailContact, data: { ...d, ...payload } });

            const ledgerRef = collection(db, "tenants", tId, "ledger");
            await addDoc(ledgerRef, {
              entity_type: "Contact",
              entity_id: docId,
              note: `Contact profile updated: ${Object.keys(payload).filter(k => k !== 'updatedAt').join(", ")}`,
              created_at: serverTimestamp(),
              user_id: user?.uid || "system"
            });
          } catch (err) {
            console.error("Update error:", err);
            showToast("Failed to update contact: " + err.message, "error");
          }
        }}
        onUpdateInvestment={handleUpdateInvestmentModal}
        onAddNote={async ({ text }) => {
          const contact = detailContact?.data || detailContact;
          const contactId = contact?.docId || contact?.id;
          if (!contactId || !tenantId) throw new Error("Missing contact or tenant ID");
          const noteRef = await addDoc(
            collection(db, "tenants", tenantId, "contacts", contactId, "notes"),
            { text, created_at: serverTimestamp(), author: "" }
          );
          return { id: noteRef.id, text, created_at: new Date().toISOString(), author: "" };
        }}
        tenantId={tenantId}
        LEDGER={LEDGER}
        USERS={USERS}
        currentUser={user}
      />
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
        </div>
      )}
    </div>
  );
}

async function syncRolloverToSchedules(db, schedules, investmentId, isRollover, schedulePath, tenantId) {
  if (!db || !investmentId) return;
  const principalSchedules = (schedules || []).filter(s => s.investment === investmentId && s.type === "INVESTOR_PRINCIPAL_PAYMENT");
  if (principalSchedules.length > 0) {
    try {
      await Promise.all(principalSchedules.map(s => {
        const path = s._path || (schedulePath && schedulePath !== "paymentSchedules" ? `${schedulePath}/${s.docId || s.id}` : `tenants/${tenantId}/paymentSchedules/${s.docId || s.id}`);
        return updateDoc(doc(db, path), { rollover: !!isRollover, updated_at: serverTimestamp() });
      }));
    } catch (e) {
      console.error("Principal schedule rollover sync error:", e);
    }
  }
}

import { useState } from "react";
import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { normalizeDateAtNoon, hybridDays, pmtCalculator_ACT360_30360, feeCalculator_ACT360_30360, getFrequencyValue, sortData } from "../utils";
import { Bdg, StatCard, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, FSel, DelModal } from "../components";

export default function PageContracts({ t, isDark, CONTRACTS = [], PROJECTS = [], PARTIES = [], DIMENSIONS = [], FEES_DATA = [], SCHEDULES = [], collectionPath = "", schedulePath = "" }) {
  const [hov, setHov] = useState(null); const [sel, setSel] = useState(new Set());
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const openAdd = () => {
    let maxIdNum = 9999;
    CONTRACTS.forEach(c => {
      const cid = c.contract_id || c.id;
      if (cid && cid.startsWith("C")) {
        const num = parseInt(cid.substring(1), 10);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
    const nextId = `C${maxIdNum + 1}`;

    const firstProj = PROJECTS[0];
    const sd = firstProj ? firstProj.startDate : "";
    const ed = firstProj ? firstProj.endDate : "";
    let termM = "";
    if (sd && ed) { const s = new Date(sd); const e = new Date(ed); if (!isNaN(s) && !isNaN(e)) termM = String((e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth()); }
    setModal({
      open: true,
      mode: "add",
      data: {
        id: nextId,
        project: firstProj ? firstProj.name : "",
        project_id: firstProj ? (firstProj.project_id || firstProj.id) : "",
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
  const handleSaveContract = async () => {
    const d = modal.data;
    const pObj = PROJECTS.find(p => p.name === d.project);
    const parObj = PARTIES.find(p => p.name === d.party);
    const payload = {
      project_name: d.project || "",
      project_id: pObj ? pObj.id : (d.project_id || ""),
      counterparty_name: d.party || "",
      counterparty_id: parObj ? parObj.id : (d.party_id || d.counterparty_id || ""),
      contract_type: d.type || "",
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
        await addDoc(collection(db, collectionPath), { ...payload, contract_id: d.id || "", created_at: serverTimestamp() });
      }
    } catch (err) { console.error("Save contract error:", err); }
    close();
  };

  const handleDeleteContract = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete contract error:", err); }
  };
  const contractStatusOpts = ["Open", "Active", "Closed"];
  const [bulkStatus, setBulkStatus] = useState("");
  const handleBulkStatus = async (status) => {
    if (!status || sel.size === 0) return;
    if (!window.confirm(`Are you sure you want to update status to "${status}" for ${sel.size} contract(s)?`)) return;
    try {
      await Promise.all([...sel].map(id => {
        const c = CONTRACTS.find(c => c.id === id);
        if (c && c.docId) return updateDoc(doc(db, collectionPath, c.docId), { status, updated_at: serverTimestamp() });
        return Promise.resolve();
      }));
      setSel(new Set()); setBulkStatus("");
    } catch (err) { console.error("Bulk status update error:", err); }
  };
  const handleBulkDelete = async () => {
    if (sel.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${sel.size} contract(s)? This action cannot be undone.`)) return;
    try {
      await Promise.all([...sel].map(id => {
        const c = CONTRACTS.find(c => c.id === id);
        if (c && c.docId) return deleteDoc(doc(db, collectionPath, c.docId));
        return Promise.resolve();
      }));
      setSel(new Set());
    } catch (err) { console.error("Bulk delete error:", err); }
  };
  const handleGenerate = async () => {
    if (sel.size === 0) return;
    const selected = CONTRACTS.filter(c => sel.has(c.id));

    // 1. Preparation - Load mapping from DIMENSIONS
    const findDim = n => (DIMENSIONS.find(d => d.name === n) || {}).items || [];
    const ptItems = findDim("PaymentType");
    const inPT = findDim("IN_PaymentType");
    const outPT = findDim("OUT_PaymentType");

    const getDirectionAndSigned = (pt, amt) => {
      let dir = "";
      if (inPT.includes(pt)) dir = "IN";
      else if (outPT.includes(pt)) dir = "OUT";
      const signed = dir === "OUT" ? -Math.abs(amt) : Math.abs(amt);
      return { direction: dir, signed: signed };
    };

    const PT_DEPOSIT = ptItems.find(i => i.includes("INVESTOR_PRINCIPAL_DEPOSIT")) || "INVESTOR_PRINCIPAL_DEPOSIT";
    const PT_INTEREST = ptItems.find(i => i.includes("INVESTOR_INTEREST_ACCRUAL")) || "INVESTOR_INTEREST_ACCRUAL";
    const PT_FEE = ptItems.find(i => i.includes("FEE")) || "FEE";
    const PT_INV_REPAYMENT = ptItems.find(i => i.includes("INVESTOR_PRINCIPAL_PAYMENT")) || "INVESTOR_PRINCIPAL_PAYMENT";
    const PT_BOR_RECEIVED = ptItems.find(i => i.includes("BORROWER_PRINCIPAL_RECEIVED")) || "BORROWER_PRINCIPAL_RECEIVED";
    const PT_BOR_PAYMENT = ptItems.find(i => i.includes("BORROWER_PRINCIPAL_PAYMENT")) || "BORROWER_PRINCIPAL_PAYMENT";
    const PT_BOR_INTEREST = ptItems.find(i => i.includes("BORROWER_INTEREST_PAYMENT")) || "BORROWER_INTEREST_PAYMENT";

    const feeInfoMap = {};
    FEES_DATA.forEach(f => {
      feeInfoMap[f.id] = { name: f.name, method: f.method, rate: f.rate, frequency: f.fee_frequency, fee_charge_at: f.fee_charge_at };
    });

    if (!window.confirm(`Generate payment schedules for ${selected.length} contract(s)?`)) return;

    // --- ID Generation Logic ---
    let maxIdNum = 9999;
    SCHEDULES.forEach(s => {
      if (s.id && s.id.startsWith("S")) {
        const num = parseInt(s.id.substring(1), 10);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
    let currentIdNum = maxIdNum + 1;

    try {
      const entries = [];
      const parseNum = v => Number(String(v).replace(/[^0-9.-]/g, "")) || 0;

      for (const c of selected) {
        const principal = parseNum(c.amount);
        const rate = parseNum(c.rate) / 100;
        const startDate = normalizeDateAtNoon(c.start_date);
        const matDate = normalizeDateAtNoon(c.maturity_date);

        if (!startDate || !matDate || matDate <= startDate) continue;

        const cTypeUpper = (c.type || "").toUpperCase();
        const isDisbursement = cTypeUpper.includes("DISBURSEMENT");

        // --- 1. Initial Deposit/Received ---
        const initialPaymentType = isDisbursement ? PT_BOR_RECEIVED : PT_DEPOSIT;
        const ds1 = getDirectionAndSigned(initialPaymentType, principal);
        const id1 = `S${currentIdNum++}`;
        entries.push({
          id: id1,
          contract_id: c.id, project_id: c.project_id || "", party_id: c.party_id || "",
          due_date: c.start_date, payment_type: initialPaymentType, fee_id: "",
          period_number: 1, principal_amount: principal, payment_amount: principal,
          signed_payment_amount: ds1.signed, direction_from_company: ds1.direction,
          status: "Due", notes: `Initial for ${c.id}`, created_at: serverTimestamp(),
        });

        // --- 2. Interest and Recurring Fees ---
        const freqValue = getFrequencyValue(c.freq);
        const monthsPerPeriod = 12 / freqValue;
        let periodNum = 1;

        // Theoretical align
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
          if (fInfo && fInfo.frequency === "One_Time") {
            const feeAmt = feeCalculator_ACT360_30360(fInfo, principal, startDate, startDate, startDate);
            let dDate = startDate;
            if (fInfo.fee_charge_at === "Contract_End") dDate = matDate;
            const dsf = getDirectionAndSigned(PT_FEE, feeAmt);
            const idF = `S${currentIdNum++}`;
            entries.push({
              id: idF,
              contract_id: c.id, project_id: c.project_id || "", party_id: c.party_id || "",
              due_date: dDate.toISOString().slice(0, 10), payment_type: PT_FEE, fee_id: fid,
              period_number: 1, principal_amount: principal, payment_amount: feeAmt,
              signed_payment_amount: dsf.signed, direction_from_company: dsf.direction,
              status: "Due", notes: `One-time Fee ${fid} for ${c.id}`, created_at: serverTimestamp(),
            });
          }
        });

        while (pStart < matDate) {
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

          if (pEnd <= pStart) pEnd = normalizeDateAtNoon(new Date(pStart.getFullYear(), pStart.getMonth() + (monthsPerPeriod || 1) + 1, 0));

          const isLast = pEnd > matDate;
          const isMonthEnd = (dt) => (dt.getDate() === new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate());

          let calcEnd = pEnd;
          if (isLast) {
            calcEnd = isMonthEnd(matDate) ? normalizeDateAtNoon(new Date(matDate.getFullYear(), matDate.getMonth() + 1, 0)) : normalizeDateAtNoon(matDate);
            pEnd = normalizeDateAtNoon(matDate);
          }

          let interest = 0;
          if (c.calculator === "ACT/360+30/360") interest = pmtCalculator_ACT360_30360(pStart, calcEnd, startDate, principal, rate, c.freq);
          else interest = principal * (rate / 360) * 90; // Default or error logic

          const interestPT = isDisbursement ? PT_BOR_INTEREST : PT_INTEREST;
          const ds2 = getDirectionAndSigned(interestPT, interest);
          const idI = `S${currentIdNum++}`;
          entries.push({
            id: idI,
            contract_id: c.id, project_id: c.project_id || "", party_id: c.party_id || "",
            due_date: pEnd.toISOString().slice(0, 10), payment_type: interestPT, fee_id: "",
            period_number: periodNum, principal_amount: principal, payment_amount: Math.round(interest * 100) / 100,
            signed_payment_amount: ds2.signed, direction_from_company: ds2.direction,
            status: "Due", notes: `Interest Period ${periodNum} for ${c.id}`, created_at: serverTimestamp(),
          });

          // Recurring Fees
          cFeeIds.forEach(fid => {
            const fInfo = feeInfoMap[fid];
            if (fInfo && fInfo.frequency === "Recurring") {
              const ca = (fInfo.fee_charge_at || "").toLowerCase();
              let should = false;
              if (ca.includes("term_start") || ca.includes("term_end")) should = true;
              else if (ca.includes("month")) should = true;
              else if (ca.includes("quart") && [2, 5, 8, 11].includes(pEnd.getMonth())) should = true;
              else if (ca.includes("semi") && [5, 11].includes(pEnd.getMonth())) should = true;
              else if (ca.includes("annu") && pEnd.getMonth() === 11) should = true;

              if (isLast) should = true;

              if (should) {
                const feeAmt = feeCalculator_ACT360_30360(fInfo, principal, pStart, calcEnd, startDate);
                const dsf2 = getDirectionAndSigned(PT_FEE, feeAmt);
                const idRF = `S${currentIdNum++}`;
                const feeDueDate = ca.includes("start") ? pStart : pEnd;
                entries.push({
                  id: idRF,
                  contract_id: c.id, project_id: c.project_id || "", party_id: c.party_id || "",
                  due_date: feeDueDate.toISOString().slice(0, 10), payment_type: PT_FEE, fee_id: fid,
                  period_number: periodNum, principal_amount: principal, payment_amount: Math.round(feeAmt * 100) / 100,
                  signed_payment_amount: dsf2.signed, direction_from_company: dsf2.direction,
                  status: "Due", notes: `Recurring Fee ${fid} P${periodNum} for ${c.id}`, created_at: serverTimestamp(),
                });
              }
            }
          });

          periodNum++;
          pStart = normalizeDateAtNoon(new Date(pEnd.getFullYear(), pEnd.getMonth() + 1, 1));
        }

        // --- 3. Principal Repayment ---
        const repaymentPT = isDisbursement ? PT_BOR_PAYMENT : PT_INV_REPAYMENT;
        const ds3 = getDirectionAndSigned(repaymentPT, principal);
        const idR = `S${currentIdNum++}`;
        entries.push({
          id: idR,
          contract_id: c.id, project_id: c.project_id || "", party_id: c.party_id || "",
          due_date: c.maturity_date, payment_type: repaymentPT, fee_id: "",
          period_number: periodNum, principal_amount: principal, payment_amount: principal,
          signed_payment_amount: ds3.signed, direction_from_company: ds3.direction,
          status: "Due", notes: `Repayment for ${c.id}`, created_at: serverTimestamp(),
        });
      }

      // Batch Write to Firestore
      for (const entry of entries) {
        await addDoc(collection(db, schedulePath), entry);
      }

      setSel(new Set());
      window.alert(`Successfully generated ${entries.length} payment schedule rows.`);
    } catch (err) {
      console.error("Generate schedules error:", err);
      window.alert("Error generating schedules. Check console.");
    }
  };
  const setF = (k, v) => setModal(m => {
    const next = { ...m, data: { ...m.data, [k]: v } };
    // When project changes in "add" mode, default start/maturity to project dates
    if (k === "project" && m.mode === "add") {
      const proj = PROJECTS.find(p => p.name === v);
      if (proj) {
        next.data.start_date = proj.startDate || next.data.start_date;
        next.data.maturity_date = proj.endDate || next.data.maturity_date;
        if (proj.startDate && proj.endDate) {
          const s = new Date(proj.startDate); const e = new Date(proj.endDate);
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
  const investorEditTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorContractEditType") || {}).items || [];
  const borrowerEditTypeOpts = (DIMENSIONS.find(d => d.name === "BorrowerContractEditType") || {}).items || [];
  const investorNewTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorContractNewType") || {}).items || [];
  const borrowerNewTypeOpts = (DIMENSIONS.find(d => d.name === "BorrowerContractNewType") || {}).items || [];
  const selectedParty = PARTIES.find(p => p.name === modal.data.party);
  const partyRole = selectedParty ? selectedParty.role : "";
  const getTypeOpts = () => {
    const isNew = modal.mode === "add";
    const invOpts = isNew ? investorNewTypeOpts : investorEditTypeOpts;
    const borOpts = isNew ? borrowerNewTypeOpts : borrowerEditTypeOpts;
    let opts = [];
    if (partyRole === "Investor") opts = [...invOpts];
    else if (partyRole === "Borrower") opts = [...borOpts];
    else if (partyRole === "Both") opts = [...invOpts, ...borOpts.filter(o => !invOpts.includes(o))];
    else opts = [...invOpts, ...borOpts.filter(o => !invOpts.includes(o))];
    const cur = modal.data.type;
    if (cur && !opts.includes(cur)) opts = [cur, ...opts];
    return opts.length > 0 ? opts : ["Loan", "Mortgage", "Equity"];
  };
  const toggleRow = id => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const cols = [{ l: "", w: "36px" }, { l: "CONTRACT ID", w: "78px", k: "id" }, { l: "PROJECT ID", w: "78px", k: "project_id" }, { l: "PROJECT", w: "minmax(0,1fr)", k: "project" }, { l: "PARTY", w: "minmax(0,1fr)", k: "party" }, { l: "TYPE", w: "80px", k: "type" }, { l: "AMOUNT", w: "100px", k: "amount" }, { l: "RATE", w: "60px", k: "rate" }, { l: "FREQ", w: "80px", k: "freq" }, { l: "TERM", w: "52px", k: "term_months" }, { l: "FEES", w: "minmax(120px, 1.2fr)", k: "feeIds" }, { l: "START", w: "84px", k: "start_date" }, { l: "MATURITY", w: "84px", k: "maturity_date" }, { l: "STATUS", w: "72px", k: "status" }, { l: "CREATED", w: "84px", k: "created_at" }, { l: "UPDATED", w: "84px", k: "updated_at" }, { l: "ACTIONS", w: "72px" }];
  const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
  const [colFilters, setColFilters] = useState({});
  const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const filtered = CONTRACTS.filter(c => cols.every(col => { if (!col.k || !colFilters[col.k]) return true; return String(c[col.k] || "").toLowerCase().includes(colFilters[col.k].toLowerCase()); }));
  const sorted = sortData(filtered, sort);
  const paginated = sorted.slice((page - 1) * 20, page * 20);
  const totalPages = Math.ceil(sorted.length / 20);
  const typC = { Loan: isDark ? "#60A5FA" : "#2563EB", Mortgage: isDark ? "#A78BFA" : "#7C3AED", Equity: isDark ? "#FBBF24" : "#D97706" };
  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Contracts</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage investment contracts</p></div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {sel.size > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.surfaceBorder}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{sel.size} selected</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 7, border: `1px solid ${t.surfaceBorder}`, background: t.searchBg, color: t.searchText, cursor: "pointer" }}>
            <option value="">Update status...</option>
            {contractStatusOpts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => handleBulkStatus(bulkStatus)} disabled={!bulkStatus} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: bulkStatus ? t.accentGrad : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"), color: bulkStatus ? "#fff" : t.textMuted, border: "none", cursor: bulkStatus ? "pointer" : "default" }}>Apply</button>
          <div style={{ width: 1, height: 20, background: t.surfaceBorder }} />
          <button onClick={handleBulkDelete} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "#FECACA"}`, cursor: "pointer" }}>Delete ({sel.size})</button>
        </div>}
        <button className="success-btn" onClick={handleGenerate} disabled={sel.size === 0} style={{ background: t.successGrad, color: "#fff", padding: "11px 20px", borderRadius: 11, fontSize: 13, fontWeight: 600, boxShadow: `0 4px 16px ${t.successShadow}`, display: "flex", alignItems: "center", gap: 6, opacity: sel.size === 0 ? 0.45 : 1 }}>▤ Generate{sel.size > 0 ? ` (${sel.size})` : ""}</button>
        <button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Contract</button>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {(() => { const scope = sel.size > 0 ? filtered.filter(c => sel.has(c.id)) : filtered; const parseAmt = a => Number(String(a).replace(/[^0-9.-]/g, "")) || 0; const fmtAmt = v => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; const depositTotal = fmtAmt(scope.filter(c => c.type === "DEPOSIT").reduce((s, c) => s + parseAmt(c.amount), 0)); const disbTotal = fmtAmt(scope.filter(c => c.type === "DISBURSEMENT").reduce((s, c) => s + parseAmt(c.amount), 0)); return [{ label: "Total", value: filtered.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Deposit", value: depositTotal, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Disbursement", value: disbTotal, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" }, { label: "Selected", value: sel.size, accent: isDark ? "#A78BFA" : "#7C3AED", bg: isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE" }]; })().map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
      <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart}>
        <input type="checkbox" checked={sel.size === filtered.length && filtered.length > 0} onChange={() => setSel(sel.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)))} style={{ accentColor: t.checkActive, width: 14, height: 14 }} />
      </TblHead>
      <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
        {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} /> : <div key={c.l || "nofilter"} />)}
      </div>
      {paginated.map((c, i) => {
        const isHov = hov === c.id; const isSel = sel.has(c.id); return (<div key={c.id} className="data-row" onMouseEnter={() => setHov(c.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isSel ? (isDark ? "rgba(52,211,153,0.05)" : "#F0FDF4") : isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
          <input type="checkbox" checked={isSel} onChange={() => toggleRow(c.id)} style={{ accentColor: t.checkActive, width: 14, height: 14 }} onClick={e => e.stopPropagation()} />
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{c.id}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{c.project_id || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontSize: 12.5, color: isDark ? "rgba(255,255,255,0.7)" : "#44403C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8, minWidth: 0 }}>{c.project}</div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8, minWidth: 0 }}>{c.party}</div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: typC[c.type] || t.textMuted }}>{c.type}</div>
          <div style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 600, color: isDark ? "#60A5FA" : "#4F46E5" }}>{c.amount}</div>
          <div style={{ fontFamily: t.mono, fontSize: 12, color: t.textMuted }}>{c.rate}</div>
          <div style={{ fontSize: 11.5, color: t.textMuted }}>{c.freq}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: t.term_months ? t.textMuted : (isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB") }}>{c.term_months ? `${c.term_months}mo` : <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {(() => {
              const appliedFees = (c.feeIds || []).map(fid => FEES_DATA.find(f => f.id === fid)).filter(Boolean);
              return appliedFees.length > 0
                ? appliedFees.map(f => <span key={f.id} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: isDark ? "rgba(52,211,153,0.12)" : "#ECFDF5", color: isDark ? "#34D399" : "#059669", border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#A7F3D0"}`, whiteSpace: "nowrap" }}>{f.name}</span>)
                : <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB", fontSize: 12 }}>—</span>;
            })()}
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{c.start_date || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{c.maturity_date || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div><Bdg status={c.status} isDark={isDark} /></div>
          <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{c.created_at || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{c.updated_at || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
          <ActBtns show={isHov} t={t} onEdit={() => openEdit(c)} onDel={() => setDelT({ id: c.id, name: c.id, docId: c.docId })} />
        </div>);
      })}
    </div>
    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.textMuted }}>Showing <strong style={{ color: t.textSecondary }}>{paginated.length}</strong> of <strong style={{ color: t.textSecondary }}>{sorted.length}</strong> contracts{sel.size > 0 && <span style={{ color: t.accent, marginLeft: 8 }}>· {sel.size} selected</span>}</span><Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} t={t} /></div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Contract" : "Edit Contract"} onSave={handleSaveContract} width={620} t={t} isDark={isDark}>
      {(modal.mode === "edit" || (modal.mode === "add" && modal.data.id)) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FF label="Contract ID" t={t}>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.id}</div>
          </FF>
          <FF label="Project ID" t={t}>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px" }}>{modal.data.project_id}</div>
          </FF>
        </div>
      )}
      <FF label="Project" t={t}><FSel value={modal.data.project} onChange={e => setF("project", e.target.value)} options={PROJECTS.map(p => p.name)} t={t} /></FF>
      <FF label="Party" t={t}><FSel value={modal.data.party} onChange={e => setF("party", e.target.value)} options={PARTIES.map(p => p.name)} t={t} /></FF>
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
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteContract} label="This contract" t={t} isDark={isDark} />
  </>);
}

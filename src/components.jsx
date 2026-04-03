/**
 * AVG Cashflow Management — Shared Components
 * Reusable UI components and hooks.
 */
import React, { useState, useRef, useEffect, useMemo } from "react";
import { badge, initials, fmtCurr, av } from "./utils";
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Pencil, Trash2, RotateCcw, X, Info, Check, Plus, AlertCircle, FileText,
  ArrowUp, ArrowDown
} from "lucide-react";

export const Bdg = ({ status, label, isDark, bg, text, border }) => {
  const actualStatus = status || label || "";
  const [defaultBg, defaultColor, defaultBorder] = badge(actualStatus, isDark) || [];
  return (
    <span style={{ 
      fontSize: 11.5, 
      fontWeight: 500, 
      padding: "2px 10px", 
      borderRadius: 20, 
      background: bg || defaultBg, 
      color: text || defaultColor, 
      border: `1px solid ${border || defaultBorder || "transparent"}` 
    }}>
      {actualStatus}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: stat card, pagination, action buttons
// ─────────────────────────────────────────────────────────────────────────────

export const StatCard = ({ label, value, accent, bg, border, titleFont, isDark, icon, large }) => (
  <div className="stat-card" style={{ background: bg, borderRadius: 14, padding: "20px 22px", border: `1px solid ${border}`, backdropFilter: isDark ? "blur(10px)" : "none", display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.7)" : "#57534E", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</span>
      {!isDark && icon && <div style={{ width: 28, height: 28, borderRadius: 7, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: accent }}>{icon}</div>}
    </div>
    <div style={{ fontFamily: titleFont, fontSize: large ? (isDark ? 22 : 28) : (isDark ? 28 : 36), fontWeight: isDark ? 800 : 700, color: accent, lineHeight: 1, letterSpacing: "-0.5px" }}>{value}</div>
  </div>
);

export const Pagination = ({ totalPages, currentPage, onPageChange, t }) => {
  const getPages = () => {
    const start = Math.floor((currentPage - 1) / 10) * 10 + 1;
    return Array.from({ length: Math.min(10, totalPages - start + 1) }, (_, i) => start + i);
  };
  const pages = getPages();
  const btn = (icon, target, disabled = false, isAct = false, tooltip = "") => (
    <Tooltip key={tooltip + target} text={disabled ? "" : tooltip} t={t}>
      <span onClick={() => !disabled && onPageChange(target)} style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isAct ? 700 : 500, background: isAct ? t.pageBtnActive : (disabled ? "transparent" : t.pageBtnBg), color: isAct ? t.pageBtnActiveTxt : (disabled ? t.textMuted : t.pageBtnText), border: `1px solid ${isAct ? t.pageBtnActive : (disabled ? t.surfaceBorder : t.pageBtnBorder)}`, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all 0.1s ease" }}>
        {typeof icon === "string" ? icon : icon}
      </span>
    </Tooltip>
  );
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {btn(<ChevronsLeft size={14} />, 1, currentPage === 1, false, "Go to first page")}
      {btn(<ChevronLeft size={14} />, Math.max(1, currentPage - 10), currentPage <= 10, false, "Go back 10 pages")}
      {pages.map(p => btn(String(p), p, false, currentPage === p, `Go to page ${p}`))}
      {btn(<ChevronRight size={14} />, Math.min(totalPages, currentPage + 10), currentPage > totalPages - (totalPages % 10 || 10), false, "Go forward 10 pages")}
      {btn(<ChevronsRight size={14} />, totalPages, currentPage === totalPages, false, "Go to last page")}
    </div>
  );
};

export const Tooltip = ({ children, text, position = "top", delay = 300, t }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  const handleShow = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const handleHide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      style={{ position: "relative", display: "inline-block" }}
    >
      {children}
      {visible && text && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            background: t.tooltipBg,
            color: t.tooltipText,
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            border: `1px solid ${t.tooltipBorder}`,
            boxShadow: t.tooltipShadow,
            zIndex: 10000,
            pointerEvents: "none",
            bottom: position === "top" ? "calc(100% + 8px)" : "auto",
            top: position === "bottom" ? "calc(100% + 8px)" : "auto",
            left: "50%",
            transform: "translateX(-50%)",
            animation: "tooltipFadeIn 150ms ease forwards"
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export const ActBtns = ({ show, t, onEdit, onDel, onUndo }) => {
  return (
    <div style={{ display: "flex", gap: 6, opacity: show ? 1 : 0, transition: "opacity 0.15s ease", pointerEvents: show ? "auto" : "none" }}>
      {onUndo && (
        <Tooltip text="Undo last action" t={t}>
          <button className="action-btn" onClick={e => { e.stopPropagation(); onUndo(e); }} style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(251,191,36,0.1)", color: "#FBBF24", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
            Undo
          </button>
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip text="Edit this record" t={t}>
          <button className="action-btn" onClick={e => { e.stopPropagation(); onEdit(e); }} style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(96,165,250,0.1)", color: "#60A5FA", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
            Edit
          </button>
        </Tooltip>
      )}
      {onDel && (
        <Tooltip text="Delete this record" t={t}>
          <button className="action-btn" onClick={e => { e.stopPropagation(); onDel(e); }} style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
            Del
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export function useResizableColumns(cols) {
  const [widths, setWidths] = useState(null);
  const headerRef = useRef(null);
  const gridTemplate = widths ? widths.map(w => `${w}px`).join(" ") : cols.map(c => c.w).join(" ");
  const onResizeStart = (colIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    const headerEl = headerRef.current;
    if (!headerEl) return;
    const currentWidths = Array.from(headerEl.children).map(cell => cell.getBoundingClientRect().width);
    setWidths(currentWidths);
    const startX = e.clientX;
    const startW = currentWidths[colIndex];
    const onMove = (ev) => { const delta = ev.clientX - startX; setWidths(prev => { const next = [...prev]; next[colIndex] = Math.max(40, startW + delta); return next; }); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  return { gridTemplate, headerRef, onResizeStart };
}

export const TblHead = ({ cols, t, isDark, sortConfig, onSort, children, gridTemplate, headerRef, onResizeStart }) => (
  <div ref={headerRef} style={{ display: "grid", gridTemplateColumns: gridTemplate || cols.map(c => c.w).join(" "), padding: "14px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", position: "sticky", top: 0, zIndex: 10 }}>
    {cols.map((c, i) => (
      <div key={c.k || c.l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: "1px", position: "relative", borderRight: i < cols.length - 1 ? `1px solid ${t.columnDivider}` : "none", width: "100%", boxSizing: "border-box" }}>
        <span onClick={() => c.k && onSort(c.k)} style={{ cursor: c.k ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4 }}>
          {c.l}
          {c.k && sortConfig?.key === c.k && (
            sortConfig.dir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
          )}
        </span>
        {c.k && onResizeStart && (
          <div onMouseDown={(e) => onResizeStart(i, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 11 }} />
        )}
      </div>
    ))}
    {children}
  </div>
);

export const TblFilterRow = ({ cols, colFilters, onFilterChange, onClear, gridTemplate, t, isDark }) => (
  <div style={{ display: "grid", gridTemplateColumns: gridTemplate || cols.map(c => c.w).join(" "), padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
    {cols.map((c, i) => c.k ? (
      <div key={c.k} style={{ borderRight: i < cols.length - 1 ? `1px solid ${t.columnDivider}` : "none", width: "100%", boxSizing: "border-box" }}>
        <input
          value={colFilters[c.k] || ""}
          onChange={e => onFilterChange(c.k, e.target.value)}
          placeholder="Filter..."
          style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
        />
      </div>
    ) : (
      <div key={c.l || "nofilter"} style={{ display: "flex", justifyContent: "center", alignItems: "center", borderRight: "none" }}>
        {c.l === "ACTIONS" && Object.values(colFilters).some(v => v !== "") && (
          <Tooltip text="Clear all filters" t={t}>
            <button
              onClick={onClear}
              className="action-btn"
              style={{
                background: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2",
                color: isDark ? "#F87171" : "#DC2626",
                border: `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "#FECACA"}`,
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Clear
            </button>
          </Tooltip>
        )}
      </div>
    ))}
  </div>
);

export const Modal = ({ open, onClose, title, onSave, saveLabel, secondaryAction, secondaryLabel, danger, width, children, t, isDark, loading, showCancel = true }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: isDark ? "#0b1929" : "#ffffff", borderRadius: 20, border: `1px solid ${t.surfaceBorder}`, width: width || 480, maxWidth: "92vw", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: isDark ? "0 40px 100px rgba(0,0,0,0.7)" : "0 24px 60px rgba(0,0,0,0.13)" }}>
        <div style={{ padding: "22px 26px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", borderRadius: "20px 20px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", fontFamily: t.titleFont, letterSpacing: "-0.4px" }}>{title}</span>
          </div>
          <Tooltip text="Close this dialog" t={t}>
            <button onClick={onClose} className="action-btn" style={{ width: 28, height: 28, borderRadius: 8, background: t.deleteBtn[0], color: t.deleteBtn[1], display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}>
              <X size={18} />
            </button>
          </Tooltip>
        </div>
        <div style={{ padding: "24px 26px", overflowY: "auto", flex: 1 }}>{children}</div>
        <div style={{ padding: "16px 26px", borderTop: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "flex-end", gap: 10, background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", borderRadius: "0 0 20px 20px" }}>
          {showCancel && (
            <Tooltip text="Cancel without saving" t={t}>
              <button onClick={onClose} disabled={loading} style={{ padding: "10px 22px", borderRadius: 11, fontSize: 13, fontWeight: 500, background: t.chipBg, color: t.textSecondary, border: `1px solid ${t.chipBorder}`, cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1 }}>Cancel</button>
            </Tooltip>
          )}
          {secondaryAction && (
            <Tooltip text={secondaryLabel || "Back"} t={t}>
              <button onClick={secondaryAction} disabled={loading} style={{ padding: "10px 22px", borderRadius: 11, fontSize: 13, fontWeight: 500, background: t.chipBg, color: t.textSecondary, border: `1px solid ${t.chipBorder}`, cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1 }}>
                {secondaryLabel || "Back"}
              </button>
            </Tooltip>
          )}
          {onSave && (
            <Tooltip text={danger ? "Confirm deletion" : (saveLabel || "Save changes")} t={t}>
              <button onClick={onSave} disabled={loading} className="primary-btn" style={{ padding: "10px 22px", borderRadius: 11, fontSize: 13, fontWeight: 600, background: danger ? "rgba(248,113,113,0.15)" : t.accentGrad, color: danger ? (isDark ? "#F87171" : "#DC2626") : "#fff", border: danger ? `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "#FECACA"}` : "none", boxShadow: danger ? "none" : `0 4px 14px ${t.accentShadow}`, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading ? "..." : (saveLabel || "Save")}
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export const FF = ({ label, t, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7, fontFamily: t.mono }}>{label}</div>
    {children}
  </div>
);

export const FIn = ({ value, onChange, onBlur, placeholder, t, type, disabled }) => (
  <input type={type || "text"} value={value || ""} onChange={onChange} onBlur={onBlur} placeholder={placeholder || ""} disabled={disabled}
    style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none", opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "text" }} />
);

export const FSel = ({ value, onChange, options, t, placeholder, disabled }) => (
  <select value={value} onChange={onChange} disabled={disabled}
    style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: value ? t.searchText : (t.textMuted), fontSize: 13.5, fontFamily: "inherit", outline: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
    {!value && <option value="">{placeholder || "Select..."}</option>}
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

export const FMultiSel = ({ value = [], onChange, options, t, style = {} }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 12px", ...style }}>
    {options.map(o => (
      <label key={o} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: t.searchText, cursor: "pointer", fontFamily: t.mono }}>
        <input
          type="checkbox"
          checked={value.includes(o)}
          onChange={(e) => {
            if (e.target.checked) onChange([...value, o]);
            else onChange(value.filter(v => v !== o));
          }}
          style={{ accentColor: t.accent, cursor: "pointer" }}
        />
        {o}
      </label>
    ))}
  </div>
);

export const DelModal = ({ target, open, onClose, onConfirm, onDel, label, title, t, isDark, children }) => {
  const isOpen = open !== undefined ? open : !!target;
  const onSave = onConfirm || onDel;
  const modalTitle = title || (target?.name ? `Delete "${target.name}"?` : "Confirm Delete");

  return (
    <Modal open={isOpen} onClose={onClose} title={modalTitle} onSave={onSave} saveLabel="Delete" danger t={t} isDark={isDark}>
      {children ? (
        <div style={{ padding: "8px 0" }}>{children}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "8px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", border: `1px solid ${isDark ? "rgba(248,113,113,0.25)" : "#FECACA"}`, display: "flex", alignItems: "center", justifyContent: "center", color: isDark ? "#F87171" : "#DC2626" }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 8 }}>
              {target?.name ? `Delete "${target.name}"?` : "Confirm Deletion"}
            </div>
            <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>
              {label || "This record"} will be permanently removed.<br />This action cannot be undone.
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
// ─────────────────────────────────────────────────────────────────────────────
// INVESTOR SUMMARY MODAL
// ─────────────────────────────────────────────────────────────────────────────

export const InvestorSummaryModal = ({ contact, defaultView = "simple", onClose, isDark, t, INVESTMENTS, SCHEDULES, DEALS, onUpdate, DIMENSIONS = [] }) => {
  const [activeTab, setActiveTab] = useState("Capital transactions");
  const [viewMode, setViewMode] = useState(defaultView);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    setViewMode(defaultView);
    if (contact) {
      setEditData({ 
        ...contact,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        party_type: contact.party_type || contact.type || "Individual",
        role_type: contact.role_type || contact.role || "Investor",
        email: contact.email || "",
        phone: contact.phone || "",
        address: contact.address || "",
        bank_information: contact.bank_information || "",
        bank_address: contact.bank_address || "",
        bank_routing_number: contact.bank_routing_number || "",
        bank_account_number: contact.bank_account_number || "",
        tax_id: contact.tax_id || "",
        payment_method: contact.payment_method || ""
      });
      setIsEditing(false);
    }
  }, [defaultView, contact]);

  if (!contact) return null;
  const dp = contact;
  const showData = isEditing ? editData : contact;
  const dpId = String(dp.id || "").trim();
  const dpDocId = String(dp.docId || "").trim();

  const roleOpts = (DIMENSIONS.find(d => d.name === "ContactRole" || d.name === "Contact Role") || {}).items || ["Investor", "Borrower"];
  const partyTypeOpts = (DIMENSIONS.find(d => d.name === "ContactType" || d.name === "Contact Type") || {}).items || ["Individual", "Company", "Trust", "Partnership"];
  const paymentMethods = (DIMENSIONS.find(d => d.name === "Payment Method" || d.name === "PaymentMethod") || {}).items || [];

  const handleSave = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(editData);
      setIsEditing(false);
    } catch (err) {
      alert("Failed to update contact: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const setED = (newVal) => {
    const next = { ...editData, ...newVal };
    if (newVal.hasOwnProperty('first_name') || newVal.hasOwnProperty('last_name')) {
      next.party_name = `${next.first_name || ""} ${next.last_name || ""}`.trim() || next.name || "";
    }
    setEditData(next);
  };
  
  const partyInvestments = INVESTMENTS.filter(c => {
    const cPId = String(c.party_id || "").trim();
    return (cPId === dpId || (dpDocId && cPId === dpDocId));
  });
  
  const partySchedules = SCHEDULES.filter(s => {
    const sPId = String(s.party_id || "").trim();
    const isMatched = sPId === dpId || (dpDocId && sPId === dpDocId);
    return isMatched || partyInvestments.some(c => c.id === s.investment);
  }).sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return da - db;
  });
  
  const investedAmount = partyInvestments.reduce((sum, c) => {
    const amtStr = String(c.amount || 0).replace(/[^0-9.-]/g, '');
    return sum + (Number(amtStr) || 0);
  }, 0);

  // Contributions logic: INVESTOR_PRINCIPAL_DEPOSIT
  const contributions = partySchedules.filter(s => (s.payment_type || s.type) === "INVESTOR_PRINCIPAL_DEPOSIT" || (s.type === 'deposit'));
  const totalContributions = contributions.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0), 0);

  // Withdrawals logic: PaymentStatus == "Withdrawals", or status
  const withdrawals = partySchedules.filter(s => {
      const st = (s.PaymentStatus || s.status || "").toLowerCase();
      return st === "withdrawals" || st === "withdrawal" || st === "withdrawl";
  });
  const totalWithdrawals = withdrawals.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0), 0);

  const capitalBalance = totalContributions - Math.abs(totalWithdrawals);

  // Distributed logic
  const distributions = partySchedules.filter(s => {
      const ty = (s.payment_type || s.type || "").toLowerCase();
      return ty.includes("interest") || ty.includes("distribution");
  });
  const distributedAmount = distributions.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0), 0);
  
  const tabs = ["Edit investment", "Investment documents", "Capital transactions", "Distributions", "Notes", "Investment changelog", "Investment sharing"];

  // Helper for generic table rows
  const renderDealTable = (items, emptyMsg) => {
      if (!items || items.length === 0) return <div style={{ fontSize: 13, color: t.textMuted, padding: "16px 24px" }}>{emptyMsg}</div>;
      return (
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA", borderBottom: `1px solid ${t.surfaceBorder}` }}>
            <tr>
              <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>DEAL</th>
              <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>TYPE</th>
              <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>MEMO</th>
              <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted, textAlign: "right" }}>AMOUNT</th>
              <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted, textAlign: "right" }}>RECEIVED DATE</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, i) => {
              const d = DEALS.find(dd => dd.id === s.deal_id);
              const dealName = d?.name || s.deal_id || s.project || "—";
              const amtNum = Number(String(s.signed_payment_amount || s.payment_amount || s.amount || 0).replace(/[^0-9.-]/g,''));
              const amtColor = amtNum > 0 ? (isDark ? "#34D399" : "#10B981") : amtNum < 0 ? (isDark ? "#F87171" : "#EF4444") : (isDark ? "#fff" : "#1C1917");
              return (
                <tr key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${t.surfaceBorder}` : "none" }}>
                  <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{dealName}</td>
                  <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary }}>{s.type || s.payment_type}</td>
                  <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary }}>{s.memo || s.notes || "—"}</td>
                  <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 600, color: amtColor, textAlign: "right" }}>{fmtCurr(s.signed_payment_amount || s.payment_amount || s.amount)}</td>
                  <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary, textAlign: "right" }}>{s.receivedDate || s.dueDate || s.date || "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "relative", background: isDark ? "#0F0F0F" : "#fff", borderRadius: 16, padding: 0, maxWidth: 1100, width: "95%", height: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.4)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB"}`, overflow: "hidden" }}>
        
        {/* Header Section */}
        <div style={{ padding: "32px 40px 0 40px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? "#fff" : "#111827", marginBottom: 8 }}>
                {showData.party_name || showData.name || "—"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 14, color: isDark ? "#9CA3AF" : "#6B7280" }}>Holdings across all deals</div>
                <Bdg status={showData.role_type || showData.role} isDark={isDark} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: 4, borderRadius: 8 }}>
                <button 
                  onClick={() => { setViewMode("simple"); setIsEditing(false); }} 
                  style={{ padding: "6px 16px", borderRadius: 6, background: viewMode === "simple" ? (isDark ? "#3B82F6" : "#fff") : "transparent", color: viewMode === "simple" ? (isDark ? "#fff" : "#111827") : t.textSecondary, boxShadow: viewMode === "simple" && !isDark ? "0 1px 3px rgba(0,0,0,0.1)" : "none", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}>
                  Transaction View
                </button>
                <button 
                  onClick={() => setViewMode("detail")} 
                  style={{ padding: "6px 16px", borderRadius: 6, background: viewMode === "detail" ? (isDark ? "#3B82F6" : "#fff") : "transparent", color: viewMode === "detail" ? (isDark ? "#fff" : "#111827") : t.textSecondary, boxShadow: viewMode === "detail" && !isDark ? "0 1px 3px rgba(0,0,0,0.1)" : "none", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}>
                  Detail View
                </button>
              </div>

              {viewMode === "detail" && (
                <div style={{ marginLeft: 8 }}>
                  {isEditing ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, background: t.accentGrad, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, boxShadow: `0 4px 12px ${t.accentShadow}`, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
                      <button onClick={() => setIsEditing(false)} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", color: t.textSecondary, border: `1px solid ${t.surfaceBorder}`, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsEditing(true)} style={{ padding: "8px 20px", borderRadius: 8, background: t.accentGrad, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, boxShadow: `0 4px 12px ${t.accentShadow}` }}>Edit Profile</button>
                  )}
                </div>
              )}
              <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, background: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6", border: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", color: t.textSecondary, transition: "background 0.2s" }}>×</button>
            </div>
          </div>

          {viewMode === "simple" && (
            <>
              {/* Top Summary Cards */}
              <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "Invested amount", val: fmtCurr(investedAmount) },
                  { label: "Distributed amount", val: fmtCurr(distributedAmount) },
                  { label: "Net capital", val: fmtCurr(capitalBalance) }
                ].map((st, i) => (
                  <div key={i} style={{ flex: 1, padding: "20px 24px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", border: `1px solid ${t.surfaceBorder}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{st.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>{st.val}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${t.surfaceBorder}` }}>
                {tabs.map(tab => (
                  <div 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{ 
                      padding: "12px 0", cursor: "pointer", fontSize: 14, fontWeight: activeTab === tab ? 600 : 500,
                      color: activeTab === tab ? t.accent : t.textMuted,
                      borderBottom: activeTab === tab ? `2px solid ${t.accent}` : "2px solid transparent",
                      transition: "all 0.2s"
                    }}
                  >
                    {tab}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Body Section */}
        <div style={{ flex: 1, overflow: "auto", padding: "32px 40px", background: isDark ? "#141414" : "#F9FAFB" }}>
          
          {viewMode === "detail" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <FF label="First Name" t={t}>
                  {isEditing ? <FIn value={editData.first_name} onChange={e => setED({ first_name: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.first_name || showData.party_name || "—"}</div>}
                </FF>
                <FF label="Last Name" t={t}>
                  {isEditing ? <FIn value={editData.last_name} onChange={e => setED({ last_name: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.last_name || "—"}</div>}
                </FF>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <FF label="Contact Type" t={t}>
                  {isEditing ? <FSel value={editData.party_type} options={partyTypeOpts} onChange={e => setED({ party_type: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.party_type || showData.type || "—"}</div>}
                </FF>
                <FF label="Role" t={t}>
                  {isEditing ? <FSel value={editData.role_type} options={roleOpts} onChange={e => setED({ role_type: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.role_type || showData.role || "—"}</div>}
                </FF>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <FF label="Email" t={t}>
                  {isEditing ? <FIn value={editData.email} onChange={e => setED({ email: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.email || "—"}</div>}
                </FF>
                <FF label="Phone" t={t}>
                  {isEditing ? <FIn value={editData.phone} onChange={e => setED({ phone: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.phone || "—"}</div>}
                </FF>
              </div>
              <FF label="Address" t={t}>
                {isEditing ? <FIn value={editData.address} onChange={e => setED({ address: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.address || "—"}</div>}
              </FF>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <FF label="Bank Name" t={t}>
                  {isEditing ? <FIn value={editData.bank_information} onChange={e => setED({ bank_information: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_information || "—"}</div>}
                </FF>
                <FF label="Bank Address" t={t}>
                  {isEditing ? <FIn value={editData.bank_address} onChange={e => setED({ bank_address: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_address || "—"}</div>}
                </FF>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <FF label="Bank Routing Number" t={t}>
                  {isEditing ? <FIn value={editData.bank_routing_number} onChange={e => setED({ bank_routing_number: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_routing_number || "—"}</div>}
                </FF>
                <FF label="Bank Account Number" t={t}>
                  {isEditing ? <FIn value={editData.bank_account_number} onChange={e => setED({ bank_account_number: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_account_number || "—"}</div>}
                </FF>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <FF label="Tax ID" t={t}>
                  {isEditing ? <FIn value={editData.tax_id} onChange={e => setED({ tax_id: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.tax_id || "—"}</div>}
                </FF>
              </div>
              <FF label="Payment Method" t={t}>
                {isEditing ? <FSel value={editData.payment_method} options={paymentMethods} onChange={e => setED({ payment_method: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.payment_method || "—"}</div>}
              </FF>
            </div>
          ) : viewMode === "simple" && activeTab === "Capital transactions" ? (
            <div>
              {/* Capital Balance Card (highlighted) */}
              <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
                <div style={{ width: 280, padding: "24px", borderRadius: 16, background: isDark ? "linear-gradient(145deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.05) 100%)" : "linear-gradient(145deg, #EFF6FF 0%, #DBEAFE 100%)", border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "#BFDBFE"}`, boxShadow: isDark ? "none" : "0 4px 6px -1px rgba(59, 130, 246, 0.1)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#93C5FD" : "#1D4ED8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <ArrowUp size={16} /> Capital balance
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: isDark ? "#fff" : "#1E3A8A", marginBottom: 4 }}>{fmtCurr(capitalBalance)}</div>
                  <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.6)" : "#3B82F6" }}>Total contributions - Total withdrawals</div>
                </div>
              </div>

              {/* Contributions Table */}
              <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>Contributions</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{fmtCurr(totalContributions)}</div>
                </div>
                {renderDealTable(contributions, "No contributions found.")}
              </div>

              {/* Withdrawals Table */}
              <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>Withdrawals</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{fmtCurr(Math.abs(totalWithdrawals))}</div>
                </div>
                {renderDealTable(withdrawals, "No withdrawals found.")}
              </div>

              {/* All Transactions Table */}
              <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>All Transactions</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>
                    {fmtCurr(partySchedules.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g,'')) || 0), 0))}
                  </div>
                </div>
                {renderDealTable(partySchedules, "No transactions found.")}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
              <Info size={48} style={{ marginBottom: 16, color: t.textMuted }} />
              <div style={{ fontSize: 18, fontWeight: 600, color: isDark ? "#fff" : "#111827" }}>Coming Soon</div>
              <div style={{ fontSize: 14, color: t.textMuted, marginTop: 8 }}>This tab is under construction.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

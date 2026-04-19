/**
 * AVG Cashflow Management — Shared Components
 * Reusable UI components and hooks.
 */
import React from "react";
import { badge, initials, fmtCurr, av } from "./utils";
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Pencil, Trash2, RotateCcw, X, Info, Check, Plus, AlertCircle, FileText,
  ArrowUp, ArrowDown
} from "lucide-react";
import InvestmentDocumentsTab from "./components/InvestmentDocumentsTab";
import InvestmentChangelogTab from "./components/InvestmentChangelogTab";
export { default as TanStackTable } from "./components/TanStackTable";
import { getContactTransactionColumns } from "./components/ContactTransactionsTanStackConfig";

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
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = React.useRef(null);

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
  const [widths, setWidths] = React.useState(null);
  const headerRef = React.useRef(null);
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

export const PromptModal = ({ open, onClose, onConfirm, title, label, defaultValue, t, isDark, loading }) => {
  const [value, setValue] = React.useState(defaultValue || "");
  
  React.useEffect(() => {
    if (open) setValue(defaultValue || "");
  }, [open, defaultValue]);

  const handleSave = () => {
    if (onConfirm) onConfirm(value);
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={title || "Input Required"} 
      onSave={handleSave} 
      saveLabel="Confirm" 
      t={t} 
      isDark={isDark}
      loading={loading}
    >
      <div style={{ padding: "8px 0" }} onKeyDown={e => e.key === "Enter" && handleSave()}>
        {label && <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>{label}</div>}
        <FIn 
          value={value} 
          onChange={e => setValue(e.target.value)} 
          placeholder="Enter value..." 
          t={t} 
        />
      </div>
    </Modal>
  );
};

// InvestorSummaryModal was moved to src/components/InvestorSummaryModal.jsx


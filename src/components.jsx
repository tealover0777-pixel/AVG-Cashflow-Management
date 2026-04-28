/**
 * AVG Cashflow Management — Shared Components
 * Reusable UI components and hooks.
 */
import React from "react";
import { badge, initials, fmtCurr, av } from "./utils";
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Pencil, Trash2, RotateCcw, X, Info, Check, Plus, AlertCircle, FileText,
  ArrowUp, ArrowDown, MoreHorizontal, Copy, UserPlus
} from "lucide-react";
import ReactDOM from "react-dom";
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

export const ActBtns = ({ show, t, onEdit, onDel, onUndo, onClone, onInvite, isInviting, extraActions = [] }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const isDark = t.isDark;

  React.useEffect(() => {
    const clickOut = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [isOpen]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 5,
        left: rect.right + window.scrollX - 170
      });
    }
    setIsOpen(!isOpen);
  };

  if (!onEdit && !onDel && !onUndo && !onClone && !onInvite && extraActions.length === 0) return null;

  return (
    <div style={{ position: "relative", opacity: show ? 1 : 0, pointerEvents: show ? "auto" : "none" }}>
      <button
        ref={btnRef}
        className="action-trigger-btn"
        onClick={toggleMenu}
        style={{
          background: "none",
          border: "none",
          color: t.textSubtle,
          cursor: "pointer",
          padding: "6px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && ReactDOM.createPortal(
        <div
          ref={menuRef}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: "absolute",
            top: coords.top,
            left: coords.left,
            width: 170,
            background: isDark ? "#1E1E1E" : "#FFFFFF",
            border: `1px solid ${t.surfaceBorder}`,
            borderRadius: 10,
            boxShadow: isDark ? "0 10px 25px rgba(0,0,0,0.5)" : "0 10px 25px rgba(0,0,0,0.1)",
            zIndex: 99999,
            padding: "5px",
            overflow: "hidden",
            animation: "fadeInUp 0.15s ease-out forwards"
          }}
        >
          {onEdit && (
            <button
              className="menu-item"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onEdit(e); }}
              style={{
                width: "100%", padding: "8px 12px", background: "transparent", border: "none",
                color: t.text, fontSize: "12.5px", fontWeight: 500, cursor: "pointer",
                textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderRadius: 6
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <Pencil size={14} style={{ color: "#60A5FA" }} /> Edit
            </button>
          )}
          {onClone && (
            <button
              className="menu-item"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onClone(e); }}
              style={{
                width: "100%", padding: "8px 12px", background: "transparent", border: "none",
                color: t.text, fontSize: "12.5px", fontWeight: 500, cursor: "pointer",
                textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderRadius: 6
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <Copy size={14} style={{ color: "#10B981" }} /> Clone
            </button>
          )}
          {onInvite && (
            <button
              className="menu-item"
              disabled={isInviting}
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onInvite(e); }}
              style={{
                width: "100%", padding: "8px 12px", background: "transparent", border: "none",
                color: t.text, fontSize: "12.5px", fontWeight: 500, cursor: isInviting ? "default" : "pointer",
                textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderRadius: 6,
                opacity: isInviting ? 0.5 : 1
              }}
              onMouseEnter={e => !isInviting && (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6")}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <UserPlus size={14} style={{ color: "#8B5CF6" }} /> {isInviting ? "Inviting..." : "Invite"}
            </button>
          )}
          {onUndo && (
            <button
              className="menu-item"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onUndo(e); }}
              style={{
                width: "100%", padding: "8px 12px", background: "transparent", border: "none",
                color: t.text, fontSize: "12.5px", fontWeight: 500, cursor: "pointer",
                textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderRadius: 6
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <RotateCcw size={14} style={{ color: "#F59E0B" }} /> Undo
            </button>
          )}
          {extraActions.map((act, idx) => (
            <button
              key={idx}
              className="menu-item"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); act.onClick(e); }}
              style={{
                width: "100%", padding: "8px 12px", background: "transparent", border: "none",
                color: act.danger ? "#EF4444" : t.text, fontSize: "12.5px", fontWeight: 500, cursor: "pointer",
                textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderRadius: 6
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {act.icon && <act.icon size={14} style={{ color: act.color || t.textSubtle }} />}
              {act.label}
            </button>
          ))}
          {onDel && (
            <button
              className="menu-item"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDel(e); }}
              style={{
                width: "100%", padding: "8px 12px", background: "transparent", border: "none",
                color: "#EF4444", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
                textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderRadius: 6
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.1)" : "#FEF2F2"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>,
        document.body
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

export const Modal = ({ open, onClose, title, onSave, saveLabel, secondaryAction, secondaryLabel, danger, width, children, t, isDark, loading, showCancel = true, titleFont }) => {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const offsetRef = React.useRef({ x: 0, y: 0 });
  const [resizeW, setResizeW] = React.useState(null);
  const [resizeH, setResizeH] = React.useState(null);
  const modalRef = React.useRef(null);

  React.useEffect(() => {
    if (open) { setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 }; setResizeW(null); setResizeH(null); }
  }, [open]);

  const onHeaderMouseDown = React.useCallback((e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    e.preventDefault();
    const startMx = e.clientX, startMy = e.clientY;
    const startOx = offsetRef.current.x, startOy = offsetRef.current.y;
    setIsDragging(true);
    const onMove = (e) => {
      const next = { x: startOx + e.clientX - startMx, y: startOy + e.clientY - startMy };
      offsetRef.current = next;
      setOffset(next);
    };
    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const onResizeStart = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = modalRef.current;
    if (!el) return;
    const { width: startW, height: startH } = el.getBoundingClientRect();
    const startMx = e.clientX, startMy = e.clientY;
    const onMove = (e) => {
      setResizeW(Math.max(320, startW + e.clientX - startMx));
      setResizeH(Math.max(180, startH + e.clientY - startMy));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
      <div ref={modalRef} style={{ position: "relative", zIndex: 1, background: isDark ? "#0b1929" : "#ffffff", borderRadius: 20, border: `1px solid ${t.surfaceBorder}`, width: resizeW || (width || 480), maxWidth: resizeW ? "none" : "92vw", height: resizeH || "auto", maxHeight: resizeH ? "none" : "88vh", display: "flex", flexDirection: "column", boxShadow: isDark ? "0 40px 100px rgba(0,0,0,0.7)" : "0 24px 60px rgba(0,0,0,0.13)", transform: `translate(${offset.x}px, ${offset.y}px)`, overflow: "hidden", minWidth: 320, minHeight: 180 }}>
        <div onMouseDown={onHeaderMouseDown} style={{ padding: "22px 26px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", borderRadius: "20px 20px 0 0", cursor: isDragging ? "grabbing" : "grab", userSelect: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", fontFamily: titleFont || t.titleFont, letterSpacing: "-0.4px" }}>{title}</span>
          </div>
          <Tooltip text="Close this dialog" t={t}>
            <button onClick={onClose} className="action-btn" style={{ width: 28, height: 28, borderRadius: 8, background: t.deleteBtn[0], color: t.deleteBtn[1], display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </Tooltip>
        </div>
        <div style={{ padding: "24px 26px", overflowY: "auto", flex: 1 }}>{children}</div>
        <div style={{ padding: "16px 26px", borderTop: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "flex-end", gap: 10, background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", borderRadius: "0 0 20px 20px", flexShrink: 0 }}>
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
        <div onMouseDown={onResizeStart} style={{ position: "absolute", right: 0, bottom: 0, width: 22, height: 22, cursor: "nwse-resize", zIndex: 10, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 4 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="13" x2="13" y2="2" stroke={isDark ? "#6B7280" : "#94A3B8"} strokeWidth="2" strokeLinecap="round"/>
            <line x1="7" y1="13" x2="13" y2="7" stroke={isDark ? "#6B7280" : "#94A3B8"} strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="13" x2="13" y2="12" stroke={isDark ? "#6B7280" : "#94A3B8"} strokeWidth="2" strokeLinecap="round"/>
          </svg>
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
    {options.map(o => {
      const isObj = typeof o === "object" && o !== null;
      const val = isObj ? o.value : o;
      const lab = isObj ? o.label : o;
      return <option key={val} value={val}>{lab}</option>;
    })}
  </select>
);

export const FMultiSel = ({ value = [], onChange, options, t, style = {}, showSelectAll = false }) => {
  const allSelected = options.length > 0 && options.every(o => value.includes(o));
  const someSelected = options.some(o => value.includes(o));
  return (
    <div style={{ display: "flex", flexDirection: "column", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, overflow: "hidden", ...style }}>
      {showSelectAll && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: t.searchText, cursor: "pointer", fontFamily: t.mono, padding: "8px 12px", borderBottom: `1px solid ${t.searchBorder}`, background: someSelected ? (t.isDark ? "rgba(255,255,255,0.04)" : "#F0F4FF") : "transparent" }}>
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={() => onChange(allSelected ? [] : [...options])}
            style={{ accentColor: t.accent, cursor: "pointer" }}
          />
          Select All
        </label>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", padding: "10px 12px" }}>
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
    </div>
  );
};

export const ConfirmModal = ({ open, onClose, onConfirm, title, message, t, isDark, saveLabel = "Yes, Proceed" }) => (
  <Modal 
    open={open} 
    onClose={onClose} 
    title={title || "Confirm Action"} 
    onSave={onConfirm} 
    saveLabel={saveLabel}
    t={t} 
    isDark={isDark}
    width={400}
  >
    <div style={{ padding: "8px 0", fontSize: 14, color: t.text, lineHeight: 1.6 }}>
      {message}
    </div>
  </Modal>
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


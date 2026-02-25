/**
 * AVG Cashflow Management — Shared Components
 * Reusable UI components and hooks.
 */
import { useState, useRef } from "react";
import { badge } from "./utils";

export const Bdg = ({ status, isDark }) => {
  const [bg, color, border] = badge(status, isDark);
  return <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 20, background: bg, color, border: `1px solid ${border}` }}>{status}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: stat card, pagination, action buttons
// ─────────────────────────────────────────────────────────────────────────────

export const StatCard = ({ label, value, accent, bg, border, titleFont, isDark, icon, large }) => (
  <div className="stat-card" style={{ background: bg, borderRadius: 14, padding: "20px 22px", border: `1px solid ${border}`, backdropFilter: isDark ? "blur(10px)" : "none", display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(128,128,128,0.8)", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</span>
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
  const btn = (label, target, disabled = false, isAct = false) => (
    <span key={label} onClick={() => !disabled && onPageChange(target)} style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isAct ? 700 : 500, background: isAct ? t.pageBtnActive : (disabled ? "transparent" : t.pageBtnBg), color: isAct ? t.pageBtnActiveTxt : (disabled ? t.textMuted : t.pageBtnText), border: `1px solid ${isAct ? t.pageBtnActive : (disabled ? t.surfaceBorder : t.pageBtnBorder)}`, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all 0.1s ease" }}>{label}</span>
  );
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {btn("««", 1, currentPage === 1)}
      {btn("«", Math.max(1, currentPage - 10), currentPage <= 10)}
      {pages.map(p => btn(p, p, false, currentPage === p))}
      {btn("»", Math.min(totalPages, currentPage + 10), currentPage > totalPages - (totalPages % 10 || 10))}
      {btn("»»", totalPages, currentPage === totalPages)}
    </div>
  );
};

export const ActBtns = ({ show, t, onEdit, onDel }) => (
  <div style={{ display: "flex", gap: 6, opacity: show ? 1 : 0, transition: "opacity 0.15s ease" }}>
    <button className="action-btn" onClick={e => { e.stopPropagation(); onEdit && onEdit(); }} style={{ width: 30, height: 30, borderRadius: 7, background: t.editBtn[0], color: t.editBtn[1], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✎</button>
    <button className="action-btn" onClick={e => { e.stopPropagation(); onDel && onDel(); }} style={{ width: 30, height: 30, borderRadius: 7, background: t.deleteBtn[0], color: t.deleteBtn[1], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⊗</button>
  </div>
);

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
  <div ref={headerRef} style={{ display: "grid", gridTemplateColumns: gridTemplate || cols.map(c => c.w).join(" "), padding: "12px 22px", background: t.tableHeader, borderBottom: `1px solid ${t.surfaceBorder}`, alignItems: "center" }}>
    {cols.map((c, i) => {
      if (i === 0 && children) return <div key="prefix" style={{ display: "flex", alignItems: "center", position: "relative" }}>{children}{onResizeStart && i < cols.length - 1 && <div onMouseDown={e => onResizeStart(i, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 2 }} />}</div>;
      const isS = !!c.k, isSorted = sortConfig?.key === c.k;
      return (
        <div key={c.l || i} onClick={() => isS && onSort && onSort(c.k)}
          style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "1px", color: isSorted ? t.accent : (isDark ? "rgba(255,255,255,0.3)" : "#C4C0BA"), textTransform: "uppercase", fontFamily: t.mono, cursor: isS ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4, userSelect: "none", position: "relative" }}>
          {c.l}
          {isS && isSorted && <span style={{ fontSize: 10 }}>{sortConfig.direction === "asc" ? "▲" : "▼"}</span>}
          {onResizeStart && i < cols.length - 1 && <div onMouseDown={e => { e.stopPropagation(); onResizeStart(i, e); }} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 2 }} />}
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MODAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, onSave, saveLabel, danger, width, children, t, isDark }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: isDark ? "#0b1929" : "#ffffff", borderRadius: 20, border: `1px solid ${t.surfaceBorder}`, width: width || 480, maxWidth: "92vw", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: isDark ? "0 40px 100px rgba(0,0,0,0.7)" : "0 24px 60px rgba(0,0,0,0.13)" }}>
        <div style={{ padding: "22px 26px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", borderRadius: "20px 20px 0 0" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", fontFamily: t.titleFont, letterSpacing: "-0.4px" }}>{title}</span>
          <button onClick={onClose} className="action-btn" style={{ width: 28, height: 28, borderRadius: 8, background: t.deleteBtn[0], color: t.deleteBtn[1], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: "none", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "24px 26px", overflowY: "auto", flex: 1 }}>{children}</div>
        <div style={{ padding: "16px 26px", borderTop: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "flex-end", gap: 10, background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", borderRadius: "0 0 20px 20px" }}>
          <button onClick={onClose} style={{ padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: t.chipBg, color: t.textSecondary, border: `1px solid ${t.chipBorder}`, cursor: "pointer" }}>Cancel</button>
          <button onClick={onSave} className="primary-btn" style={{ padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: danger ? "rgba(248,113,113,0.15)" : t.accentGrad, color: danger ? (isDark ? "#F87171" : "#DC2626") : "#fff", border: danger ? `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "#FECACA"}` : "none", boxShadow: danger ? "none" : `0 4px 14px ${t.accentShadow}`, cursor: "pointer" }}>{saveLabel || "Save"}</button>
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

export const FIn = ({ value, onChange, placeholder, t, type }) => (
  <input type={type || "text"} value={value || ""} onChange={onChange} placeholder={placeholder || ""}
    style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none" }} />
);

export const FSel = ({ value, onChange, options, t, placeholder }) => (
  <select value={value} onChange={onChange}
    style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: value ? t.searchText : (t.textMuted), fontSize: 13.5, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
    {!value && <option value="">{placeholder || "Select..."}</option>}
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

export const DelModal = ({ target, onClose, onConfirm, label, t, isDark }) => (
  <Modal open={!!target} onClose={onClose} title="Confirm Delete" onSave={onConfirm} saveLabel="Delete" danger t={t} isDark={isDark}>
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "8px 0" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", border: `1px solid ${isDark ? "rgba(248,113,113,0.25)" : "#FECACA"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: isDark ? "#F87171" : "#DC2626" }}>⊗</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 8 }}>Delete "{target?.name}"?</div>
        <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>{label || "This record"} will be permanently removed.<br />This action cannot be undone.</div>
      </div>
    </div>
  </Modal>
);

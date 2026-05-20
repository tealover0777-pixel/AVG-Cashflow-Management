import React, { useState, useMemo } from "react";
import { 
  Plus, Minus, RefreshCw, ChevronDown, ChevronRight, 
  FileText, AlertTriangle, CheckCircle2, X, ArrowRight,
  Eye, EyeOff, Search
} from "lucide-react";

/**
 * RestorePreviewDiff
 * 
 * Shows a field-level comparison between current live data and the backup snapshot
 * for each collection (deals, contacts, investments).
 * 
 * Props:
 *  - currentData: { deals: [...], contacts: [...], investments: [...] }
 *  - backupData:  { deals: [...], contacts: [...], investments: [...] }
 *  - t: theme object
 *  - isDark: boolean
 *  - onConfirm: callback when admin confirms restore
 *  - onCancel:  callback to cancel
 *  - tenantName: string for display
 *  - backupDate: string ISO date of the backup
 */
export default function RestorePreviewDiff({ 
  currentData = {}, 
  backupData = {}, 
  t, 
  isDark, 
  onConfirm, 
  onCancel,
  tenantName = "",
  backupDate = ""
}) {
  const [activeCollection, setActiveCollection] = useState("deals");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnchanged, setShowUnchanged] = useState(false);

  // Compute diffs per collection
  const collectionDiffs = useMemo(() => {
    const result = {};
    const collections = ["deals", "contacts", "investments"];
    if (currentData.paymentSchedules || backupData.paymentSchedules) {
      collections.push("paymentSchedules");
    }

    collections.forEach(col => {
      const current = Array.isArray(currentData[col]) ? currentData[col] : [];
      const backup  = Array.isArray(backupData[col])  ? backupData[col]  : [];

      const currentMap = new Map(current.map(item => [item.id || item.docId || JSON.stringify(item), item]));
      const backupMap  = new Map(backup.map(item => [item.id || item.docId || JSON.stringify(item), item]));

      const additions = []; // In backup but not in current → will be added
      const deletions = []; // In current but not in backup → will be removed
      const modifications = []; // In both but with changes
      const unchanged = []; // In both and identical

      // Check backup items vs current
      backupMap.forEach((backupItem, key) => {
        if (!currentMap.has(key)) {
          additions.push({ id: key, backup: backupItem });
        } else {
          const currentItem = currentMap.get(key);
          const changes = getFieldChanges(currentItem, backupItem);
          if (changes.length > 0) {
            modifications.push({ id: key, current: currentItem, backup: backupItem, changes });
          } else {
            unchanged.push({ id: key, item: currentItem });
          }
        }
      });

      // Check current items not in backup → will be deleted
      currentMap.forEach((currentItem, key) => {
        if (!backupMap.has(key)) {
          deletions.push({ id: key, current: currentItem });
        }
      });

      result[col] = { additions, deletions, modifications, unchanged };
    });

    return result;
  }, [currentData, backupData]);

  // Simple field-level comparison
  function getFieldChanges(current, backup) {
    const changes = [];
    const allKeys = new Set([...Object.keys(current || {}), ...Object.keys(backup || {})]);
    
    // Exclude metadata/timestamps from comparison
    const ignoreKeys = new Set(["createdAt", "updatedAt", "lastModified", "_ref", "_path"]);
    
    allKeys.forEach(key => {
      if (ignoreKeys.has(key)) return;
      const cVal = current?.[key];
      const bVal = backup?.[key];
      
      // Deep-compare objects/arrays via JSON string
      const cStr = typeof cVal === "object" ? JSON.stringify(cVal) : String(cVal ?? "");
      const bStr = typeof bVal === "object" ? JSON.stringify(bVal) : String(bVal ?? "");
      
      if (cStr !== bStr) {
        changes.push({ field: key, current: cVal, backup: bVal });
      }
    });

    return changes;
  }

  // Get primary display label for an item
  function getItemLabel(item) {
    if (!item) return "—";
    if (item.due_date) {
      return `Schedule: ${item.due_date} (${item.payment_amount ? '$' + item.payment_amount : item.amount || ''})`;
    }
    return item.name || item.deal_name || 
           (item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : "") ||
           item.email || item.id || item.docId || "Unknown";
  }

  function formatValue(val) {
    if (val === undefined || val === null) return "—";
    if (typeof val === "object") return JSON.stringify(val, null, 1);
    return String(val);
  }

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeDiff = collectionDiffs[activeCollection] || { additions: [], deletions: [], modifications: [], unchanged: [] };

  // Filter by search
  const filterItems = (items, getItem) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(entry => {
      const item = getItem(entry);
      const label = getItemLabel(item).toLowerCase();
      const id = String(entry.id || "").toLowerCase();
      return label.includes(q) || id.includes(q);
    });
  };

  const filteredAdditions = filterItems(activeDiff.additions, e => e.backup);
  const filteredDeletions = filterItems(activeDiff.deletions, e => e.current);
  const filteredModifications = filterItems(activeDiff.modifications, e => e.current);
  const filteredUnchanged = filterItems(activeDiff.unchanged, e => e.item);

  // Aggregate summary stats
  const totalChanges = Object.values(collectionDiffs).reduce((sum, col) => 
    sum + col.additions.length + col.deletions.length + col.modifications.length, 0
  );

  const tabs = ["deals", "contacts", "investments"];
  if (currentData.paymentSchedules || backupData.paymentSchedules) {
    tabs.push("paymentSchedules");
  }

  const pillStyle = (isActive) => ({
    padding: "7px 16px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${isActive ? t.accent : t.border}`,
    background: isActive ? (isDark ? "rgba(99,102,241,0.12)" : "#EEF2FF") : "transparent",
    color: isActive ? t.accent : t.textSecondary,
    transition: "all 0.15s ease"
  });

  const countBadge = (count, color) => (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: "1px 6px",
      borderRadius: 10,
      background: isDark ? `${color}22` : `${color}18`,
      color: color,
      marginLeft: 6
    }}>
      {count}
    </span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: "70vh", overflow: "hidden" }}>
      
      {/* Summary Banner */}
      <div style={{
        padding: "16px 24px",
        background: isDark ? "rgba(99,102,241,0.06)" : "#F5F3FF",
        borderBottom: `1px solid ${t.surfaceBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Eye size={16} style={{ color: t.accent }} />
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: isDark ? "#fff" : "#1C1917" }}>
              Restore Preview — {tenantName}
            </span>
            <span style={{ fontSize: 11.5, color: t.textMuted, display: "block", marginTop: 2 }}>
              Comparing live data against snapshot from {backupDate ? new Date(backupDate).toLocaleString() : "selected backup"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {/* Change summary pills */}
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, color: isDark ? "#34D399" : "#059669", fontWeight: 600 }}>
              +{Object.values(collectionDiffs).reduce((s, c) => s + c.additions.length, 0)} added
            </span>
            <span style={{ fontSize: 11, color: isDark ? "#F87171" : "#DC2626", fontWeight: 600 }}>
              −{Object.values(collectionDiffs).reduce((s, c) => s + c.deletions.length, 0)} removed
            </span>
            <span style={{ fontSize: 11, color: isDark ? "#FBBF24" : "#D97706", fontWeight: 600 }}>
              ~{Object.values(collectionDiffs).reduce((s, c) => s + c.modifications.length, 0)} modified
            </span>
          </div>
        </div>
      </div>

      {/* Collection Tabs + Search */}
      <div style={{
        padding: "12px 24px",
        borderBottom: `1px solid ${t.surfaceBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {tabs.map(tab => {
            const diff = collectionDiffs[tab] || {};
            const total = (diff.additions?.length || 0) + (diff.deletions?.length || 0) + (diff.modifications?.length || 0);
            return (
              <button
                key={tab}
                onClick={() => { setActiveCollection(tab); setExpandedRows(new Set()); }}
                style={pillStyle(activeCollection === tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {total > 0 && countBadge(total, t.accent)}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label 
            onClick={() => setShowUnchanged(p => !p)}
            style={{ fontSize: 11.5, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
          >
            {showUnchanged ? <EyeOff size={13} /> : <Eye size={13} />}
            {showUnchanged ? "Hide unchanged" : "Show unchanged"}
          </label>

          <div style={{ position: "relative", width: 200 }}>
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: t.searchBg,
                color: t.searchText,
                border: `1px solid ${t.searchBorder}`,
                borderRadius: 7,
                padding: "6px 10px 6px 28px",
                fontSize: 12,
                outline: "none"
              }}
            />
            <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.textMuted }} />
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div style={{ padding: "0 24px 16px", overflowY: "auto", flex: 1, maxHeight: "calc(70vh - 200px)" }}>
        
        {/* Additions */}
        {filteredAdditions.length > 0 && (
          <DiffSection 
            title="Records to Add" 
            icon={<Plus size={13} />}
            count={filteredAdditions.length}
            color={isDark ? "#34D399" : "#059669"}
            bgColor={isDark ? "rgba(16,185,129,0.06)" : "#ECFDF5"}
            borderColor={isDark ? "rgba(16,185,129,0.15)" : "#A7F3D0"}
            t={t}
            isDark={isDark}
          >
            {filteredAdditions.map(entry => (
              <DiffRow
                key={entry.id}
                id={entry.id}
                label={getItemLabel(entry.backup)}
                type="addition"
                expanded={expandedRows.has(`add_${entry.id}`)}
                onToggle={() => toggleRow(`add_${entry.id}`)}
                t={t}
                isDark={isDark}
              >
                <FieldTable fields={Object.entries(entry.backup || {}).filter(([k]) => k !== "id" && k !== "docId")} mode="addition" t={t} isDark={isDark} formatValue={formatValue} />
              </DiffRow>
            ))}
          </DiffSection>
        )}

        {/* Deletions */}
        {filteredDeletions.length > 0 && (
          <DiffSection 
            title="Records to Remove" 
            icon={<Minus size={13} />}
            count={filteredDeletions.length}
            color={isDark ? "#F87171" : "#DC2626"}
            bgColor={isDark ? "rgba(239,68,68,0.06)" : "#FEF2F2"}
            borderColor={isDark ? "rgba(239,68,68,0.15)" : "#FCA5A5"}
            t={t}
            isDark={isDark}
          >
            {filteredDeletions.map(entry => (
              <DiffRow
                key={entry.id}
                id={entry.id}
                label={getItemLabel(entry.current)}
                type="deletion"
                expanded={expandedRows.has(`del_${entry.id}`)}
                onToggle={() => toggleRow(`del_${entry.id}`)}
                t={t}
                isDark={isDark}
              >
                <FieldTable fields={Object.entries(entry.current || {}).filter(([k]) => k !== "id" && k !== "docId")} mode="deletion" t={t} isDark={isDark} formatValue={formatValue} />
              </DiffRow>
            ))}
          </DiffSection>
        )}

        {/* Modifications */}
        {filteredModifications.length > 0 && (
          <DiffSection 
            title="Records with Changes" 
            icon={<RefreshCw size={13} />}
            count={filteredModifications.length}
            color={isDark ? "#FBBF24" : "#D97706"}
            bgColor={isDark ? "rgba(251,191,36,0.06)" : "#FFFBEB"}
            borderColor={isDark ? "rgba(251,191,36,0.15)" : "#FDE68A"}
            t={t}
            isDark={isDark}
          >
            {filteredModifications.map(entry => (
              <DiffRow
                key={entry.id}
                id={entry.id}
                label={getItemLabel(entry.current)}
                type="modification"
                changeCount={entry.changes.length}
                expanded={expandedRows.has(`mod_${entry.id}`)}
                onToggle={() => toggleRow(`mod_${entry.id}`)}
                t={t}
                isDark={isDark}
              >
                <ModificationTable changes={entry.changes} t={t} isDark={isDark} formatValue={formatValue} />
              </DiffRow>
            ))}
          </DiffSection>
        )}

        {/* Unchanged (toggle) */}
        {showUnchanged && filteredUnchanged.length > 0 && (
          <DiffSection 
            title="Unchanged Records" 
            icon={<CheckCircle2 size={13} />}
            count={filteredUnchanged.length}
            color={t.textMuted}
            bgColor="transparent"
            borderColor={t.surfaceBorder}
            t={t}
            isDark={isDark}
          >
            {filteredUnchanged.map(entry => (
              <div key={entry.id} style={{
                padding: "8px 14px",
                fontSize: 12.5,
                color: t.textMuted,
                borderBottom: `1px solid ${t.surfaceBorder}`,
                fontFamily: t.mono
              }}>
                {getItemLabel(entry.item)} <span style={{ opacity: 0.5 }}>({entry.id})</span>
              </div>
            ))}
          </DiffSection>
        )}

        {/* Empty state */}
        {filteredAdditions.length === 0 && filteredDeletions.length === 0 && filteredModifications.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: t.textMuted }}>
            <CheckCircle2 size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ fontSize: 13 }}>No changes detected in <strong>{activeCollection}</strong>. The backup matches live data.</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div style={{
        padding: "16px 24px",
        borderTop: `1px solid ${t.surfaceBorder}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9"
      }}>
        <div style={{ fontSize: 12, color: t.textMuted }}>
          <AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 4, color: isDark ? "#FBBF24" : "#D97706" }} />
          {totalChanges} total change{totalChanges !== 1 ? "s" : ""} will be applied across all collections
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              background: "none",
              border: `1px solid ${t.border}`,
              color: t.textSecondary,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              background: isDark ? "rgba(239,68,68,0.15)" : "#DC2626",
              color: isDark ? "#F87171" : "#fff",
              border: isDark ? "1px solid rgba(239,68,68,0.3)" : "none",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <ArrowRight size={14} />
            Proceed to Restore
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Subcomponents ─────────────────────────────────────────────────────────── */

function DiffSection({ title, icon, count, color, bgColor, borderColor, children, t, isDark }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ marginTop: 16 }}>
      <div 
        onClick={() => setCollapsed(p => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: collapsed ? 10 : "10px 10px 0 0",
          cursor: "pointer",
          userSelect: "none"
        }}
      >
        {collapsed ? <ChevronRight size={14} style={{ color }} /> : <ChevronDown size={14} style={{ color }} />}
        <span style={{ color, display: "flex", alignItems: "center", gap: 6 }}>
          {icon}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color }}>
          {title}
        </span>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          background: `${color}22`,
          color: color,
          padding: "1px 8px",
          borderRadius: 10,
          marginLeft: 4
        }}>
          {count}
        </span>
      </div>
      {!collapsed && (
        <div style={{
          border: `1px solid ${borderColor}`,
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          overflow: "hidden"
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DiffRow({ id, label, type, changeCount, expanded, onToggle, children, t, isDark }) {
  const colors = {
    addition: isDark ? "#34D399" : "#059669",
    deletion: isDark ? "#F87171" : "#DC2626",
    modification: isDark ? "#FBBF24" : "#D97706",
  };

  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 14px",
          borderBottom: `1px solid ${t.surfaceBorder}`,
          cursor: "pointer",
          background: expanded ? (isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9") : "transparent",
          transition: "background 0.15s"
        }}
      >
        {expanded ? <ChevronDown size={12} style={{ color: t.textMuted }} /> : <ChevronRight size={12} style={{ color: t.textMuted }} />}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>
          {label}
        </span>
        <span style={{ fontSize: 11, fontFamily: "monospace", color: t.textMuted, opacity: 0.6 }}>
          {id}
        </span>
        {changeCount && (
          <span style={{ fontSize: 10, color: colors[type], fontWeight: 600, marginLeft: "auto" }}>
            {changeCount} field{changeCount !== 1 ? "s" : ""} changed
          </span>
        )}
        {type === "addition" && (
          <span style={{ fontSize: 10, color: colors.addition, fontWeight: 600, marginLeft: "auto" }}>NEW</span>
        )}
        {type === "deletion" && (
          <span style={{ fontSize: 10, color: colors.deletion, fontWeight: 600, marginLeft: "auto" }}>WILL BE REMOVED</span>
        )}
      </div>
      {expanded && (
        <div style={{ padding: "10px 14px 10px 36px", background: isDark ? "rgba(0,0,0,0.2)" : "#F9FAFB" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function FieldTable({ fields, mode, t, isDark, formatValue }) {
  const color = mode === "addition" ? (isDark ? "#34D399" : "#059669") : (isDark ? "#F87171" : "#DC2626");
  
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "4px 8px", color: t.textMuted, fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", borderBottom: `1px solid ${t.surfaceBorder}` }}>Field</th>
          <th style={{ textAlign: "left", padding: "4px 8px", color: t.textMuted, fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", borderBottom: `1px solid ${t.surfaceBorder}` }}>Value</th>
        </tr>
      </thead>
      <tbody>
        {fields.map(([key, value]) => (
          <tr key={key}>
            <td style={{ padding: "4px 8px", color: t.textSecondary, fontFamily: "monospace", fontSize: 11.5 }}>{key}</td>
            <td style={{ padding: "4px 8px", color, fontFamily: "monospace", fontSize: 11.5, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {mode === "addition" ? "+" : "−"} {formatValue(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ModificationTable({ changes, t, isDark, formatValue }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "4px 8px", color: t.textMuted, fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", borderBottom: `1px solid ${t.surfaceBorder}`, width: "25%" }}>Field</th>
          <th style={{ textAlign: "left", padding: "4px 8px", color: isDark ? "#F87171" : "#DC2626", fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", borderBottom: `1px solid ${t.surfaceBorder}`, width: "37%" }}>Current (Live)</th>
          <th style={{ textAlign: "left", padding: "4px 8px", color: isDark ? "#34D399" : "#059669", fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", borderBottom: `1px solid ${t.surfaceBorder}`, width: "37%" }}>After Restore</th>
        </tr>
      </thead>
      <tbody>
        {changes.map(ch => (
          <tr key={ch.field}>
            <td style={{ padding: "4px 8px", color: t.textSecondary, fontFamily: "monospace", fontSize: 11.5 }}>{ch.field}</td>
            <td style={{ 
              padding: "4px 8px", 
              fontFamily: "monospace", 
              fontSize: 11.5, 
              color: isDark ? "#F87171" : "#DC2626",
              background: isDark ? "rgba(239,68,68,0.05)" : "#FEF2F2",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              {formatValue(ch.current)}
            </td>
            <td style={{ 
              padding: "4px 8px", 
              fontFamily: "monospace", 
              fontSize: 11.5, 
              color: isDark ? "#34D399" : "#059669",
              background: isDark ? "rgba(16,185,129,0.05)" : "#ECFDF5",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              {formatValue(ch.backup)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import React, { useState, useRef, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { doc, updateDoc, collection, addDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { Modal, FIn, FF, DelModal } from "../components";
import { Trash2, Pencil, Check } from "lucide-react";

export default function PageDimensions({ t, isDark, DIMENSIONS = [], rawDimensions = [], collectionPath = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canView = isSuperAdmin || hasPermission("PlatformAdmin_view");
  const canUpdate = isSuperAdmin || hasPermission("PlatformAdmin_update");
  const canDelete = isSuperAdmin || hasPermission("PlatformAdmin_delete");
  const [editing, setEditing] = useState(null);
  const [newVals, setNewVals] = useState({});
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValuesStr, setNewValuesStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // { groupName, originalItem, item }

  const getRawDoc = (name) => rawDimensions.find(d => (d.category || d.name || d.id) === name);
  const getItemsField = (rawDoc) => {
    if (!rawDoc) return "items";
    if (Array.isArray(rawDoc.options)) return "options";
    return "items";
  };

  const normalizeItem = (item, index) => {
    if (!item) return { value: "", label: "", order: index + 1, active: true, color: "#9CA3AF" };
    if (typeof item === "object") {
      return {
        value: item.value || item.label || "",
        label: item.label || item.value || "",
        order: typeof item.order === "number" ? item.order : index + 1,
        active: item.active !== false,
        color: item.color || "#9CA3AF",
        ...item
      };
    }
    const isMap = typeof item === "string" && item.includes(":");
    const [label, val] = isMap ? item.split(":") : [item, null];
    return {
      value: val || label,
      label: label,
      order: index + 1,
      active: true,
      color: "#9CA3AF"
    };
  };

  const handleAdd = async (groupName) => {
    const val = (newVals[groupName] || "").trim();
    if (!val) return;
    const rawDoc = getRawDoc(groupName);
    if (!rawDoc) return;
    const field = getItemsField(rawDoc);
    const current = rawDoc[field] || [];
    
    // Always add new items as rich objects
    const nextOrder = current.length + 1;
    const valToAdd = {
      value: val,
      label: val,
      order: nextOrder,
      color: "#9CA3AF",
      active: true,
      ...(groupName === "PaymentType" ? { direction: "BOTH" } : {})
    };

    const exists = current.some(v => {
      const existingStr = (v && typeof v === "object") ? (v.value || v.label || "") : v;
      return existingStr.toLowerCase() === val.toLowerCase();
    });
    if (exists) {
      showToast(`"${val}" already exists.`, "error");
      return;
    }

    try {
      await updateDoc(doc(db, collectionPath, rawDoc.doc_id), { [field]: [...current, valToAdd] });
      setNewVals(v => ({ ...v, [groupName]: "" }));
      showToast("Value added successfully.", "success");
    } catch (err) {
      console.error("Add dimension value error:", err);
      showToast("Failed to add value: " + (err.message || err), "error");
    }
  };

  const handleRemove = async (groupName, item) => {
    const rawDoc = getRawDoc(groupName);
    if (!rawDoc) return;
    const field = getItemsField(rawDoc);
    const current = rawDoc[field] || [];
    try {
      await updateDoc(doc(db, collectionPath, rawDoc.doc_id), { [field]: current.filter(v => v !== item) });
      showToast("Value removed.", "success");
    } catch (err) {
      console.error("Remove dimension value error:", err);
      showToast("Failed to remove value: " + (err.message || err), "error");
    }
  };

  const handleDelete = (groupName) => setConfirmDelete(groupName);

  const doDelete = async (groupName) => {
    const rawDoc = getRawDoc(groupName);
    if (!rawDoc) return;
    try {
      await deleteDoc(doc(db, collectionPath, rawDoc.doc_id));
      if (editing === groupName) setEditing(null);
      showToast("Dimension deleted.", "success");
    } catch (err) {
      console.error("Delete dimension error:", err);
      showToast("Failed to delete dimension: " + (err.message || err), "error");
    }
  };

  const handleSaveItemDetails = async () => {
    if (!editingItem) return;
    const { groupName, originalItem, item } = editingItem;
    const trimmedVal = item.value.trim();
    const trimmedLab = item.label.trim();
    if (!trimmedVal || !trimmedLab) {
      showToast("Value and Label are required.", "error");
      return;
    }

    const rawDoc = getRawDoc(groupName);
    if (!rawDoc) return;
    const field = getItemsField(rawDoc);
    const current = rawDoc[field] || [];

    const exists = current.some(v => {
      if (v === originalItem) return false;
      const existingStr = (v && typeof v === "object") ? (v.value || v.label || "") : v;
      return existingStr.toLowerCase() === trimmedVal.toLowerCase();
    });
    if (exists) {
      showToast(`An item with value "${trimmedVal}" already exists in this dimension.`, "error");
      return;
    }

    try {
      const updatedList = current.map(v => {
        if (v === originalItem) {
          return {
            ...item,
            value: trimmedVal,
            label: trimmedLab,
            order: Number(item.order) || 1,
            active: !!item.active
          };
        }
        return v;
      });

      await updateDoc(doc(db, collectionPath, rawDoc.doc_id), { [field]: updatedList });
      setEditingItem(null);
      showToast("Configuration saved successfully.", "success");
    } catch (err) {
      console.error("Save item details error:", err);
      showToast("Failed to save configuration: " + (err.message || err), "error");
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const items = newValuesStr.split(",").map((v, index) => {
        const val = v.trim();
        return {
          value: val,
          label: val,
          order: index + 1,
          active: true,
          color: "#9CA3AF"
        };
      }).filter(item => item.value);

      await addDoc(collection(db, collectionPath), {
        category: newName.trim(),
        items: items,
        created_at: new Date()
      });
      setShowNewModal(false);
      setNewName("");
      setNewValuesStr("");
      showToast("Dimension created successfully.", "success");
    } catch (err) {
      console.error("Create dimension error:", err);
      showToast("Failed to create dimension: " + (err.message || err), "error");
    } finally {
      setLoading(false);
    }
  };

  if (!canView) return <div style={{ padding: 40, color: t.textMuted }}>You don't have permission to view this page.</div>;

  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Dimensions</h1>
        <p style={{ fontSize: 13.5, color: t.textMuted }}>Reference data · <strong style={{ color: t.textSecondary }}>{DIMENSIONS.length}</strong> groups · <strong style={{ color: t.textSecondary }}>{DIMENSIONS.reduce((s, g) => s + g.items.length, 0)}</strong> values</p>
      </div>
      {canUpdate && (
        <button
          onClick={() => setShowNewModal(true)}
          className="primary-btn"
          style={{ padding: "10px 20px", borderRadius: 10, background: t.accentGrad, color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: `0 4px 12px ${t.accentShadow}` }}>
          + New Dimension
        </button>
      )}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
      {[...DIMENSIONS].sort((a, b) => a.name.localeCompare(b.name)).map(g => {
        const accent = g.accent(isDark), bg = g.bg(isDark), border = g.border(isDark), isEd = editing === g.name; return (
          <div key={g.name} className="dim-card" style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", backdropFilter: isDark ? "blur(20px)" : "none" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: bg }}>
              <div><div style={{ fontSize: 13.5, fontWeight: 700, color: accent }}>{g.name}</div></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: t.mono, fontSize: 11.5, color: accent, background: isDark ? "rgba(255,255,255,0.08)" : "#fff", padding: "2px 10px", borderRadius: 20, border: `1px solid ${border}`, fontWeight: 500 }}>{g.items.length} values</span>
                {canUpdate && (
                  <button onClick={() => setEditing(isEd ? null : g.name)} style={{ width: 28, height: 28, borderRadius: 7, background: isEd ? accent : t.editBtn[0], color: isEd ? (isDark ? "#050c15" : "#fff") : t.editBtn[1], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, border: "none", cursor: "pointer" }}>
                    {isEd ? <Check size={14} /> : <Pencil size={13} />}
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(g.name)} style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(248,113,113,0.1)", color: "#F87171", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {g.items
                .map((item, idx) => ({ original: item, normalized: normalizeItem(item, idx) }))
                .sort((a, b) => a.normalized.order - b.normalized.order)
                .map(({ original, normalized }) => {
                  const hexColor = normalized.color || "#9CA3AF";
                  const badgeBg = isDark ? `${hexColor}25` : `${hexColor}15`;
                  const badgeBorder = isDark ? `${hexColor}40` : `${hexColor}30`;
                  const isActive = normalized.active !== false;

                  return (
                    <div
                      key={normalized.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 500,
                        padding: "2px 10px",
                        borderRadius: 20,
                        background: badgeBg,
                        color: hexColor,
                        border: `1px solid ${badgeBorder}`,
                        whiteSpace: "nowrap",
                        opacity: isActive ? 1 : 0.55
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span>{normalized.label}</span>
                        {!isActive && <span style={{ fontSize: 9.5, opacity: 0.6, fontStyle: "italic" }}>(inactive)</span>}
                        {normalized.direction && <span style={{ opacity: 0.6, fontSize: 9.5, fontFamily: t.mono, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 4 }}>{normalized.direction}</span>}
                      </div>
                      {isEd && (
                        <>
                          <span
                            onClick={() => setEditingItem({
                              groupName: g.name,
                              originalItem: original,
                              item: normalized
                            })}
                            style={{ fontSize: 11, color: t.textMuted, lineHeight: 1, marginLeft: 2, cursor: "pointer", opacity: 0.7 }}
                            title="Edit details"
                          >
                            ✏️
                          </span>
                          <span onClick={() => handleRemove(g.name, original)} style={{ fontSize: 13, color: isDark ? "#F87171" : "#DC2626", fontWeight: 700, lineHeight: 1, cursor: "pointer" }}>×</span>
                        </>
                      )}
                    </div>
                  );
                })}
              {isEd && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><input value={newVals[g.name] || ""} onChange={e => setNewVals(v => ({ ...v, [g.name]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleAdd(g.name); }} placeholder="Add value..." style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 20, padding: "5px 12px", color: t.searchText, fontSize: 12.5, width: 120 }} /><button onClick={() => handleAdd(g.name)} style={{ width: 28, height: 28, borderRadius: 8, background: t.addItemBg, color: t.addItemColor, border: `1px solid ${t.addItemBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button></div>}
            </div>
          </div>
        );
      })}
    </div>

    <Modal
      open={showNewModal}
      onClose={() => setShowNewModal(false)}
      title="Create New Dimension"
      onSave={handleCreate}
      saveLabel="Create"
      loading={loading}
      t={t}
      isDark={isDark}
    >
      <FF label="Dimension Name" t={t}>
        <FIn value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Asset Class, Priority..." t={t} />
      </FF>
      <FF label="Initial Values" t={t}>
        <textarea
          value={newValuesStr}
          onChange={e => setNewValuesStr(e.target.value)}
          placeholder="Comma-separated values (e.g. High, Medium, Low)"
          style={{
            width: "100%", height: 100, background: t.searchBg, border: `1px solid ${t.searchBorder}`,
            borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "none"
          }}
        />
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Separate items with commas.</div>
      </FF>
    </Modal>

    <Modal
      open={!!editingItem}
      onClose={() => setEditingItem(null)}
      title={`Configure Item - ${editingItem?.groupName}`}
      onSave={handleSaveItemDetails}
      saveLabel="Save Configuration"
      t={t}
      isDark={isDark}
      width={450}
    >
      <FF label="Label (Display Name)" t={t}>
        <FIn 
          value={editingItem?.item?.label || ""} 
          onChange={e => setEditingItem(prev => ({ ...prev, item: { ...prev.item, label: e.target.value } }))} 
          t={t} 
        />
      </FF>
      <FF label="Value (Database Key)" t={t}>
        <FIn 
          value={editingItem?.item?.value || ""} 
          onChange={e => setEditingItem(prev => ({ ...prev, item: { ...prev.item, value: e.target.value } }))} 
          t={t} 
        />
      </FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FF label="Sort Order" t={t}>
          <input
            type="number"
            value={editingItem?.item?.order ?? ""}
            onChange={e => setEditingItem(prev => ({ ...prev, item: { ...prev.item, order: parseInt(e.target.value) || 0 } }))}
            style={{
              width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`,
              borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none"
            }}
          />
        </FF>
        {editingItem?.groupName === "PaymentType" && (
          <FF label="Direction" t={t}>
            <select
              value={editingItem?.item?.direction || "BOTH"}
              onChange={e => setEditingItem(prev => ({ ...prev, item: { ...prev.item, direction: e.target.value } }))}
              style={{
                width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`,
                borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none", cursor: "pointer"
              }}
            >
              <option value="BOTH">BOTH</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </FF>
        )}
      </div>

      <FF label="Status" t={t}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13.5, color: t.searchText }}>
          <input
            type="checkbox"
            checked={editingItem?.item?.active !== false}
            onChange={e => setEditingItem(prev => ({ ...prev, item: { ...prev.item, active: e.target.checked } }))}
            style={{ accentColor: t.accent, width: 16, height: 16, cursor: "pointer" }}
          />
          <span>Active (available for selection)</span>
        </label>
      </FF>

      <FF label="Badge Color" t={t}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { hex: "#10B981", name: "Green" },
              { hex: "#3B82F6", name: "Blue" },
              { hex: "#F59E0B", name: "Amber" },
              { hex: "#F97316", name: "Orange" },
              { hex: "#EF4444", name: "Red" },
              { hex: "#8B5CF6", name: "Purple" },
              { hex: "#EC4899", name: "Pink" },
              { hex: "#9CA3AF", name: "Gray" }
            ].map(preset => {
              const isSelected = editingItem?.item?.color?.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setEditingItem(prev => ({ ...prev, item: { ...prev.item, color: preset.hex } }))}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", background: preset.hex,
                    border: isSelected ? `3px solid ${isDark ? "#fff" : "#1C1917"}` : `1px solid ${t.surfaceBorder}`,
                    cursor: "pointer", boxShadow: isSelected ? "0 0 8px rgba(0,0,0,0.3)" : "none",
                    position: "relative", display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                  title={preset.name}
                >
                  {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: t.textMuted }}>Custom HEX:</span>
            <input
              type="text"
              value={editingItem?.item?.color || ""}
              onChange={e => setEditingItem(prev => ({ ...prev, item: { ...prev.item, color: e.target.value } }))}
              placeholder="#FFFFFF"
              style={{
                width: 100, background: t.searchBg, border: `1px solid ${t.searchBorder}`,
                borderRadius: 6, padding: "6px 10px", color: t.searchText, fontSize: 12.5, fontFamily: t.mono, outline: "none"
              }}
            />
            <div style={{ width: 24, height: 24, borderRadius: 6, background: editingItem?.item?.color || "#9CA3AF", border: `1px solid ${t.surfaceBorder}` }} />
          </div>
        </div>
      </FF>
    </Modal>

    <DelModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onDel={async () => { await doDelete(confirmDelete); setConfirmDelete(null); }} title="Delete Dimension?" t={t}>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.textMuted }}>
        Are you sure you want to delete <strong>{confirmDelete}</strong>? This cannot be undone.
      </p>
    </DelModal>

    {toast && (
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
        <span>{toast.type === "success" ? "✅" : "❌"}</span>
        <span>{toast.msg}</span>
        <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
      </div>
    )}
  </>);
}

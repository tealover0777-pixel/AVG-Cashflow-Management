import { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../AuthContext";

export default function PageDimensions({ t, isDark, DIMENSIONS = [], rawDimensions = [], collectionPath = "" }) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("DIMENTION_UPDATE");
  const [editing, setEditing] = useState(null);
  const [newVals, setNewVals] = useState({});

  const getRawDoc = (name) => rawDimensions.find(d => (d.category || d.name || d.id) === name);
  const getItemsField = (rawDoc) => {
    if (!rawDoc) return "items";
    if (Array.isArray(rawDoc.options)) return "options";
    return "items";
  };

  const handleAdd = async (groupName) => {
    const val = (newVals[groupName] || "").trim();
    if (!val) return;
    const rawDoc = getRawDoc(groupName);
    if (!rawDoc) return;
    const field = getItemsField(rawDoc);
    const current = rawDoc[field] || [];
    if (current.includes(val)) return;
    try {
      await updateDoc(doc(db, collectionPath, rawDoc.doc_id), { [field]: [...current, val] });
      setNewVals(v => ({ ...v, [groupName]: "" }));
    } catch (err) {
      console.error("Add dimension value error:", err);
      alert("Failed to add value: " + (err.message || err));
    }
  };

  const handleRemove = async (groupName, item) => {
    const rawDoc = getRawDoc(groupName);
    if (!rawDoc) return;
    const field = getItemsField(rawDoc);
    const current = rawDoc[field] || [];
    try {
      await updateDoc(doc(db, collectionPath, rawDoc.doc_id), { [field]: current.filter(v => v !== item) });
    } catch (err) {
      console.error("Remove dimension value error:", err);
      alert("Failed to remove value: " + (err.message || err));
    }
  };

  return (<>
    <div style={{ marginBottom: 28 }}><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Dimensions</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Reference data · <strong style={{ color: t.textSecondary }}>{DIMENSIONS.length}</strong> groups · <strong style={{ color: t.textSecondary }}>{DIMENSIONS.reduce((s, g) => s + g.items.length, 0)}</strong> values</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
      {DIMENSIONS.map(g => {
        const accent = g.accent(isDark), bg = g.bg(isDark), border = g.border(isDark), isEd = editing === g.name; return (
          <div key={g.name} className="dim-card" style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", backdropFilter: isDark ? "blur(20px)" : "none" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: bg }}>
              <div><div style={{ fontSize: 13.5, fontWeight: 700, color: accent }}>{g.name}</div></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: t.mono, fontSize: 11, color: accent, background: isDark ? "rgba(255,255,255,0.08)" : "#fff", padding: "2px 8px", borderRadius: 20, border: `1px solid ${border}` }}>{g.items.length} values</span>
                {canUpdate && (
                  <button onClick={() => setEditing(isEd ? null : g.name)} style={{ width: 28, height: 28, borderRadius: 7, background: isEd ? accent : t.editBtn[0], color: isEd ? (isDark ? "#050c15" : "#fff") : t.editBtn[1], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, border: "none", cursor: "pointer" }}>
                    {isEd ? "✓" : "✎"}
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {g.items.map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 500, padding: "5px 12px", borderRadius: 20, background: t.tagBg, color: t.tagColor, border: `1px solid ${t.tagBorder}` }}>
                  {item}
                  {isEd && <span onClick={() => handleRemove(g.name, item)} style={{ fontSize: 13, color: isDark ? "#F87171" : "#DC2626", fontWeight: 700, lineHeight: 1, marginLeft: 2, cursor: "pointer" }}>×</span>}
                </div>
              ))}
              {isEd && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><input value={newVals[g.name] || ""} onChange={e => setNewVals(v => ({ ...v, [g.name]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleAdd(g.name); }} placeholder="Add value..." style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 20, padding: "5px 12px", color: t.searchText, fontSize: 12.5, width: 120 }} /><button onClick={() => handleAdd(g.name)} style={{ width: 28, height: 28, borderRadius: 8, background: t.addItemBg, color: t.addItemColor, border: `1px solid ${t.addItemBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button></div>}
            </div>
          </div>
        );
      })}
    </div>
  </>);
}

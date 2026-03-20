import React, { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { TblHead, TblFilterRow, Tooltip, Modal, FIn, Bdg, ActBtns, DelModal } from "../components";
import { Bot, ThumbsUp, ThumbsDown, Search, Trash2 } from "lucide-react";

// ── Similarity helper ──────────────────────────────────────────────────────────
function tokenize(text) {
  return new Set(String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean));
}
function jaccardSimilarity(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
const DUPLICATE_THRESHOLD = 0.4;

export default function PageAdminHelp({ t, isDark }) {
  const { isGlobalRole, isCompanySuperAdmin } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [kbContent, setKbContent] = useState("");
  const [kbLoading, setKbLoading] = useState(true);

  // Modal State
  const [selectedConv, setSelectedConv] = useState(null);
  const [newRule, setNewRule] = useState("");

  // ── Bulk Delete State ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Column Filters State ─────────────────────────────────────────────────────
  const [colFilters, setColFilters] = useState({});
  const setColFilter = (key, val) => setColFilters(f => ({ ...f, [key]: val }));

  // ── Duplicate banner ─────────────────────────────────────────────────────────
  const [dupBanner, setDupBanner] = useState(null); // {count, type: "found"|"none"}

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "help_conversations"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({
        id: d.id,
        user_email: d.data().user_email || "Unknown",
        question: d.data().question || "",
        answer: d.data().answer || "",
        feedback: d.data().feedback || "none",
        status: d.data().status || "pending",
        date: d.data().created_at ? new Date(d.data().created_at.seconds * 1000).toLocaleString() : "Just now"
      }));
      setConversations(data);

      setKbLoading(true);
      const kbSnap = await getDoc(doc(db, "system", "knowledge_base"));
      if (kbSnap.exists() && kbSnap.data().content) {
        setKbContent(kbSnap.data().content);
      } else {
        setKbContent("You are a helpful assistant for AVG Cashflow Management. Answer questions concisely and professionally. You assist users with Projects, Contacts, Schedules, and Payments.");
      }
      setKbLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load help data. Are you sure you are a super admin with sufficient permissions?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = conversations.filter(c => {
    if (colFilters.date && !c.date.toLowerCase().includes(colFilters.date.toLowerCase())) return false;
    if (colFilters.user_email && !c.user_email.toLowerCase().includes(colFilters.user_email.toLowerCase())) return false;
    if (colFilters.question && !c.question.toLowerCase().includes(colFilters.question.toLowerCase())) return false;
    if (colFilters.feedback && !c.feedback.toLowerCase().includes(colFilters.feedback.toLowerCase())) return false;
    if (colFilters.status && !c.status.toLowerCase().includes(colFilters.status.toLowerCase())) return false;
    return true;
  });

  // ── Select-all for visible rows ──────────────────────────────────────────────
  const allFilteredIds = filtered.map(c => c.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
  const someSelected = allFilteredIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) { allFilteredIds.forEach(id => next.delete(id)); }
      else { allFilteredIds.forEach(id => next.add(id)); }
      return next;
    });
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Bulk Delete ──────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected conversation(s)? This cannot be undone.`)) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => deleteDoc(doc(db, "help_conversations", id))));
      setConversations(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } catch (err) {
      alert("Failed to delete some records.");
      console.error(err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ── Single Delete ────────────────────────────────────────────────────────────
  const handleDeleteConv = (conv, e) => {
    e?.stopPropagation();
    setDeleteTarget({ id: conv.id, name: conv.question || "this conversation" });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, "help_conversations", deleteTarget.id));
      setConversations(prev => prev.filter(c => c.id !== deleteTarget.id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
      if (selectedConv?.id === deleteTarget.id) { setSelectedConv(null); setNewRule(""); }
      setDeleteTarget(null);
    } catch (err) {
      alert("Failed to delete.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Find Duplicates ──────────────────────────────────────────────────────────
  const handleFindDuplicates = () => {
    setDupBanner(null);
    const resolved = conversations.filter(c => c.status === "resolved");
    if (resolved.length === 0) {
      setDupBanner({ count: 0, type: "none" });
      return;
    }
    const resolvedTokens = resolved.map(c => tokenize(c.question));
    const dupIds = new Set();

    conversations.forEach(c => {
      if (c.status === "resolved") return; // skip already-resolved
      const tokens = tokenize(c.question);
      const isDup = resolvedTokens.some(rt => jaccardSimilarity(tokens, rt) >= DUPLICATE_THRESHOLD);
      if (isDup) dupIds.add(c.id);
    });

    if (dupIds.size === 0) {
      setDupBanner({ count: 0, type: "none" });
    } else {
      setSelectedIds(dupIds);
      setDupBanner({ count: dupIds.size, type: "found" });
    }
  };

  // ── Knowledge Base ───────────────────────────────────────────────────────────
  const handleSaveKnowledgeBase = async () => {
    try {
      setKbLoading(true);
      await setDoc(doc(db, "system", "knowledge_base"), { content: kbContent }, { merge: true });
      alert("Knowledge base updated successfully! AI will use this on next load.");
    } catch (err) {
      alert("Failed to update knowledge base.");
      console.error(err);
    } finally {
      setKbLoading(false);
    }
  };

  const handleResolveIssue = async () => {
    if (!selectedConv || !newRule.trim()) return;
    try {
      setLoading(true);
      const updatedKb = `${kbContent}\n\nQ: ${selectedConv.question}\nA: ${newRule}`;
      await setDoc(doc(db, "system", "knowledge_base"), { content: updatedKb }, { merge: true });
      setKbContent(updatedKb);
      await updateDoc(doc(db, "help_conversations", selectedConv.id), { status: "resolved" });
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, status: "resolved" } : c));
      setSelectedConv(null);
      setNewRule("");
    } catch (err) {
      alert("Failed to update system.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!selectedConv) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, "help_conversations", selectedConv.id), { status: "resolved" });
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, status: "resolved" } : c));
      setSelectedConv(null);
      setNewRule("");
    } catch (err) {
      alert("Failed to mark as resolved.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isGlobalRole && !isCompanySuperAdmin) {
    return <div style={{ padding: 40, textAlign: "center", color: t.text }}>Access Denied. You must be an Admin to view this page.</div>;
  }

  // ── Columns (with checkbox col first) ────────────────────────────────────────
  const cols = [
    { k: null,        l: "",          w: "40px"  },  // checkbox
    { k: "date",      l: "Date",      w: "130px" },
    { k: "user_email",l: "User",      w: "170px" },
    { k: "question",  l: "Question",  w: "1fr"   },
    { k: "feedback",  l: "Feedback",  w: "90px"  },
    { k: "status",    l: "Status",    w: "90px"  },
    { k: null,        l: "Actions",   w: "80px"  },   // actions btn
  ];
  const gridTemplate = cols.map(c => c.w).join(" ");

  const hasFilters = Object.values(colFilters).some(v => v !== "");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24 }}>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: t.titleFont, color: t.text, marginBottom: 4, letterSpacing: "-0.5px" }}>AI Assistant Admin</h1>
          <p style={{ color: t.textMuted, fontSize: 13.5 }}>Monitor queries, analyze feedback, and continuously train the AI knowledge base.</p>
        </div>
        <button className="primary-btn" onClick={loadData} style={{ background: t.chipBg, color: t.text, border: `1px solid ${t.chipBorder}`, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Refresh Data</button>
      </div>

      {error ? (
        <div style={{ padding: 20, background: isDark ? "rgba(248,113,113,0.1)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", borderRadius: 12 }}>{error}</div>
      ) : (
        <div style={{ display: "flex", gap: 24, flex: 1, minHeight: 0 }}>

          {/* ── Left Column: Q&A Log ─────────────────────────────────────────── */}
          <div style={{ flex: 2, display: "flex", flexDirection: "column", background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, boxShadow: t.tableShadow, overflow: "hidden" }}>

            {/* Panel header */}
            <div style={{ padding: "14px 22px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: t.text, display: "flex", alignItems: "center", gap: 8 }}>
                <Bot size={18} /> User Queries
                <span style={{ fontSize: 12, fontWeight: 400, color: t.textMuted, marginLeft: 4 }}>({filtered.length})</span>
              </h2>
              {/* Find Duplicates button */}
              <Tooltip text="Auto-select pending queries similar to resolved ones" t={t}>
                <button
                  onClick={handleFindDuplicates}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${isDark ? "rgba(167,139,250,0.35)" : "#DDD6FE"}`, background: isDark ? "rgba(167,139,250,0.1)" : "#F5F3FF", color: isDark ? "#A78BFA" : "#7C3AED", fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease" }}
                >
                  <Search size={13} /> Find Duplicates
                </button>
              </Tooltip>
            </div>

            {/* Duplicate banner */}
            {dupBanner && (
              <div style={{ padding: "8px 22px", background: dupBanner.type === "found" ? (isDark ? "rgba(167,139,250,0.1)" : "#F5F3FF") : (isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9"), borderBottom: `1px solid ${t.rowDivider}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <span style={{ fontSize: 12.5, color: dupBanner.type === "found" ? (isDark ? "#A78BFA" : "#7C3AED") : t.textMuted, fontWeight: 600 }}>
                  {dupBanner.type === "found"
                    ? `🔍 Found ${dupBanner.count} potential duplicate${dupBanner.count !== 1 ? "s" : ""} — they have been selected`
                    : "✓ No duplicates found among pending queries"}
                </span>
                <button onClick={() => setDupBanner(null)} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}

            {/* Bulk selection toolbar */}
            {selectedIds.size > 0 && (
              <div style={{ padding: "8px 22px", background: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2", borderBottom: `1px solid ${isDark ? "rgba(248,113,113,0.2)" : "#FECACA"}`, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: isDark ? "#F87171" : "#DC2626" }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, border: `1px solid ${isDark ? "rgba(248,113,113,0.4)" : "#FECACA"}`, background: isDark ? "rgba(248,113,113,0.15)" : "#FEE2E2", color: isDark ? "#F87171" : "#DC2626", fontSize: 12, fontWeight: 600, cursor: isBulkDeleting ? "not-allowed" : "pointer" }}
                >
                  <Trash2 size={12} /> {isBulkDeleting ? "Deleting..." : "Delete Selected"}
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{ background: "transparent", border: "none", color: t.textMuted, fontSize: 12, cursor: "pointer", padding: "5px 0" }}
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* Table */}
            <div style={{ flex: 1, overflow: "auto" }}>
              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "10px 22px", background: t.tableHeader, borderBottom: `1px solid ${t.surfaceBorder}`, alignItems: "center", position: "sticky", top: 0, zIndex: 2 }}>
                {/* Checkbox all */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleSelectAll}
                    style={{ accentColor: t.accent, cursor: "pointer", width: 14, height: 14 }}
                  />
                </div>
                {cols.slice(1).map((c, i) => (
                  <div key={c.l || i} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "1px", color: isDark ? "#FFFFFF" : "#1C1917", textTransform: "uppercase", fontFamily: t.mono }}>
                    {c.l}
                  </div>
                ))}
              </div>

              {/* Filter row */}
              <TblFilterRow
                cols={cols}
                colFilters={colFilters}
                onFilterChange={setColFilter}
                onClear={() => setColFilters({})}
                gridTemplate={gridTemplate}
                t={t}
                isDark={isDark}
              />

              {/* Data rows */}
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Loading conversations...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
                  {hasFilters ? "No results match your filters." : "No conversations recorded yet."}
                </div>
              ) : (
                filtered.map(c => {
                  const isSelected = selectedIds.has(c.id);
                  const isHighlighted = c.status === "pending" && c.feedback === "down";
                  return (
                    <div
                      key={c.id}
                      className="data-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: gridTemplate,
                        padding: "12px 22px",
                        borderBottom: `1px solid ${t.rowDivider}`,
                        alignItems: "center",
                        background: isSelected
                          ? (isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF")
                          : isHighlighted
                            ? (isDark ? "rgba(239, 68, 68, 0.05)" : "#FEF2F2")
                            : "transparent",
                        transition: "background 0.1s ease",
                        outline: isSelected ? `1px solid ${isDark ? "rgba(167,139,250,0.3)" : "#DDD6FE"}` : "none",
                        outlineOffset: -1,
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { e.stopPropagation(); toggleSelectOne(c.id); }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ accentColor: isDark ? "#A78BFA" : "#7C3AED", cursor: "pointer", width: 14, height: 14 }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: t.textMuted }}>{c.date.split(',')[0]}</div>
                      <div style={{ fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.user_email}</div>
                      <div style={{ fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>&quot;{c.question}&quot;</div>
                      <div>
                        {c.feedback === "up" ? <div style={{ color: "#10B981" }}><ThumbsUp size={16} /></div> : c.feedback === "down" ? <div style={{ color: "#EF4444" }}><ThumbsDown size={16} /></div> : <span style={{ color: t.textMuted, fontSize: 12 }}>None</span>}
                      </div>
                      <div>
                        {c.status === "resolved" ? <Bdg status="Resolved" isDark={isDark} /> : <Bdg status="Pending" isDark={isDark} />}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", height: "100%" }}>
                        <ActBtns
                          show={true}
                          t={t}
                          onEdit={(e) => { e.stopPropagation(); setSelectedConv(c); }}
                          onDel={(e) => handleDeleteConv(c, e)}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right Column: Knowledge Base Editor ──────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, boxShadow: t.tableShadow, overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: isDark ? "rgba(59, 130, 246, 0.05)" : "#F0F9FF" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: isDark ? "#60A5FA" : "#2563EB", display: "flex", alignItems: "center", gap: 8 }}>System Prompt / Knowledge Base</h2>
            </div>
            <div style={{ padding: 22, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>This is the hidden context sent to Gemini before every user question. Add rules, facts, and structure here.</p>
              <textarea
                value={kbContent}
                onChange={(e) => setKbContent(e.target.value)}
                disabled={kbLoading}
                style={{ flex: 1, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, background: isDark ? "rgba(0,0,0,0.2)" : "#FAFAF9", padding: 16, color: t.text, fontFamily: t.mono, fontSize: 13, resize: "none", outline: "none", opacity: kbLoading ? 0.5 : 1 }}
              />
              <button
                onClick={handleSaveKnowledgeBase}
                disabled={kbLoading}
                className="primary-btn"
                style={{ width: "100%", padding: 14, background: t.accentGrad, color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14 }}
              >
                {kbLoading ? "Saving..." : "Save Knowledge Base"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Dialog ────────────────────────────────────────────────────── */}
      <Modal open={!!selectedConv} onClose={() => { setSelectedConv(null); setNewRule(""); }} title="Review User Question" t={t} isDark={isDark} width={700}>
        {selectedConv && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", marginBottom: 6 }}>User Asked</div>
              <div style={{ padding: 16, background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, color: t.text, fontSize: 15, fontWeight: 500 }}>&quot;{selectedConv.question}&quot;</div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", marginBottom: 6 }}>AI Responded</div>
              <div style={{ padding: 16, background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, color: t.text, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {selectedConv.answer}
              </div>
            </div>

            <div style={{ background: t.sidebar, padding: 20, borderRadius: 12, border: `1px dashed ${t.surfaceBorder}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 8 }}>Is this response incorrect or missing info?</div>
              <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>Write the correct answer below. It will be saved to the Knowledge Base as:<br /><code style={{ fontSize: 12, fontFamily: t.mono, opacity: 0.8 }}>Q: {selectedConv?.question}</code><br /><code style={{ fontSize: 12, fontFamily: t.mono, opacity: 0.8 }}>A: [your answer]</code></p>
              <textarea
                placeholder="e.g., 'The contract amount is $200,000 with a 7.75% quarterly interest rate, starting 2025-02-10...'"
                value={newRule}
                onChange={e => setNewRule(e.target.value)}
                style={{ width: "100%", height: 100, padding: 12, borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(0,0,0,0.2)" : "#fff", color: t.text, fontSize: 14, resize: "none", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button onClick={handleMarkResolved} disabled={loading} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.chipBg, color: t.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  ✓ Mark as Resolved (no rule)
                </button>
                <button onClick={handleResolveIssue} disabled={loading || !newRule.trim()} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: newRule.trim() ? t.accentGrad : (isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb"), color: newRule.trim() ? "#fff" : t.textMuted, fontSize: 13, fontWeight: 600, cursor: newRule.trim() ? "pointer" : "not-allowed" }}>
                  ➕ Add Rule &amp; Resolve
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <DelModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        label="This conversation record"
        t={t}
        isDark={isDark}
      />
    </div>
  );
}

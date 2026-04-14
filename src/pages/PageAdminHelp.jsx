import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { Tooltip, Modal, Bdg, DelModal } from "../components";
import TanStackTable from "../components/TanStackTable";
import { getAdminHelpColumns } from "../components/AdminHelpTanStackConfig";
import { Bot, Search, Trash2 } from "lucide-react";
import {
  loadConversations,
  readKnowledgeBase,
  writeKnowledgeBase,
  updateConversation,
  deleteConversation,
} from "../utils/helpStorage";

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
  const [editedQuestion, setEditedQuestion] = useState("");
  const [editedAnswer, setEditedAnswer] = useState("");
  const [newRule, setNewRule] = useState("");

  useEffect(() => {
    if (selectedConv) {
      setEditedQuestion(selectedConv.question || "");
      setEditedAnswer(selectedConv.answer || "");
    }
  }, [selectedConv]);

  // External Selection State for TanStack
  const [rowSelection, setRowSelection] = useState({});
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);

  // ── Duplicate banner ─────────────────────────────────────────────────────────
  const [dupBanner, setDupBanner] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const convs = await loadConversations();
      setConversations(convs.map(c => ({
        ...c,
        docId: c.id,
        feedback: c.feedback || "none",
        status: c.status || "pending",
        date: c.created_at ? new Date(c.created_at).toLocaleString() : "Just now",
      })));

      setKbLoading(true);
      const kb = await readKnowledgeBase();
      setKbContent(kb || "You are a helpful assistant for AVG Cashflow Management. Answer questions concisely and professionally. You assist users with Projects, Contacts, Schedules, and Payments.");
      setKbLoading(false);
    } catch (err) {
      console.error("PageAdminHelp loadData error:", err);
      setError(`Failed to load help data: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── KB Sync Helper ──────────────────────────────────────────────────────────
  const syncKbEntry = async (oldQ, newQ, newRuleText, isDelete = false) => {
    if (!oldQ) return;
    try {
      const currentKb = await readKnowledgeBase();
      const escapedQ = oldQ.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Look for Q: [oldQ] followed by A: line
      const regex = new RegExp(`\\n\\nQ:\\s*${escapedQ}[\\s\\S]*?(?=\\n\\nQ:|$)`, 'g');
      
      let updatedKb = currentKb || "";
      if (isDelete) {
        updatedKb = updatedKb.replace(regex, "").trim();
      } else {
        const newBlock = `\n\nQ: ${newQ.trim()}\nA: ${newRuleText.trim()}`;
        if (regex.test(updatedKb)) {
          updatedKb = updatedKb.replace(regex, newBlock);
        } else {
          // If not found and it's an update, we just append to be safe or do nothing
          updatedKb = updatedKb.trim() + newBlock;
        }
      }
      
      await writeKnowledgeBase(updatedKb);
      setKbContent(updatedKb);
    } catch (err) {
      console.error("Failed to sync Knowledge Base:", err);
      showToast("Database updated, but Knowledge Base sync failed.", "warning");
    }
  };

  // ── Bulk Delete ──────────────────────────────────────────────────────────────
  const handleBulkDelete = () => {
    if (selectedCount === 0) return;
    setConfirmBulkDel(true);
  };

  const doBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const idsToDelete = Object.keys(rowSelection).filter(k => rowSelection[k]);
      // For each resolved one, try to remove from KB
      for (const id of idsToDelete) {
        const conv = conversations.find(c => c.id === id);
        if (conv?.status === "resolved") {
          await syncKbEntry(conv.question, null, null, true);
        }
      }
      await Promise.all(idsToDelete.map(id => deleteConversation(id)));
      setConversations(prev => prev.filter(c => !rowSelection[c.id]));
      setRowSelection({});
      showToast(`${idsToDelete.length} record(s) deleted and removed from Knowledge Base.`, "success");
    } catch (err) {
      showToast("Failed to delete some records.", "error");
      console.error(err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ── Single Delete ────────────────────────────────────────────────────────────
  const handleDeleteConv = (conv) => {
    setDeleteTarget(conv);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      // Remove from KB if resolved
      if (deleteTarget.status === "resolved") {
        await syncKbEntry(deleteTarget.question, null, null, true);
      }
      await deleteConversation(deleteTarget.id);
      setConversations(prev => prev.filter(c => c.id !== deleteTarget.id));
      setRowSelection(prev => { const next = { ...prev }; delete next[deleteTarget.id]; return next; });
      if (selectedConv?.id === deleteTarget.id) { setSelectedConv(null); setNewRule(""); setEditedQuestion(""); setEditedAnswer(""); }
      setDeleteTarget(null);
      showToast("Record deleted and removed from Knowledge Base.", "success");
    } catch (err) {
      showToast("Failed to delete.", "error");
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
    const nextSelection = {};

    conversations.forEach(c => {
      if (c.status === "resolved") return;
      const tokens = tokenize(c.question);
      const isDup = resolvedTokens.some(rt => jaccardSimilarity(tokens, rt) >= DUPLICATE_THRESHOLD);
      if (isDup) nextSelection[c.id] = true;
    });

    const dupCount = Object.keys(nextSelection).length;
    if (dupCount === 0) {
      setDupBanner({ count: 0, type: "none" });
    } else {
      setRowSelection(nextSelection);
      setDupBanner({ count: dupCount, type: "found" });
    }
  };

  // ── Knowledge Base ───────────────────────────────────────────────────────────
  const handleSaveKnowledgeBase = async () => {
    try {
      setKbLoading(true);
      await writeKnowledgeBase(kbContent);
      showToast("Knowledge base updated successfully!", "success");
    } catch (err) {
      showToast("Failed to update knowledge base.", "error");
      console.error(err);
    } finally {
      setKbLoading(false);
    }
  };

  const handleResolveIssue = async () => {
    if (!selectedConv || !newRule.trim()) return;
    try {
      setLoading(true);
      const qText = (editedQuestion || "").trim();
      const aText = (editedAnswer || "").trim();
      
      // Update Database
      const updateData = { status: "resolved", answer: newRule.trim() };
      if (qText !== selectedConv.question) updateData.question = qText;
      await updateConversation(selectedConv.id, updateData);
      
      // Update Knowledge Base
      const updatedKb = `${kbContent.trim()}\n\nQ: ${qText}\nA: ${newRule.trim()}`;
      await writeKnowledgeBase(updatedKb);
      setKbContent(updatedKb);
      
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, ...updateData } : c));
      setSelectedConv(null);
      setNewRule("");
      setEditedQuestion("");
      setEditedAnswer("");
      showToast("Issue resolved and added to Knowledge Base.", "success");
    } catch (err) {
      showToast("Failed to update system.", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!selectedConv) return;
    try {
      setLoading(true);
      const qText = (editedQuestion || "").trim();
      const aText = (editedAnswer || "").trim();
      const updateData = { status: "resolved" };
      if (qText !== selectedConv.question) updateData.question = qText;
      if (aText !== selectedConv.answer) updateData.answer = aText;
      
      await updateConversation(selectedConv.id, updateData);
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, ...updateData } : c));
      setSelectedConv(null);
      setNewRule("");
      setEditedQuestion("");
      setEditedAnswer("");
      showToast("Marked as resolved (No KB entry added).", "success");
    } catch (err) {
      showToast("Failed to mark as resolved.", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecord = async () => {
    if (!selectedConv) return;
    try {
      setLoading(true);
      const qText = (editedQuestion || "").trim();
      const aText = (editedAnswer || "").trim();
      
      // Sync Knowledge Base first if it was already resolved
      if (selectedConv.status === "resolved") {
        await syncKbEntry(selectedConv.question, qText, aText);
      }
      
      const updateData = {};
      if (qText !== selectedConv.question) updateData.question = qText;
      if (aText !== selectedConv.answer) updateData.answer = aText;
      
      if (Object.keys(updateData).length > 0) {
        await updateConversation(selectedConv.id, updateData);
        setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, ...updateData } : c));
      }
      
      setSelectedConv(null);
      setNewRule("");
      setEditedQuestion("");
      setEditedAnswer("");
      showToast("Record updated and Knowledge Base synced.", "success");
    } catch (err) {
      showToast("Failed to update record.", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columnDefs = useMemo(() => {
    return getAdminHelpColumns({}, isDark, t, setSelectedConv, handleDeleteConv);
  }, [isDark, t]);

  const selectedCount = Object.keys(rowSelection).filter(k => rowSelection[k]).length;

  if (!isGlobalRole && !isCompanySuperAdmin) {
    return <div style={{ padding: 40, textAlign: "center", color: t.text }}>Access Denied. You must be an Admin to view this page.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24 }}>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: t.titleFont, color: t.text, marginBottom: 4, letterSpacing: "-0.5px" }}>AI Admin</h1>
          <p style={{ color: t.textMuted, fontSize: 13.5 }}>Monitor AI queries and continuously train the knowledge base.</p>
        </div>
        <button className="primary-btn" onClick={loadData} style={{ background: t.chipBg, color: t.text, border: `1px solid ${t.chipBorder}`, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Refresh</button>
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
                <Bot size={18} /> Chat Log
              </h2>
              <Tooltip text="Compute Jaccard similarity to suggest duplicates" t={t}>
                <button
                  onClick={handleFindDuplicates}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${isDark ? "rgba(167,139,250,0.35)" : "#DDD6FE"}`, background: isDark ? "rgba(167,139,250,0.1)" : "#F5F3FF", color: isDark ? "#A78BFA" : "#7C3AED", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
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
                    ? `🔍 Found ${dupBanner.count} potential duplicate${dupBanner.count !== 1 ? "s" : ""}`
                    : "✓ No duplicates found"}
                </span>
                <button onClick={() => setDupBanner(null)} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            )}

            {/* Bulk selection toolbar */}
            {selectedCount > 0 && (
              <div style={{ padding: "8px 22px", background: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2", borderBottom: `1px solid ${isDark ? "rgba(248,113,113,0.2)" : "#FECACA"}`, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: isDark ? "#F87171" : "#DC2626" }}>
                  {selectedCount} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, border: `1px solid ${isDark ? "rgba(248,113,113,0.4)" : "#FECACA"}`, background: isDark ? "rgba(248,113,113,0.15)" : "#FEE2E2", color: isDark ? "#F87171" : "#DC2626", fontSize: 12, fontWeight: 600 }}
                >
                  <Trash2 size={12} /> {isBulkDeleting ? "Deleting..." : "Delete Selected"}
                </button>
                <button
                  onClick={() => setRowSelection({})}
                  style={{ background: "transparent", border: "none", color: t.textMuted, fontSize: 12, cursor: "pointer" }}
                >
                  Clear selection
                </button>
              </div>
            )}

            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
              {loading && conversations.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: t.textMuted }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  <span style={{ fontSize: 13 }}>Loading conversations...</span>
                </div>
              ) : (
                <TanStackTable
                  data={conversations}
                  columns={columnDefs}
                  pageSize={20}
                  t={t}
                  isDark={isDark}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                />
              )}
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>

          {/* ── Right Column: Knowledge Base Editor ──────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, boxShadow: t.tableShadow, overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(59, 130, 246, 0.05)" : "#F0F9FF" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: isDark ? "#60A5FA" : "#2563EB" }}>Knowledge Base</h2>
            </div>
            <div style={{ padding: 22, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>AI context & behavior rules</p>
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
      <Modal open={!!selectedConv} onClose={() => { setSelectedConv(null); setNewRule(""); setEditedQuestion(""); setEditedAnswer(""); }} title="Review Interaction" t={t} isDark={isDark} width={700}>
        {selectedConv && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", marginBottom: 6 }}>User Asked</div>
              <textarea
                value={editedQuestion}
                onChange={e => setEditedQuestion(e.target.value)}
                style={{ width: "100%", padding: 16, background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, color: t.text, fontSize: 15, fontWeight: 500, resize: "vertical", outline: "none", height: 240, lineHeight: 1.5 }}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", marginBottom: 6 }}>AI Responded</div>
              <textarea
                value={editedAnswer}
                onChange={e => setEditedAnswer(e.target.value)}
                style={{ width: "100%", padding: 16, background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, color: t.text, fontSize: 14, lineHeight: 1.6, resize: "vertical", height: 360, outline: "none" }}
              />
            </div>

            {selectedConv.status === "resolved" ? (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={handleUpdateRecord} disabled={loading} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: t.accentGrad, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {loading ? "Updating..." : "Update Record"}
                </button>
              </div>
            ) : (
              <div style={{ background: t.sidebar, padding: 20, borderRadius: 12, border: `1px dashed ${t.surfaceBorder}` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 8 }}>Knowledge Base Update</div>
                <textarea
                  placeholder="Write the correct answer here..."
                  value={newRule}
                  onChange={e => setNewRule(e.target.value)}
                  style={{ width: "100%", height: 300, padding: 16, borderRadius: 10, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(0,0,0,0.2)" : "#fff", color: t.text, fontSize: 14, resize: "vertical", outline: "none", lineHeight: 1.6 }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button onClick={handleMarkResolved} disabled={loading} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.chipBg, color: t.text, fontSize: 13, fontWeight: 600 }}>Mark as Resolved</button>
                  <button onClick={handleResolveIssue} disabled={loading || !newRule.trim()} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: newRule.trim() ? t.accentGrad : (isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb"), color: newRule.trim() ? "#fff" : t.textMuted, fontSize: 13, fontWeight: 600 }}>Add Rule &amp; Resolve</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <DelModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDel={handleConfirmDelete} title="Delete Interaction?" t={t}>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.textMuted }}>Are you sure you want to remove this record?</p>
      </DelModal>

      <DelModal open={confirmBulkDel} onClose={() => setConfirmBulkDel(false)} onDel={async () => { setConfirmBulkDel(false); await doBulkDelete(); }} title={`Delete ${selectedCount} Conversation(s)?`} t={t}>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t.textMuted }}>This will permanently delete {selectedCount} selected conversation(s). This cannot be undone.</p>
      </DelModal>

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

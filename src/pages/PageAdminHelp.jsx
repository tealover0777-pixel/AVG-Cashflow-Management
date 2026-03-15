import React, { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { TblHead, TblFilterRow, Tooltip, Modal, FIn, Bdg } from "../components";
import { Bot, ThumbsUp, ThumbsDown, Clock, CheckCircle } from "lucide-react";

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

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Conversations
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

      // 2. Fetch Knowledge Base
      setKbLoading(true);
      const kbSnap = await getDoc(doc(db, "system", "knowledge_base"));
      if (kbSnap.exists() && kbSnap.data().content) {
        setKbContent(kbSnap.data().content);
      } else {
        setKbContent("You are a helpful assistant for AVG Cashflow Management. Answer questions concisely and professionally. You assist users with Projects, Parties, Schedules, and Payments.");
      }
      setKbLoading(false);

    } catch (err) {
      console.error(err);
      setError("Failed to load help data. Are you sure you are a super admin with sufficient permissions?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      
      // 1. Append rule to knowledge base
      const updatedKb = `${kbContent}\n\n=== Rule Added for issue: '${selectedConv.question}' ===\n${newRule}`;
      await setDoc(doc(db, "system", "knowledge_base"), { content: updatedKb }, { merge: true });
      setKbContent(updatedKb);
      
      // 2. Mark conversation as resolved
      await updateDoc(doc(db, "help_conversations", selectedConv.id), { status: "resolved" });

      // 3. Update local state
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

  const cols = [
    { k: "date", l: "Date", w: "150px" },
    { k: "user", l: "User", w: "200px" },
    { k: "question", l: "Question", w: "1fr" },
    { k: "feedback", l: "Feedback", w: "100px" },
    { k: "status", l: "Status", w: "100px" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24 }}>
      
      {/* Header */}
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
          
          {/* Left Column: Q&A Log */}
          <div style={{ flex: 2, display: "flex", flexDirection: "column", background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, boxShadow: t.tableShadow, overflow: "hidden" }}>
             <div style={{ padding: "16px 22px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <h2 style={{ fontSize: 16, fontWeight: 600, color: t.text, display: "flex", alignItems: "center", gap: 8 }}><Bot size={18} /> User Queries</h2>
             </div>
             
             <div style={{ flex: 1, overflow: "auto" }}>
               <TblHead cols={cols} t={t} isDark={isDark} />
               {loading ? (
                 <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Loading conversations...</div>
               ) : conversations.length === 0 ? (
                 <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>No conversations recorded yet.</div>
               ) : (
                 conversations.map(c => (
                   <div key={c.id} className="data-row" onClick={() => setSelectedConv(c)} style={{ display: "grid", gridTemplateColumns: cols.map(c => c.w).join(" "), padding: "14px 22px", borderBottom: `1px solid ${t.rowDivider}`, alignItems: "center", background: c.status === "pending" && c.feedback === "down" ? (isDark ? "rgba(239, 68, 68, 0.05)" : "#FEF2F2") : "transparent" }}>
                     <div style={{ fontSize: 12, color: t.textMuted }}>{c.date.split(',')[0]}</div>
                     <div style={{ fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.user_email}</div>
                     <div style={{ fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>&quot;{c.question}&quot;</div>
                     <div>
                       {c.feedback === "up" ? <div style={{ color: "#10B981" }}><ThumbsUp size={16} /></div> : c.feedback === "down" ? <div style={{ color: "#EF4444" }}><ThumbsDown size={16} /></div> : <span style={{ color: t.textMuted, fontSize: 12 }}>None</span>}
                     </div>
                     <div>
                       {c.status === "resolved" ? <Bdg status="Resolved" isDark={isDark} /> : <Bdg status="Pending" isDark={isDark} />}
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>

          {/* Right Column: Knowledge Base Editor */}
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

      {/* Review Dialog */}
      <Modal open={!!selectedConv} onClose={() => { setSelectedConv(null); setNewRule(""); }} title="Review User Question" saveLabel="Add to Rules & Resolve" onSave={handleResolveIssue} t={t} isDark={isDark} width={700}>
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
              <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>Write the exact rule or fact the AI should have known. This will be automatically added to the Knowledge Base, so the AI never gets it wrong again.</p>
              <textarea 
                placeholder="e.g., 'To create a project, users must go to the Projects Tab and click the + symbol in the top left...'"
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

    </div>
  );
}

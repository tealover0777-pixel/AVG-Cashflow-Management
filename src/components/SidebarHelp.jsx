import React, { useState, useEffect, useRef } from "react";
import { getGenerativeModel } from "@firebase/vertexai";
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { vertexAI, db } from "../firebase";
import { Send, X, ThumbsUp, ThumbsDown, Bot, Loader2 } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function SidebarHelp({ open, onClose, t, isDark }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ role: "model", text: "Hello! I'm your AVG Cashflow assistant. How can I help you today?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelOptions, setModelOptions] = useState(null);
  const scrollRef = useRef(null);

  // Fetch knowledge base text and initialize model options
  useEffect(() => {
    async function fetchKB() {
      if (!open || !user?.uid) return;

      try {
        console.log("Refreshing Knowledge Base for User:", user.email);
        const docSnap = await getDoc(doc(db, "system", "knowledge_base"));
        let kbText = "You are a helpful assistant for AVG Cashflow Management. Answer questions concisely and professionally. You assist users with Projects, Parties, Schedules, and Payments. If you don't know an answer, tell the user to contact the admin at admin@avg-cashflow.com.";
        if (docSnap.exists() && docSnap.data().content) {
          kbText = docSnap.data().content;
        }
        setModelOptions({
          model: "gemini-2.5-flash",
          systemInstruction: kbText,
        });
        console.log("Model Initialized with latest KB.");
      } catch (err) {
        console.error("Failed to load KB from Firestore:", err);
        // Fallback options
        setModelOptions({
          model: "gemini-2.5-flash",
          systemInstruction: "You are a helpful assistant for AVG Cashflow Management. You provide information about Projects, Parties, and Schedules. If you don't know the answer, politely suggest contacting the admin.",
        });
      }
    }
    fetchKB();
  }, [open, user?.uid]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || !modelOptions || loading) return;

    const userText = input.trim();
    setInput("");

    // Add user message to UI
    const tempMessageId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempMessageId, role: "user", text: userText }]);
    setLoading(true);

    try {
      // Send to Gemini with conversation history (excluding the first greeting, though it's fine)
      const model = getGenerativeModel(vertexAI, modelOptions);
      const chatHistory = messages.filter(m => m.id).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(userText);
      const aiResponseText = result.response.text();

      // Save Q&A to Firestore exactly as planned
      const savedDoc = await addDoc(collection(db, "help_conversations"), {
        user_id: user?.uid || "unknown",
        user_email: user?.email || "unknown",
        question: userText,
        answer: aiResponseText,
        created_at: serverTimestamp(),
        feedback: null // Will be updated to 'up' or 'down' based on user interaction
      });

      // Add AI response to UI, using the Firestore doc string ID so we can update feedback later
      setMessages(prev => [
        ...prev,
        { id: savedDoc.id, role: "model", text: aiResponseText, docId: savedDoc.id }
      ]);

    } catch (err) {
      console.error("Error from AI/Firestore:", err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "model", text: `I'm sorry, I encountered an error: ${err.message || String(err)}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (docId, type) => {
    try {
      await updateDoc(doc(db, "help_conversations", docId), { feedback: type });
      // Update local state to visually indicate the feedback has been logged
      setMessages(prev => prev.map(m => m.docId === docId ? { ...m, feedback: type } : m));
    } catch (err) {
      console.error("Failed to save feedback", err);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", top: 0, bottom: 0, right: 0, width: 380,
      background: isDark ? "#1C1917" : "#FFFFFF",
      borderLeft: `1px solid ${t.surfaceBorder}`,
      boxShadow: "-6px 0 24px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column",
      zIndex: 10001,
      animation: "slideInFromRight 0.2s ease",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.topbar }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: t.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: `0 4px 10px ${t.accentShadow}` }}>
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>AI Assistant</div>
            <div style={{ fontSize: 12, color: t.textMuted }}>Powered by Gemini 2.5</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 8, transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
          <X size={20} />
        </button>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", gap: 6 }}>
                <div style={{
                  maxWidth: "88%",
                  padding: "14px 18px",
                  borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isUser ? t.accentGrad : (isDark ? "rgba(255,255,255,0.04)" : "#F5F5F4"),
                  color: isUser ? "#fff" : t.text,
                  fontSize: 14.5,
                  lineHeight: 1.55,
                  boxShadow: isUser ? `0 4px 14px ${t.accentShadow}` : "none",
                  border: isUser ? "none" : `1px solid ${t.surfaceBorder}`,
                  wordBreak: "break-word"
                }}>
                  {msg.text.split('\\n').map((line, j) => <React.Fragment key={j}>{line}<br /></React.Fragment>)}
                </div>
                {!isUser && msg.docId && (
                  <div style={{ display: "flex", gap: 12, paddingLeft: 8, marginTop: 2 }}>
                    <button
                      onClick={() => handleFeedback(msg.docId, "up")}
                      disabled={!!msg.feedback}
                      style={{ background: "none", border: "none", cursor: !!msg.feedback ? "default" : "pointer", color: msg.feedback === "up" ? "#10B981" : (isDark ? "rgba(255,255,255,0.3)" : "#A8A29E"), display: "flex", alignItems: "center", gap: 4, fontSize: 11, transition: "color 0.2s" }}
                    >
                      <ThumbsUp size={14} fill={msg.feedback === "up" ? "#10B981" : "none"} /> {msg.feedback === "up" ? "Helpful" : ""}
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.docId, "down")}
                      disabled={!!msg.feedback}
                      style={{ background: "none", border: "none", cursor: !!msg.feedback ? "default" : "pointer", color: msg.feedback === "down" ? "#EF4444" : (isDark ? "rgba(255,255,255,0.3)" : "#A8A29E"), display: "flex", alignItems: "center", gap: 4, fontSize: 11, transition: "color 0.2s" }}
                    >
                      <ThumbsDown size={14} fill={msg.feedback === "down" ? "#EF4444" : "none"} /> {msg.feedback === "down" ? "Inaccurate" : ""}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: t.textMuted, padding: "8px 12px" }}>
              <Loader2 size={18} className="animate-spin" />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Thinking...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div style={{ padding: "18px 24px", borderTop: `1px solid ${t.surfaceBorder}`, background: t.surface }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", border: `1px solid ${t.surfaceBorder}`, padding: 6, borderRadius: 16 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={modelOptions ? "Ask about Projects, Schedules..." : "Loading assistant..."}
            disabled={!modelOptions}
            style={{
              flex: 1, minHeight: 40, maxHeight: 120, padding: "10px 10px 10px 14px",
              background: "transparent",
              border: "none",
              color: t.text, fontSize: 14, outline: "none",
              resize: "none", fontFamily: "inherit",
              lineHeight: 1.5
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || !modelOptions}
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: input.trim() ? t.accentGrad : (isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB"),
              color: input.trim() ? "#fff" : t.textMuted,
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !loading ? "pointer" : "default",
              transition: "all 0.2s",
              boxShadow: input.trim() ? `0 4px 12px ${t.accentShadow}` : "none"
            }}
          >
            <Send size={18} />
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: t.textMuted, textAlign: "center", marginTop: 12 }}>
          AI Assistant can make mistakes. Please verify important information.
        </div>
      </div>
      <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `}</style>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { Send, X, ThumbsUp, ThumbsDown, Bot, Loader2 } from "lucide-react";
import { useAuth } from "../AuthContext";
import { saveConversation, updateConversation } from "../utils/helpStorage";

export default function SidebarHelp({ open, onClose, t, isDark, tenantId, width, setWidth }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ role: "model", text: "Hello! I'm your Intelligent Cashflow assistant. How can I help you today?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const isResizingRef = useRef(false);

  const startResize = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const resize = (e) => {
    if (!isResizingRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 320 && newWidth < 900) {
      setWidth(newWidth);
    }
  };

  const stopResize = () => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResize);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    const tempMessageId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempMessageId, role: "user", text: userText }]);
    setLoading(true);

    try {
      const askAIFn = httpsCallable(functions, "askAI");
      const result = await askAIFn({ query: userText, selectedTenantId: tenantId });
      
      let aiResponseText = "";
      if (result.data && result.data.success) {
        aiResponseText = result.data.answer;
      } else if (result.data && result.data.warning) {
        aiResponseText = `⚠️ Warning: ${result.data.warning}`;
      } else {
        aiResponseText = "Received an invalid response from the assistant backend.";
      }

      // Save Q&A to Firebase Storage (metadata logs)
      const savedId = await saveConversation({
        user_id: user?.uid || "unknown",
        user_email: user?.email || "unknown",
        question: userText,
        answer: aiResponseText,
        feedback: null,
        status: "pending",
      });

      setMessages(prev => [
        ...prev,
        { id: savedId, role: "model", text: aiResponseText, docId: savedId }
      ]);

    } catch (err) {
      console.error("Error from AI/Storage:", err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "model", text: `I'm sorry, I encountered an error: ${err.message || String(err)}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (docId, type) => {
    try {
      await updateConversation(docId, { feedback: type });
      setMessages(prev => prev.map(m => m.docId === docId ? { ...m, feedback: type } : m));
    } catch (err) {
      console.error("Failed to save feedback", err);
    }
  };
  if (!open) return null;

  return (
    <div style={{
      position: "fixed", top: 0, bottom: 0, right: 0, width: width,
      background: isDark ? "#1C1917" : "#FFFFFF",
      borderLeft: `1px solid ${t.surfaceBorder}`,
      boxShadow: "-6px 0 24px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column",
      zIndex: 10001,
      animation: "slideInFromRight 0.2s ease",
    }}>
      {/* Resize Handle */}
      <div
        onMouseDown={startResize}
        style={{
          position: "absolute",
          left: -3,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: "col-resize",
          background: "transparent",
          transition: "background 0.2s",
          zIndex: 10002,
        }}
        onMouseOver={e => e.currentTarget.style.background = "rgba(139, 92, 246, 0.25)"}
        onMouseOut={e => e.currentTarget.style.background = "transparent"}
      />
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
                  {renderMessageText(msg.text)}
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
            placeholder="Ask about Deals, Investments, Ledger..."
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
            disabled={!input.trim() || loading}
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

/**
 * Basic markdown parser to render bold text, bullet points, and tables.
 */
function renderMessageText(text) {
  if (!text) return "";
  
  const lines = text.split('\n');
  let inList = false;
  let inTable = false;
  let tableRows = [];
  const renderedElements = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Check for tables
    if (line.startsWith('|') && line.endsWith('|')) {
      if (inList) {
        renderedElements.push(<ul key={`list-${i}`} style={{ listStyleType: 'disc', margin: '8px 0' }}>{inList}</ul>);
        inList = false;
      }
      inTable = true;
      if (line.includes('---')) continue;
      
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      if (tableRows.length > 0) {
        renderedElements.push(
          <table key={`table-${i}`} style={{ borderCollapse: 'collapse', margin: '12px 0', fontSize: '13px', width: '100%', border: '1px solid rgba(128,128,128,0.2)' }}>
            <thead>
              <tr style={{ background: 'rgba(128,128,128,0.1)', borderBottom: '2px solid rgba(128,128,128,0.3)' }}>
                {tableRows[0].map((cell, idx) => (
                  <th key={idx} style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>{parseInlineMarkdown(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, rowIdx) => (
                <tr key={rowIdx} style={{ borderBottom: '1px solid rgba(128,128,128,0.15)' }}>
                  {row.map((cell, idx) => (
                    <td key={idx} style={{ padding: '8px' }}>{parseInlineMarkdown(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      tableRows = [];
      inTable = false;
    }

    // Check for bullet points
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        inList = [];
      }
      const itemText = line.substring(2);
      inList.push(<li key={`li-${i}`} style={{ marginLeft: '16px', marginBottom: '4px' }}>{parseInlineMarkdown(itemText)}</li>);
      continue;
    } else if (inList) {
      renderedElements.push(<ul key={`list-${i}`} style={{ listStyleType: 'disc', margin: '8px 0' }}>{inList}</ul>);
      inList = false;
    }

    // Regular line
    if (line === '') {
      renderedElements.push(<div key={`br-${i}`} style={{ height: '8px' }} />);
    } else {
      renderedElements.push(<p key={`p-${i}`} style={{ marginBottom: '8px' }}>{parseInlineMarkdown(line)}</p>);
    }
  }

  if (inTable && tableRows.length > 0) {
    renderedElements.push(
      <table key="table-end" style={{ borderCollapse: 'collapse', margin: '12px 0', fontSize: '13px', width: '100%', border: '1px solid rgba(128,128,128,0.2)' }}>
        <thead>
          <tr style={{ background: 'rgba(128,128,128,0.1)', borderBottom: '2px solid rgba(128,128,128,0.3)' }}>
            {tableRows[0].map((cell, idx) => (
              <th key={idx} style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>{parseInlineMarkdown(cell)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.slice(1).map((row, rowIdx) => (
            <tr key={rowIdx} style={{ borderBottom: '1px solid rgba(128,128,128,0.15)' }}>
              {row.map((cell, idx) => (
                <td key={idx} style={{ padding: '8px' }}>{parseInlineMarkdown(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (inList) {
    renderedElements.push(<ul key="list-end" style={{ listStyleType: 'disc', margin: '8px 0' }}>{inList}</ul>);
  }

  return renderedElements;
}

function parseInlineMarkdown(text) {
  if (typeof text !== 'string') return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}


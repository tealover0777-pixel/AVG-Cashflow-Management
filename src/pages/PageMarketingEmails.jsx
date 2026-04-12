import React, { useState } from "react";
import { Plus, Search, FileText, Send, Inbox, LayoutTemplate, X, ChevronRight } from "lucide-react";

export default function PageMarketingEmails({ t, isDark, setActivePage }) {
  const [activeTab, setActiveTab] = useState("Draft");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { label: "Draft", icon: FileText, count: 3 },
    { label: "Sent", icon: Send, count: 12 },
    { label: "Inbox", icon: Inbox, count: 5 }
  ];

  const dummyDrafts = [
    { id: 1, name: "Q3 Newsletter", date: "Oct 12, 2026", status: "Draft" },
    { id: 2, name: "New Deal Announcement: Pearl Spring", date: "Oct 10, 2026", status: "Draft" },
    { id: 3, name: "Investor Update - Q2 Review", date: "Sep 28, 2026", status: "Draft" }
  ];

  const dummyTemplates = [
    { id: "t1", name: "Blank Template", category: "System" },
    { id: "t2", name: "Monthly Newsletter", category: "My Templates" },
    { id: "t3", name: "Deal Announcement", category: "System" },
    { id: "t4", name: "Capital Call Notice", category: "My Templates" }
  ];

  // Colors
  const tabBgActive = isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF";
  const tabTextActive = isDark ? "#60A5FA" : "#2563EB";
  const tabBgHover = isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6";

  const handleStartDraft = () => {
    // Navigate to email builder regardless of template for this demo
    setShowTemplateModal(false);
    setActivePage("Email Builder");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px 0", color: t.text }}>Marketing Emails</h1>
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>Manage your campaigns, newsletters, and communications.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn-secondary"
            onClick={() => setActivePage("Manage Templates")}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
              color: t.text, fontWeight: 600, fontSize: 13, border: `1px solid ${t.border}`, cursor: "pointer",
            }}
          >
            <LayoutTemplate size={16} /> Templates
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowTemplateModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 8, background: t.accentGrad,
              color: "#fff", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(59,130,246,0.25)"
            }}
          >
            <Plus size={16} /> New Draft
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${t.border}`, paddingBottom: 16, marginBottom: 24 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;
          const TabIcon = tab.icon;
          return (
            <div
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 8,
                background: isActive ? tabBgActive : "transparent",
                color: isActive ? tabTextActive : t.textMuted,
                fontWeight: isActive ? 600 : 500,
                fontSize: 13.5, cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = tabBgHover; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <TabIcon size={16} />
              {tab.label}
              <span style={{
                background: isActive ? (isDark ? "rgba(59,130,246,0.3)" : "#DBEAFE") : (isDark ? "#374151" : "#E5E7EB"),
                padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                color: isActive ? tabTextActive : t.text
              }}>
                {tab.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, backgroundColor: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 24, boxShadow: t.cardShadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{activeTab} Box</h2>
          
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.textMuted }} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 32px", borderRadius: 8, border: `1px solid ${t.border}`,
                background: isDark ? "rgba(0,0,0,0.1)" : "#F9FAFB", color: t.text,
                fontSize: 13, width: 250, outline: "none"
              }}
            />
          </div>
        </div>

        {/* List of Emails */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeTab === "Draft" ? (
            dummyDrafts.map(draft => (
              <div key={draft.id} style={{ 
                display: "flex", alignItems: "center", justifyContent: "space-between", 
                padding: 16, border: `1px solid ${t.border}`, borderRadius: 12,
                cursor: "pointer", background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
                transition: "border-color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = isDark ? "#60A5FA" : "#3B82F6"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = t.border}
              onClick={() => setActivePage("Email Builder")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ padding: 10, background: isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF", borderRadius: 8, color: isDark ? "#60A5FA" : "#3B82F6" }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: t.text, marginBottom: 4 }}>{draft.name}</div>
                    <div style={{ fontSize: 12, color: t.textMuted }}>Last edited {draft.date}</div>
                  </div>
                </div>
                <div style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: isDark ? "#374151" : "#F3F4F6", color: t.text }}>
                  {draft.status}
                </div>
              </div>
            ))
          ) : (
             <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 14 }}>
               No items found in {activeTab}.
             </div>
          )}
        </div>
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: t.cardBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 16,
            width: "90%", maxWidth: 640, boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column", maxHeight: "85vh"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${t.border}` }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: t.text }}>Select a Template</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: t.textMuted }}>Start from scratch or pick an existing layout.</p>
              </div>
              <button 
                onClick={() => setShowTemplateModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textMuted }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {dummyTemplates.map(tmp => (
                <div 
                  key={tmp.id}
                  onClick={handleStartDraft}
                  style={{
                    border: `1px solid ${t.border}`, borderRadius: 12, padding: 16,
                    cursor: "pointer", display: "flex", flexDirection: "column", gap: 12,
                    background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = isDark ? "#60A5FA" : "#3B82F6";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = t.border;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ height: 100, background: isDark ? "#1F2937" : "#F3F4F6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted }}>
                    <LayoutTemplate size={32} opacity={0.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, marginBottom: 4, textTransform: "uppercase" }}>{tmp.category}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.text, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {tmp.name}
                      <ChevronRight size={14} style={{ color: t.textMuted }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

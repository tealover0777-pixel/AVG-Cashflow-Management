import React, { useState, useMemo } from "react";
import { 
  Plus, Search, FileText, Send, Inbox, LayoutTemplate, X, 
  ChevronRight, Trash2, Filter, MoreHorizontal, ChevronUp, ChevronDown 
} from "lucide-react";

export default function PageMarketingEmails({ t, isDark, setActivePage }) {
  const [activeTab, setActiveTab] = useState("Draft");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "updatedAt", direction: "desc" });

  const tabs = [
    { label: "Draft", icon: FileText, count: 45 },
    { label: "Sent", icon: Send, count: 12 },
    { label: "Inbox", icon: Inbox, count: 5 }
  ];

  const dummyDrafts = [
    { id: 1, title: "Quarterly Investor Newsletter Template", recipients: "No recipients", createdAt: "2026-04-16T17:31:00", updatedAt: "2026-04-16T17:34:00", status: "Draft" },
    { id: 2, title: "New draft", recipients: "No recipients", createdAt: "2026-04-16T17:30:00", updatedAt: "2026-04-16T17:30:00", status: "Draft" },
    { id: 3, title: "Quarterly Investor Newsletter Template", recipients: "No recipients", createdAt: "2026-04-16T17:30:00", updatedAt: "2026-04-16T17:30:00", status: "Draft" },
    { id: 4, title: "New draft", recipients: "No recipients", createdAt: "2026-04-12T19:12:00", updatedAt: "2026-04-12T19:14:00", status: "Draft" },
    { id: 5, title: "New draft", recipients: "No recipients", createdAt: "2026-04-12T19:12:00", updatedAt: "2026-04-12T19:12:00", status: "Draft" },
    { id: 6, title: "Template of Introducing American Vision Group & Our Investment Solutions", recipients: "No recipients", createdAt: "2026-04-12T17:59:00", updatedAt: "2026-04-16T17:40:00", status: "Draft" },
    { id: 7, title: "Template of Introducing American Vision Group & Our Investment Solutions", recipients: "No recipients", createdAt: "2026-04-12T17:47:00", updatedAt: "2026-04-12T17:47:00", status: "Draft" },
    { id: 8, title: "Template of Introducing American Vision Group & Our Investment Solutions", recipients: "No recipients", createdAt: "2026-04-12T17:47:00", updatedAt: "2026-04-12T17:47:00", status: "Draft" },
    { id: 9, title: "Template of Intro our Fund", recipients: "No recipients", createdAt: "2026-04-12T15:38:00", updatedAt: "2026-04-12T15:38:00", status: "Draft" },
    { id: 10, title: "10% fixed - first timer", recipients: "No recipients", createdAt: "2026-04-12T15:38:00", updatedAt: "2026-04-12T15:38:00", status: "Draft" },
    { id: 11, title: "AVG Intro Email", recipients: "No recipients", createdAt: "2026-01-28T23:10:00", updatedAt: "2026-01-28T23:10:00", status: "Draft" },
    { id: 12, title: "Quarterly Investor Newsletter Template", recipients: "No recipients", createdAt: "2025-10-29T17:35:00", updatedAt: "2025-11-04T15:24:00", status: "Draft" },
    { id: 13, title: "Investor Newsletter for navigation purpose", recipients: "No recipients", createdAt: "2025-10-13T15:11:00", updatedAt: "2025-10-13T15:11:00", status: "Draft" },
    { id: 14, title: "Q3 2025 Insights: Investor Newsletter", recipients: "No recipients", createdAt: "2025-10-02T16:37:00", updatedAt: "2025-10-02T16:40:00", status: "Draft" },
    { id: 15, title: "New draft", recipients: "No recipients", createdAt: "2025-09-22T01:46:00", updatedAt: "2025-09-22T01:46:00", status: "Draft" },
  ];

  const filteredData = useMemo(() => {
    let data = activeTab === "Draft" ? dummyDrafts : [];
    if (searchQuery) {
      data = data.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return data.sort((a, b) => {
      const vA = a[sortConfig.key];
      const vB = b[sortConfig.key];
      if (sortConfig.direction === "asc") return vA > vB ? 1 : -1;
      return vA < vB ? 1 : -1;
    });
  }, [activeTab, searchQuery, sortConfig]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(d => d.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric", hour12: true });
  };

  const dummyTemplates = [
    { id: "t1", name: "Blank Template", category: "System" },
    { id: "t2", name: "Monthly Newsletter", category: "My Templates" },
    { id: "t3", name: "Deal Announcement", category: "System" },
    { id: "t4", name: "Capital Call Notice", category: "My Templates" }
  ];

  const handleStartDraft = () => {
    setShowTemplateModal(false);
    setActivePage("Email Builder");
  };

  // Colors
  const tabBgActive = isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF";
  const tabTextActive = isDark ? "#60A5FA" : "#2563EB";
  const tabBgHover = isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6";

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <ChevronDown size={14} style={{ opacity: 0.3 }} />;
    return sortConfig.direction === "asc" ? <ChevronUp size={14} color="#3B82F6" /> : <ChevronDown size={14} color="#3B82F6" />;
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px 0", color: t.text }}>Marketing Emails</h1>
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>Manage your campaigns, newsletters, and communications.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
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

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${t.border}`, marginBottom: 20 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;
          return (
            <div
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "12px 16px",
                color: isActive ? t.text : t.textMuted,
                borderBottom: isActive ? `2px solid ${isDark ? "#60A5FA" : "#3B82F6"}` : "2px solid transparent",
                fontWeight: isActive ? 600 : 500,
                fontSize: 14, cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
              <span style={{
                background: isActive ? (isDark ? "rgba(59,130,246,0.3)" : "#E5E7EB") : (isDark ? "#374151" : "#F3F4F6"),
                padding: "1px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                color: isActive ? (isDark ? "#60A5FA" : "#6B7280") : t.textMuted
              }}>
                {tab.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.textMuted }} />
          <input 
            type="text" 
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px 9px 38px", borderRadius: 8, border: `1px solid ${t.border}`,
              background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text,
              fontSize: 13.5, outline: "none"
            }}
          />
        </div>
        
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            disabled={selectedIds.length === 0}
            style={{ 
              display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8,
              border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
              color: selectedIds.length > 0 ? "#EF4444" : t.textMuted, fontSize: 13, fontWeight: 500,
              cursor: selectedIds.length > 0 ? "pointer" : "not-allowed", opacity: selectedIds.length > 0 ? 1 : 0.6
            }}
          >
            <Trash2 size={15} /> Delete
          </button>
          <button 
            style={{ 
              display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8,
              border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
              color: t.text, fontSize: 13, fontWeight: 500, cursor: "pointer"
            }}
          >
            <Filter size={15} /> Filters <span style={{ background: "#3B82F6", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>0</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ 
        flex: 1, overflow: "auto", border: `1px solid ${t.border}`, borderRadius: 12, 
        background: isDark ? "rgba(255,255,255,0.02)" : "#fff" 
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ position: "sticky", top: 0, background: isDark ? "#1C1C1E" : "#F9FAFB", zIndex: 10 }}>
            <tr style={{ borderBottom: `1px solid ${t.border}` }}>
              <th style={{ padding: "12px 16px", textAlign: "left", width: 40 }}>
                <input type="checkbox" checked={selectedIds.length === filteredData.length && filteredData.length > 0} onChange={toggleSelectAll} style={{ cursor: "pointer" }} />
              </th>
              <th onClick={() => handleSort("title")} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: t.text, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>Title <SortIcon col="title" /></div>
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: t.text }}>Recipients</th>
              <th onClick={() => handleSort("createdAt")} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: t.text, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>Created <SortIcon col="createdAt" /></div>
              </th>
              <th onClick={() => handleSort("updatedAt")} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: t.text, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>Last updated <SortIcon col="updatedAt" /></div>
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: t.text }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: t.text }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${t.border}`, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "12px 16px" }}>
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} style={{ cursor: "pointer" }} />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span 
                    onClick={() => setActivePage("Email Builder")}
                    style={{ color: "#2563EB", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                  >
                    {item.title}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: t.textMuted }}>{item.recipients}</td>
                <td style={{ padding: "12px 16px", color: t.text }}>{formatDate(item.createdAt)}</td>
                <td style={{ padding: "12px 16px", color: t.text }}>{formatDate(item.updatedAt)}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: t.text }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#9CA3AF" }} />
                    {item.status}
                  </div>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <button style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = isDark ? "#333" : "#F3F4F6"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>No emails found.</div>
        )}
      </div>

      {/* Template Modal Reused */}
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

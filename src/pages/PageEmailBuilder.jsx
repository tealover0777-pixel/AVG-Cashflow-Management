import React, { useState } from "react";
import { 
  ChevronLeft, Edit2, UploadCloud, Calendar, Mail, Send,
  FileEdit, Settings, Smartphone, Monitor, Paperclip, Save,
  Columns, TrendingUp, Square, Minus, Type, AlignLeft, Image as ImageIcon,
  FileText, Video, Users, Menu, Code, Table
} from "lucide-react";

export default function PageEmailBuilder({ t, isDark, setActivePage }) {
  const [activeRightTab, setActiveRightTab] = useState("Content");

  const rightTabs = [
    { id: "Content", icon: Square },
    { id: "Blocks", icon: Columns },
    { id: "Body", icon: AlignLeft },
    { id: "Images", icon: ImageIcon },
    { id: "Uploads", icon: UploadCloud },
    { id: "Audit", icon: FileText },
  ];

  const contentBlocks = [
    { label: "COLUMNS", icon: Columns },
    { label: "KPIs", icon: TrendingUp },
    { label: "BUTTON", icon: Square },
    { label: "DIVIDER", icon: Minus },
    { label: "HEADING", icon: Type },
    { label: "PARAGRAPH", icon: AlignLeft },
    { label: "IMAGE", icon: ImageIcon },
    { label: "AI SUMMARY", icon: FileText },
    { label: "VIDEO", icon: Video },
    { label: "SOCIAL", icon: Users },
    { label: "MENU", icon: Menu },
    { label: "HTML", icon: Code },
    { label: "TABLE", icon: Table },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif", background: t.background }}>
      {/* Absolute Top Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${t.border}`, background: t.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            onClick={() => setActivePage("Marketing emails")}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 20, padding: "4px 12px", cursor: "pointer", color: isDark ? "#60A5FA" : "#3B82F6", fontSize: 13, fontWeight: 600 }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: t.text }}>
            New draft <Edit2 size={14} color={t.textMuted} style={{ cursor: "pointer" }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
            <UploadCloud size={14} /> Saved
          </span>
          <button style={{ background: "transparent", border: "none", color: isDark ? "#60A5FA" : "#3B82F6", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Schedule a demo
          </button>
          <button style={{ background: isDark ? "#1E3A8A" : "#1D4ED8", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            Send test email <ChevronDownIcon size={14} />
          </button>
          <button style={{ background: isDark ? "#1E3A8A" : "#1D4ED8", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            Send <ChevronDownIcon size={14} />
          </button>
        </div>
      </div>

      {/* Sub Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 24px", borderBottom: `1px solid ${t.border}`, background: t.surface }}>
        <div style={{ display: "flex", gap: 24, paddingLeft: "50%", transform: "translateX(-50%)" }}>
          <TabButton icon={<FileEdit size={14} />} label="Edit" active t={t} isDark={isDark} />
          <TabButton icon={<Settings size={14} />} label="Settings" t={t} isDark={isDark} />
          <TabButton icon={<Smartphone size={14} />} label="Mobile review" t={t} isDark={isDark} />
          <TabButton icon={<Monitor size={14} />} label="Desktop review" t={t} isDark={isDark} />
        </div>
        
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${isDark ? "#3B82F6" : "#2563EB"}`, color: isDark ? "#60A5FA" : "#2563EB", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Add attachment <span style={{ background: isDark ? "#3B82F6" : "#2563EB", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>0</span>
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${isDark ? "#3B82F6" : "#2563EB"}`, color: isDark ? "#60A5FA" : "#2563EB", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Save size={14} /> Save as new template
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        
        {/* Canvas Area */}
        <div style={{ flex: 1, background: isDark ? "#111" : "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", padding: 40, overflowY: "auto" }}>
          
          {/* Drop Zone Box */}
          <div style={{ 
            width: "100%", maxWidth: 600,
            background: isDark ? "rgba(59,130,246,0.05)" : "#EFF6FF",
            border: `1px dashed ${isDark ? "#3B82F6" : "#93C5FD"}`,
            padding: 40, textAlign: "center", borderRadius: 4,
            color: isDark ? "#60A5FA" : "#2563EB", fontSize: 13, fontWeight: 500
          }}>
            No content here. Drag content from right.
          </div>
          
          <div style={{ marginTop: 24, fontSize: 12, color: t.textMuted }}>
            Don't want to receive this type of email? <a href="#" style={{ color: isDark ? "#60A5FA" : "#2563EB", textDecoration: "none" }}>Unsubscribe</a>
          </div>

        </div>

        {/* Right Sidebar - Tools */}
        <div style={{ width: 380, background: t.surface, borderLeft: `1px solid ${t.border}`, display: "flex" }}>
          
          {/* Tools Grid */}
          <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
             <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {contentBlocks.map((block) => (
                  <div key={block.label} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                    background: isDark ? "#1F2937" : "#fff", border: `1px solid ${t.border}`, borderRadius: 4,
                    padding: "16px 8px", cursor: "grab", color: t.text,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    transition: "border-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = isDark ? "#60A5FA" : "#3B82F6"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = t.border}
                  >
                    <block.icon size={24} strokeWidth={1.5} color={t.textMuted} />
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>{block.label}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Far Right Tabs */}
          <div style={{ width: 64, borderLeft: `1px solid ${t.border}`, display: "flex", flexDirection: "column", background: isDark ? "#111" : "#FAFAFA" }}>
            {rightTabs.map(rtab => {
              const active = activeRightTab === rtab.id;
              return (
                <div 
                  key={rtab.id}
                  onClick={() => setActiveRightTab(rtab.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "16px 0", cursor: "pointer",
                    background: active ? t.surface : "transparent",
                    borderLeft: active ? `3px solid ${isDark ? "#60A5FA" : "#3B82F6"}` : "3px solid transparent",
                    color: active ? (isDark ? "#60A5FA" : "#3B82F6") : t.textMuted
                  }}
                >
                  <rtab.icon size={20} strokeWidth={1.5} />
                  <span style={{ fontSize: 9, fontWeight: active ? 600 : 500 }}>{rtab.id}</span>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}

// Small helper for down-chevron in buttons
function ChevronDownIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}

// Helper for top sub-toolbar tabs
function TabButton({ icon, label, active, t, isDark }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      color: active ? (isDark ? "#60A5FA" : "#2563EB") : t.textMuted,
      fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer",
      borderBottom: active ? `2px solid ${isDark ? "#60A5FA" : "#2563EB"}` : "2px solid transparent",
      paddingBottom: 4,
      transform: "translateY(2px)" // Align with border perfectly
    }}>
      {icon}
      {label}
    </div>
  );
}

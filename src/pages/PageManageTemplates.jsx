import React, { useState } from "react";
import { ArrowLeft, Search, MoreHorizontal, FileText, Image as ImageIcon, Briefcase, Star, Users } from "lucide-react";

export default function PageManageTemplates({ t, isDark, setActivePage }) {
  const [searchQuery, setSearchQuery] = useState("");

  const TemplateCard = ({ template }) => (
    <div style={{
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: t.cardBg,
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
      position: "relative"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
    }}
    >
      <button style={{
        position: "absolute", top: 12, right: 12,
        background: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)",
        border: `1px solid ${t.border}`, borderRadius: 4,
        width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: t.textMuted
      }}>
        <MoreHorizontal size={14} />
      </button>

      <div style={{
        height: 140,
        backgroundColor: template.bgColor || (isDark ? "#1F2937" : "#F3F4F6"),
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottom: `1px solid ${t.border}`
      }}>
        {template.previewContent || <FileText size={48} style={{ color: t.textMuted, opacity: 0.5 }} />}
      </div>
      
      <div style={{ padding: "12px 16px" }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {template.name}
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: t.textMuted }}>
            {template.subtext}
          </span>
          {template.tag && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              padding: "2px 6px", borderRadius: 4,
              backgroundColor: isDark ? "#374151" : "#F3F4F6",
              color: t.textMuted, display: "flex", alignItems: "center", gap: 4
            }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: t.textMuted }}></span>
              {template.tag}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const sections = [
    {
      title: "Your templates",
      templates: [
        { id: 1, name: "Template of Introducing American Vision Group & Our Investment Solutions", subtext: "Created 11/14/2025", tag: "Drag & drop" },
        { id: 2, name: "Quarterly Investor Newsletter Template", subtext: "Created 10/29/2025", tag: "Drag & drop" },
        { id: 3, name: "10% fixed - first timer", subtext: "Created 09/22/2025", tag: "Simple" },
        { id: 4, name: "[Template] Introducing AVG & Our Investment Solutions", subtext: "Created 09/20/2025", tag: "Drag & drop" },
        { id: 5, name: "Template of form 1099s are uploaded", subtext: "Created 09/12/2025", tag: "Drag & drop" },
        { id: 6, name: "[Template] AVCR Cross-Sale Proposal Email", subtext: "Created 08/19/2025", tag: "Drag & drop" },
      ]
    },
    {
      title: "Design",
      backgroundColor: isDark ? "rgba(59,130,246,0.05)" : "#F0F4FA",
      templates: [
        { id: 7, name: "Modern", subtext: "Made by CFP", tag: "Drag & drop", bgColor: "#fff", previewContent: <ImageIcon size={40} color="#3B82F6" /> },
        { id: 8, name: "Modern (Announcement)", subtext: "Made by CFP", tag: "Drag & drop", bgColor: "#fff", previewContent: <Briefcase size={40} color="#10B981" /> },
        { id: 9, name: "Modern (Webinar)", subtext: "Made by CFP", tag: "Drag & drop", bgColor: "#fff", previewContent: <Users size={40} color="#8B5CF6" /> },
        { id: 10, name: "Warm", subtext: "Made by CFP", tag: "Drag & drop", bgColor: "#1F2937", previewContent: <Star size={40} color="#F59E0B" /> },
      ]
    },
    {
      title: "Requesting reviews",
      templates: [
        { id: 11, name: "We'd love your feedback", subtext: "Made by CFP", tag: "Drag & drop" },
        { id: 12, name: "Reminder: leave a review", subtext: "Made by CFP", tag: "Drag & drop" },
      ]
    },
    {
      title: "Raising capital",
      templates: [
        { id: 13, name: "New Fund Announcement", subtext: "Made by CFP", tag: "Drag & drop" },
        { id: 14, name: "Capital Call Notice", subtext: "Made by CFP", tag: "Drag & drop" },
      ]
    },
    {
      title: "LP nurturing",
      templates: [
        { id: 15, name: "Monthly Performance Update", subtext: "Made by CFP", tag: "Drag & drop" },
        { id: 16, name: "Year-End Summary", subtext: "Made by CFP", tag: "Drag & drop" },
      ]
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setActivePage("Marketing")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 6, background: "transparent",
            color: t.text, fontWeight: 600, fontSize: 13, border: `1px solid ${t.border}`, cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: t.text }}>Manage email templates</h1>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, backgroundColor: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: 32, overflowY: "auto", boxShadow: t.cardShadow }}>
        
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 32, maxWidth: 400 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: t.textMuted }} />
          <input 
            type="text" 
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "10px 14px 10px 40px", borderRadius: 8, border: `1px solid ${t.border}`,
              background: isDark ? "rgba(0,0,0,0.1)" : "#fff", color: t.text,
              fontSize: 14, width: "100%", outline: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          />
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {sections.map((section, idx) => (
            <div key={idx} style={{ 
              backgroundColor: section.backgroundColor || "transparent",
              padding: section.backgroundColor ? "24px 32px" : "0",
              margin: section.backgroundColor ? "0 -32px" : "0",
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 20px 0", color: t.text }}>
                {section.title}
              </h2>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", 
                gap: 20 
              }}>
                {section.templates.filter(tmpl => tmpl.name.toLowerCase().includes(searchQuery.toLowerCase())).map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

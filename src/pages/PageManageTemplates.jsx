import React, { useState } from "react";
import { ArrowLeft, Search, MoreHorizontal, FileText, Image as ImageIcon, Briefcase, Star, Users, X } from "lucide-react";

export default function PageManageTemplates({ t, isDark, setActivePage }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const TemplateCard = ({ template }) => (
    <div 
      onClick={() => setSelectedTemplate(template)}
      style={{
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
          onClick={() => setActivePage("Marketing emails")}
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

      {/* Preview Modal */}
      {selectedTemplate && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 40
        }}>
          <div style={{
            width: "100%", maxWidth: 800, height: "100%", maxHeight: "90vh",
            backgroundColor: "#F3F4F6", borderRadius: 8, overflow: "hidden",
            display: "flex", flexDirection: "column", boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: "#1D4ED8", color: "#fff", padding: "16px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>View email</h2>
              <button 
                onClick={() => setSelectedTemplate(null)}
                style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Preview Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "40px", display: "flex", justifyContent: "center" }}>
              
              <div style={{ 
                width: 600, backgroundColor: "#E5E5DF", padding: "40px", 
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)", minHeight: 800
              }}>
                <div style={{ backgroundColor: "#fff", width: "100%" }}>
                  {/* Mock Email Header */}
                  <div style={{ 
                    height: 120, background: "linear-gradient(135deg, #2c2518 0%, #a28131 50%, #201a0f 100%)",
                    position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "flex-end"
                  }}>
                    <div style={{
                      backgroundColor: "#D97706", color: "#fff", padding: "8px 24px",
                      fontWeight: 700, fontSize: 14, letterSpacing: 1,
                      borderBottomLeftRadius: 8
                    }}>
                      COMPANY ANNOUNCEMENT
                    </div>
                  </div>

                  {/* Mock Email Body */}
                  <div style={{ padding: "40px", color: "#1F2937", fontSize: 13, lineHeight: 1.6 }}>
                    <p style={{ margin: "0 0 16px 0" }}>Hi <span style={{ padding: "2px 6px", border: "1px dashed #9CA3AF", borderRadius: 4, color: "#6B7280", fontSize: 11, background: "#F9FAFB" }}>First name</span>,</p>
                    <p style={{ margin: "0 0 16px 0" }}>
                      We are from <strong>American Vision Group</strong>. We help business owners and families like yours turn complex wealth into something clear, structured, and sustainable.
                    </p>
                    <p style={{ margin: "0 0 16px 0" }}>
                      Why now? Many investors are realizing that traditional markets can feel like a second job — constant volatility, endless headlines, and uncertainty. That's why we've built strategies around <strong>real assets</strong> that are easier to understand and more resilient over time.
                    </p>
                    <p style={{ margin: "0 0 16px 0" }}>Two of our current offerings may be of interest:</p>
                    <ul style={{ margin: "0 0 16px 0", paddingLeft: 20 }}>
                      <li style={{ marginBottom: 8 }}><strong>American Vision Senior Fund (AVS):</strong> Focused on the growing demand for senior housing and healthcare properties — designed to generate consistent income while serving a real community need.</li>
                      <li><strong>American Vision Double Eagle Fund (AVDE):</strong> A balanced portfolio combining real estate equity and fixed-income strategies to provide both growth and stability.</li>
                    </ul>
                    <p style={{ margin: "0 0 16px 0" }}>Attached are short overviews that walk through the structure, returns, and how these funds fit into today's environment.</p>
                    <p style={{ margin: "0 0 16px 0" }}>We'd be happy to schedule a quick call to see if either aligns with your goals and answer any questions.</p>
                    <p style={{ margin: "0 0 16px 0" }}>Looking forward to connecting,</p>
                    <p style={{ margin: "0" }}>
                      <strong>[Please put your name here]</strong><br/>
                      [Your Position]<br/>
                      American Vision Group
                    </p>
                  </div>

                  {/* Mock Email Footer */}
                  <div style={{ 
                    height: 100, background: "linear-gradient(135deg, #1c170f 0%, #826521 50%, #15110a 100%)",
                    display: "flex", alignItems: "center", padding: "0 40px", justifyContent: "space-between"
                  }}>
                    <div style={{ color: "#fff", fontSize: 18, fontWeight: 300 }}>
                      AMERICAN VISION<br/><strong style={{ letterSpacing: 2, fontSize: 14 }}>GROUP</strong>
                    </div>
                    <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, textAlign: "right" }}>
                      Building wealth,<br/>one investment at a time
                    </div>
                  </div>
                </div>
                
                <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#6B7280" }}>
                  Don't want to see this type of email? <a href="#" style={{ color: "#2563EB" }}>Unsubscribe</a>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{
              backgroundColor: "#fff", padding: "16px 24px", borderTop: "1px solid #E5E7EB",
              display: "flex", justifyContent: "center", gap: 16
            }}>
              <button 
                onClick={() => setActivePage("Email Builder")}
                style={{
                  padding: "10px 24px", borderRadius: 6, backgroundColor: "#1D4ED8",
                  color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer"
                }}
              >
                Use template
              </button>
              <button 
                onClick={() => setActivePage("Email Builder")}
                style={{
                  padding: "10px 24px", borderRadius: 6, backgroundColor: "#1D4ED8",
                  color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer"
                }}
              >
                Edit template
              </button>
              <button 
                onClick={() => setSelectedTemplate(null)}
                style={{
                  padding: "10px 24px", borderRadius: 6, backgroundColor: "#1D4ED8",
                  color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer"
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useMemo } from "react";
import { ArrowLeft, Search, Plus, LayoutTemplate, ChevronRight, X } from "lucide-react";

// Standard placeholder for templates without images
const TemplatePlaceholder = ({ isDark }) => (
  <div style={{
    width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    background: isDark ? "rgba(255,255,255,0.02)" : "#F3F4F6", color: isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB"
  }}>
    <LayoutTemplate size={48} />
  </div>
);

export default function PageSelectTemplate(props) {
  const { t, isDark, setActivePage, allTemplates = [], setActiveEmailTemplate } = props;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = useMemo(() => {
    return (allTemplates || []).filter(tmp => 
      (tmp.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tmp.category || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allTemplates, searchQuery]);

  const handleSelectTemplate = (template, isUseMode = true) => {
    if (typeof setActiveEmailTemplate === 'function') {
      setActiveEmailTemplate({ ...template, _useMode: isUseMode });
    }
    setActivePage("Email Builder");
  };

  const handleUseBlank = (mode) => {
    const initialRows = mode === 'simple' 
      ? [{ id: "r_1", type: "paragraph", content: { html: "<p>Start typing your simple email here...</p>" } }]
      : undefined; // Email Builder uses default INITIAL_ROWS if rows is undefined

    handleSelectTemplate({
      name: `New ${mode === 'simple' ? 'Simple' : 'Drag & drop'} Draft`,
      rows: initialRows,
      settings: { subject: "", type: "Marketing" },
      editorMode: mode
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setActivePage("Marketing emails")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 20, background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
            color: isDark ? "#60A5FA" : "#2563EB", fontWeight: 600, fontSize: 13, border: `1px solid ${t.border}`, cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: t.text }}>Select an email template</h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        {/* Blank templates section */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 16 }}>Blank templates</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {/* Blank Drag & drop */}
            <div
              onClick={() => handleUseBlank('drag')}
              style={{
                background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
                border: `1px solid ${t.border}`, borderRadius: 12, padding: "32px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Plus size={32} style={{ color: t.textMuted }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.text }}>Blank</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>Drag & drop</div>
              </div>
            </div>

            {/* Blank Simple */}
            <div
              onClick={() => handleUseBlank('simple')}
              style={{
                background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
                border: `1px solid ${t.border}`, borderRadius: 12, padding: "32px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Plus size={32} style={{ color: t.textMuted }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.text }}>Blank</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>Simple</div>
              </div>
            </div>
          </div>
        </section>

        {/* Search templates */}
        <div style={{ position: "relative", marginBottom: 32, maxWidth: 400 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: t.textMuted }} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "10px 14px 10px 40px", borderRadius: 8, border: `1px solid ${t.border}`,
              background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text,
              fontSize: 14, width: "100%", outline: "none"
            }}
          />
        </div>

        {/* Templates sections */}
        {[
          { title: "Your templates", items: filteredTemplates.filter(t => !t.isGlobal) },
          { title: "Global Templates", items: filteredTemplates.filter(t => t.isGlobal) }
        ].map((section, idx) => (
          <section key={idx} style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: 0 }}>{section.title}</h2>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, opacity: 0.7 }}>
                {section.items.length}
              </span>
            </div>
            
            {section.items.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
                {section.items.map(tmp => (
                  <div
                    key={tmp.id}
                    onClick={() => handleSelectTemplate(tmp)}
                    style={{
                      background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
                      border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden",
                      cursor: "pointer", transition: "all 0.2s", position: "relative"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ height: 140, borderBottom: `1px solid ${t.border}`, position: "relative" }}>
                      {tmp.previewImage ? <img src={tmp.previewImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <TemplatePlaceholder isDark={isDark} />}
                      {tmp.isGlobal && (
                        <div style={{
                          position: "absolute", bottom: 8, right: 8,
                          display: "flex", alignItems: "center", gap: 4,
                          fontSize: 10, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.3)",
                          padding: "2px 6px", borderRadius: 4, backdropFilter: "blur(4px)"
                        }}>
                          <Star size={10} fill="currentColor" /> Global
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 16, position: "relative" }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: t.text, margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tmp.name}</h3>
                      <div style={{ fontSize: 11, color: t.textMuted }}>Updated {tmp.updatedAt ? new Date(tmp.updatedAt).toLocaleDateString() : "recently"}</div>
                      
                      {/* Editor Type Pill */}
                      <div style={{ 
                        position: "absolute", bottom: 16, right: 16,
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", color: t.textMuted,
                        border: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 4
                      }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: t.textMuted }} />
                        {tmp.editorMode === 'simple' ? 'Simple' : 'Drag & drop'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, border: `1px dashed ${t.border}`, borderRadius: 12 }}>
                {section.title === "Your templates" 
                  ? "No personal templates found."
                  : "No global templates found."}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

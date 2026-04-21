import React, { useState, useMemo } from "react";
import { ArrowLeft, Search, Plus, LayoutTemplate, ChevronRight, X, Star } from "lucide-react";

const TemplatePlaceholder = ({ isDark }) => (
  <div style={{
    width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    background: isDark
      ? "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)"
      : "radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)",
    overflow: "hidden", position: "relative"
  }}>
    <div style={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", background: "rgba(212,175,55,0.08)", top: -40, right: -40, filter: "blur(30px)" }} />
    <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", background: "rgba(59,130,246,0.05)", bottom: -30, left: -20, filter: "blur(25px)" }} />
    <div style={{
      width: 75, height: 100,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)",
      backdropFilter: "blur(10px)",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)"}`,
      borderRadius: 8,
      boxShadow: isDark ? "0 20px 40px -10px rgba(0,0,0,0.5)" : "0 20px 40px -12px rgba(0,0,0,0.1)",
      display: "flex", flexDirection: "column", padding: "12px 10px", gap: 7,
      transform: "rotate(-3deg) translateY(-2px)", zIndex: 2
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(212,175,55,0.8)" }} />
        <div style={{ width: "50%", height: 3, background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)", borderRadius: 1.5 }} />
      </div>
      <div style={{ width: "100%", height: 2, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 1 }} />
      <div style={{ width: "90%",  height: 2, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 1 }} />
      <div style={{ width: "100%", height: 2, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 1 }} />
      <div style={{ width: "85%",  height: 2, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 1 }} />
      <div style={{ flex: 1 }} />
      <div style={{ width: "100%", height: 12, background: "linear-gradient(135deg,#d4af37 0%,#a28131 100%)", borderRadius: 4, opacity: 0.9, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(212,175,55,0.2)" }}>
        <div style={{ width: "30%", height: 1.5, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
      </div>
    </div>
    <div style={{ position: "absolute", width: 75, height: 100, background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.3)", border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.2)"}`, borderRadius: 8, transform: "rotate(6deg) translate(8px,4px)", zIndex: 1, opacity: 0.6 }} />
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
      ? [{ id: "r_1", type: "paragraph", content: { html: "" } }]
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
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {/* YOURS Badge Overlay */}
                    {!tmp.isGlobal && (
                      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}>
                        <div style={{
                          padding: "3px 8px", borderRadius: 4,
                          background: "#D1FAE5", color: "#059669",
                          fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px"
                        }}>
                          YOURS
                        </div>
                      </div>
                    )}

                    <div style={{ height: 140, borderBottom: `1px solid ${t.border}`, position: "relative", background: isDark ? "#111827" : "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {tmp.previewImage ? <img src={tmp.previewImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <TemplatePlaceholder isDark={isDark} />}
                      {tmp.isGlobal && (
                        <div style={{
                          position: "absolute", bottom: 10, right: 10,
                          display: "flex", alignItems: "center", gap: 4,
                          fontSize: 10, color: t.textMuted, fontWeight: 600, opacity: 0.8
                        }}>
                          <Star size={10} fill={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} />
                          Global
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "14px 16px", position: "relative" }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: t.text, margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tmp.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: t.textMuted }}>
                        <span>Updated {tmp.updatedAt ? new Date(tmp.updatedAt).toLocaleDateString() : "recently"}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 13, color: t.textSubtle, opacity: 0.5 }}>•</span>
                          <span style={{ fontWeight: 600, fontSize: 10, color: t.textSubtle }}>{tmp.tag || (tmp.editorMode === 'simple' ? 'Simple' : 'Drag & drop')}</span>
                        </div>
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

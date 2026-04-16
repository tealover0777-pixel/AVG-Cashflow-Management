import React, { useState, useEffect } from "react";
import { ArrowLeft, Search, MoreHorizontal, FileText, Image as ImageIcon, Briefcase, Star, Users, X, Trash2, Loader2, AlertCircle } from "lucide-react";
import { DelModal, Modal } from "../components";
import { useAuth } from "../AuthContext";
import { storage } from "../firebase";
import { ref, listAll, getDownloadURL, deleteObject } from "firebase/storage";

const TemplatePlaceholder = () => (
  <div style={{
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a", // Fallback dark background matching brand
    overflow: "hidden"
  }}>
    <img 
      src="/template-preview.png" 
      alt="Template Preview"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block"
      }}
    />
  </div>
);


export default function PageManageTemplates({ t, isDark, setActivePage, setActiveEmailTemplate, allTemplates, loading, fetchTemplates }) {
  const { tenantId, isSuperAdmin, isGlobalRole, profile } = useAuth();
  const isAdmin = isSuperAdmin || isGlobalRole;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const TemplateCard = ({ template }) => (
    <div
      onClick={() => { setActiveEmailTemplate(template); setActivePage("Email Builder"); }}
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: t.cardBg || (isDark ? "rgba(255,255,255,0.02)" : "#fff"),
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
      {/* Delete Button - only for non-global (personal) templates */}
      {!template.isGlobal && (
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            setTemplateToDelete(template);
          }}
          style={{
            position: "absolute", top: 12, right: 12,
            background: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)"}`, 
            borderRadius: 6,
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#EF4444",
            zIndex: 10
          }}
          title="Delete template"
        >
          <Trash2 size={14} />
        </button>
      )}

      {!template.isGlobal && (
        <div style={{
          position: "absolute", top: 12, left: 12,
          padding: "2px 6px", borderRadius: 4,
          background: isDark ? "rgba(52,211,153,0.2)" : "rgba(52,211,153,0.1)",
          border: `1px solid ${isDark ? "rgba(52,211,153,0.3)" : "rgba(52,211,153,0.2)"}`,
          color: "#34D399", fontSize: 10, fontWeight: 700, zIndex: 5
        }}>
          YOURS
        </div>
      )}

      <div style={{
        height: 140,
        backgroundColor: template.bgColor || (isDark ? "#111827" : "#F3F4F6"),
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottom: `1px solid ${t.border}`,
        position: "relative"
      }}>
        {template.previewContent || <TemplatePlaceholder isDark={isDark} />}
        {template.isGlobal && (
          <div style={{
            position: "absolute", bottom: 8, right: 8,
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, color: t.textMuted, opacity: 0.8
          }}>
            <Star size={10} fill={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} />
            Global
          </div>
        )}
      </div>
      
      <div style={{ padding: "12px 16px" }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {template.name}
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: t.textMuted }}>
            {template.subtext || `Updated ${template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : "recently"}`}
          </span>
          {template.tag && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              padding: "2px 6px", borderRadius: 4,
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
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

  const handleDeleteTemplate = async (template) => {
    setIsDeleting(true);
    try {
      const fileRef = ref(storage, template.id);
      await deleteObject(fileRef);
      // Refresh global cache
      await fetchTemplates(true);
      if (selectedTemplate?.id === template.id) setSelectedTemplate(null);
      showToast("Template deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting template:", err);
      showToast("Error deleting template. You might not have permission.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTemplates = allTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sections = [
    { title: "Your templates", templates: filteredTemplates.filter(t => !t.isGlobal) },
    { title: "Global Templates", templates: filteredTemplates.filter(t => t.isGlobal) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setActivePage("Marketing emails")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 20, background: "transparent",
              color: isDark ? "#60A5FA" : "#3B82F6", fontWeight: 600, fontSize: 13, border: `1px solid ${t.border}`, cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: t.text }}>Manage email templates</h1>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setActiveEmailTemplate({ name: "Untitled Template", rows: [], settings: {} });
              setActivePage("Email Builder");
            }}
            style={{
              padding: "8px 16px", borderRadius: 8, background: t.accent,
              color: "#fff", border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}
          >
            + Create Template
          </button>
        </div>
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
              background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text,
              fontSize: 14, width: "100%", outline: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", color: t.textMuted }}>
            <Loader2 size={40} className="animate-spin" style={{ marginBottom: 16, opacity: 0.5 }} />
            <p>Loading your templates...</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {sections.map((section, idx) => (
              <div key={idx}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: t.text }}>{section.title}</h2>
                  <div style={{ flex: 1, height: 1, background: t.border, opacity: 0.5 }}></div>
                  <span style={{ fontSize: 12, color: t.textMuted, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: "2px 8px", borderRadius: 10 }}>
                    {section.templates.length}
                  </span>
                </div>

                {section.templates.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
                    {section.templates.map(template => (
                      <TemplateCard key={template.id} template={template} />
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: "32px 24px", borderRadius: 12, border: `1px dashed ${t.border}`,
                    textAlign: "center", color: t.textMuted, fontSize: 13
                  }}>
                    {section.title === "Your templates"
                      ? "No custom templates yet. Save a draft from the Email Builder to create one."
                      : "No global templates available."}
                  </div>
                )}
              </div>
            ))}

          </div>
        )}
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
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{selectedTemplate.name}</h2>
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
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)", minHeight: 800,
                display: "flex", flexDirection: "column", gap: 0
              }}>
                <div style={{ backgroundColor: "#fff", width: "100%", height: "100%" }}>
                  {/* We could render the rows here, but for now we show a placeholder or fixed preview */}
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <FileText size={48} style={{ color: "#3B82F6", marginBottom: 16, opacity: 0.5 }} />
                    <p style={{ color: "#4B5563" }}>Preview for <strong>{selectedTemplate.name}</strong></p>
                    <p style={{ fontSize: 12, color: "#6B7280" }}>Click "Use template" to load this into the builder.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{
              backgroundColor: "#fff", padding: "16px 24px", borderTop: "1px solid #E5E7EB",
              display: "flex", justifyContent: "center", gap: 16
            }}>
              <button 
                onClick={() => {
                  setActiveEmailTemplate(selectedTemplate);
                  setActivePage("Email Builder");
                  setSelectedTemplate(null);
                }}
                style={{
                  padding: "10px 24px", borderRadius: 6, backgroundColor: "#1D4ED8",
                  color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer"
                }}
              >
                Use template
              </button>
              <button 
                onClick={() => setSelectedTemplate(null)}
                style={{
                  padding: "10px 24px", borderRadius: 6, border: "1px solid #E5E7EB",
                  color: "#4B5563", fontWeight: 600, fontSize: 14, cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 2000,
          backgroundColor: toast.type === "error" ? "#EF4444" : (toast.type === "success" ? "#10B981" : "#3B82F6"),
          color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 600,
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          display: "flex", alignItems: "center", gap: 10,
          animation: "slideIn 0.3s ease-out"
        }}>
          {toast.type === "error" ? <X size={18} /> : <FileText size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DelModal 
        target={templateToDelete} 
        onClose={() => setTemplateToDelete(null)} 
        onConfirm={async () => {
          await handleDeleteTemplate(templateToDelete);
          setTemplateToDelete(null);
        }} 
        label="This template" 
        t={t} 
        isDark={isDark} 
      />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

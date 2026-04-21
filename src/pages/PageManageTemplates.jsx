import React from "react";
import { ArrowLeft, Search, MoreHorizontal, FileText, Image as ImageIcon, Briefcase, Star, Users, X, Trash2, Loader2, AlertCircle, Edit2, Send } from "lucide-react";
import { db, functions } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { DelModal, Modal, PromptModal } from "../components";
import { useAuth } from "../AuthContext";
import { storage } from "../firebase";
import { ref, listAll, getDownloadURL, deleteObject } from "firebase/storage";

function generateEmailPreviewHtml(rows = []) {
  const renderRow = (row) => {
    if (!row) return "";
    switch (row.type) {
      case "image": {
        const url = row.content?.imageUrl;
        const isValid = url && url !== "undefined" && url !== "null" && url !== "";
        if (row.content?.banner) {
          return `<div style="background:${row.content.bg || "#1a1a1a"};min-height:100px;display:flex;align-items:flex-end;justify-content:flex-end;padding:16px;margin-bottom:0"><div style="background:#D97706;color:#fff;padding:6px 16px;font-weight:700;font-size:12px;letter-spacing:1px">${row.content.bannerText || "INVESTMENT REPORT"}</div></div>`;
        }
        return isValid
          ? `<div style="margin-bottom:0;text-align:${row.content?.align || "center"}"><img src="${url}" onerror="this.parentElement.style.display='none'" style="width:${row.content?.autoWidth !== false ? "auto" : (row.content?.width || "100%")};max-width:100%;height:${row.content?.autoHeight !== false ? "auto" : (row.content?.height || "auto")};display:block;margin:${row.content?.align === "center" ? "0 auto" : row.content?.align === "right" ? "0 0 0 auto" : "0 auto 0 0"}" /></div>`
          : "";
      }
      case "heading":
        return `<div style="padding:24px 32px 8px;"><h2 style="margin:0;font-family:Arial,sans-serif;font-size:${row.content?.fontSize || 22}px;color:${row.content?.color || "#111"}">${row.content?.headingText || row.content?.text || ""}</h2></div>`;
      case "paragraph":
        return `<div style="padding:12px 32px;font-size:14px;line-height:1.6;color:#374151">${row.content?.html || row.content?.text || ""}</div>`;
      case "divider":
        return `<div style="padding:16px 32px"><hr style="border:none;border-top:${row.content?.lineWidth || 1}px solid ${row.content?.lineColor || "#e5e7eb"};margin:0"/></div>`;
      case "button": {
        const bg = row.content?.bgColor || "#1D4ED8";
        const txt = row.content?.buttonText || row.content?.text || "Click here";
        const align = row.content?.align || "center";
        return `<div style="padding:24px 32px;text-align:${align}"><a href="#" style="background:${bg};color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;display:inline-block">${txt}</a></div>`;
      }
      case "footer":
        return `<div style="background:${row.content?.bg || "#1c170f"};padding:32px;display:flex;align-items:center;justify-content:space-between">
          <div style="color:#fff;font-size:13px;font-weight:300;white-space:pre-line">${row.content?.leftText || ""}</div>
          <div style="color:#fff;font-size:12px;text-align:right">
            <div style="white-space:pre-line;font-weight:500">${row.content?.rightText || ""}</div>
            ${row.content?.buttonText ? `<div style="margin-top:12px;border:1px solid rgba(255,255,255,0.4);border-radius:4px;padding:6px 12px;font-size:10px;letter-spacing:1px;display:inline-block;color:#fff">${row.content.buttonText}</div>` : ""}
          </div>
        </div>`;
      case "kpis": {
        const items = Array.isArray(row.content?.items) ? row.content.items : [{ label: "KPI", value: "0" }];
        return `<div style="padding:32px;display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:20px;background:#f9fafb">
          ${items.map(i => `<div style="text-align:center"><div style="font-size:12px;color:#6b7280;margin-bottom:4px">${i.label}</div><div style="font-size:20px;font-weight:700;color:#111">${i.value}</div></div>`).join("")}
        </div>`;
      }
      case "social": {
        const icons = Array.isArray(row.content?.icons) ? row.content.icons : ["F", "X", "in", "IG"];
        return `<div style="padding:24px 32px;text-align:center;display:flex;justify-content:center;gap:12px">
          ${icons.map(icon => `<div style="width:32px;height:32px;border-radius:50%;background:#3B82F6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${icon}</div>`).join("")}
        </div>`;
      }
      case "video":
        return `<div style="padding:24px 32px"><div style="background:#000;border-radius:8px;height:180px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">YouTube / Video Placeholder</div></div>`;
      case "html":
        return `<div style="padding:16px 32px;font-size:13px">${row.content?.html || ""}</div>`;
      case "table": {
        const tRows = Array.isArray(row.content?.rows) ? row.content.rows : [];
        return `<div style="padding:16px 32px"><table style="width:100%;border-collapse:collapse;font-size:12px">${tRows.map(r => `<tr>${(Array.isArray(r.cells) ? r.cells : []).map(c => `<td style="border:1px solid #e5e7eb;padding:8px">${c.text || ""}</td>`).join("")}</tr>`).join("")}</table></div>`;
      }
      case "columns": {
        const type = row.content?.type;
        const ratios = type === "1/2" ? [1, 1] : type === "1/3" ? [1, 1, 1] : type === "1/4" ? [1, 1, 1, 1] : [1];
        const cols = row.content?.columns || [];
        const colsHtml = (Array.isArray(ratios) ? ratios : []).map((flex, i) => {
          const col = (Array.isArray(cols) ? cols[i] : null) || { blocks: [], settings: {} };
          const blocksHtml = (Array.isArray(col.blocks) ? col.blocks : []).map(b => renderRow(b)).join("");
          return `<div style="flex:${flex};padding:${col.settings?.padding || "10px"}">${blocksHtml}</div>`;
        }).join("");
        return `<div style="display:flex;background:${row.content?.rowBg || "transparent"}">${colsHtml}</div>`;
      }
      default:
        return "";
    }
  };

  const body = (Array.isArray(rows) ? rows : []).map(renderRow).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;font-family:Arial,sans-serif;background:#f3f4f6}*{box-sizing:border-box}</style></head><body><div style="max-width:600px;margin:32px auto;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.08)">${body}</div></body></html>`;
}

const TemplatePlaceholder = ({ isDark }) => (
  <div style={{
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: isDark
      ? "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)"
      : "radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)",
    overflow: "hidden",
    position: "relative"
  }}>
    {/* Background Decorative Elements */}
    <div style={{
      position: "absolute", width: 140, height: 140, borderRadius: "50%",
      background: "rgba(212, 175, 55, 0.08)", top: -40, right: -40, filter: "blur(30px)"
    }} />
    <div style={{
      position: "absolute", width: 100, height: 100, borderRadius: "50%",
      background: "rgba(59, 130, 246, 0.05)", bottom: -30, left: -20, filter: "blur(25px)"
    }} />

    {/* The floating "Template" Page */}
    <div style={{
      width: 75,
      height: 100,
      background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.6)",
      backdropFilter: "blur(10px)",
      border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.5)"}`,
      borderRadius: 8,
      boxShadow: isDark
        ? "0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(212, 175, 55, 0.05)"
        : "0 20px 40px -12px rgba(0, 0, 0, 0.1)",
      display: "flex",
      flexDirection: "column",
      padding: "12px 10px",
      gap: 7,
      transform: "rotate(-3deg) translateY(-2px)",
      zIndex: 2
    }}>
      {/* Header section */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(212, 175, 55, 0.8)" }} />
        <div style={{ width: "50%", height: 3, background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)", borderRadius: 1.5 }} />
      </div>

      {/* Abstract Content lines */}
      <div style={{ width: "100%", height: 2, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 1 }} />
      <div style={{ width: "90%", height: 2, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 1 }} />
      <div style={{ width: "100%", height: 2, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 1 }} />
      <div style={{ width: "85%", height: 2, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 1 }} />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Call to Action "Button" */}
      <div style={{
        width: "100%", height: 12,
        background: "linear-gradient(135deg, #d4af37 0%, #a28131 100%)",
        borderRadius: 4,
        opacity: 0.9,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 10px rgba(212, 175, 55, 0.2)"
      }}>
        <div style={{ width: "30%", height: 1.5, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
      </div>
    </div>

    {/* Secondary floating "card" behind */}
    <div style={{
      position: "absolute",
      width: 75,
      height: 100,
      background: isDark ? "rgba(255, 255, 255, 0.01)" : "rgba(255, 255, 255, 0.3)",
      border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.2)"}`,
      borderRadius: 8,
      transform: "rotate(6deg) translate(8px, 4px)",
      zIndex: 1,
      opacity: 0.6
    }} />
  </div>
);

export default function PageManageTemplates({ t, isDark, setActivePage, setActiveEmailTemplate, allTemplates, loading, fetchTemplates }) {
  const { tenantId, isSuperAdmin, isGlobalRole, profile } = useAuth();
  const isAdmin = isSuperAdmin || isGlobalRole;
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewTemplate, setViewTemplate] = React.useState(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [templateToDelete, setTemplateToDelete] = React.useState(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [showSendPrompt, setShowSendPrompt] = React.useState(null);
  const [sendingEmail, setSendingEmail] = React.useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const TemplateCard = ({ template }) => (
    <div
      onClick={() => setViewTemplate(template)}
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
        e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
      }}
    >
      {/* Badge & Trash Overlay */}
      <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        {!template.isGlobal ? (
          <div style={{
            padding: "3px 8px", borderRadius: 4,
            background: "#D1FAE5", // Light green
            color: "#059669", // Dark green
            fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px"
          }}>
            YOURS
          </div>
        ) : <div />}

        {!template.isGlobal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTemplateToDelete(template);
            }}
            style={{
              background: "#FEE2E2", // Light red
              border: "none",
              borderRadius: 6,
              width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#EF4444",
            }}
            title="Delete template"
          >
            <Trash2 size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div style={{
        height: 140,
        backgroundColor: isDark ? "#111827" : "#F8FAFC",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottom: `1px solid ${t.border}`,
        position: "relative",
        overflow: "hidden"
      }}>
        {template.rows && template.rows.length > 0 ? (
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none" }}>
            <iframe
              srcDoc={generateEmailPreviewHtml(template.rows)}
              title={template.name}
              sandbox="allow-same-origin"
              style={{
                width: 600,
                height: 420,
                border: "none",
                overflow: "hidden",
                transform: "scale(0.47)",
                transformOrigin: "top left",
                pointerEvents: "none",
                display: "block"
              }}
            />
          </div>
        ) : <TemplatePlaceholder isDark={isDark} />}
        {template.isGlobal && (
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

      <div style={{ padding: "14px 16px" }}>
        <h3 style={{ margin: "0 0 4px 0", fontSize: 13, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {template.name}
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: t.textMuted }}>
            <span>Updated {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : "recently"}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, color: t.textSubtle, opacity: 0.5 }}>•</span>
              <span style={{ fontWeight: 600, fontSize: 10, color: t.textSubtle }}>{template.tag || (template.editorMode === 'simple' ? 'Simple' : 'Drag & drop')}</span>
            </div>
          </div>
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

  const handleSendTemplate = async (template, recipients) => {
    if (!recipients) return;
    setSendingEmail(true);
    try {
      // 1. Send via Cloud Function
      const sendFn = httpsCallable(functions, 'sendMarketingEmail');
      const res = await sendFn({
        tenantId,
        campaignId: template.id.replace(/\//g, '_'), // Sanitized ID for logs
        subject: template.name || "Marketing Email",
        rows: template.rows,
        recipients,
        fromName: profile?.displayName || "American Vision Group",
        fromEmail: profile?.email || "",
        replyTo: profile?.email || ""
      });

      // 2. Create a "Sent" record in marketingEmails so it shows in the "Sent" tab
      const campaignData = {
        name: `${template.name} (Sent from Library)`,
        subject: template.name || "Marketing Email",
        rows: template.rows,
        status: "Sent",
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        type: "Marketing",
        recipients: recipients,
        recipientCount: recipients.split(';').length,
        from: profile?.email || "",
        fromName: profile?.displayName || "American Vision Group",
        replyTo: profile?.email || ""
      };

      await addDoc(collection(db, `tenants/${tenantId}/marketingEmails`), campaignData);

      showToast("Email sent successfully and recorded in Sent tab.", "success");
      setShowSendPrompt(null);
    } catch (err) {
      console.error("Error sending template:", err);
      showToast("Error sending template: " + err.message, "error");
    } finally {
      setSendingEmail(false);
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
              if (typeof setActiveEmailTemplate === 'function') {
                setActiveEmailTemplate({ name: "Untitled Template", rows: [], settings: {} });
              }
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
              <div key={idx} style={{ marginBottom: idx === 0 ? 48 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: t.text }}>{section.title}</h2>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, opacity: 0.7 }}>
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
      {/* View Email Modal */}
      {viewTemplate && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{
            width: "80vw",
            height: "85vh",
            minWidth: 400,
            minHeight: 300,
            background: "#fff",
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
            resize: "both",
            position: "relative"
          }}>
            {/* Header */}
            <div style={{ background: isDark ? "#1e293b" : "#1D4ED8", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>View email</span>
              <button onClick={() => setViewTemplate(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", display: "flex", padding: 2 }}>
                <X size={18} />
              </button>
            </div>

            {/* Preview Body */}
            <div style={{ flex: 1, position: "relative", background: "#f3f4f6" }}>
              <iframe
                srcDoc={generateEmailPreviewHtml(viewTemplate.rows)}
                title="Email preview"
                sandbox="allow-same-origin allow-scripts"
                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              />
              
              {/* Resize Handle Visual Hint */}
              <div style={{
                position: "absolute", bottom: 4, right: 4, width: 12, height: 12,
                borderRight: "2px solid #cbd5e1", borderBottom: "2px solid #cbd5e1",
                pointerEvents: "none", opacity: 0.6, zIndex: 10
              }} />
            </div>

            {/* Footer Buttons */}
            <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "14px 20px", display: "flex", gap: 10, justifyContent: "center", flexShrink: 0 }}>
              <button
                onClick={() => {
                  setActiveEmailTemplate({ ...viewTemplate, _useMode: true });
                  setActivePage("Email Builder");
                  setViewTemplate(null);
                }}
                style={{ padding: "9px 20px", borderRadius: 7, background: "#1D4ED8", color: "#fff", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}
              >
                Use template
              </button>
              <button
                onClick={() => {
                  setActiveEmailTemplate(viewTemplate);
                  setActivePage("Email Builder");
                  setViewTemplate(null);
                }}
                style={{ padding: "9px 20px", borderRadius: 7, background: "transparent", color: "#374151", fontWeight: 600, fontSize: 13, border: "1px solid #d1d5db", cursor: "pointer" }}
              >
                Edit template
              </button>
              <button
                onClick={() => setViewTemplate(null)}
                style={{ padding: "9px 20px", borderRadius: 7, background: "transparent", color: "#374151", fontWeight: 600, fontSize: 13, border: "1px solid #d1d5db", cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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

      {showSendPrompt && (
        <PromptModal
          isOpen={!!showSendPrompt}
          onClose={() => setShowSendPrompt(null)}
          onConfirm={(val) => handleSendTemplate(showSendPrompt, val)}
          title="Send Template"
          label="Recipient email(s) (separate with semicolon)"
          placeholder="investor@example.com; partner@example.com"
          confirmLabel={sendingEmail ? "Sending..." : "Send Now"}
          defaultValue=""
          t={t}
          isDark={isDark}
        />
      )}

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

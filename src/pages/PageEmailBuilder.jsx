import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, listAll } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../AuthContext";
import {
  ChevronLeft, ChevronDown, Edit2, UploadCloud, FileEdit, Smartphone, Monitor, Save,
  Columns as ColumnsIcon, TrendingUp, Square, Minus, Type, AlignLeft,
  Image as ImageIcon, FileText, Video, Users, Menu as MenuIcon, Code,
  Table as TableIcon, Search, ChevronRight, ChevronUp, X as XIcon,
  Plus, Trash2, Copy, Settings as SettingsIcon, Paperclip,
  AlignCenter, AlignRight, AlignJustify, Move
} from "lucide-react";

const CDown = () => <ChevronDown size={12} strokeWidth={2.5} style={{ opacity: 0.7 }} />;

// ── Constants ────────────────────────────────────────────────────────────────

const CONTENT_BLOCKS = [
  { label: "COLUMNS",   icon: ColumnsIcon },
  { label: "KPIs",      icon: TrendingUp  },
  { label: "BUTTON",    icon: Square      },
  { label: "DIVIDER",   icon: Minus       },
  { label: "HEADING",   icon: Type        },
  { label: "PARAGRAPH", icon: AlignLeft   },
  { label: "IMAGE",     icon: ImageIcon   },
  { label: "AI SUMMARY",icon: FileText    },
  { label: "VIDEO",     icon: Video       },
  { label: "SOCIAL",    icon: Users       },
  { label: "MENU",      icon: MenuIcon    },
  { label: "HTML",      icon: Code        },
  { label: "TABLE",     icon: TableIcon   },
];

const LABEL_TO_TYPE = {
  "COLUMNS":"columns","KPIs":"kpis","BUTTON":"button","DIVIDER":"divider",
  "HEADING":"heading","PARAGRAPH":"paragraph","IMAGE":"image","AI SUMMARY":"ai_summary",
  "VIDEO":"video","SOCIAL":"social","MENU":"menu","HTML":"html","TABLE":"table"
};

const INITIAL_SETTINGS = {
  subject: "[Template] Investment Report",
  internalName: "Investment reports - March 2026",
  fromName: "American Vision Group",
  from: "invest@americanvisioncap.com",
  replyTo: "invest@americanvisioncap.com",
  previewText: "",
};

const INITIAL_ROWS = [
  {
    id: "r_header", type: "image",
    content: {
      banner: true, bannerText: "INVESTMENT REPORT",
      bg: "linear-gradient(135deg, #2c2518 0%, #a28131 50%, #201a0f 100%)"
    }
  },
  {
    id: "r_body", type: "paragraph",
    content: {
      html: `<p style="margin:0 0 12px 0">Dear <span style="border:1px dashed #9CA3AF;padding:2px 6px;border-radius:4px;color:#6B7280;font-size:11px;background:#F9FAFB">First name</span>,</p>
<p style="margin:0 0 12px 0">We are pleased to inform you that your [YEAR] [QUARTER] distribution report has been uploaded. You can find the report attached to this email, and it is also available for download via your investor portal.</p>
<p style="margin:0 0 10px 0">To access your investor report via portal, please follow these steps:</p>
<ol style="margin:0 0 12px 0;padding-left:20px">
  <li style="margin-bottom:5px">Log into <span style="border:1px dashed #9CA3AF;padding:1px 5px;border-radius:4px;color:#6B7280;font-size:10px">Selected sponsor portal link</span>.</li>
  <li style="margin-bottom:5px">Go to <strong>Investments</strong> on the left navigation menu.</li>
  <li style="margin-bottom:5px">Locate the <strong>Export Summary</strong> button at the top right.</li>
  <li>You have the option to <strong>View</strong> or <strong>Download</strong> your investment report.</li>
</ol>
<p style="margin:0 0 12px 0">If you need assistance, feel free to reach out to at <a href="mailto:invest@americanvisioncap.com" style="color:#D97706">invest@americanvisioncap.com</a> or <a href="tel:+16267654999" style="color:#D97706">+1 (626) 765-4999</a>. We're happy to help.</p>
<p style="margin:0 0 12px 0">We appreciate your partnership and look forward to helping you grow your investments with American Vision Group.</p>
<p style="margin:0 0 10px 0">Best Regards,</p>
<p style="margin:0">Stephanie Lin<br/>CEO &amp; Co-Founder<br/><strong>American Vision Group</strong></p>`
    }
  },
  {
    id: "r_footer", type: "footer",
    content: {
      leftText: "AMERICAN VISION\nGROUP",
      rightText: "Building wealth,\none investment at a time",
      buttonText: "LET'S CONNECT",
      bg: "linear-gradient(135deg, #1c170f 0%, #826521 50%, #15110a 100%)"
    }
  }
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function PageEmailBuilder({ t, isDark, setActivePage, activeEmailTemplate, refreshTemplates }) {
  const [activeMainTab, setActiveMainTab] = useState("Edit");
  const [activeRightTab, setActiveRightTab] = useState("Content");
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedBlockType, setSelectedBlockType] = useState(null);
  const [emailName, setEmailName] = useState(activeEmailTemplate?.name || "Investment reports - March 2026");
  const [editingName, setEditingName] = useState(false);
  const [emailSettings, setEmailSettings] = useState(activeEmailTemplate?.settings || INITIAL_SETTINGS);
  const [rows, setRows] = useState(activeEmailTemplate?.rows || INITIAL_ROWS);
  const [uploads, setUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { profile, tenantId, isSuperAdmin, isGlobalRole } = useAuth();
  const isAdmin = isSuperAdmin || isGlobalRole;

  useEffect(() => {
    if (activeEmailTemplate) {
      if (activeEmailTemplate.rows) setRows(activeEmailTemplate.rows);
      if (activeEmailTemplate.settings) setEmailSettings(activeEmailTemplate.settings);
      if (activeEmailTemplate.name) setEmailName(activeEmailTemplate.name);
    }
  }, [activeEmailTemplate]);

  useEffect(() => {
    const fetchUploads = async () => {
      if (!tenantId) return;
      try {
        const res = await listAll(ref(storage, `tenants/${tenantId}/marketing_uploads`));
        const urls = await Promise.all(res.items.reverse().map(r => getDownloadURL(r)));
        setUploads(urls);
      } catch (err) { console.error(err); }
    };
    fetchUploads();
  }, [tenantId]);

  const handleUploadFile = async (file, onComplete) => {
    if (!file) return;
    if (!tenantId) {
      showToast("No tenant ID found. Cannot upload.", "error");
      return;
    }
    setIsUploading(true);
    const storageRef = ref(storage, `tenants/${tenantId}/marketing_uploads/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on("state_changed",
      snap => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      err => { console.error(err); setIsUploading(false); },
      () => {
        getDownloadURL(task.snapshot.ref).then(url => {
          setUploads(p => [url, ...p]);
          setIsUploading(false);
          setUploadProgress(0);
          if (onComplete) onComplete(url);
          showToast("Image uploaded successfully!", "success");
        });
      }
    );
  };

  const handleSave = async () => {
    if (!tenantId && !isAdmin) {
      showToast("No tenant ID found. Cannot save.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const sanitizedName = emailName.replace(/[/\s]+/g, "_").trim();
      const isSavingAsGlobal = isAdmin && activeEmailTemplate?.isGlobal;
      
      const templateData = {
        name: emailName,
        settings: emailSettings,
        rows: rows,
        updatedAt: new Date().toISOString(),
        updatedBy: profile?.email || "unknown",
        category: (isSavingAsGlobal || !activeEmailTemplate) ? "Global" : (activeEmailTemplate.category || "Your templates"),
        tag: activeEmailTemplate?.tag || "Custom",
        isGlobal: !!isSavingAsGlobal
      };

      // Path: tenants/{id}/templates/{name}.json
      // If admin saving a global template, we overwrite global_templates/
      let path = `tenants/${tenantId}/templates/${sanitizedName}.json`;
      
      if (isSavingAsGlobal) {
        path = `global_templates/${sanitizedName}.json`;
      }

      const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: "application/json" });
      const storageRef = ref(storage, path);
      await uploadBytesResumable(storageRef, blob);
      
      if (refreshTemplates) await refreshTemplates();
      showToast(isSavingAsGlobal ? "Global template saved!" : "Template saved to your library!", "success");
    } catch (err) {
      console.error(err);
      showToast("Error saving template", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); }; // eslint-disable-line

  const RIGHT_TABS = [
    { id: "Content", icon: Square },
    { id: "Blocks",  icon: ColumnsIcon },
    { id: "Body",    icon: AlignLeft },
    { id: "Images",  icon: ImageIcon },
    { id: "Uploads", icon: UploadCloud },
    { id: "Audit",   icon: FileText },
  ];

  const showBlockProps = !!(selectedRowId && selectedBlockType && activeRightTab === "Content");

  const handleSelectRow = (rowId, blockType) => {
    setSelectedRowId(rowId);
    setSelectedBlockType(blockType || null);
    setActiveRightTab("Content");
  };

  const handleDeselect = () => { setSelectedRowId(null); setSelectedBlockType(null); };

  const handleAddRow = (relativeId, label = "PARAGRAPH", position = "after") => {
    const type = LABEL_TO_TYPE[label] || "paragraph";
    const newRow = { id: `r_${Date.now()}`, type, content: {} };
    
    if (type === "columns") {
      newRow.content = {
        layout: "50-50",
        columns: [
          { id: `c_${Date.now()}_0`, blocks: [], settings: { padding: "10px" } },
          { id: `c_${Date.now()}_1`, blocks: [], settings: { padding: "10px" } }
        ]
      };
    }

    setRows(prev => {
      if (!relativeId) return [...prev, newRow];
      const idx = prev.findIndex(r => r.id === relativeId);
      if (idx === -1) return [...prev, newRow]; // Should not happen for top level rows if relativeId is correct

      const next = [...prev];
      const insertIdx = position === "before" ? idx : idx + 1;
      next.splice(insertIdx, 0, newRow);
      return next;
    });
    setSelectedRowId(newRow.id);
    setSelectedBlockType(label);
  };

  const handleAddBlockToColumn = (rowId, colIdx, label) => {
    const type = LABEL_TO_TYPE[label] || "paragraph";
    const newBlock = { id: `b_${Date.now()}`, type, content: {} };
    
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const newCols = [...(r.content.columns || [])];
      if (!newCols[colIdx]) return r;
      newCols[colIdx] = { 
        ...newCols[colIdx], 
        blocks: [...(newCols[colIdx].blocks || []), newBlock] 
      };
      return { ...r, content: { ...r.content, columns: newCols } };
    }));
    setSelectedRowId(newBlock.id);
    setSelectedBlockType(label);
  };

  const handleDeleteRow = (rowId) => {
    setRows(prev => {
      // Top level delete
      let next = prev.filter(r => r.id !== rowId);
      // Nested level delete
      next = next.map(r => {
        if (r.type !== "columns") return r;
        const newCols = r.content.columns?.map(col => ({
          ...col,
          blocks: col.blocks.filter(b => b.id !== rowId)
        }));
        return { ...r, content: { ...r.content, columns: newCols } };
      });
      return next;
    });
    if (selectedRowId === rowId) handleDeselect();
  };

  const handleDuplicateRow = (rowId) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === rowId);
      if (idx !== -1) {
        // Top level duplicate
        const row = prev[idx];
        const newRow = JSON.parse(JSON.stringify(row));
        newRow.id = `r_${Date.now()}`;
        const next = [...prev];
        next.splice(idx + 1, 0, newRow);
        return next;
      }
      // Nested level duplicate
      return prev.map(r => {
        if (r.type !== "columns") return r;
        const newCols = r.content.columns?.map(col => {
          const bIdx = col.blocks.findIndex(b => b.id === rowId);
          if (bIdx === -1) return col;
          const newBlock = JSON.parse(JSON.stringify(col.blocks[bIdx]));
          newBlock.id = `b_${Date.now()}`;
          const newBlocks = [...col.blocks];
          newBlocks.splice(bIdx + 1, 0, newBlock);
          return { ...col, blocks: newBlocks };
        });
        return { ...r, content: { ...r.content, columns: newCols } };
      });
    });
  };

  const handleUpdateRow = (rowId, patch) => {
    setRows(prev => {
      const updateObj = (r) => {
        if (r.id !== rowId) return r;
        let newContent = { ...r.content, ...patch };
        
        // Auto-manage columns array if layout changed
        if (patch.layout && r.type === "columns") {
           const count = patch.layout.split("-").length;
           let newCols = [...(newContent.columns || [])];
           if (newCols.length < count) {
             for (let i = newCols.length; i < count; i++) {
               newCols.push({ id: `c_${Date.now()}_${i}`, blocks: [], settings: { padding: "10px" } });
             }
           } else if (newCols.length > count) {
             newCols = newCols.slice(0, count);
           }
           newContent.columns = newCols;
        }
        return { ...r, content: newContent };
      };

      // Top level
      let next = prev.map(updateObj);
      
      // Nested
      next = next.map(r => {
        if (r.type !== "columns") return r;
        const newCols = r.content.columns?.map(col => ({
          ...col,
          blocks: col.blocks.map(updateObj)
        }));
        return { ...r, content: { ...r.content, columns: newCols } };
      });
      return next;
    });
  };

  const MAIN_TABS = [
    { id: "Edit",    label: "Edit",           icon: <FileEdit size={13} /> },
    { id: "Settings",label: "Settings",       icon: <SettingsIcon size={13} /> },
    { id: "Mobile",  label: "Mobile review",  icon: <Smartphone size={13} /> },
    { id: "Desktop", label: "Desktop review", icon: <Monitor size={13} /> },
  ];

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif", background: t.background }}
      onClick={handleDeselect}
    >
      {/* ── Top Toolbar ── */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => setActivePage("Manage Templates")}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 20, padding: "4px 12px", cursor: "pointer", color: isDark ? "#60A5FA" : "#3B82F6", fontSize: 13, fontWeight: 600 }}
          >
            <ChevronLeft size={15} /> Back
          </button>
          {editingName ? (
            <input
              autoFocus value={emailName}
              onChange={e => setEmailName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => e.key === "Enter" && setEditingName(false)}
              style={{ fontSize: 14, fontWeight: 600, color: t.text, border: `1px solid ${isDark ? "#60A5FA" : "#3B82F6"}`, borderRadius: 6, padding: "3px 8px", background: t.surface, outline: "none", minWidth: 220 }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: t.text }}>
              {emailName}
              <Edit2 size={13} color={t.textMuted} style={{ cursor: "pointer" }} onClick={() => setEditingName(true)} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button 
            onClick={() => {
              const newName = prompt("Enter a name for the new template copy:", `${emailName} (Copy)`);
              if (newName && newName.trim()) {
                setEmailName(newName.trim());
                setTimeout(() => handleSave(), 100);
              }
            }}
            style={{ 
              background: "transparent", 
              color: "#1D4ED8", 
              border: `1px solid #1D4ED8`, 
              borderRadius: 24, 
              padding: "7px 18px", 
              fontSize: 13, 
              fontWeight: 600, 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: 8 
            }}
          >
            <Save size={14} /> Save as new template
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{ 
              background: "transparent", 
              color: "#1D4ED8", 
              border: `1px solid #1D4ED8`, 
              borderRadius: 24, 
              padding: "7px 18px", 
              fontSize: 13, 
              fontWeight: 600, 
              cursor: isSaving ? "not-allowed" : "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              opacity: isSaving ? 0.7 : 1 
            }}
          >
            <Save size={14} /> {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* ── Sub Toolbar ── */}
      <div
        style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${t.border}`, background: t.surface, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex" }}>
          {MAIN_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
                background: "transparent", border: "none", cursor: "pointer",
                color: activeMainTab === tab.id ? (isDark ? "#60A5FA" : "#2563EB") : t.textMuted,
                fontSize: 13, fontWeight: activeMainTab === tab.id ? 600 : 500,
                borderBottom: activeMainTab === tab.id ? `2px solid ${isDark ? "#60A5FA" : "#2563EB"}` : "2px solid transparent",
                marginBottom: -1
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingRight: 16 }}>
          {/* Empty space for alignment balance */}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Canvas / Settings / Preview */}
        {activeMainTab === "Settings" ? (
          <SettingsPanel t={t} isDark={isDark} settings={emailSettings} onChange={setEmailSettings} />
        ) : activeMainTab === "Mobile" ? (
          <ReviewPanel t={t} isDark={isDark} rows={rows} emailSettings={emailSettings} narrow />
        ) : activeMainTab === "Desktop" ? (
          <ReviewPanel t={t} isDark={isDark} rows={rows} emailSettings={emailSettings} />
        ) : (
          <EmailCanvas
            t={t} isDark={isDark} rows={rows}
            selectedRowId={selectedRowId}
            onSelectRow={handleSelectRow}
            onAddRow={handleAddRow}
            onDeleteRow={handleDeleteRow}
            onDuplicateRow={handleDuplicateRow}
            onUpdateRow={handleUpdateRow}
          />
        )}

        {/* Right Sidebar – only in Edit mode */}
        {activeMainTab === "Edit" && (
          <div
            style={{ width: 380, background: t.surface, borderLeft: `1px solid ${t.border}`, display: "flex", flexShrink: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {showBlockProps ? (
                <BlockPropsPanel
                  t={t} isDark={isDark} blockType={selectedBlockType} rowId={selectedRowId}
                  onUpdate={handleUpdateRow} onClose={handleDeselect} rows={rows}
                  uploads={uploads} isUploading={isUploading} uploadProgress={uploadProgress}
                  onUpload={handleUploadFile} setActiveRightTab={setActiveRightTab}
                />
              ) : (
                <>
                  {activeRightTab === "Content"  && <ContentTab   t={t} isDark={isDark} onAddRow={handleAddRow} />}
                  {activeRightTab === "Blocks"   && <BlocksTab    t={t} isDark={isDark} />}
                  {activeRightTab === "Body"     && <BodyTab      t={t} isDark={isDark} />}
                  {activeRightTab === "Images"   && <ImagesTab    t={t} isDark={isDark} setActiveRightTab={setActiveRightTab} />}
                  {activeRightTab === "Uploads"  && (
                    <UploadsTab
                      t={t} isDark={isDark}
                      uploads={uploads}
                      isUploading={isUploading}
                      uploadProgress={uploadProgress}
                      onUpload={handleUploadFile}
                    />
                  )}
                  {activeRightTab === "Audit"    && (
                    <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontSize: 13, marginTop: 40 }}>
                      <FileText size={32} style={{ margin: "0 auto 14px", display: "block", opacity: 0.4 }} />
                      No audits found. Your email looks great!
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Far-right vertical tab strip */}
            <div style={{ width: 60, borderLeft: `1px solid ${t.border}`, display: "flex", flexDirection: "column", background: isDark ? "#111" : "#FAFAFA" }}>
              {RIGHT_TABS.map(rt => {
                const active = activeRightTab === rt.id && !showBlockProps;
                return (
                  <div
                    key={rt.id}
                    onClick={() => { setActiveRightTab(rt.id); handleDeselect(); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      padding: "13px 0", cursor: "pointer",
                      background: active ? t.surface : "transparent",
                      borderLeft: active ? `3px solid ${isDark ? "#60A5FA" : "#3B82F6"}` : "3px solid transparent",
                      color: active ? (isDark ? "#60A5FA" : "#3B82F6") : t.textMuted
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <rt.icon size={18} strokeWidth={1.5} />
                      {rt.id === "Audit" && (
                        <span style={{ position: "absolute", top: -5, right: -7, background: "#EF4444", color: "#fff", fontSize: 8, fontWeight: 700, width: 13, height: 13, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                      )}
                    </div>
                    <span style={{ fontSize: 8.5, fontWeight: active ? 600 : 400, textAlign: "center" }}>{rt.id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "12px 18px", fontSize: 13, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10 }}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 15, marginLeft: 4, opacity: 0.7 }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Email Canvas ─────────────────────────────────────────────────────────────

// ── Email Canvas ─────────────────────────────────────────────────────────────

function EmailCanvas({ t, isDark, rows, selectedRowId, onSelectRow, onAddRow, onDeleteRow, onDuplicateRow, onUpdateRow, onAddBlockToColumn, setActiveRightTab }) {
  const [dropIdx, setDropIdx] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropIdx(idx);
  };

  const handleDrop = (e, afterIdx) => {
    e.preventDefault();
    setDropIdx(null);
    const label = e.dataTransfer.getData("blockLabel");
    if (!label) return;
    const afterId = afterIdx >= 0 ? rows[afterIdx]?.id : null;
    onAddRow(afterId, label);
  };

  return (
    <div
      id="email-canvas-wrapper"
      style={{ flex: 1, background: isDark ? "#1a1a1a" : "#EEEEE9", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", overflowY: "auto", overflowX: "hidden" }}
      onDragOver={e => { e.preventDefault(); if (rows.length === 0) setDropIdx(-1); }}
      onDragLeave={() => setDropIdx(null)}
    >
      <div style={{ width: "100%", maxWidth: 780 }}>
        {/* Drop zone before first row */}
        <DropZone active={dropIdx === -1} onDragOver={e => handleDragOver(e, -1)} onDrop={e => handleDrop(e, -1)} />
        {rows.map((row, idx) => (
          <React.Fragment key={row.id}>
            <EmailRow
              row={row}
              isSelected={selectedRowId === row.id}
              isHovered={hoveredRowId === row.id}
              onSelect={onSelectRow}
              onHover={setHoveredRowId}
              onDelete={() => onDeleteRow(row.id)}
              onDuplicate={() => onDuplicateRow(row.id)}
              onUpdate={patch => onUpdateRow(row.id, patch)}
              onAddRow={onAddRow}
              onAddBlockToColumn={onAddBlockToColumn}
              setActiveRightTab={setActiveRightTab}
              t={t} isDark={isDark}
              selectedRowId={selectedRowId}
              hoveredRowId={hoveredRowId}
            />
            <DropZone active={dropIdx === idx} onDragOver={e => handleDragOver(e, idx)} onDrop={e => handleDrop(e, idx)} />
          </React.Fragment>
        ))}

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF" }}>
          Don't want to receive this type of email?{" "}
          <a href="#" onClick={e => e.preventDefault()} style={{ color: isDark ? "#60A5FA" : "#2563EB", textDecoration: "none" }}>Unsubscribe</a>
        </div>
      </div>
    </div>
  );
}

function DropZone({ active, onDragOver, onDrop }) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={e => { e.stopPropagation(); onDrop(e); }}
      style={{
        height: active ? 40 : 8, transition: "height 0.15s",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "rgba(59,130,246,0.12)" : "transparent",
        border: active ? "2px dashed #3B82F6" : "2px solid transparent",
        borderRadius: 4,
      }}
    >
      {active && <span style={{ fontSize: 11, color: "#3B82F6", fontWeight: 600 }}>Drop here</span>}
    </div>
  );
}

const ROW_BLOCK_TYPE = {
  image: "IMAGE", paragraph: "PARAGRAPH", footer: "IMAGE",
  button: "BUTTON", divider: "DIVIDER", heading: "HEADING",
  video: "VIDEO", social: "SOCIAL", html: "HTML", table: "TABLE",
  columns: "COLUMNS", menu: "MENU", kpis: "KPIs", ai_summary: "AI SUMMARY"
};

function AddRowBtn({ onClick, position, isDark }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        position: "absolute", left: "50%", transform: "translateX(-50%)",
        top: position === "top" ? -11 : "auto",
        bottom: position === "bottom" ? -11 : "auto",
        zIndex: 25, cursor: "pointer",
        background: "#3B82F6", color: "#fff",
        borderRadius: "50%", width: 22, height: 22,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        border: "1px solid #fff",
        transition: "transform 0.15s"
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateX(-50%) scale(1.15)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateX(-50%) scale(1)"}
    >
      <Plus size={14} strokeWidth={4} />
    </div>
  );
}

function EmailRow({ row, isSelected, isHovered, onSelect, onHover, onDelete, onDuplicate, onUpdate, onAddRow, onAddBlockToColumn, setActiveRightTab, t, isDark, selectedRowId, hoveredRowId, isNested }) {
  const blockType = ROW_BLOCK_TYPE[row.type] || "PARAGRAPH";
  const showControls = (isSelected || isHovered) && !isNested;

  const MoveHandle = () => (
    <div style={{
      position: "absolute", right: -32, top: "50%", transform: "translateY(-50%)",
      width: 28, height: 28, borderRadius: "50%", background: "#3B82F6",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "grab", color: "#fff", zIndex: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
    }}>
      <Move size={14} />
    </div>
  );

  const renderContent = (item, isNested) => {
    switch (item.type) {
      case "columns": {
        const layout = item.content?.layout || "50-50";
        const ratios = layout.split("-").map(Number);
        const columnData = item.content?.columns || [];

        return (
          <div style={{ display: "flex", width: "100%", background: item.content?.rowBg || "transparent", minHeight: 60 }}>
            {ratios.map((flex, i) => {
              const col = columnData[i] || { blocks: [], settings: {} };
              return (
                <div
                  key={i}
                  onDragOverCapture={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; }}
                  onDropCapture={e => {
                    e.preventDefault(); e.stopPropagation();
                    const label = e.dataTransfer.getData("blockLabel");
                    if (label) onAddBlockToColumn(item.id, i, label);
                  }}
                  style={{
                    flex: `${flex} 1 0%`,
                    padding: col.settings?.padding || "10px",
                    background: col.settings?.bgColor || "transparent",
                    border: `1px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
                    display: "flex", flexDirection: "column", gap: 8
                  }}
                >
                  {col.blocks?.length > 0 ? (
                    col.blocks.map(b => (
                      <EmailRow
                        key={b.id}
                        row={b}
                        isSelected={selectedRowId === b.id}
                        onSelect={onSelect}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        onUpdate={onUpdate}
                        t={t} isDark={isDark}
                        isNested
                      />
                    ))
                  ) : (
                    <div
                      onClick={e => { e.stopPropagation(); onSelect(item.id, "COLUMNS"); setActiveRightTab("Content"); }}
                      style={{
                        padding: "20px 10px", textAlign: "center",
                        color: t.textMuted, fontSize: 11,
                        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                        borderRadius: 4, cursor: "pointer", border: `1px dashed ${t.border}`
                      }}
                    >
                      <Plus size={14} style={{ display: "block", margin: "0 auto 6px", opacity: 0.5 }} />
                      No content here. Drag content from right.
                      <button style={{ display: "block", margin: "8px auto 0", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        Add Content
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      case "image":
        if (item.content?.banner) return (
          <div style={{ background: item.content.bg, minHeight: 120, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
            {item.content.bannerText && (
              <div style={{ background: "#D97706", color: "#fff", padding: "7px 20px", fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
                {item.content.bannerText}
              </div>
            )}
          </div>
        );
        const align = item.content?.align || "center";
        const autoWidth = item.content?.autoWidth !== false;
        const width = item.content?.width ?? "100%";
        const imgStyle = {
          width: align === "justify" ? "100%" : (autoWidth ? "auto" : width),
          display: "block",
          marginLeft: (align === "center" || align === "right" || align === "justify") ? "auto" : "0",
          marginRight: (align === "center" || align === "left" || align === "justify") ? "auto" : "0",
          maxWidth: "100%"
        };
        return item.content?.imageUrl ? (
          <img src={item.content.imageUrl} alt={item.content.altText || ""} style={imgStyle} />
        ) : (
          <div style={{ background: isDark ? "#222" : "#F3F4F6", minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted }}>
            <ImageIcon size={32} opacity={0.4} />
          </div>
        );

      case "paragraph":
        return (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={e => onUpdate(item.id, { html: e.currentTarget.innerHTML })}
            onClick={e => e.stopPropagation()}
            style={{ padding: isNested ? "12px 16px" : "24px 32px", background: "#fff", color: "#1F2937", fontSize: 13, lineHeight: 1.65, outline: "none", minHeight: 40 }}
            dangerouslySetInnerHTML={{ __html: item.content?.html || "<p>New paragraph block. Click to edit.</p>" }}
          />
        );

      case "footer":
        return (
          <div style={{ background: item.content?.bg || "#1c170f", padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 300, whiteSpace: "pre-line" }}>{item.content?.leftText || "COMPANY"}</div>
            <div style={{ color: "#fff", fontSize: 12, textAlign: "right" }}>
              <div style={{ whiteSpace: "pre-line", fontWeight: 500 }}>{item.content?.rightText}</div>
              {item.content?.buttonText && (
                <div style={{ marginTop: 8, border: "1px solid rgba(255,255,255,0.5)", borderRadius: 2, padding: "4px 12px", fontSize: 10, letterSpacing: 1, display: "inline-block", cursor: "pointer" }}>
                  {item.content.buttonText}
                </div>
              )}
            </div>
          </div>
        );

      case "button":
        return (
          <div style={{ padding: "16px 32px", background: "#fff", display: "flex", justifyContent: "center" }}>
            <div style={{ background: item.content?.bgColor || "#1D4ED8", color: item.content?.textColor || "#fff", padding: "10px 24px", borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {item.content?.buttonText || "Button Text"}
            </div>
          </div>
        );

      case "divider":
        return (
          <div style={{ padding: "16px 32px", background: "#fff" }}>
            <hr style={{ border: "none", borderTop: `${item.content?.lineWidth || 1}px solid ${item.content?.lineColor || "#E5E7EB"}`, margin: 0 }} />
          </div>
        );

      case "heading":
        return (
          <div style={{ padding: "16px 32px", background: "#fff" }}>
            <h2
              contentEditable
              suppressContentEditableWarning
              onBlur={e => onUpdate(item.id, { headingText: e.currentTarget.innerText })}
              onClick={e => e.stopPropagation()}
              style={{ margin: 0, fontSize: item.content?.fontSize || 22, fontWeight: 700, color: item.content?.color || "#1F2937", outline: "none" }}
              dangerouslySetInnerHTML={{ __html: item.content?.headingText || "Heading" }}
            />
          </div>
        );

      case "video":
        return (
          <div style={{ padding: "16px 32px", background: "#fff" }}>
            {item.content?.videoUrl ? (
              <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000", borderRadius: 4, overflow: "hidden" }}>
                <iframe src={item.content.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen />
              </div>
            ) : (
              <div style={{ background: "#F3F4F6", height: 150, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>
                <Video size={32} color="#9CA3AF" />
              </div>
            )}
          </div>
        );

      case "social":
        return (
          <div style={{ padding: "16px 32px", background: "#fff", display: "flex", justifyContent: "center", gap: 8 }}>
            {(item.content?.icons || ["F", "𝕏", "in", "📷"]).map((s, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>{s}</div>
            ))}
          </div>
        );

      case "html":
        return <div style={{ padding: "16px 32px", background: "#fff", fontSize: 13, color: "#1F2937" }} dangerouslySetInnerHTML={{ __html: item.content?.html || "<strong>Hello, world!</strong>" }} />;

      default:
        return (
          <div style={{ padding: "24px 32px", background: isDark ? "#1F2937" : "#F9FAFB", textAlign: "center", color: t.textMuted, fontSize: 13, minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={14} style={{ marginRight: 6 }} /> Add Content
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: "relative",
        cursor: "pointer",
        outline: (isSelected || isHovered) ? `2px solid #3B82F6` : "none",
        outlineOffset: (isSelected || isHovered) ? -2 : 0,
        transition: "outline 0.1s, background 0.2s",
        background: (isSelected || isHovered) ? "rgba(59,130,246,0.05)" : "transparent",
        marginBottom: isSelected ? 8 : 0,
        marginTop: isSelected ? 8 : 0,
        zIndex: (isSelected || isHovered) ? 10 : 1
      }}
      onMouseEnter={() => !isNested && onHover(row.id)}
      onMouseLeave={() => !isNested && onHover(null)}
      onClick={e => { e.stopPropagation(); onSelect(row.id, blockType); }}
    >
      {/* Full-width highlight strip (optional visual) */}
      {(isSelected || isHovered) && !isNested && (
        <div style={{
          position: "absolute", left: -2000, right: -2000, top: 0, bottom: 0,
          background: isSelected ? "rgba(59,130,246,0.03)" : "rgba(0,0,0,0.02)",
          zIndex: -1, pointerEvents: "none"
        }} />
      )}

      {showControls && onAddRow && <AddRowBtn isDark={isDark} position="top" onClick={() => onAddRow(row.id, "COLUMNS", "before")} />}
      
      {renderContent(row, isNested)}

      {showControls && onAddRow && <AddRowBtn isDark={isDark} position="bottom" onClick={() => onAddRow(row.id, "COLUMNS", "after")} />}

      {showControls && (
        <>
          <MoveHandle />
          <div style={{
            position: "absolute", top: 0, right: -40, background: "#3B82F6",
            color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: "0 4px 4px 0",
            fontWeight: 800, textTransform: "uppercase", zIndex: 11
          }}>
            Row
          </div>
          
          {isSelected && (
            <div style={{
              position: "absolute", bottom: -12, right: 0,
              display: "flex", gap: 6, zIndex: 30,
              background: t.surface, padding: "6px 10px", borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: `1px solid ${t.border}`
            }}>
              <button onClick={e => { e.stopPropagation(); onDuplicate(row.id); }} style={{ ...ctrlBtn, background: t.surface, color: t.text }} title="Duplicate"><Copy size={12} /></button>
              <button onClick={e => { e.stopPropagation(); onDelete(row.id); }} style={{ ...ctrlBtn, background: "#EF4444", color: "#fff" }} title="Delete"><Trash2 size={12} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const ctrlBtn = { background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 3, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

// ── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({ t, isDark, settings, onChange }) {
  const set = (key, val) => onChange(prev => ({ ...prev, [key]: val }));
  const Row = ({ label, children }) => (
    <div style={{ display: "flex", alignItems: "center", paddingBottom: 20, borderBottom: `1px solid ${t.border}` }}>
      <div style={{ width: 140, fontSize: 13, color: t.textMuted, flexShrink: 0 }}>{label}</div>
      {children}
    </div>
  );
  return (
    <div style={{ flex: 1, background: isDark ? "#111" : "#EEEEE9", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 680, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}` }}>
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${t.border}` }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.text }}>Email settings &amp; recipients</h3>
        </div>
        <div style={{ padding: "28px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          <Row label="Subject">
            <input value={settings.subject} onChange={e => set("subject", e.target.value)} style={{ flex: 1, border: "none", borderBottom: `1px solid ${t.border}`, background: "transparent", fontSize: 13, color: t.text, outline: "none", padding: "2px 0" }} />
          </Row>
          <Row label="Internal name">
            <input value={settings.internalName} onChange={e => set("internalName", e.target.value)} style={{ flex: 1, border: "none", borderBottom: `1px solid ${t.border}`, background: "transparent", fontSize: 13, color: t.text, outline: "none", padding: "2px 0" }} />
          </Row>
          <Row label="Recipients">
            <div style={{ flex: 1 }} />
            <button style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px 14px", background: "transparent", cursor: "pointer", color: t.text, fontSize: 12.5, fontWeight: 500 }}>
              👁 View recipients
            </button>
          </Row>
          <Row label="From name">
            <input value={settings.fromName} onChange={e => set("fromName", e.target.value)} style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: t.text, outline: "none" }} />
            <button style={{ border: `1px solid ${t.border}`, borderRadius: 6, padding: "5px 12px", background: "transparent", cursor: "pointer", color: t.text, fontSize: 12, flexShrink: 0 }}>Return to dropdown</button>
          </Row>
          <Row label="From">
            <div style={{ flex: 1, fontSize: 13, color: t.text }}>{settings.from}</div>
            <button style={{ border: `1px solid ${t.border}`, borderRadius: 6, padding: "5px 10px", background: "transparent", cursor: "pointer", color: t.text, fontSize: 12, marginRight: 10 }}>✏️ Edit</button>
            <span style={{ fontSize: 12, color: t.textMuted, cursor: "pointer", whiteSpace: "nowrap" }}>Add email signature ℹ</span>
          </Row>
          <Row label="Reply-to">
            <input value={settings.replyTo} onChange={e => set("replyTo", e.target.value)} style={{ flex: 1, border: "none", borderBottom: `1px solid ${t.border}`, background: "transparent", fontSize: 13, color: t.text, outline: "none" }} />
            <CDown />
          </Row>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: 140, fontSize: 13, color: t.textMuted, paddingTop: 3, flexShrink: 0 }}>Preview text <span style={{ fontSize: 10 }}>ℹ</span></div>
            <input value={settings.previewText} onChange={e => set("previewText", e.target.value)} placeholder="Enter email preview text" style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: t.text, outline: "none" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Review Panels ─────────────────────────────────────────────────────────────

function ReviewPanel({ t, isDark, rows, emailSettings, narrow }) {
  return (
    <div style={{ flex: 1, background: isDark ? "#111" : "#EEEEE9", display: "flex", gap: 24, padding: 40, overflowY: "auto" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {narrow && (
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "7px 14px", fontSize: 12, color: "#2563EB", display: "flex", alignItems: "center", gap: 6 }}>
            ℹ Discover mobile email styling tips. <span style={{ textDecoration: "underline", cursor: "pointer" }}>Learn more</span>
          </div>
        )}
        <div style={{ width: narrow ? 390 : "100%", maxWidth: narrow ? 390 : 780, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
          {rows.map(row => <RowPreview key={row.id} row={row} narrow={narrow} />)}
          <div style={{ textAlign: "center", padding: 12, fontSize: 11, color: "#6B7280", background: "#EEEEE9" }}>
            Don't want to see this type of email? <a href="#" style={{ color: "#2563EB" }}>Unsubscribe</a>
          </div>
        </div>
      </div>

      <div style={{ width: 220, background: t.surface, borderRadius: 10, border: `1px solid ${t.border}`, padding: 20, height: "fit-content", flexShrink: 0 }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 700, color: t.text }}>Email info</h4>
        {[["From:", emailSettings.from], ["From name:", emailSettings.fromName], ["Reply-to:", emailSettings.replyTo], ["Subject:", emailSettings.subject], ["Recipients:", "—"]].map(([label, val]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, color: val === "—" ? t.textMuted : t.text }}>{val || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RowPreview({ row, narrow }) {
  const p = narrow ? "14px 18px" : "22px 30px";
  switch (row.type) {
    case "image":
      if (row.content?.banner) return (
        <div style={{ background: row.content.bg, minHeight: narrow ? 80 : 120, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
          {row.content.bannerText && <div style={{ background: "#D97706", color: "#fff", padding: narrow ? "5px 14px" : "7px 20px", fontWeight: 700, fontSize: narrow ? 11 : 13, letterSpacing: 1 }}>{row.content.bannerText}</div>}
        </div>
      );
      return <div style={{ height: narrow ? 80 : 120, background: "#F3F4F6" }} />;
    case "paragraph":
      return <div style={{ padding: p, background: "#fff", color: "#1F2937", fontSize: narrow ? 12 : 13, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: row.content?.html || "" }} />;
    case "footer":
      return (
        <div style={{ background: row.content?.bg || "#1c170f", padding: p, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: "#fff", fontSize: narrow ? 10 : 14, fontWeight: 300, whiteSpace: "pre-line" }}>{row.content?.leftText}</div>
          <div style={{ color: "#fff", fontSize: narrow ? 9 : 12, textAlign: "right" }}>
            <div style={{ whiteSpace: "pre-line" }}>{row.content?.rightText}</div>
            {row.content?.buttonText && <div style={{ marginTop: 6, border: "1px solid rgba(255,255,255,0.5)", borderRadius: 2, padding: "3px 10px", fontSize: 9, display: "inline-block", letterSpacing: 1 }}>{row.content.buttonText}</div>}
          </div>
        </div>
      );
    default:
      return <div style={{ height: 40, background: "#fff" }} />;
  }
}

// ── Block Properties Panel ────────────────────────────────────────────────────

function BlockPropsPanel({ t, isDark, blockType, rowId, onUpdate, rows, onClose, uploads, isUploading, uploadProgress, onUpload, setActiveRightTab }) {
  const row = rows?.find(r => r.id === rowId);
  const content = row?.content || {};
  const upd = patch => onUpdate(rowId, patch);

  const fileInputRef = useRef(null);

  const [open, setOpen] = useState({ displayCondition: false, main: true, action: true, general: true, responsive: true, links: false, columnProps: false, header: true, menuItems: true });
  const tog = id => setOpen(p => ({ ...p, [id]: !p[id] }));

  const Sec = ({ id, label, children }) => (
    <div>
      <div onClick={() => tog(id)} style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", cursor: "pointer", borderBottom: `1px solid ${t.border}`, background: isDark ? "#161616" : "#F9FAFB" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{label}</span>
        {open[id] ? <ChevronUp size={13} color={t.textMuted} /> : <CDown />}
      </div>
      {open[id] && <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, borderBottom: `1px solid ${t.border}` }}>{children}</div>}
    </div>
  );

  const PR = ({ label, children }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: t.textMuted }}>{label}</span>
      <div>{children}</div>
    </div>
  );

  const Swatch = ({ color = "#000" }) => <div style={{ width: 22, height: 22, background: color, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer" }} />;
  const Toggle = ({ on = true }) => (
    <div style={{ width: 32, height: 18, background: on ? "#3B82F6" : "#D1D5DB", borderRadius: 9, display: "flex", alignItems: "center", padding: "0 2px", cursor: "pointer" }}>
      <div style={{ width: 14, height: 14, background: "#fff", borderRadius: "50%", marginLeft: on ? "auto" : 0, transition: "margin 0.2s" }} />
    </div>
  );
  const DD = ({ value }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, border: `1px solid ${t.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 11, color: t.text, cursor: "pointer", background: t.surface }}>
      {value} <CDown />
    </div>
  );
  const NI = ({ value = 0, unit = "px" }) => (
    <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden", fontSize: 11 }}>
      <input type="number" defaultValue={value} style={{ width: 36, padding: "4px", border: "none", borderRight: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 11, textAlign: "center" }} />
      <div style={{ padding: "4px 6px", background: isDark ? "#1F2937" : "#F3F4F6", borderRight: `1px solid ${t.border}`, color: t.textMuted, fontSize: 10 }}>{unit}</div>
      <button style={{ width: 22, background: t.surface, border: "none", borderRight: `1px solid ${t.border}`, cursor: "pointer", color: t.textMuted }}>-</button>
      <button style={{ width: 22, background: t.surface, border: "none", cursor: "pointer", color: t.textMuted }}>+</button>
    </div>
  );
  const AlignBtns = ({ n = 3 }) => (
    <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden" }}>
      {[<AlignLeft size={12} />, <AlignCenter size={12} />, <AlignRight size={12} />, ...(n > 3 ? [<AlignJustify size={12} />] : [])].slice(0, n).map((icon, i) => (
        <button key={i} style={{ padding: "5px 10px", background: i === (n > 3 ? 0 : 1) ? (isDark ? "#374151" : "#1F2937") : t.surface, border: "none", borderRight: i < n - 1 ? `1px solid ${t.border}` : "none", cursor: "pointer", color: i === (n > 3 ? 0 : 1) ? "#fff" : t.textMuted }}>{icon}</button>
      ))}
    </div>
  );
  const DispCond = () => (
    <Sec id="displayCondition" label="Display Condition">
      <button style={{ width: "100%", padding: "7px", border: `1px dashed ${t.border}`, borderRadius: 4, background: "transparent", color: t.textMuted, fontSize: 12, cursor: "pointer" }}>+ Add Display Condition</button>
    </Sec>
  );
  const General = () => (
    <Sec id="general" label="General">
      <PR label="Container Padding"><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, color: t.textMuted }}>More Options</span><Toggle on={false} /></div></PR>
    </Sec>
  );
  const Responsive = () => (
    <Sec id="responsive" label="Responsive Design">
      <PR label="Hide on Desktop"><Toggle on={false} /></PR>
    </Sec>
  );

  const renderProps = () => {
    switch (blockType) {
      case "BUTTON": return (
        <>
          <DispCond />
          <Sec id="main" label="Button Options">
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Button Text</div>
              <input value={content.buttonText ?? "Button Text"} onChange={e => upd({ buttonText: e.target.value })} style={inpStyle(t)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Link URL</div>
              <input value={content.url ?? ""} onChange={e => upd({ url: e.target.value })} style={inpStyle(t)} placeholder="https://" />
            </div>
            <PR label="Background Color">
              <input type="color" value={content.bgColor || "#1D4ED8"} onChange={e => upd({ bgColor: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />
            </PR>
            <PR label="Text Color">
              <input type="color" value={content.textColor || "#ffffff"} onChange={e => upd({ textColor: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />
            </PR>
          </Sec>
          <General /><Responsive />
        </>
      );

      case "DIVIDER": return (
        <>
          <DispCond />
          <Sec id="main" label="Line">
            <PR label="Thickness (px)">
              <input type="number" value={content.lineWidth ?? 1} min={1} max={20} onChange={e => upd({ lineWidth: Number(e.target.value) })} style={{ width: 60, padding: "4px 6px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 12 }} />
            </PR>
            <PR label="Color">
              <input type="color" value={content.lineColor || "#E5E7EB"} onChange={e => upd({ lineColor: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />
            </PR>
          </Sec>
          <General /><Responsive />
        </>
      );

      case "HEADING": return (
        <>
          <DispCond />
          <Sec id="main" label="Text">
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Heading Text</div>
              <input value={content.headingText ?? "Heading"} onChange={e => upd({ headingText: e.target.value })} style={inpStyle(t)} />
            </div>
            <PR label="Font Size (px)">
              <input type="number" value={content.fontSize ?? 22} min={8} max={96} onChange={e => upd({ fontSize: Number(e.target.value) })} style={{ width: 60, padding: "4px 6px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 12 }} />
            </PR>
            <PR label="Color">
              <input type="color" value={content.color || "#1F2937"} onChange={e => upd({ color: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />
            </PR>
          </Sec>
          <General /><Responsive />
        </>
      );

      case "PARAGRAPH": return (
        <>
          <DispCond />
          <Sec id="main" label="Text">
            <p style={{ margin: 0, fontSize: 11, color: t.textMuted }}>Click the paragraph block on the canvas to edit text inline.</p>
          </Sec>
          <General /><Responsive />
        </>
      );

      case "IMAGE": return (
        <>
          <Sec id="main" label="Image">
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{ flex: 1, background: isDark ? "#333" : "#222", color: "#fff", border: "none", padding: "8px", borderRadius: 4, fontWeight: 700, fontSize: 13, cursor: isUploading ? "not-allowed" : "pointer", opacity: isUploading ? 0.7 : 1 }}
              >
                {isUploading ? `Uploading...` : "Upload Image"}
              </button>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setActiveRightTab("Images")}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: t.surface, color: t.text, border: `1px solid ${t.border}`, padding: "8px 12px", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                >
                  More Images <CDown />
                </button>
              </div>
            </div>

            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={e => e.target.files[0] && onUpload(e.target.files[0], url => upd({ imageUrl: url }))} />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && onUpload(e.dataTransfer.files[0], url => upd({ imageUrl: url })); }}
              onDragOver={e => e.preventDefault()}
              style={{ border: `1px dashed ${t.border}`, borderRadius: 4, padding: "20px 12px", textAlign: "center", background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA", cursor: "pointer", marginBottom: 14 }}
            >
              <ImageIcon size={20} color={t.textMuted} style={{ margin: "0 auto 6px", display: "block", opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>
                {isUploading ? `Uploading ${Math.round(uploadProgress)}%` : "Drop a new image here, or click to select files to upload."}
              </p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.text }}>Image URL</div>
                <div style={{ fontSize: 10, color: t.textMuted }}>1600 × 400</div>
              </div>
              <input value={content.imageUrl ?? ""} onChange={e => upd({ imageUrl: e.target.value })} style={inpStyle(t)} placeholder="https://cdn.tools.unlayer.com/image/placeholder.p" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>Width</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: t.textMuted }}>Auto On</span>
                  <div onClick={() => upd({ autoWidth: !content.autoWidth })} style={{ width: 34, height: 18, background: content.autoWidth !== false ? "#3B82F6" : "#D1D5DB", borderRadius: 9, display: "flex", alignItems: "center", padding: "0 2px", cursor: "pointer", transition: "background 0.2s" }}>
                    <div style={{ width: 14, height: 14, background: "#fff", borderRadius: "50%", marginLeft: content.autoWidth !== false ? "16px" : "0", transition: "margin-left 0.2s" }} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range" min="10" max="100" value={parseInt(content.width || "100")}
                  onChange={e => upd({ width: e.target.value + "%", autoWidth: false })}
                  style={{ flex: 1, height: 4, accentColor: "#3B82F6" }}
                />
                <span style={{ fontSize: 11, color: t.textMuted, width: 30 }}>{content.width || "100%"}</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 8 }}>Align</div>
              <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden", width: "fit-content" }}>
                {[
                  { id: "left", icon: <AlignLeft size={14} /> },
                  { id: "center", icon: <AlignCenter size={14} /> },
                  { id: "right", icon: <AlignRight size={14} /> },
                  { id: "justify", icon: <AlignJustify size={14} /> }
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => upd({ align: a.id })}
                    style={{
                      padding: "8px 14px",
                      background: (content.align || "center") === a.id ? (isDark ? "#333" : "#222") : t.surface,
                      border: "none",
                      borderRight: a.id !== "justify" ? `1px solid ${t.border}` : "none",
                      cursor: "pointer",
                      color: (content.align || "center") === a.id ? "#fff" : t.textMuted,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                  >
                    {a.icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 6 }}>Alternate Text</div>
              <input value={content.altText ?? ""} onChange={e => upd({ altText: e.target.value })} style={inpStyle(t)} placeholder="" />
            </div>
          </Sec>

          <Sec id="action" label="Action">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <PR label="Image Link">
                <div style={{ width: 140 }}>
                  <DD value="Open Website" />
                </div>
              </PR>
              <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ padding: "6px 10px", background: isDark ? "#222" : "#F3F4F6", fontSize: 11, color: t.textMuted, borderRight: `1px solid ${t.border}`, fontWeight: 700 }}>URL</div>
                <input
                  value={content.linkUrl ?? ""}
                  onChange={e => upd({ linkUrl: e.target.value })}
                  style={{ ...inpStyle(t), border: "none", borderRadius: 0 }}
                  placeholder="https://"
                />
              </div>
              <PR label="Target">
                <div style={{ width: 140 }}>
                  <DD value="New Tab" />
                </div>
              </PR>
            </div>
          </Sec>

          <General /><Responsive />
        </>
      );

      case "VIDEO": return (
        <>
          <DispCond />
          <Sec id="link" label="Link">
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Video URL</div>
              <input value={content.videoUrl ?? ""} onChange={e => upd({ videoUrl: e.target.value })} style={inpStyle(t)} placeholder="YouTube or Vimeo URL" />
              <p style={{ fontSize: 10, color: t.textMuted, margin: "6px 0 0 0" }}>Paste a YouTube or Vimeo URL to embed the video.</p>
            </div>
          </Sec>
          <General /><Responsive />
        </>
      );

      case "SOCIAL": return (
        <>
          <DispCond />
          <Sec id="main" label="Icons">
            <p style={{ margin: 0, fontSize: 11, color: t.textMuted }}>Click an icon to toggle it on/off:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {["F","𝕏","in","📷","▶","G"].map(s => {
                const active = (content.icons || ["F","𝕏","in","📷"]).includes(s);
                return (
                  <div key={s} onClick={() => {
                    const cur = content.icons || ["F","𝕏","in","📷"];
                    upd({ icons: active ? cur.filter(x => x !== s) : [...cur, s] });
                  }} style={{ width: 30, height: 30, borderRadius: "50%", background: active ? "#3B82F6" : (isDark ? "#374151" : "#E5E7EB"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, color: active ? "#fff" : t.textMuted, fontWeight: 700 }}>{s}</div>
                );
              })}
            </div>
          </Sec>
          <General /><Responsive />
        </>
      );

      case "MENU": return (
        <>
          <DispCond />
          <Sec id="menuItems" label="Menu Items">
            {(content.menuItems || []).map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input value={item} onChange={e => { const items = [...(content.menuItems || [])]; items[i] = e.target.value; upd({ menuItems: items }); }} style={{ ...inpStyle(t), flex: 1 }} />
                <button onClick={() => upd({ menuItems: (content.menuItems || []).filter((_, j) => j !== i) })} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            ))}
            <button onClick={() => upd({ menuItems: [...(content.menuItems || []), "New Item"] })} style={{ width: "100%", padding: "7px", border: `1px dashed ${t.border}`, borderRadius: 4, background: "transparent", color: t.textMuted, fontSize: 12, cursor: "pointer" }}>+ Add New Item</button>
          </Sec>
          <General /><Responsive />
        </>
      );

      case "HTML": return (
        <>
          <DispCond />
          <Sec id="main" label="HTML">
            <textarea value={content.html ?? "<strong>Hello, world!</strong>"} onChange={e => upd({ html: e.target.value })} style={{ width: "100%", height: 120, padding: "8px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 11, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
          </Sec>
          <General /><Responsive />
        </>
      );

      case "TABLE": return (
        <>
          <DispCond />
          <Sec id="main" label="Layout">
            <PR label="Columns">
              <input type="number" value={content.cols ?? 2} min={1} max={6} onChange={e => upd({ cols: Number(e.target.value) })} style={{ width: 60, padding: "4px 6px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 12 }} />
            </PR>
            <PR label="Rows">
              <input type="number" value={content.rows ?? 2} min={1} max={20} onChange={e => upd({ rows: Number(e.target.value) })} style={{ width: 60, padding: "4px 6px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 12 }} />
            </PR>
          </Sec>
          <General /><Responsive />
        </>
      );

      case "COLUMNS":
        return (
          <>
            <DispCond />
            <Sec id="main" label="Columns">
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[[[100]],[[50,50]],[[67,33]],[[33,67]],[[33,33,33]],[[50,25,25]],[[25,25,25,25]]].map((layout, i) => {
                  const key = layout[0].join("-");
                  const active = (content.layout || "100") === key;
                  return (
                    <div key={key} onClick={() => upd({ layout: key })} style={{ display: "flex", gap: 2, height: 26, cursor: "pointer", opacity: active ? 1 : 0.45, border: active ? "1px solid #3B82F6" : "1px solid transparent", borderRadius: 3, padding: 1 }}>
                      {layout[0].map((col, j) => (
                        <div key={j} style={{ flex: col, background: active ? "#3B82F6" : (isDark ? "#374151" : "#D1D5DB"), borderRadius: 1 }} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </Sec>
            
            <Sec id="row-params" label="Row Properties">
              <PR label="Background Color">
                <input type="color" value={content.rowBg || "#ffffff"} onChange={e => upd({ rowBg: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />
              </PR>
            </Sec>
            
            {(content.columns || []).map((col, idx) => (
              <Sec key={idx} id={`col-${idx}`} label={`Column ${idx + 1}`}>
                <PR label="Background">
                   <input type="color" value={col.settings?.bgColor || "transparent"} onChange={e => {
                     const newCols = [...content.columns];
                     newCols[idx] = { ...newCols[idx], settings: { ...newCols[idx].settings, bgColor: e.target.value } };
                     upd({ columns: newCols });
                   }} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />
                </PR>
                <PR label="Padding">
                   <input value={col.settings?.padding || "10px"} onChange={e => {
                     const newCols = [...content.columns];
                     newCols[idx] = { ...newCols[idx], settings: { ...newCols[idx].settings, padding: e.target.value } };
                     upd({ columns: newCols });
                   }} style={{ ...inpStyle(t), width: 80 }} />
                </PR>
              </Sec>
            ))}
          </>
        );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${t.border}`, background: isDark ? "#1a1a1a" : "#F9FAFB" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{blockType}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}><Trash2 size={13} /></button>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}><Copy size={13} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}><XIcon size={13} /></button>
        </div>
      </div>
      {/* Desktop/Mobile tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${t.border}` }}>
        {["Desktop", "Mobile"].map((tab, i) => (
          <button key={tab} style={{ flex: 1, padding: "7px", fontSize: 11.5, border: "none", background: i === 0 ? t.surface : "transparent", cursor: "pointer", color: i === 0 ? t.text : t.textMuted, fontWeight: i === 0 ? 600 : 400, borderBottom: i === 0 ? `2px solid ${isDark ? "#60A5FA" : "#3B82F6"}` : "2px solid transparent" }}>{tab}</button>
        ))}
        <button onClick={onClose} style={{ padding: "4px 8px", border: "none", background: "transparent", cursor: "pointer", color: t.textMuted }}><XIcon size={13} /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>{renderProps()}</div>
    </div>
  );
}

const inpStyle = t => ({ width: "100%", padding: "6px 8px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 11.5, outline: "none", boxSizing: "border-box" });

// ── Content Tab ───────────────────────────────────────────────────────────────

function ContentTab({ t, isDark, onAddRow }) {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {CONTENT_BLOCKS.map(block => {
          const disabled = block.label === "KPIs";
          return (
            <div
              key={block.label}
              draggable={!disabled}
              title={disabled ? "Coming soon" : undefined}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                background: isDark ? "#1F2937" : "#fff", border: `1px solid ${t.border}`, borderRadius: 4,
                padding: "13px 6px", cursor: disabled ? "not-allowed" : "grab", color: t.text,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "border-color 0.15s, transform 0.1s",
                opacity: disabled ? 0.4 : 1, position: "relative"
              }}
              onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = isDark ? "#60A5FA" : "#3B82F6"; e.currentTarget.style.transform = "scale(1.04)"; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "scale(1)"; }}
              onDragStart={e => { if (disabled) { e.preventDefault(); return; } e.dataTransfer.setData("blockLabel", block.label); }}
              onClick={() => { if (!disabled) onAddRow(null, block.label); }}
            >
              <block.icon size={20} strokeWidth={1.5} color={t.textMuted} />
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.5, textAlign: "center" }}>{block.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Blocks Tab ────────────────────────────────────────────────────────────────

function BlocksTab({ t, isDark }) {
  return (
    <div>
      <div style={{ padding: "14px", borderBottom: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px 0", color: t.text }}>Blocks</h3>
        <div style={{ position: "relative" }}>
          <Search size={14} color={t.textMuted} style={{ position: "absolute", left: 10, top: 9 }} />
          <input placeholder="Search" style={{ width: "100%", padding: "8px 8px 8px 32px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>Blank</span>
            <span style={{ fontSize: 11, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>All <ChevronRight size={13} /></span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ height: 52, border: `1px solid ${t.border}`, background: isDark ? "#333" : "#F3F4F6", borderRadius: 2 }} />
            <div style={{ display: "flex", gap: 6, height: 52 }}>
              {[1, 1].map((_, i) => <div key={i} style={{ flex: 1, border: `1px solid ${t.border}`, background: isDark ? "#333" : "#F3F4F6", borderRadius: 2 }} />)}
            </div>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>AVG Overview</span>
            <span style={{ fontSize: 11, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>All <ChevronRight size={13} /></span>
          </div>
          <div style={{ height: 110, background: "#555", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", width: "100%", textAlign: "center", padding: "0 8px", color: "#fff" }}>
              {[["10+", "years of consistent outperformance"], ["$250 M+", "Assets Under Managed"], ["300+", "Trusted by investors"], ["100+", "Properties Managed"]].map(([val, lbl]) => (
                <div key={val}><div style={{ fontSize: 16, fontWeight: 700 }}>{val}</div><div style={{ fontSize: 7, opacity: 0.8, marginTop: 2 }}>{lbl}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Body Tab ──────────────────────────────────────────────────────────────────

function BodyTab({ t, isDark }) {
  const [open, setOpen] = useState({ general: true, emailSettings: true, links: true, accessibility: false });
  const tog = id => setOpen(p => ({ ...p, [id]: !p[id] }));
  const Sec = ({ id, label, children }) => (
    <div>
      <div onClick={() => tog(id)} style={{ padding: "11px 16px", display: "flex", justifyContent: "space-between", cursor: "pointer", background: isDark ? "#1F2937" : "#F9FAFB", borderBottom: `1px solid ${t.border}` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{label}</span>
        {open[id] ? <ChevronUp size={14} color={t.textMuted} /> : <CDown />}
      </div>
      {open[id] && <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16, borderBottom: `1px solid ${t.border}` }}>{children}</div>}
    </div>
  );
  const PR = ({ label, children }) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: t.text }}>{label}</span><div>{children}</div></div>;
  const Swatch = ({ color = "#000" }) => <div style={{ width: 22, height: 22, background: color, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer" }} />;
  const Toggle = ({ on = true }) => (
    <div style={{ width: 32, height: 18, background: on ? "#3B82F6" : "#D1D5DB", borderRadius: 9, display: "flex", alignItems: "center", padding: "0 2px", cursor: "pointer" }}>
      <div style={{ width: 14, height: 14, background: "#fff", borderRadius: "50%", marginLeft: on ? "auto" : 0 }} />
    </div>
  );
  const DD = ({ value }) => <div style={{ display: "flex", alignItems: "center", gap: 4, border: `1px solid ${t.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 12, color: t.text, cursor: "pointer" }}>{value} <CDown /></div>;

  return (
    <div>
      <Sec id="general" label="General">
        <PR label="Text Color"><Swatch color="#000" /></PR>
        <PR label="Background Color">
          <div style={{ position: "relative" }}>
            <Swatch color="#fff" />
            <div style={{ position: "absolute", top: -5, right: -5, background: "#666", borderRadius: "50%", width: 13, height: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <XIcon size={9} color="#fff" />
            </div>
          </div>
        </PR>
        <PR label="Content Width">
          <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden", fontSize: 12 }}>
            <input type="text" defaultValue="780" style={{ width: 40, padding: "5px", textAlign: "center", border: "none", borderRight: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 12 }} />
            <div style={{ width: 28, padding: "5px", textAlign: "center", background: isDark ? "#1F2937" : "#F3F4F6", borderRight: `1px solid ${t.border}`, fontSize: 11, color: t.textMuted }}>px</div>
            <button style={{ width: 26, background: t.surface, border: "none", borderRight: `1px solid ${t.border}`, cursor: "pointer", color: t.textMuted }}>-</button>
            <button style={{ width: 26, background: t.surface, border: "none", cursor: "pointer", color: t.textMuted }}>+</button>
          </div>
        </PR>
        <PR label="Content Alignment">
          <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden" }}>
            <button style={{ padding: "5px 10px", background: t.surface, border: "none", borderRight: `1px solid ${t.border}`, cursor: "pointer", color: t.textMuted }}><AlignLeft size={13} /></button>
            <button style={{ padding: "5px 10px", background: isDark ? "#374151" : "#1F2937", border: "none", cursor: "pointer", color: "#fff" }}><AlignCenter size={13} /></button>
          </div>
        </PR>
        <PR label="Font Family"><DD value="Montserrat" /></PR>
        <PR label="Font Weight"><DD value="Regular" /></PR>
      </Sec>
      <Sec id="emailSettings" label="Email Settings">
        <span style={{ fontSize: 12, color: t.text }}>Preheader Text</span>
        <input type="text" style={{ width: "100%", padding: 8, border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, outline: "none", boxSizing: "border-box" }} />
        <p style={{ margin: 0, fontSize: 10, color: t.textMuted }}>A preheader is the short summary text that follows the subject line when viewing an email from the inbox.</p>
      </Sec>
      <Sec id="links" label="Links">
        <PR label="Color"><Swatch color="#0000FF" /></PR>
        <PR label="Underline"><Toggle /></PR>
      </Sec>
      <Sec id="accessibility" label="Accessibility">
        <span style={{ fontSize: 12, color: t.text }}>HTML Title</span>
        <input type="text" style={{ width: "100%", padding: 8, border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, outline: "none", boxSizing: "border-box" }} />
        <p style={{ margin: 0, fontSize: 10, color: t.textMuted }}>Sets the HTML &lt;title&gt; tag in the exported HTML.</p>
      </Sec>
    </div>
  );
}

// ── Images Tab (Unsplash) ─────────────────────────────────────────────────────

function ImagesTab({ t, isDark, setActiveRightTab }) {
  const { user, profile, isSuperAdmin, isGlobalRole, isR10010 } = useAuth();
  const rawRole = (profile?.role || "").toLowerCase();
  const isAdmin = isSuperAdmin || isGlobalRole || isR10010 ||
    ["super admin", "platform admin", "r10009", "r10010"].includes(rawRole) ||
    rawRole.includes("admin") || user?.email?.toLowerCase() === "kyuahn@yahoo.com";

  const [query, setQuery] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const docSnap = await getDoc(doc(db, "system", "integrations"));
        if (docSnap.exists() && docSnap.data().unsplash_api_key) setApiKey(docSnap.data().unsplash_api_key);
        else if (isAdmin) setShowKeyInput(true);
      } catch (err) { console.error(err); }
    };
    fetchKey();
  }, [isAdmin]);

  const searchImages = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    if (!apiKey) { if (isAdmin) setShowKeyInput(true); else setError("Unsplash integration not configured."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?page=1&per_page=20&query=${encodeURIComponent(query)}`, { headers: { Authorization: `Client-ID ${apiKey}` } });
      if (res.status === 401) { setError("Invalid API Key."); if (isAdmin) setShowKeyInput(true); setLoading(false); return; }
      if (!res.ok) throw new Error("Failed to fetch images");
      const data = await res.json();
      setImages(data.results);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const saveApiKey = async () => {
    try {
      await setDoc(doc(db, "system", "integrations"), { unsplash_api_key: apiKey }, { merge: true });
      setShowKeyInput(false); setError(null);
      if (query.trim()) searchImages();
    } catch (err) { setError("Failed to save API key."); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px", borderBottom: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px 0", color: t.text }}>Images</h3>
        <form onSubmit={searchImages} style={{ position: "relative", marginBottom: 10 }}>
          <Search size={14} color={t.textMuted} style={{ position: "absolute", left: 10, top: 9 }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Unsplash..." style={{ width: "100%", padding: "8px 8px 8px 32px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, outline: "none", boxSizing: "border-box", fontSize: 13 }} />
        </form>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 10, color: t.textMuted, margin: 0 }}>Powered by Unsplash.</p>
          {isAdmin && <button onClick={() => setShowKeyInput(!showKeyInput)} style={{ background: "none", border: "none", color: "#3A86FF", fontSize: 10, cursor: "pointer" }}>{showKeyInput ? "Hide Settings" : "Settings"}</button>}
        </div>
      </div>
      <div style={{ padding: 14, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {showKeyInput && isAdmin && (
          <div style={{ padding: 14, background: t.surface, borderRadius: 4, border: `1px solid ${t.border}` }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 13, color: t.text }}>Unsplash Setup</h4>
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste Access Key here" style={{ width: "100%", padding: "7px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.background, color: t.text, marginBottom: 8, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
            {error && <p style={{ color: "#EF4444", fontSize: 11, margin: "0 0 8px" }}>{error}</p>}
            <button onClick={saveApiKey} style={{ width: "100%", background: "#3A86FF", color: "#fff", border: "none", padding: "7px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save Key</button>
          </div>
        )}
        {!showKeyInput && images.length === 0 && !loading && (
          <div style={{ background: "#06D6A0", borderRadius: 4, padding: 14, color: "#fff" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>Let AI Create Images</h4>
            <p style={{ margin: "0 0 12px", fontSize: 12, opacity: 0.9 }}>If you can't find what you need, AI can create it.</p>
            <button style={{ background: "#059669", border: "none", color: "#fff", padding: "7px 14px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>See the Magic</button>
          </div>
        )}
        {loading && <div style={{ textAlign: "center", padding: "28px 0", color: t.textMuted, fontSize: 12 }}>Loading images...</div>}
        {!loading && images.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {images.map(img => (
              <div
                key={img.id}
                draggable
                onDragStart={e => e.dataTransfer.setData("imageUrl", img.urls.regular)}
                style={{ height: 110, borderRadius: 4, backgroundImage: `url(${img.urls.small})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "grab", border: `1px solid ${t.border}` }}
                title={img.alt_description}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Uploads Tab ───────────────────────────────────────────────────────────────

function UploadsTab({ t, isDark, uploads, isUploading, uploadProgress, onUpload }) {
  const fileInputRef = useRef(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px", borderBottom: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px 0", color: t.text }}>Uploads</h3>
        <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ width: "100%", background: isDark ? "#333" : "#222", color: "#fff", border: "none", padding: "10px", borderRadius: 4, fontWeight: 600, fontSize: 13, marginBottom: 12, cursor: isUploading ? "not-allowed" : "pointer", opacity: isUploading ? 0.7 : 1 }}>
          {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : "Upload Image"}
        </button>
        <div onClick={() => fileInputRef.current?.click()} onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && onUpload(e.dataTransfer.files[0]); }} onDragOver={e => e.preventDefault()} style={{ border: `1px dashed ${t.border}`, borderRadius: 4, padding: "24px 12px", textAlign: "center", background: t.surface, cursor: "pointer" }}>
          <UploadCloud size={22} color={t.textMuted} style={{ margin: "0 auto 6px", display: "block" }} />
          <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>Drop a new image here, or click to select files to upload.</p>
        </div>
      </div>
      <div style={{ padding: 14, flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, alignContent: "flex-start" }}>
        {uploads.length === 0
          ? <div style={{ gridColumn: "1/-1", textAlign: "center", fontSize: 12, color: t.textMuted, padding: "28px 0" }}>{isUploading ? "Processing..." : "No uploads yet"}</div>
          : uploads.map((url, i) => (
            <div
              key={i}
              draggable
              onDragStart={e => e.dataTransfer.setData("imageUrl", url)}
              style={{ height: 90, borderRadius: 4, backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "grab", border: `1px solid ${t.border}` }}
            />
          ))
        }
      </div>
    </div>
  );
}



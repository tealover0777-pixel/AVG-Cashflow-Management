import React, { useState, useEffect, useRef, useMemo } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../AuthContext";
import {
  ChevronLeft, ChevronDown, Edit2, UploadCloud, FileEdit, Smartphone, Monitor, Save,
  Columns as ColumnsIcon, TrendingUp, Square, Minus, Type, AlignLeft,
  Image as ImageIcon, FileText, Code,
  Table as TableIcon, Search, ChevronRight, ChevronUp, X as XIcon,
  Plus, Trash2, Copy, Settings as SettingsIcon, Paperclip,
  AlignCenter, AlignRight, AlignJustify, Move, Send, Clock, Check, Eye,
  Bold, Italic, Underline, List, Link as LinkIcon, Indent, Outdent,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical
} from "lucide-react";
import { PromptModal, DelModal, Modal, TanStackTable } from "../components";

const CDown = () => <ChevronDown size={12} strokeWidth={2.5} style={{ opacity: 0.7 }} />;

// ── Constants ────────────────────────────────────────────────────────────────

const CONTENT_BLOCKS = [
  { label: "COLUMNS", icon: ColumnsIcon },
  { label: "TEXT", icon: AlignLeft },
  { label: "BUTTON", icon: Square },
  { label: "DIVIDER", icon: Minus },
  { label: "HEADING", icon: Type },
  { label: "IMAGE", icon: ImageIcon },
  { label: "HTML", icon: Code },
  { label: "TABLE", icon: TableIcon },
];

const LABEL_TO_TYPE = {
  "COLUMNS": "columns", "TEXT": "paragraph", "BUTTON": "button", "DIVIDER": "divider",
  "HEADING": "heading", "IMAGE": "image", "HTML": "html", "TABLE": "table"
};

const INITIAL_SETTINGS = {
  subject: "[Template] Investment Report",
  internalName: "Investment reports - March 2026",
  fromName: "American Vision Group",
  from: "invest@americanvisioncap.com",
  replyTo: "invest@americanvisioncap.com",
  previewText: "",
  doNotSendTo: "",
  type: "Marketing",
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

export default function PageEmailBuilder(props) {
  const { t, isDark, setActivePage, activeEmailTemplate, setActiveEmailTemplate, refreshTemplates, activeTenantId: activeTenantIdProp, backTo = "Manage Templates", USERS = [], CONTACTS = [], DIMENSIONS = [] } = props;
  const isUseMode = activeEmailTemplate?._useMode === true;

  const [activeMainTab, setActiveMainTab] = useState("Edit");
  const [activeRightTab, setActiveRightTab] = useState("Content");
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedBlockType, setSelectedBlockType] = useState(null);
  // Refs mirror state so handlers always see the latest values regardless of closure age
  const selectedRowIdRef = useRef(null);
  const selectedBlockTypeRef = useRef(null);
  const [emailName, setEmailName] = useState(activeEmailTemplate?.name || "Investment reports - March 2026");
  const [editingName, setEditingName] = useState(false);
  const [emailSettings, setEmailSettings] = useState(activeEmailTemplate?.settings || INITIAL_SETTINGS);
  const [rows, setRows] = useState((activeEmailTemplate?.rows && activeEmailTemplate.rows.length > 0) ? activeEmailTemplate.rows : INITIAL_ROWS);
  const [uploads, setUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveAsNewPrompt, setShowSaveAsNewPrompt] = useState(false);

  // Send test email
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [testSentTo, setTestSentTo] = useState(null);
  const testDropRef = useRef(null);

  // Send / Schedule
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: "", time: "", subject: "", recipients: [], timezone: "America/New_York" });
  const [recipientSearch, setRecipientSearch] = useState("");
  const sendDropRef = useRef(null);

  const { profile, tenantId, isSuperAdmin, isGlobalRole, isR10010 } = useAuth();
  const isAdmin = isSuperAdmin || isGlobalRole || isR10010;
  const isEditingGlobal = isAdmin && !!activeEmailTemplate?.isGlobal;

  const lastIdRef = useRef(null);
  useEffect(() => {
    if (activeEmailTemplate) {
      if (activeEmailTemplate.id !== lastIdRef.current) {
        lastIdRef.current = activeEmailTemplate.id;
        if (activeEmailTemplate.rows) setRows(activeEmailTemplate.rows.length > 0 ? activeEmailTemplate.rows : INITIAL_ROWS);
        if (activeEmailTemplate.settings) setEmailSettings(activeEmailTemplate.settings);
        if (activeEmailTemplate.name) setEmailName(activeEmailTemplate.name);
      }
    }
  }, [activeEmailTemplate]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showTestDropdown && !showSendDropdown) return;
    const handler = (e) => {
      if (testDropRef.current && !testDropRef.current.contains(e.target)) setShowTestDropdown(false);
      if (sendDropRef.current && !sendDropRef.current.contains(e.target)) setShowSendDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTestDropdown, showSendDropdown]);

  const effectiveUploadTenantId = tenantId ||
    (activeTenantIdProp && activeTenantIdProp !== "GLOBAL" ? activeTenantIdProp : "");

  useEffect(() => {
    const fetchUploads = async () => {
      if (!effectiveUploadTenantId) return;
      try {
        const res = await listAll(ref(storage, `tenants/${effectiveUploadTenantId}/marketing_uploads`));
        const items = Array.isArray(res.items) ? res.items : [];
        const list = await Promise.all(
          items.slice().reverse().map(async (r) => ({
            url: await getDownloadURL(r),
            path: r.fullPath
          }))
        );
        setUploads(list);
      } catch (err) { console.error(err); }
    };
    fetchUploads();
  }, [effectiveUploadTenantId]);

  const handleDeleteUpload = async (item) => {
    if (!item?.path) {
      showToast("Cannot delete: image path not found.", "error");
      return;
    }
    try {
      await deleteObject(ref(storage, item.path));
      setUploads(prev => prev.filter(u => u.path !== item.path));
      showToast("Image deleted.", "success");
    } catch (err) {
      console.error("Delete upload error:", err);
      showToast("Error deleting image: " + (err?.message || "unknown error"), "error");
    }
  };

  const handleUploadFile = async (file, onComplete) => {
    if (!file) return;
    if (!effectiveUploadTenantId) {
      showToast("No tenant ID found. Cannot upload.", "error");
      return;
    }
    setIsUploading(true);
    const storageRef = ref(storage, `tenants/${effectiveUploadTenantId}/marketing_uploads/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on("state_changed",
      snap => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      err => { console.error(err); setIsUploading(false); },
      () => {
        getDownloadURL(task.snapshot.ref).then(url => {
          setUploads(p => [{ url, path: task.snapshot.ref.fullPath }, ...p]);
          setIsUploading(false);
          setUploadProgress(0);
          if (onComplete) onComplete(url);
          showToast("Image uploaded successfully!", "success");
        });
      }
    );
  };

  const handleSave = async (asNew = false, asNewName = null, settingsOverride = null) => {
    // If handleSave is called directly by onClick={handleSave}, asNew will be the event object.
    const saveAsNew = (typeof asNew === "boolean") ? asNew : false;

    if (!tenantId && !isAdmin) {
      showToast("No tenant ID found. Cannot save.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const targetName = asNewName || emailName;
      const sanitizedName = targetName.replace(/[/\s]+/g, "_").trim();
      const isSavingAsGlobal = !saveAsNew && isAdmin && activeEmailTemplate?.isGlobal;
      const effectiveTenantId = tenantId || (activeTenantIdProp && activeTenantIdProp !== "GLOBAL" ? activeTenantIdProp : "");

      const templateData = {
        name: targetName,
        settings: settingsOverride || emailSettings,
        rows: rows,
        updatedAt: new Date().toISOString(),
        updatedBy: profile?.email || "unknown",
        category: saveAsNew ? "Your templates" : (isSavingAsGlobal || !activeEmailTemplate) ? "Global" : (activeEmailTemplate.category || "Your templates"),
        tag: activeEmailTemplate?.tag || "Custom",
        isGlobal: !!isSavingAsGlobal
      };

      // Check if we are updating a live Marketing Email from Firestore
      // Firestore IDs for marketing emails are random strings, storage templates end in .json
      const isMarketingEmail = activeEmailTemplate?.id && !activeEmailTemplate.id.endsWith(".json") && !activeEmailTemplate.isGlobal;

      if (isMarketingEmail && !saveAsNew) {
        // UPDATE FIRESTORE DRAFT
        const docRef = doc(db, "tenants", effectiveTenantId, "marketingEmails", activeEmailTemplate.id);
        await updateDoc(docRef, {
          title: targetName,
          rows: rows,
          settings: settingsOverride || emailSettings,
          status: (settingsOverride || emailSettings).status || "Draft",
          updatedAt: new Date().toISOString()
        });
        showToast("Draft updated successfully!", "success");
      } else {
        // SAVE TO STORAGE AS TEMPLATE (Original logic)
        if (!effectiveTenantId && !isSavingAsGlobal) {
          showToast("Cannot save personal template: no tenant selected. Switch to a specific tenant first.", "error");
          setIsSaving(false);
          return;
        }

        let path;
        if (isSavingAsGlobal && activeEmailTemplate?.id?.startsWith("global_templates/")) {
          path = activeEmailTemplate.id;
        } else {
          path = isSavingAsGlobal
            ? `global_templates/${sanitizedName}.json`
            : `tenants/${effectiveTenantId}/templates/${sanitizedName}.json`;
        }

        const templateRef = ref(storage, path);
        const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: "application/json" });
        await uploadBytes(templateRef, blob);

        if (typeof props.setActiveEmailTemplate === "function") {
          props.setActiveEmailTemplate({ ...templateData, id: path, isGlobal: !!isSavingAsGlobal });
        }

        showToast(saveAsNew ? "New template saved to your library!" : (isSavingAsGlobal ? "Global template updated!" : "Template saved!"), "success");
      }

      if (typeof props.refreshTemplates === "function") {
        await props.refreshTemplates();
      }
    } catch (error) {
      console.error("Save error:", error);
      showToast("Save failed. Check console.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); }; // eslint-disable-line

  const RIGHT_TABS = [
    { id: "Content", icon: Square },
    { id: "Body", icon: AlignLeft },
    { id: "Images", icon: ImageIcon },
    { id: "Uploads", icon: UploadCloud },
    { id: "Audit", icon: FileText },
  ];

  const showBlockProps = !!(selectedRowId && selectedBlockType && activeRightTab === "Content");

  const handleSelectRow = (rowId, blockType) => {
    selectedRowIdRef.current = rowId;
    selectedBlockTypeRef.current = blockType || null;
    setSelectedRowId(rowId);
    setSelectedBlockType(blockType || null);
    // Stay on Images/Uploads tab so users can immediately pick an image after selecting a block
    setActiveRightTab(prev => (prev === "Images" || prev === "Uploads") ? prev : "Content");
  };

  const handleDeselect = () => {
    selectedRowIdRef.current = null;
    selectedBlockTypeRef.current = null;
    setSelectedRowId(null);
    setSelectedBlockType(null);
  };

  // Called from Images/Uploads tabs to set the URL on the currently-selected IMAGE block
  const handleInsertImage = (url) => {
    const rowId = selectedRowIdRef.current;
    const blockType = selectedBlockTypeRef.current;
    if (rowId && blockType === "IMAGE") {
      handleUpdateRow(rowId, { imageUrl: url });
      setActiveRightTab("Content");
    } else {
      showToast("Click an image block on the canvas first, then click USE", "info");
    }
  };

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

    if (type === "table") {
      newRow.content = {
        rows: [
          { id: `tr_${Date.now()}_1`, isHeader: true, cells: [{ id: `c_${Date.now()}_1`, text: "Add header text" }, { id: `c_${Date.now()}_2`, text: "" }] },
          { id: `tr_${Date.now()}_2`, cells: [{ id: `c_${Date.now()}_3`, text: "Add text" }, { id: `c_${Date.now()}_4`, text: "" }] },
          { id: `tr_${Date.now()}_3`, cells: [{ id: `c_${Date.now()}_5`, text: "" }, { id: `c_${Date.now()}_6`, text: "" }] },
        ]
      };
    }

    setRows(prev => {
      if (!relativeId) {
        return position === "before" ? [newRow, ...prev] : [...prev, newRow];
      }
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

    setRows(prev => (Array.isArray(prev) ? prev : []).map(r => {
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
      next = (Array.isArray(next) ? next : []).map(r => {
        if (r.type !== "columns") return r;
        const cols = Array.isArray(r.content?.columns) ? r.content.columns : [];
        const newCols = cols.map(col => ({
          ...col,
          blocks: (Array.isArray(col.blocks) ? col.blocks : []).filter(b => b.id !== rowId)
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
      return (Array.isArray(prev) ? prev : []).map(r => {
        if (r.type !== "columns") return r;
        const cols = Array.isArray(r.content?.columns) ? r.content.columns : [];
        const newCols = cols.map(col => {
          const blocks = Array.isArray(col.blocks) ? col.blocks : [];
          const bIdx = blocks.findIndex(b => b.id === rowId);
          if (bIdx === -1) return col;
          const newBlock = JSON.parse(JSON.stringify(blocks[bIdx]));
          newBlock.id = `b_${Date.now()}`;
          const newBlocks = [...blocks];
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
      let next = (Array.isArray(prev) ? prev : []).map(updateObj);
      next = (Array.isArray(next) ? next : []).map(r => {
        if (r.type !== "columns") return r;
        const cols = Array.isArray(r.content?.columns) ? r.content.columns : [];
        const newCols = cols.map(col => ({
          ...col,
          blocks: (Array.isArray(col.blocks) ? col.blocks : []).map(updateObj)
        }));
        return { ...r, content: { ...r.content, columns: newCols } };
      });
      return next;
    });
  };

  const handleReorderRows = (sourceId, targetId) => {
    if (sourceId === targetId) return;
    setRows(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let sourceItem = null;
      const findAndRemove = (list) => {
        for (let i = 0; i < list.length; i++) {
          if (list[i].id === sourceId) {
            sourceItem = list.splice(i, 1)[0];
            return true;
          }
          if (Array.isArray(list[i].content?.columns)) {
            for (const col of list[i].content.columns) {
              if (findAndRemove(Array.isArray(col.blocks) ? col.blocks : [])) return true;
            }
          }
        }
        return false;
      };
      findAndRemove(next);
      if (!sourceItem) return prev;
      const findAndInsert = (list) => {
        for (let i = 0; i < list.length; i++) {
          if (list[i].id === targetId) {
            list.splice(i, 0, sourceItem);
            return true;
          }
          if (Array.isArray(list[i].content?.columns)) {
            for (const col of list[i].content.columns) {
              if (findAndInsert(Array.isArray(col.blocks) ? col.blocks : [])) return true;
            }
          }
        }
        return false;
      };
      if (!findAndInsert(next)) { next.push(sourceItem); }
      return next;
    });
  };

  const MAIN_TABS = [
    { id: "Edit", label: "Edit", icon: <FileEdit size={13} /> },
    { id: "Settings", label: "Settings", icon: <SettingsIcon size={13} /> },
    { id: "Mobile", label: "Mobile review", icon: <Smartphone size={13} /> },
    { id: "Desktop", label: "Desktop review", icon: <Monitor size={13} /> },
  ];

  return (
    <div
      id="email-builder-wrapper"
      style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif", background: t.background }}
      onClick={handleDeselect}
    >
      <style>{`
        #email-builder-wrapper ::placeholder {
          color: ${t.textMuted} !important;
          opacity: 0.7 !important;
        }
        #email-builder-wrapper :-ms-input-placeholder { color: ${t.textMuted} !important; }
        #email-builder-wrapper ::-ms-input-placeholder { color: ${t.textMuted} !important; }
      `}</style>
      {/* ── Top Toolbar ── */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: `1px solid ${t.border}`, background: t.surface, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => setActivePage(backTo)}
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
            onClick={() => setShowSaveAsNewPrompt(true)}
            style={{ background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`, borderRadius: 24, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
          >
            <Save size={14} /> Save as my copy
          </button>

          {/* ── Use-mode: Send test email + Send ── */}
          {isUseMode && (<>
            <div style={{ position: "relative" }} ref={testDropRef}>
              <button
                onClick={() => { setShowTestDropdown(v => !v); setShowSendDropdown(false); }}
                style={{ background: "transparent", color: isDark ? "#60A5FA" : "#2563EB", border: `1px solid ${isDark ? "#60A5FA" : "#2563EB"}`, borderRadius: 24, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                <Send size={14} /> Send test email <ChevronDown size={13} />
              </button>
              {showTestDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 300, background: isDark ? "#1e293b" : "#fff", border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 500, padding: 12 }}>
                  <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: t.textMuted }}>Select recipient for test</p>
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: t.textMuted, pointerEvents: "none" }} />
                    <input autoFocus value={testSearch} onChange={e => setTestSearch(e.target.value)} placeholder="Search by name or email…" style={{ width: "100%", padding: "7px 8px 7px 28px", borderRadius: 7, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb", color: t.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                    {(Array.isArray([...USERS, ...CONTACTS]) ? [...USERS, ...CONTACTS] : []).filter(u => {
                      const name = u.first_name ? `${u.first_name} ${u.last_name || ""}` : (u.name || u.full_name || "");
                      const email = u.email || "";
                      const q = testSearch.toLowerCase();
                      return !q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
                    }).slice(0, 30).map((u, i) => {
                      const name = u.first_name ? `${u.first_name} ${u.last_name || ""}`.trim() : (u.name || u.full_name || u.email || "Unknown");
                      const email = u.email || "";
                      const sent = testSentTo === email;
                      return (
                        <div key={u.id || i} onClick={() => { setTestSentTo(email); showToast(`Test email sent to ${email || name}`, "success"); setShowTestDropdown(false); setTestSearch(""); }}
                          style={{ padding: "8px 10px", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: sent ? (isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4") : "transparent" }}
                          onMouseEnter={e => { if (!sent) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = sent ? (isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4") : "transparent"; }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: isDark ? "#334155" : "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: isDark ? "#93c5fd" : "#3730a3", flexShrink: 0 }}>
                            {(name[0] || "?").toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                            <div style={{ fontSize: 11, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
                          </div>
                          {sent && <Check size={14} color="#22c55e" />}
                        </div>
                      );
                    })}
                    {[...USERS, ...CONTACTS].length === 0 && <div style={{ padding: "20px 10px", textAlign: "center", fontSize: 12, color: t.textMuted }}>No users found.</div>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: "relative" }} ref={sendDropRef}>
              <button
                onClick={() => { setShowSendDropdown(v => !v); setShowTestDropdown(false); }}
                style={{ background: "#1D4ED8", color: "#fff", border: "none", borderRadius: 24, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                <Send size={14} /> Send <ChevronDown size={13} />
              </button>
              {showSendDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 175, background: isDark ? "#1e293b" : "#fff", border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 500, overflow: "hidden" }}>
                  {(Array.isArray([
                    { label: "Send now", icon: Send, action: async () => {
                      const newSettings = { ...emailSettings, status: "Sent", sentAt: new Date().toISOString() };
                      setEmailSettings(newSettings);
                      await handleSave(false, null, newSettings);
                      showToast("Email sent!", "success");
                      setShowSendDropdown(false);
                    } },
                    { label: "Schedule", icon: Clock, action: () => { setScheduleData(d => ({ ...d, subject: emailSettings.subject || emailName })); setShowScheduleModal(true); setShowSendDropdown(false); } },
                  ]) ? [
                    { label: "Send now", icon: Send, action: async () => {
                      const newSettings = { ...emailSettings, status: "Sent", sentAt: new Date().toISOString() };
                      setEmailSettings(newSettings);
                      await handleSave(false, null, newSettings);
                      showToast("Email sent!", "success");
                      setShowSendDropdown(false);
                    } },
                    { label: "Schedule", icon: Clock, action: () => { setScheduleData(d => ({ ...d, subject: emailSettings.subject || emailName })); setShowScheduleModal(true); setShowSendDropdown(false); } },
                  ] : []).map(({ label, icon: Icon, action }) => (
                    <button key={label} onClick={action}
                      style={{ width: "100%", padding: "11px 16px", background: "transparent", border: "none", borderBottom: label === "Send now" ? `1px solid ${t.border}` : "none", color: t.text, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>)}

          {/* ── Edit-mode save ── */}
          {!isUseMode && (!activeEmailTemplate?.isGlobal || isAdmin) && (
            <button onClick={() => handleSave()} disabled={isSaving}
              style={{ background: isEditingGlobal ? "#1D4ED8" : "transparent", color: isEditingGlobal ? "#fff" : "#1D4ED8", border: `1px solid #1D4ED8`, borderRadius: 24, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: isSaving ? 0.7 : 1 }}>
              <Save size={14} /> {isSaving ? "Saving..." : isEditingGlobal ? "Update Global Template" : "Save"}
            </button>
          )}
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
          <SettingsPanel t={t} isDark={isDark} settings={emailSettings} onChange={setEmailSettings} profile={profile} DIMENSIONS={DIMENSIONS} CONTACTS={CONTACTS} USERS={USERS} />
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
            onAddBlockToColumn={handleAddBlockToColumn}
            onReorder={handleReorderRows}
            setActiveRightTab={setActiveRightTab}
            DIMENSIONS={DIMENSIONS}
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
                  onDelete={handleDeleteRow} onDuplicate={handleDuplicateRow}
                />
              ) : (
                <>
                  {activeRightTab === "Content" && <ContentTab t={t} isDark={isDark} onAddRow={handleAddRow} />}
                  {activeRightTab === "Body" && <BodyTab t={t} isDark={isDark} />}
                  {activeRightTab === "Images" && <ImagesTab t={t} isDark={isDark} setActiveRightTab={setActiveRightTab} hasImageSelected={selectedBlockType === "IMAGE"} onInsertImage={handleInsertImage} />}
                  {activeRightTab === "Uploads" && (
                    <UploadsTab
                      t={t} isDark={isDark}
                      uploads={uploads}
                      isUploading={isUploading}
                      uploadProgress={uploadProgress}
                      onUpload={handleUploadFile}
                      onDeleteUpload={handleDeleteUpload}
                      hasImageSelected={selectedBlockType === "IMAGE"}
                      onInsertImage={handleInsertImage}
                    />
                  )}
                  {activeRightTab === "Audit" && (
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
                    onClick={() => setActiveRightTab(rt.id)}
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

      <PromptModal
        open={showSaveAsNewPrompt}
        onClose={() => setShowSaveAsNewPrompt(false)}
        title="Save as new template"
        label="Enter a name for the new template copy:"
        defaultValue={`${emailName} (Copy)`}
        t={t}
        isDark={isDark}
        onConfirm={(newName) => {
          if (newName && newName.trim()) {
            const trimmed = newName.trim();
            setEmailName(trimmed);
            setShowSaveAsNewPrompt(false);
            handleSave(true, trimmed);
          } else {
            setShowSaveAsNewPrompt(false);
          }
        }}
      />

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowScheduleModal(false)}>
          <div style={{ width: "100%", maxWidth: 480, background: isDark ? "#1e293b" : "#fff", border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: "0 20px 48px rgba(0,0,0,0.25)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Schedule email</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>All times in Eastern Time (ET)</div>
              </div>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer" }}><XIcon size={18} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Date + Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Date (ET)</label>
                  <input type="date" value={scheduleData.date} onChange={e => setScheduleData(d => ({ ...d, date: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb", color: t.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Time (ET)</label>
                  <input type="time" value={scheduleData.time} onChange={e => setScheduleData(d => ({ ...d, time: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb", color: t.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Subject</label>
                <input type="text" value={scheduleData.subject} onChange={e => setScheduleData(d => ({ ...d, subject: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb", color: t.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Recipients */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Recipients</label>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: t.textMuted, pointerEvents: "none" }} />
                  <input value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} placeholder="Search users or contacts…"
                    style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: 8, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb", color: t.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                </div>
                {/* Selected badges */}
                {scheduleData.recipients.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {(Array.isArray(scheduleData.recipients) ? scheduleData.recipients : []).map(r => (
                      <span key={r.email} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: isDark ? "rgba(59,130,246,0.2)" : "#EFF6FF", color: isDark ? "#93c5fd" : "#1D4ED8", fontSize: 12, fontWeight: 500 }}>
                        {r.name || r.email}
                        <button onClick={() => setScheduleData(d => ({ ...d, recipients: d.recipients.filter(x => x.email !== r.email) }))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ maxHeight: 160, overflowY: "auto", border: `1px solid ${t.border}`, borderRadius: 8, background: isDark ? "rgba(0,0,0,0.15)" : "#fafafa" }}>
                  {[...USERS, ...CONTACTS].filter(u => {
                    const name = u.first_name ? `${u.first_name} ${u.last_name || ""}` : (u.name || u.full_name || "");
                    const email = u.email || "";
                    const q = recipientSearch.toLowerCase();
                    return email && (!q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q));
                  }).slice(0, 40).map((u, i) => {
                    const name = u.first_name ? `${u.first_name} ${u.last_name || ""}`.trim() : (u.name || u.full_name || "");
                    const email = u.email || "";
                    const selected = scheduleData.recipients.some(r => r.email === email);
                    return (
                      <div key={u.id || i} onClick={() => setScheduleData(d => ({
                        ...d,
                        recipients: selected
                          ? d.recipients.filter(r => r.email !== email)
                          : [...d.recipients, { name, email }]
                      }))}
                        style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`, background: selected ? (isDark ? "rgba(59,130,246,0.12)" : "#EFF6FF") : "transparent" }}
                        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = selected ? (isDark ? "rgba(59,130,246,0.12)" : "#EFF6FF") : "transparent"; }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: isDark ? "#334155" : "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: isDark ? "#93c5fd" : "#3730a3", flexShrink: 0 }}>
                          {(name[0] || email[0] || "?").toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || email}</div>
                          <div style={{ fontSize: 11, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
                        </div>
                        {selected && <Check size={14} color={isDark ? "#60A5FA" : "#1D4ED8"} />}
                      </div>
                    );
                  })}
                  {[...USERS, ...CONTACTS].filter(u => u.email).length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: t.textMuted }}>No users available.</div>
                  )}
                </div>
              </div>

              {/* From */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>From</label>
                <div style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6", color: t.textMuted, fontSize: 13 }}>
                  {emailSettings.fromName || "American Vision Group"} &lt;{emailSettings.from || profile?.email || "—"}&gt;
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowScheduleModal(false)}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                disabled={!scheduleData.date || !scheduleData.time || scheduleData.recipients.length === 0}
                onClick={async () => {
                  const scheduledAt = `${scheduleData.date}T${scheduleData.time}:00`;
                  const newSettings = { ...emailSettings, status: "Scheduled", scheduledAt };
                  setEmailSettings(newSettings);
                  await handleSave(false, null, newSettings);
                  showToast(`Scheduled for ${scheduleData.date} at ${scheduleData.time} ET`, "success");
                  setShowScheduleModal(false);
                }}
                style={{ padding: "9px 20px", borderRadius: 8, background: !scheduleData.date || !scheduleData.time || scheduleData.recipients.length === 0 ? "#93c5fd" : "#1D4ED8", color: "#fff", fontWeight: 600, fontSize: 13, border: "none", cursor: !scheduleData.date || !scheduleData.time || scheduleData.recipients.length === 0 ? "not-allowed" : "pointer" }}>
                <Clock size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Email Canvas ─────────────────────────────────────────────────────────────

// ── Email Canvas ─────────────────────────────────────────────────────────────

function EmailCanvas({ t, isDark, rows, selectedRowId, onSelectRow, onAddRow, onDeleteRow, onDuplicateRow, onUpdateRow, onAddBlockToColumn, onReorder, setActiveRightTab, DIMENSIONS = [] }) {
  const [dropIdx, setDropIdx] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes("moverowid") ? "move" : "copy";
    setDropIdx(idx);
  };

  const handleDrop = (e, afterIdx) => {
    e.preventDefault();
    setDropIdx(null);
    const moveRowId = e.dataTransfer.getData("moverowid");
    if (moveRowId) {
      const insertBeforeIdx = afterIdx === -1 ? 0 : afterIdx + 1;
      const targetId = rows[insertBeforeIdx]?.id || null;
      if (targetId !== moveRowId) onReorder(moveRowId, targetId);
      return;
    }
    const label = e.dataTransfer.getData("blockLabel");
    if (!label) return;
    const relativeId = afterIdx === -1 ? (rows[0]?.id || null) : rows[afterIdx]?.id;
    const position = afterIdx === -1 ? "before" : "after";
    onAddRow(relativeId, label, position);
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
        {(Array.isArray(rows) ? rows : []).map((row, idx) => (
          <React.Fragment key={row.id}>
            <EmailRow
              row={row}
              isSelected={selectedRowId === row.id}
              isHovered={hoveredRowId === row.id}
              onSelect={onSelectRow}
              onHover={setHoveredRowId}
              onDelete={() => onDeleteRow(row.id)}
              onDuplicate={() => onDuplicateRow(row.id)}
              onUpdate={onUpdateRow}
              onAddRow={onAddRow}
              onAddBlockToColumn={onAddBlockToColumn}
              onReorder={onReorder}
              setActiveRightTab={setActiveRightTab}
              t={t} isDark={isDark}
              DIMENSIONS={DIMENSIONS}
              selectedRowId={selectedRowId}
              hoveredRowId={hoveredRowId}
            />
            <DropZone active={dropIdx === idx} onDragOver={e => handleDragOver(e, idx)} onDrop={e => handleDrop(e, idx)} />
          </React.Fragment>
        ))}

      </div>
      <style>{`
        [contenteditable="true"] blockquote,
        [contenteditable="true"] ul,
        [contenteditable="true"] ol {
          margin-left: 2rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        [contenteditable="true"] ul,
        [contenteditable="true"] ol {
          padding-left: 0;
          list-style-position: outside;
        }
        [contenteditable="true"] li {
          margin-bottom: 0.25rem;
        }
        [contenteditable="true"] blockquote {
          padding-left: 0.5rem;
          border-left: 1px dashed rgba(0,0,0,0.1);
        }
      `}</style>
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
  image: "IMAGE", paragraph: "TEXT", footer: "IMAGE",
  button: "BUTTON", divider: "DIVIDER", heading: "HEADING",
  html: "HTML", table: "TABLE", columns: "COLUMNS", kpis: "KPIs"
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

const FloatingTextBar = ({ t, isDark, DIMENSIONS = [] }) => {
  const [showTags, setShowTags] = useState(false);
  const tagDropRef = useRef(null);

  const rawTags = DIMENSIONS.find(d => d.name === "EmailTags")?.items || ["First name", "Last name", "Email", "Property Name", "Investment Amount", "Closing Date"];
  const emailTags = Array.isArray(rawTags) ? rawTags : ["First name", "Last name", "Email", "Property Name", "Investment Amount", "Closing Date"];

  const cmd = (name, val = null) => {
    try {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(name, false, val);
    } catch (e) {
      console.warn("Command failed", e);
    }
  };

  const insertTag = (tag) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    // Ensure we are inside a contenteditable area
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === 3) parent = parent.parentNode;
    
    // Simple check to see if we are inside our editor
    if (!parent.closest || !parent.closest('[contenteditable="true"]')) {
      // If not in editor, we can't reliably insert. 
      // Most of the time onMouseDown preventDefault keeps the focus where it was.
    }

    range.deleteContents();

    const span = document.createElement("span");
    span.style.cssText = "border:1px dashed #9CA3AF;padding:2px 6px;border-radius:4px;color:#6B7280;font-size:11px;background:#F9FAFB;margin:0 2px;display:inline-flex;align-items:center;vertical-align:middle;line-height:1";
    span.contentEditable = "false";
    span.innerText = tag;

    range.insertNode(span);
    
    // Add a space after the tag for convenience
    const textNode = document.createTextNode("\u00A0");
    range.setStartAfter(span);
    range.insertNode(textNode);
    
    // Set cursor after the space
    range.setStartAfter(textNode);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
    
    setShowTags(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showTags) return;
    const handler = (e) => {
      if (tagDropRef.current && !tagDropRef.current.contains(e.target)) setShowTags(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTags]);

  const Btn = ({ name, icon: Icon, title }) => (
    <button
      onMouseDown={e => { e.preventDefault(); cmd(name); }}
      style={{
        background: "transparent", border: "none", color: "#fff",
        padding: "6px 8px", cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center", borderRadius: 4,
        transition: "background 0.2s"
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      title={title}
    >
      <Icon size={14} strokeWidth={2.5} />
    </button>
  );

  const Separator = () => <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />;

  return (
    <div style={{
      position: "absolute", bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
      background: "#222", color: "#fff", padding: "4px 8px", borderRadius: 8,
      display: "flex", alignItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      zIndex: 1000, whiteSpace: "nowrap"
    }}>
      <Btn name="bold" icon={Bold} title="Bold" />
      <Btn name="italic" icon={Italic} title="Italic" />
      <Btn name="underline" icon={Underline} title="Underline" />
      <Btn name="strikethrough" icon={Type} title="Strikethrough" />
      <Separator />
      <Btn name="justifyLeft" icon={AlignLeft} title="Align Left" />
      <Btn name="justifyCenter" icon={AlignCenter} title="Align Center" />
      <Btn name="justifyRight" icon={AlignRight} title="Align Right" />
      <Separator />
      <Btn name="insertUnorderedList" icon={List} title="Bullet List" />
      <Btn name="insertOrderedList" icon={List} title="Numbered List" />
      <Separator />
      <Btn name="outdent" icon={Outdent} title="Decrease Indent" />
      <Btn name="indent" icon={Indent} title="Increase Indent" />
      <Separator />
      <button
        onMouseDown={e => {
          e.preventDefault();
          const url = prompt("Enter URL:", "https://");
          if (url) cmd("createLink", url);
        }}
        style={{ background: "transparent", border: "none", color: "#fff", padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, transition: "background 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        title="Link"
      >
        <LinkIcon size={14} strokeWidth={2.5} />
      </button>
      <Separator />

      {/* Merge Tags Dropdown */}
      <div style={{ position: "relative" }} ref={tagDropRef}>
        <div
          onMouseDown={e => { e.preventDefault(); setShowTags(!showTags); }}
          style={{
            padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer",
            opacity: showTags ? 1 : 0.8, display: "flex", alignItems: "center", gap: 4
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => { if (!showTags) e.currentTarget.style.opacity = 0.8; }}
        >
          Merge Tags <ChevronDown size={12} strokeWidth={2.5} style={{ transform: showTags ? "rotate(180deg)" : "none", transition: "transform 0.2s", opacity: 0.7 }} />
        </div>

        {showTags && (
          <div style={{
            position: "absolute", top: "calc(100% + 10px)", left: "0",
            background: "#222", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
            minWidth: 160, boxShadow: "0 8px 30px rgba(0,0,0,0.5)", zIndex: 1100,
            overflowX: "hidden", overflowY: "auto", maxHeight: 250, padding: "4px 0"
          }}>
            {(Array.isArray(emailTags) ? emailTags : []).map(tag => (
              <div
                key={tag}
                onMouseDown={e => { e.preventDefault(); insertTag(tag); }}
                style={{
                  padding: "8px 12px", fontSize: 11, color: "#fff", cursor: "pointer",
                  transition: "background 0.1s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {tag}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function EmailRow({ row, isSelected, isHovered, onSelect, onHover, onDelete, onDuplicate, onUpdate, onAddRow, onAddBlockToColumn, onReorder, setActiveRightTab, t, isDark, selectedRowId, hoveredRowId, isNested, DIMENSIONS = [] }) {
  const blockType = ROW_BLOCK_TYPE[row.type] || "TEXT";
  const showControls = (isSelected || isHovered);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const MoveHandle = () => (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("moverowid", row.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setDragImage(e.currentTarget, 14, 14);
      }}
      style={{
        position: "absolute", right: -32, top: "50%", transform: "translateY(-50%)",
        width: 28, height: 28, borderRadius: "50%", background: "#3B82F6",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "grab", color: "#fff", zIndex: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      }}
    >
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
            {(Array.isArray(ratios) ? ratios : []).map((flex, i) => {
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
                  {Array.isArray(col.blocks) && col.blocks.length > 0 ? (
                    col.blocks.map(b => (
                      <EmailRow
                        key={b.id}
                        row={b}
                        isSelected={selectedRowId === b.id}
                        onSelect={onSelect}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        onUpdate={onUpdate}
                        onAddRow={onAddRow}
                        onAddBlockToColumn={onAddBlockToColumn}
                        onReorder={onReorder}
                        t={t} isDark={isDark}
                        DIMENSIONS={DIMENSIONS}
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
        const autoHeight = item.content?.autoHeight !== false;
        const height = item.content?.height ?? "auto";

        const imgStyle = {
          width: align === "justify" ? "100%" : (autoWidth ? "auto" : width),
          height: autoHeight ? "auto" : height,
          display: "block",
          marginLeft: (align === "center" || align === "right" || align === "justify") ? "auto" : "0",
          marginRight: (align === "center" || align === "left" || align === "justify") ? "auto" : "0",
          maxWidth: "100%"
        };
        return (
          <div
            onDragOver={e => {
              if (e.dataTransfer.types.includes("imageUrl")) {
                e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDrop={e => {
              const url = e.dataTransfer.getData("imageUrl");
              if (url) {
                e.preventDefault(); e.stopPropagation();
                onUpdate(item.id, { imageUrl: url });
              }
            }}
          >
            {item.content?.imageUrl ? (
              <div style={{ position: "relative" }}>
                <img
                  src={item.content.imageUrl}
                  alt={item.content.altText || ""}
                  style={imgStyle}
                  onError={e => {
                    e.currentTarget.style.display = "none";
                    const ph = e.currentTarget.parentElement.querySelector("[data-img-placeholder]");
                    if (ph) ph.style.display = "flex";
                  }}
                />
                <div data-img-placeholder style={{ display: "none", background: isDark ? "#222" : "#F3F4F6", minHeight: 120, alignItems: "center", justifyContent: "center", color: t.textMuted, flexDirection: "column", gap: 6 }}>
                  <ImageIcon size={32} opacity={0.4} />
                  <span style={{ fontSize: 11, opacity: 0.5 }}>Broken image — click to replace</span>
                </div>
              </div>
            ) : (
              <div style={{ background: isDark ? "#222" : "#F3F4F6", minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted }}>
                <ImageIcon size={32} opacity={0.4} />
              </div>
            )}
          </div>
        );

      case "paragraph":
        return (
          <>
            <div
              ref={el => {
                if (el && (item.content?.html || "") !== el.innerHTML && document.activeElement !== el) {
                  el.innerHTML = item.content?.html || "";
                }
              }}
              contentEditable
              suppressContentEditableWarning
              onBlur={e => onUpdate(item.id, { html: e.currentTarget.innerHTML })}
              onClick={e => {
                // Don't stop propagation, let it bubble to EmailRow for selection
                // but we need to make sure the focus is handled correctly.
              }}
              style={{
                paddingTop: item.content?.paddingTop ?? (isNested ? 12 : 24),
                paddingBottom: item.content?.paddingBottom ?? (isNested ? 12 : 24),
                paddingLeft: item.content?.paddingLeft ?? (isNested ? 16 : 32),
                paddingRight: item.content?.paddingRight ?? (isNested ? 16 : 32),
                background: item.content?.bgColor || "#fff",
                color: item.content?.color || "#1F2937",
                fontSize: item.content?.fontSize || 13,
                lineHeight: item.content?.lineHeight ? (typeof item.content.lineHeight === 'number' ? `${item.content.lineHeight}%` : item.content.lineHeight) : 1.65,
                textAlign: item.content?.textAlign || "left",
                fontFamily: item.content?.fontFamily || "inherit",
                fontWeight: item.content?.fontWeight || "normal",
                letterSpacing: item.content?.letterSpacing ? `${item.content.letterSpacing}px` : "normal",
                outline: "none",
                minHeight: 40
              }}
            />
            {isSelected && <FloatingTextBar t={t} isDark={isDark} DIMENSIONS={DIMENSIONS} />}
          </>
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
              ref={el => {
                if (el && (item.content?.headingText || "") !== el.innerText && document.activeElement !== el) {
                  el.innerText = item.content?.headingText || "";
                }
              }}
              contentEditable
              suppressContentEditableWarning
              onBlur={e => onUpdate(item.id, { headingText: e.currentTarget.innerText })}
              onClick={e => e.stopPropagation()}
              style={{ margin: 0, fontSize: item.content?.fontSize || 22, fontWeight: 700, color: item.content?.color || "#1F2937", outline: "none" }}
            />
          </div>
        );

      case "html":
        return <div style={{ padding: "16px 32px", background: "#fff", fontSize: 13, color: "#1F2937" }} dangerouslySetInnerHTML={{ __html: item.content?.html || "<strong>Hello, world!</strong>" }} />;

      case "table":
        const tableRows = Array.isArray(item.content?.rows) ? item.content.rows : [];
        return (
          <>
            <div style={{ padding: "16px 32px", background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #DDDDDD" }}>
                <tbody>
                  {tableRows.map((tr, rIdx) => (
                    <tr key={tr.id} style={{ background: tr.isHeader ? (item.content?.headerBg || "#EBEBEB") : (item.content?.striped && rIdx % 2 === 1 ? "#F9F9F9" : (item.content?.bg || "transparent")) }}>
                      {(Array.isArray(tr.cells) ? tr.cells : []).map((cell, cIdx) => (
                        <td
                          ref={el => {
                            if (el && (cell.text || "") !== el.innerHTML && document.activeElement !== el) {
                              el.innerHTML = cell.text || "";
                            }
                          }}
                          key={cell.id}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => {
                            e.currentTarget.style.boxShadow = "none";
                            const newRows = [...tableRows];
                            newRows[rIdx].cells[cIdx].text = e.currentTarget.innerHTML;
                            onUpdate(item.id, { rows: newRows });
                          }}
                          onFocus={e => {
                            e.currentTarget.style.boxShadow = "inset 0 0 0 2px #3B82F6";
                            const txt = e.currentTarget.innerText.trim();
                            if (txt === "Add header text" || txt === "Add text") {
                              e.currentTarget.innerHTML = "";
                            }
                          }}
                          onClick={e => e.stopPropagation()}
                          style={{
                            border: `${item.content?.borderWidth || 1}px ${item.content?.borderStyle || "solid"} ${item.content?.borderColor || "#DDDDDD"}`,
                            padding: item.content?.cellPadding ?? "12px",
                            fontSize: (tr.isHeader ? item.content?.headerFontSize : item.content?.fontSize) || 13,
                            color: (tr.isHeader ? item.content?.headerColor : item.content?.color) || "#1F2937",
                            fontWeight: tr.isHeader ? (item.content?.headerFontWeight || 700) : (item.content?.fontWeight === 'bold' ? 700 : 400),
                            textAlign: (tr.isHeader ? item.content?.headerTextAlign : item.content?.textAlign) || "left",
                            verticalAlign: item.content?.verticalAlign || "middle",
                            fontFamily: (tr.isHeader ? item.content?.headerFontFamily : item.content?.fontFamily) || "inherit",
                            lineHeight: item.content?.lineHeight ? `${item.content.lineHeight}%` : "1.4",
                            letterSpacing: item.content?.letterSpacing ? `${item.content.letterSpacing}px` : "normal",
                            outline: "none",
                            minHeight: 40,
                            minWidth: 100,
                            transition: "0.2s"
                          }}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isSelected && <FloatingTextBar t={t} isDark={isDark} DIMENSIONS={DIMENSIONS} />}
          </>
        );

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
      onMouseEnter={() => !isNested && onHover(row.id)}
      onMouseLeave={() => !isNested && onHover(null)}
      onClick={e => { e.stopPropagation(); onSelect(row.id, blockType); }}
      onDragOver={e => {
        if (e.dataTransfer.types.includes("moverowid")) {
          e.preventDefault();
          setIsDropTarget(true);
        }
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={e => {
        e.preventDefault();
        setIsDropTarget(false);
        const sourceId = e.dataTransfer.getData("moverowid");
        if (sourceId && sourceId !== row.id) {
          onReorder(sourceId, row.id);
        }
      }}
      style={{
        position: "relative",
        cursor: "pointer",
        outline: isDropTarget ? "2px solid #3B82F6" : ((isSelected || isHovered) ? `2px solid #3B82F6` : "none"),
        outlineOffset: (isSelected || isHovered || isDropTarget) ? -2 : 0,
        boxShadow: isDropTarget ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
        transition: "outline 0.1s, background 0.2s, box-shadow 0.2s",
        background: (isSelected || isHovered || isDropTarget) ? "rgba(59,130,246,0.05)" : "transparent",
        marginBottom: isSelected ? 8 : 0,
        marginTop: isSelected ? 8 : 0,
        zIndex: (isSelected || isHovered || isDropTarget) ? 10 : 1
      }}
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

      {isHovered && !isNested && (
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          background: "#3B82F6", color: "#fff",
          fontSize: 8, padding: "2px 6px",
          fontWeight: 900, textTransform: "uppercase",
          zIndex: 15, borderRadius: "4px 0 0 0",
          pointerEvents: "none", letterSpacing: 0.5
        }}>
          {blockType}
        </div>
      )}

      {showControls && onAddRow && <AddRowBtn isDark={isDark} position="bottom" onClick={() => onAddRow(row.id, "COLUMNS", "after")} />}

      {showControls && (
        <>
          {!isNested && <MoveHandle />}
          {!isNested && (
            <div style={{
              position: "absolute", top: 0, right: -40, background: "#3B82F6",
              color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: "0 4px 4px 0",
              fontWeight: 800, textTransform: "uppercase", zIndex: 11
            }}>
              Row
            </div>
          )}

          {isSelected && (
            <div style={{
              position: "absolute", bottom: isNested ? 0 : -12, right: 0,
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

// Stable module-level row wrapper — must NOT be defined inside SettingsPanel to avoid remount on every render
function SettingsRow({ label, t, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", paddingBottom: 22 }}>
      <div style={{ width: 180, fontSize: 14, color: t.textMuted, fontWeight: 500, flexShrink: 0 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function SettingsPanel({ t, isDark, settings, onChange, profile, DIMENSIONS = [], CONTACTS = [], USERS = [] }) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showRecipients, setShowRecipients] = useState(false);
  const [selectedInTable, setSelectedInTable] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [showDoNotSend, setShowDoNotSend] = useState(false);
  const [doNotSendRowSelection, setDoNotSendRowSelection] = useState({});
  const [selectedDoNotSend, setSelectedDoNotSend] = useState([]);
  const [showReplyToDropdown, setShowReplyToDropdown] = useState(false);
  const replyToDropRef = useRef(null);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const fromDropRef = useRef(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeDropRef = useRef(null);

  useEffect(() => {
    if (showRecipients) {
      const currentEmails = (localSettings.recipients || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
      const newSelObject = {};
      CONTACTS.forEach((c, i) => {
        const id = c.docId || c._docId || c.id || c.schedule_id || `idx-${i}`;
        if (c.email && currentEmails.includes(c.email.toLowerCase())) {
          newSelObject[id] = true;
        }
      });
      setRowSelection(newSelObject);
    } else {
      setRowSelection({});
    }
  }, [showRecipients, CONTACTS, localSettings.recipients]);

  useEffect(() => {
    if (showDoNotSend) {
      const currentEmails = (localSettings.doNotSendTo || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
      const newSelObject = {};
      CONTACTS.forEach((c, i) => {
        const id = c.docId || c._docId || c.id || c.schedule_id || `idx-${i}`;
        if (c.email && currentEmails.includes(c.email.toLowerCase())) {
          newSelObject[id] = true;
        }
      });
      setDoNotSendRowSelection(newSelObject);
    }
  }, [showDoNotSend, CONTACTS, localSettings.doNotSendTo]);

  const tableData = useMemo(() => {
    const recipients = (localSettings.recipients || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
    const dns = (localSettings.doNotSendTo || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
    return (Array.isArray(CONTACTS) ? CONTACTS : []).map((c, i) => {
      const id = c.docId || c._docId || c.id || c.schedule_id || `idx-${i}`;
      return {
        ...c,
        _rowId: id,
        isSelected: !!rowSelection[id],
        isAlreadyRecipient: c.email && recipients.includes(c.email.toLowerCase()),
        isAlreadyDoNotSend: c.email && dns.includes(c.email.toLowerCase())
      };
    });
  }, [CONTACTS, rowSelection, localSettings.recipients, localSettings.doNotSendTo]);

  const doNotSendTableData = useMemo(() => {
    const recipients = (localSettings.recipients || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
    const dns = (localSettings.doNotSendTo || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
    return (Array.isArray(CONTACTS) ? CONTACTS : []).map((c, i) => {
      const id = c.docId || c._docId || c.id || c.schedule_id || `idx-${i}`;
      return {
        ...c,
        _rowId: id,
        isSelected: !!doNotSendRowSelection[id],
        isAlreadyRecipient: c.email && recipients.includes(c.email.toLowerCase()),
        isAlreadyDoNotSend: c.email && dns.includes(c.email.toLowerCase())
      };
    });
  }, [CONTACTS, doNotSendRowSelection, localSettings.recipients, localSettings.doNotSendTo]);

  const recipientColumns = useMemo(() => [
    {
      id: "select",
      accessorKey: "isSelected",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="ts-checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="ts-checkbox"
          checked={row.getIsSelected()}
          disabled={!row.original.email || row.original.isAlreadyDoNotSend}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      size: 50,
      enableSorting: true,
    },
    {
      accessorKey: "first_name",
      header: (t.isFrench ? "Prénom" : "First Name"),
      cell: info => info.getValue() || "—"
    },
    {
      accessorKey: "last_name",
      header: (t.isFrench ? "Nom" : "Last Name"),
      cell: info => info.getValue() || "—"
    },
    {
      accessorKey: "email",
      header: (t.isFrench ? "E-mail" : "Email Address"),
      cell: info => {
        const val = info.getValue() || "—";
        const isExcluded = info.row.original.isAlreadyDoNotSend;
        if (isExcluded) {
          return (
            <div style={{ color: isDark ? "#F87171" : "#DC2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              {val}
              <span style={{
                fontSize: 10,
                background: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
                color: isDark ? "#F87171" : "#DC2626",
                padding: "2px 8px",
                borderRadius: 12,
                fontWeight: 700,
                letterSpacing: "0.02em",
                border: `1px solid ${isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA"}`
              }}>
                EXCLUDED
              </span>
            </div>
          );
        }
        return val;
      }
    },
  ], [t, isDark, CONTACTS]);

  const doNotSendColumns = useMemo(() => [
    {
      id: "select",
      accessorKey: "isSelected",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="ts-checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="ts-checkbox"
          checked={row.getIsSelected()}
          disabled={!row.original.email || row.original.isAlreadyRecipient}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      size: 50,
      enableSorting: true,
    },
    {
      accessorKey: "first_name",
      header: (t.isFrench ? "Prénom" : "First Name"),
      cell: info => info.getValue() || "—"
    },
    {
      accessorKey: "last_name",
      header: (t.isFrench ? "Nom" : "Last Name"),
      cell: info => info.getValue() || "—"
    },
    {
      accessorKey: "email",
      header: (t.isFrench ? "E-mail" : "Email Address"),
      cell: info => {
        const val = info.getValue() || "—";
        const isRecipient = info.row.original.isAlreadyRecipient;
        if (isRecipient) {
          return (
            <div style={{ color: isDark ? "#60A5FA" : "#2563EB", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              {val}
              <span style={{
                fontSize: 10,
                background: isDark ? "rgba(59, 130, 246, 0.2)" : "#DBEAFE",
                color: isDark ? "#60A5FA" : "#2563EB",
                padding: "2px 8px",
                borderRadius: 12,
                fontWeight: 700,
                letterSpacing: "0.02em",
                border: `1px solid ${isDark ? "rgba(59, 130, 246, 0.3)" : "#BFDBFE"}`
              }}>
                RECIPIENT
              </span>
            </div>
          );
        }
        return val;
      }
    },
  ], [t, isDark, CONTACTS]);

  const userFullName = (profile?.first_name || profile?.last_name)
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : profile?.displayName;

  const userName = userFullName || profile?.email?.split("@")[0] || "Sender";

  const getInfoForEmail = (email) => {
    if (!email) return { name: userName, email: profile?.email || "" };
    const e = email.toLowerCase().trim();
    const match = [...USERS, ...CONTACTS].find(u => (u.email || "").toLowerCase().trim() === e);

    if (match) {
      const name = (match.first_name || match.last_name)
        ? `${match.first_name || ""} ${match.last_name || ""}`.trim()
        : (match.name || match.full_name || match.displayName || match.email);
      return { name, email: match.email };
    }
    if (e === "invest@americanvisioncap.com") {
      return { name: "American Vision Group", email: "invest@americanvisioncap.com" };
    }
    return { name: email.split("@")[0], email };
  };

  const currentFromInfo = useMemo(() => getInfoForEmail(localSettings.from), [localSettings.from, USERS, CONTACTS, profile, userName]);
  const currentReplyToInfo = useMemo(() => getInfoForEmail(localSettings.replyTo), [localSettings.replyTo, USERS, CONTACTS, profile, userName]);

  // Close from name dropdown on outside click
  useEffect(() => {
    if (!showFromDropdown) return;
    const handler = (e) => {
      if (fromDropRef.current && !fromDropRef.current.contains(e.target)) setShowFromDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFromDropdown]);

  // Close type dropdown on outside click
  useEffect(() => {
    if (!showTypeDropdown) return;
    const handler = (e) => {
      if (typeDropRef.current && !typeDropRef.current.contains(e.target)) setShowTypeDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTypeDropdown]);

  // Close reply-to dropdown on outside click
  useEffect(() => {
    if (!showReplyToDropdown) return;
    const handler = (e) => {
      if (replyToDropRef.current && !replyToDropRef.current.contains(e.target)) setShowReplyToDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showReplyToDropdown]);

  // Sync local state when external settings change (e.g. from a different template)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const set = (key, val) => {
    setLocalSettings(prev => ({ ...prev, [key]: val }));
  };

  const commit = (key) => {
    onChange(prev => ({ ...prev, [key]: localSettings[key] }));
  };

  const inp = { flex: 1, border: "none", borderBottom: `1px solid ${t.chipBorder}`, background: "transparent", fontSize: 15, color: t.text, outline: "none", padding: "8px 0", transition: "border-color 0.2s" };
  const actionBtn = { border: `1px solid ${t.chipBorder}`, borderRadius: 20, padding: "8px 20px", background: "transparent", cursor: "pointer", color: t.text, fontSize: 13, fontWeight: 600, transition: "all 0.2s" };

  return (
    <div style={{ flex: 1, background: isDark ? "#111" : "#EEEEE9", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 1360, background: t.surface, borderRadius: 16, border: `1px solid ${t.chipBorder}`, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
        <div style={{ padding: "32px 48px", borderBottom: `1px solid ${t.chipBorder}` }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: "-0.01em" }}>Email settings &amp; recipients</h3>
        </div>
        <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 32 }}>

          <SettingsRow label="Subject:" t={t}>
            <input value={localSettings.subject || ""} onChange={e => set("subject", e.target.value)} onBlur={() => commit("subject")} placeholder="Enter Subject" style={inp} />
          </SettingsRow>

          <SettingsRow label="Internal name:" t={t}>
            <input value={localSettings.internalName || ""} onChange={e => set("internalName", e.target.value)} onBlur={() => commit("internalName")} placeholder="Enter Internal Name" style={inp} />
          </SettingsRow>

          <SettingsRow label="Recipients:" t={t}>
            <input
              value={localSettings.recipients || ""}
              onChange={e => set("recipients", e.target.value)}
              onBlur={() => commit("recipients")}
              placeholder="Click button to select recipients..."
              style={{ ...inp, color: localSettings.recipients ? t.text : t.textMuted }}
            />
            <button
              onClick={() => setShowRecipients(true)}
              style={{ ...actionBtn, marginLeft: 16, display: "flex", alignItems: "center", gap: 8, background: isDark ? "#374151" : "#F3F4F6", border: "none" }}
            >
              <Eye size={16} /> View recipients
            </button>
          </SettingsRow>

          <SettingsRow label="Do not send to:" t={t}>
            <input
              value={localSettings.doNotSendTo || ""}
              onChange={e => set("doNotSendTo", e.target.value)}
              onBlur={() => commit("doNotSendTo")}
              placeholder="(Optional) Click to select recipients to exclude"
              style={{ ...inp, color: localSettings.doNotSendTo ? t.text : t.textMuted }}
            />
            <button
              onClick={() => setShowDoNotSend(true)}
              style={{ ...actionBtn, marginLeft: 16, display: "flex", alignItems: "center", gap: 8, background: isDark ? "#374151" : "#F3F4F6", border: "none" }}
            >
              <Eye size={16} /> View Do not send
            </button>
          </SettingsRow>

          <SettingsRow label="Type:" t={t}>
            <div ref={typeDropRef} style={{ position: "relative", flex: 1, borderBottom: `1px solid ${t.chipBorder}`, cursor: "pointer" }} onClick={() => setShowTypeDropdown(!showTypeDropdown)}>
              <div style={{ ...inp, borderBottom: "none", color: localSettings.type ? t.text : t.textMuted, display: "flex", alignItems: "center" }}>
                {localSettings.type || (t.isFrench ? "Choisir Type..." : "Select Type...")}
              </div>
              <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.6 }}>
                <CDown />
              </div>
              {showTypeDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: t.surface, border: `1px solid ${t.chipBorder}`, borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 1000, overflow: "hidden" }}>
                  {(() => {
                    const rawItems = DIMENSIONS.find(d => d.name === "EmailType")?.items || ["Marketing", "Transactional", "Operational"];
                    const items = Array.isArray(rawItems) ? rawItems : ["Marketing", "Transactional", "Operational"];
                    return items.map(opt => (
                      <div
                        key={opt}
                        onClick={(e) => {
                          e.stopPropagation();
                          set("type", opt);
                          onChange(prev => ({ ...prev, type: opt }));
                          setShowTypeDropdown(false);
                        }}
                        style={{ padding: "12px 16px", cursor: "pointer", fontSize: 14, color: t.text, transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {opt}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </SettingsRow>

          <SettingsRow label="From name:" t={t}>
            <div ref={fromDropRef} style={{ position: "relative", flex: 1, borderBottom: `1px solid ${t.chipBorder}`, cursor: "pointer" }} onClick={() => setShowFromDropdown(!showFromDropdown)}>
              <input
                value={localSettings.fromName || ""}
                onChange={e => set("fromName", e.target.value)}
                onBlur={() => commit("fromName")}
                onClick={e => e.stopPropagation()}
                placeholder="Enter From Name"
                style={{ ...inp, borderBottom: "none", paddingRight: 32 }}
              />
              <div
                style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: "100%", opacity: 0.6 }}
              >
                <CDown />
              </div>
              {showFromDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: t.surface, border: `1px solid ${t.chipBorder}`, borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 1000, overflow: "hidden" }}>
                  {[
                    { name: userName, email: profile?.email || "" },
                    { name: "Custom sender name", email: "" }
                  ].map((opt, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        const isCustom = opt.name === "Custom sender name";
                        const newVal = isCustom ? "" : opt.name;
                        set("fromName", newVal);
                        onChange(prev => ({ ...prev, fromName: newVal }));
                        setShowFromDropdown(false);
                        if (isCustom) {
                          const el = fromDropRef.current?.querySelector('input');
                          if (el) el.focus();
                        }
                      }}
                      style={{ padding: "12px 16px", cursor: "pointer", transition: "background 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ fontSize: 14, color: t.text }}>{opt.name}</div>
                      {opt.email && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{opt.email}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SettingsRow>

          <SettingsRow label="From:" t={t}>
            <div style={{ flex: 1, fontSize: 15, color: t.text, borderBottom: `1px solid ${t.chipBorder}`, padding: "8px 0" }}>{localSettings.from || "—"}</div>
            <button style={{ ...actionBtn, marginLeft: 16, marginRight: 16 }}>✏️ Edit</button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: t.textMuted, cursor: "pointer", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={!!localSettings.addSignature} onChange={e => { set("addSignature", e.target.checked); onChange(prev => ({ ...prev, addSignature: e.target.checked })); }} />
              Add email signature
            </label>
          </SettingsRow>

          <SettingsRow label="Reply-to:" t={t}>
            <div ref={replyToDropRef} style={{ position: "relative", flex: 1, borderBottom: `1px solid ${t.chipBorder}`, display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => setShowReplyToDropdown(!showReplyToDropdown)}>
              <input
                value={localSettings.replyTo || ""}
                onChange={e => set("replyTo", e.target.value)}
                onBlur={() => commit("replyTo")}
                onClick={e => e.stopPropagation()}
                placeholder="Enter Reply-to"
                style={{ ...inp, borderBottom: "none", paddingRight: 32 }}
              />
              <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", cursor: "pointer", opacity: 0.6, width: 32, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CDown />
              </div>
              {showReplyToDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: t.surface, border: `1px solid ${t.chipBorder}`, borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 1000, overflow: "hidden" }}>
                  {(() => {
                    const base = Array.isArray(USERS) ? USERS : [];
                    const list = [...base, { isCustom: true, name: "Custom reply-to name" }];
                    return list.map((u, idx) => {
                      const isCustom = u.isCustom;
                      const name = isCustom ? u.name : (u.first_name ? `${u.first_name} ${u.last_name || ""}` : (u.name || u.full_name || u.email || "Unknown"));
                      const email = isCustom ? "" : (u.email || "");
                      return (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCustom) {
                              set("replyTo", "");
                              onChange(prev => ({ ...prev, replyTo: "" }));
                              const el = replyToDropRef.current?.querySelector('input');
                              if (el) el.focus();
                            } else {
                              set("replyTo", email);
                              onChange(prev => ({ ...prev, replyTo: email }));
                            }
                            setShowReplyToDropdown(false);
                          }}
                          style={{ padding: "12px 16px", cursor: "pointer", transition: "background 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ fontSize: 14, color: t.text }}>{name}</div>
                          {email && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{email}</div>}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </SettingsRow>


        </div>
      </div>

      <Modal
        open={showRecipients}
        onClose={() => setShowRecipients(false)}
        title="Recipients List"
        width={800}
        t={t}
        isDark={isDark}
        showCancel={true}
        saveLabel="Select Recipients"
        onSave={() => {
          const emails = (Array.isArray(selectedInTable) ? selectedInTable : []).map(s => s.email).filter(Boolean).join("; ");
          set("recipients", emails);
          onChange(prev => ({ ...prev, recipients: emails }));
          setShowRecipients(false);
        }}
      >
        <div style={{ height: 500, width: "100%" }}>
          <TanStackTable
            data={tableData}
            columns={recipientColumns}
            t={t}
            isDark={isDark}
            pageSize={10}
            onSelectionChange={setSelectedInTable}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            getRowId={(row) => row._rowId}
            rowStyle={(row) => row.isAlreadyDoNotSend ? {
              background: isDark ? "rgba(239, 68, 68, 0.05)" : "#FEF2F2",
              borderLeft: `4px solid ${isDark ? "#EF4444" : "#DC2626"}`,
              opacity: 0.9,
              cursor: "not-allowed"
            } : {}}
          />
        </div>
      </Modal>

      <Modal
        open={showDoNotSend}
        onClose={() => setShowDoNotSend(false)}
        title="Do Not Send List"
        width={800}
        t={t}
        isDark={isDark}
        showCancel={true}
        saveLabel="Select Recipients"
        onSave={() => {
          const emails = (Array.isArray(selectedDoNotSend) ? selectedDoNotSend : []).map(s => s.email).filter(Boolean).join("; ");
          set("doNotSendTo", emails);
          onChange(prev => ({ ...prev, doNotSendTo: emails }));
          setShowDoNotSend(false);
        }}
      >
        <div style={{ height: 500, width: "100%" }}>
          <TanStackTable
            data={doNotSendTableData}
            columns={doNotSendColumns}
            t={t}
            isDark={isDark}
            pageSize={10}
            onSelectionChange={setSelectedDoNotSend}
            rowSelection={doNotSendRowSelection}
            onRowSelectionChange={setDoNotSendRowSelection}
            getRowId={(row) => row._rowId}
            rowStyle={(row) => row.isAlreadyRecipient ? {
              background: isDark ? "rgba(59, 130, 246, 0.05)" : "#F0F9FF",
              borderLeft: `4px solid ${isDark ? "#3B82F6" : "#2563EB"}`,
              opacity: 0.9,
              cursor: "not-allowed"
            } : {}}
          />
        </div>
      </Modal>

    </div>
  );
}


// ── Review Panels ─────────────────────────────────────────────────────────────

function ReviewPanel({ t, isDark, rows, emailSettings, narrow }) {
  return (
    <div style={{ flex: 1, background: isDark ? "#111" : "#EEEEE9", display: "flex", gap: 24, padding: "40px", overflowY: "auto" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {narrow && (
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "7px 14px", fontSize: 12, color: "#2563EB", display: "flex", alignItems: "center", gap: 6 }}>
            ℹ Discover mobile email styling tips. <span style={{ textDecoration: "underline", cursor: "pointer" }}>Learn more</span>
          </div>
        )}
        <div style={{ width: narrow ? 390 : "100%", maxWidth: narrow ? 390 : 1100, boxShadow: "0 10px 40px rgba(0,0,0,0.1)", background: "#fff", borderRadius: 8, overflow: "hidden" }}>
          {(Array.isArray(rows) ? rows : []).map(row => <RowPreview key={row.id} row={row} narrow={narrow} />)}
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
    case "columns":
      const ratios = (row.content?.layout || "50-50").split("-").map(Number);
      return (
        <div style={{ display: "flex", width: "100%", background: row.content?.rowBg || "transparent" }}>
          {(Array.isArray(ratios) ? ratios : []).map((flex, i) => (
            <div key={i} style={{ flex: `${flex} 1 0%`, padding: row.content?.columns?.[i]?.settings?.padding || "10px", background: row.content?.columns?.[i]?.settings?.bgColor || "transparent" }}>
              {(Array.isArray(row.content?.columns?.[i]?.blocks) ? row.content.columns[i].blocks : []).map(b => <RowPreview key={b.id} row={b} narrow={narrow} />)}
            </div>
          ))}
        </div>
      );
    case "table":
      const tRows = Array.isArray(row.content?.rows) ? row.content.rows : [];
      return (
        <div style={{ padding: p, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #DDDDDD" }}>
            <tbody>
              {(Array.isArray(tRows) ? tRows : []).map((tr, rIdx) => (
                <tr key={tr.id} style={{ background: tr.isHeader ? (row.content?.headerBg || "#EBEBEB") : (row.content?.striped && rIdx % 2 === 1 ? "#F9F9F9" : (row.content?.bg || "transparent")) }}>
                  {(Array.isArray(tr.cells) ? tr.cells : []).map(cell => (
                    <td key={cell.id} style={{ border: "1px solid #DDDDDD", padding: row.content?.cellPadding || "12px", fontSize: narrow ? 11 : 13 }} dangerouslySetInnerHTML={{ __html: cell.text || "" }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return <div style={{ height: 40, background: "#fff" }} />;
  }
}

// ── Block Properties Panel helpers — module-level so React never remounts them ─

function BPSec({ isOpen, onToggle, label, t, isDark, children }) {
  return (
    <div>
      <div onClick={onToggle} style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", cursor: "pointer", borderBottom: `1px solid ${t.border}`, background: isDark ? "#161616" : "#F9FAFB" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{label}</span>
        {isOpen ? <ChevronUp size={13} color={t.textMuted} /> : <CDown />}
      </div>
      {isOpen && <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, borderBottom: `1px solid ${t.border}` }}>{children}</div>}
    </div>
  );
}

function BPPropRow({ label, t, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: t.textMuted }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

const NumInput = ({ value, onChange, unit, t, isDark }) => (
  <div style={{ display: "flex", alignItems: "center", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden", background: t.surface }}>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: 45, padding: "7px 6px", textAlign: "center", border: "none", background: "transparent", color: t.text, fontSize: 12, outline: "none" }}
    />
    <div style={{ padding: "7px 10px", background: isDark ? "#222" : "#F3F4FB", fontSize: 11, color: t.textMuted, borderLeft: `1px solid ${t.border}`, minWidth: 24, textAlign: "center" }}>
      {unit}
    </div>
    <div style={{ display: "flex", flexDirection: "row", borderLeft: `1px solid ${t.border}` }}>
      <button onClick={() => onChange(parseInt(value || 0) - 1)} style={{ width: 34, height: 34, border: "none", background: "transparent", cursor: "pointer", borderRight: `1px solid ${t.border}`, color: t.textMuted, fontSize: 16 }}>-</button>
      <button onClick={() => onChange(parseInt(value || 0) + 1)} style={{ width: 34, height: 34, border: "none", background: "transparent", cursor: "pointer", color: t.textMuted, fontSize: 16 }}>+</button>
    </div>
  </div>
);

const PropToggle = ({ value, onChange }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      width: 44, height: 22, background: value ? "#222" : "#D1D5DB",
      borderRadius: 11, position: "relative", cursor: "pointer", transition: "0.2s"
    }}
  >
    <div style={{
      position: "absolute", top: 2, left: value ? 24 : 2,
      width: 18, height: 18, background: "#fff", borderRadius: "50%",
      transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
    }}>
      {value && <Check size={12} color="#000" />}
    </div>
  </div>
);

const SelectDD = ({ value, options, onChange, t }) => (
  <div style={{ position: "relative", width: 140 }}>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "7px 10px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 12, outline: "none", appearance: "none" }}
    >
      {(Array.isArray(options) ? options : []).map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
    </select>
    <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }}>
      <CDown />
    </div>
  </div>
);

const AlignToggle = ({ value, onChange, t, isDark }) => (
  <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden" }}>
    {[
      { val: "left", icon: AlignLeft, title: "Left" },
      { val: "center", icon: AlignCenter, title: "Center" },
      { val: "right", icon: AlignRight, title: "Right" },
      { val: "justify", icon: AlignJustify, title: "Justify" },
    ].map((a, i) => (
      <button
        key={a.val}
        onClick={() => onChange(a.val)}
        style={{
          padding: "8px 12px", border: "none", cursor: "pointer",
          background: value === a.val ? (isDark ? "#333" : "#222") : "transparent",
          color: value === a.val ? "#fff" : t.textMuted,
          borderRight: i < 3 ? `1px solid ${t.border}` : "none",
          transition: "0.2s"
        }}
        title={a.title}
      >
        <a.icon size={15} />
      </button>
    ))}
  </div>
);

const VerticalAlignToggle = ({ value, onChange, t, isDark }) => (
  <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden" }}>
    {[
      { val: "top", icon: AlignStartVertical },
      { val: "middle", icon: AlignCenterVertical },
      { val: "bottom", icon: AlignEndVertical },
    ].map((a, i) => (
      <button
        key={a.val}
        onClick={() => onChange(a.val)}
        style={{
          padding: "8px 12px", border: "none", cursor: "pointer",
          background: value === a.val ? (isDark ? "#333" : "#222") : "transparent",
          color: value === a.val ? "#fff" : t.textMuted,
          borderRight: i < 2 ? `1px solid ${t.border}` : "none",
          transition: "0.2s"
        }}
      >
        <a.icon size={15} />
      </button>
    ))}
  </div>
);

const COMMON_COLORS = [
  "#C6F6D5", "#FEEBC8", "#FED7D7", "#E9D8FD", "#BEE3F8", "#38A169", "#ECC94B",
  "#E53E3E", "#9F7AEA", "#3182CE", "#319795", "#DD6B20", "#C53030", "#805AD5",
  "#2C5282", "#FFFFFF", "#E2E8F0", "#A0AEC0", "#718096", "#2D3748", "#000000"
];

const ColorPicker = ({ value, onChange, t, isDark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const satRef = useRef(null);
  const hueRef = useRef(null);

  const hexToRgb = (hex) => {
    let h = (hex || "#000000").replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return { r, g, b };
  };

  const rgbToHex = (r, g, b) => {
    const h = (n) => {
      const s = Math.max(0, Math.min(255, parseInt(n) || 0)).toString(16);
      return s.length === 1 ? "0" + s : s;
    };
    return "#" + h(r) + h(g) + h(b);
  };

  const rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h, s, v = max;
    s = max === 0 ? 0 : d / max;
    if (max === min) h = 0;
    else {
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  };

  const hsvToRgb = (h, s, v) => {
    h /= 360; s /= 100; v /= 100;
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v, g = t, b = p; break; case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break; case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break; case 5: r = v, g = p, b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  };

  const { r, g, b } = hexToRgb(value);
  const { h, s, v } = rgbToHsv(r, g, b);

  useEffect(() => {
    const clickAway = (e) => { if (isOpen && ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", clickAway);
    return () => document.removeEventListener("mousedown", clickAway);
  }, [isOpen]);

  const handleSatDown = (e) => {
    const move = (ee) => {
      const rect = satRef.current.getBoundingClientRect();
      const nx = Math.max(0, Math.min(100, ((ee.clientX - rect.left) / rect.width) * 100));
      const ny = Math.max(0, Math.min(100, (1 - (ee.clientY - rect.top) / rect.height) * 100));
      const rgb = hsvToRgb(h, nx, ny);
      onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    move(e);
  };

  const handleHueDown = (e) => {
    const move = (ee) => {
      const rect = hueRef.current.getBoundingClientRect();
      const nh = Math.max(0, Math.min(360, ((ee.clientX - rect.left) / rect.width) * 360));
      const rgb = hsvToRgb(nh, s, v);
      onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    move(e);
  };

  const inpS = { width: "100%", padding: "5px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.background, color: t.text, fontSize: 11, outline: "none", boxSizing: "border-box", textAlign: "center" };
  const lblS = { fontSize: 10, color: t.textMuted, marginTop: 4, textAlign: "center", fontWeight: 600 };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ width: 44, height: 28, borderRadius: 4, background: value || "#1F2937", border: `1px solid ${t.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
        {(!value || value.toLowerCase() === "#ffffff") && <div style={{ width: "100%", height: 1, background: "red", transform: "rotate(-45deg)", opacity: 0.3 }} />}
      </div>

      {isOpen && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 230, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 100, overflow: "hidden" }}>

          <div ref={satRef} onMouseDown={handleSatDown} style={{ height: 130, position: "relative", cursor: "crosshair", background: `hsl(${h}, 100%, 50%)` }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #fff, transparent)" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #000, transparent)" }} />
            <div style={{ position: "absolute", left: `${s}%`, bottom: `${v}%`, width: 10, height: 10, margin: -5, borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 2px rgba(0,0,0,0.5)", pointerEvents: "none" }} />
          </div>

          <div style={{ padding: 12 }}>
            <div ref={hueRef} onMouseDown={handleHueDown} style={{ height: 12, borderRadius: 6, marginBottom: 14, cursor: "pointer", position: "relative", background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)" }}>
              <div style={{ position: "absolute", left: `${(h / 360) * 100}%`, top: -2, bottom: -2, width: 6, margin: "0 -3px", background: "#fff", border: "1px solid #999", borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.3)", pointerEvents: "none" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr", gap: 5, marginBottom: 14 }}>
              <div><input value={value?.replace("#", "") || ""} onChange={e => onChange("#" + e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6))} style={{ ...inpS, textTransform: "uppercase" }} /><div style={lblS}>Hex</div></div>
              <div><input value={r} onChange={e => onChange(rgbToHex(e.target.value, g, b))} style={inpS} /><div style={lblS}>R</div></div>
              <div><input value={g} onChange={e => onChange(rgbToHex(r, e.target.value, b))} style={inpS} /><div style={lblS}>G</div></div>
              <div><input value={b} onChange={e => onChange(rgbToHex(r, g, e.target.value))} style={inpS} /><div style={lblS}>B</div></div>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${t.border}`, padding: 12 }}>
            <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 8, fontWeight: 700 }}>COMMON COLORS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
              {COMMON_COLORS.map(c => (
                <div key={c} onClick={() => onChange(c)} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: value?.toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${isDark ? "#fff" : "#3B82F6"}` : "none" }}>
                  {value?.toLowerCase() === c.toLowerCase() && <Check size={10} color={c === "#FFFFFF" || c === "#FEEBC8" ? "#000" : "#fff"} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Block Properties Panel ────────────────────────────────────────────────────

function BlockPropsPanel({ t, isDark, blockType, rowId, onUpdate, rows, onClose, uploads, isUploading, uploadProgress, onUpload, setActiveRightTab, onDelete, onDuplicate }) {
  const row = rows?.find(r => r.id === rowId);
  const content = row?.content || {};
  const upd = patch => onUpdate(rowId, patch);

  const fileInputRef = useRef(null);

  const [open, setOpen] = useState({
    displayCondition: false, main: true, action: true, general: true,
    links: false, columnProps: false, header: true,
    layout: true, content: true, footer: true
  });
  const tog = id => setOpen(p => ({ ...p, [id]: !p[id] }));

  // Thin wrappers that bind open/tog/t/isDark — these are plain functions NOT components,
  // so they don't create React component boundaries and cannot cause remount issues.
  // The actual stable component is BPSec (module-level).
  const S = (id, label, children) => (
    <BPSec key={id} isOpen={!!open[id]} onToggle={() => tog(id)} label={label} t={t} isDark={isDark}>
      {children}
    </BPSec>
  );
  const PR = (label, children) => (
    <BPPropRow key={label} label={label} t={t}>{children}</BPPropRow>
  );
  const DispCond = () => S("displayCondition", "Display Condition",
    <button style={{ width: "100%", padding: "7px", border: `1px dashed ${t.border}`, borderRadius: 4, background: "transparent", color: t.textMuted, fontSize: 12, cursor: "pointer" }}>+ Add Display Condition</button>
  );
  const General = () => S("general", "General",
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 12 }}>Container Padding</div>
      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8 }}>All Sides</div>
      <NumInput value={content.paddingTop ?? 10} unit="px" onChange={v => {
        const p = Number(v);
        upd({ paddingTop: p, paddingBottom: p, paddingLeft: p, paddingRight: p, morePadding: false });
      }} t={t} isDark={isDark} />
    </>
  );

  const renderProps = () => {
    switch (blockType) {
      case "BUTTON": return (
        <>
          <DispCond />
          {S("main", "Button Options", <>
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Button Text</div>
              <input value={content.buttonText ?? "Button Text"} onChange={e => upd({ buttonText: e.target.value })} style={inpStyle(t)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Link URL</div>
              <input value={content.url ?? ""} onChange={e => upd({ url: e.target.value })} style={inpStyle(t)} placeholder="https://" />
            </div>
            {PR("Background Color", <input type="color" value={content.bgColor || "#1D4ED8"} onChange={e => upd({ bgColor: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />)}
            {PR("Text Color", <input type="color" value={content.textColor || "#ffffff"} onChange={e => upd({ textColor: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />)}
          </>)}
          <General />
        </>
      );

      case "DIVIDER": return (
        <>
          <DispCond />
          {S("main", "Line", <>
            {PR("Thickness (px)", <input type="number" value={content.lineWidth ?? 1} min={1} max={20} onChange={e => upd({ lineWidth: Number(e.target.value) })} style={{ width: 60, padding: "4px 6px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 12 }} />)}
            {PR("Color", <input type="color" value={content.lineColor || "#E5E7EB"} onChange={e => upd({ lineColor: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />)}
          </>)}
          <General />
        </>
      );

      case "HEADING": return (
        <>
          <DispCond />
          {S("main", "Text", <>
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Heading Text</div>
              <input value={content.headingText ?? "Heading"} onChange={e => upd({ headingText: e.target.value })} style={inpStyle(t)} />
            </div>
            {PR("Font Size (px)", <input type="number" value={content.fontSize ?? 22} min={8} max={96} onChange={e => upd({ fontSize: Number(e.target.value) })} style={{ width: 60, padding: "4px 6px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 12 }} />)}
            {PR("Color", <input type="color" value={content.color || "#1F2937"} onChange={e => upd({ color: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />)}
          </>)}
          <General />
        </>
      );

      case "TEXT": return (
        <>
          {S("main", "Text", <>
            {PR("Font Family", <SelectDD value={content.fontFamily || "inherit"} options={[{ label: "Body Font", val: "inherit" }, { label: "Montserrat", val: "Montserrat" }, { label: "Arial", val: "Arial" }, { label: "Inter", val: "Inter" }]} onChange={v => upd({ fontFamily: v })} t={t} />)}
            {PR("Font Weight", <SelectDD value={content.fontWeight || "normal"} options={[{ label: "Regular", val: "normal" }, { label: "Bold", val: "bold" }, { label: "Semi Bold", val: "600" }]} onChange={v => upd({ fontWeight: v })} t={t} />)}
            {PR("Font Size", <NumInput value={content.fontSize || 13} unit="px" onChange={v => upd({ fontSize: Number(v) })} t={t} isDark={isDark} />)}
            {PR("Font color", <ColorPicker value={content.color || "#1F2937"} onChange={v => upd({ color: v })} t={t} isDark={isDark} />)}
            {PR("Background color", <ColorPicker value={content.bgColor || "#ffffff"} onChange={v => upd({ bgColor: v })} t={t} isDark={isDark} />)}
            {PR("Text Align", <AlignToggle value={content.textAlign || "left"} onChange={v => upd({ textAlign: v })} t={t} isDark={isDark} />)}
            {PR("Line Height", <NumInput value={content.lineHeight || 140} unit="%" onChange={v => upd({ lineHeight: Number(v) })} t={t} isDark={isDark} />)}
            {PR("Letter Spacing", <NumInput value={content.letterSpacing || 0} unit="px" onChange={v => upd({ letterSpacing: Number(v) })} t={t} isDark={isDark} />)}
          </>)}

          {S("links", "Links", <>
            {PR("Inherit Body Styles", <PropToggle value={!!content.inheritStyles} onChange={v => upd({ inheritStyles: v })} />)}
          </>)}

          <General />
        </>
      );

      case "IMAGE": return (
        <>
          {S("main", "Image", <>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{ flex: 1, background: isDark ? "#333" : "#222", color: "#fff", border: "none", padding: "8px", borderRadius: 4, fontWeight: 700, fontSize: 13, cursor: isUploading ? "not-allowed" : "pointer", opacity: isUploading ? 0.7 : 1 }}
              >
                {isUploading ? `Uploading...` : "Upload Image"}
              </button>
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
                <input type="range" min="10" max="100" value={parseInt(content.width || "100")} onChange={e => upd({ width: e.target.value + "%", autoWidth: false })} style={{ flex: 1, height: 4, accentColor: "#3B82F6" }} />
                <span style={{ fontSize: 11, color: t.textMuted, width: 30 }}>{content.width || "100%"}</span>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>Height</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: t.textMuted }}>Auto On</span>
                  <div onClick={() => upd({ autoHeight: content.autoHeight === undefined ? false : !content.autoHeight })} style={{ width: 34, height: 18, background: (content.autoHeight !== false) ? "#3B82F6" : "#D1D5DB", borderRadius: 9, display: "flex", alignItems: "center", padding: "0 2px", cursor: "pointer", transition: "background 0.2s" }}>
                    <div style={{ width: 14, height: 14, background: "#fff", borderRadius: "50%", marginLeft: (content.autoHeight !== false) ? "16px" : "0", transition: "margin-left 0.2s" }} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min="10" max="1000" value={parseInt(content.height || "300")} onChange={e => upd({ height: e.target.value + "px", autoHeight: false })} style={{ flex: 1, height: 4, accentColor: "#3B82F6" }} />
                <span style={{ fontSize: 11, color: t.textMuted, width: 35 }}>{content.autoHeight !== false ? "auto" : (content.height || "300px")}</span>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 8 }}>Align</div>
              <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden", width: "fit-content" }}>
                {[{ id: "left", icon: <AlignLeft size={14} /> }, { id: "center", icon: <AlignCenter size={14} /> }, { id: "right", icon: <AlignRight size={14} /> }, { id: "justify", icon: <AlignJustify size={14} /> }].map((a) => (
                  <button key={a.id} onClick={() => upd({ align: a.id })} style={{ padding: "8px 14px", background: (content.align || "center") === a.id ? (isDark ? "#333" : "#222") : t.surface, border: "none", borderRight: a.id !== "justify" ? `1px solid ${t.border}` : "none", cursor: "pointer", color: (content.align || "center") === a.id ? "#fff" : t.textMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>{a.icon}</button>
                ))}
              </div>
            </div>
          </>)}
          <General />
        </>
      );

      case "HTML": return <HtmlBlockPanel rowId={rowId} content={content} upd={upd} t={t} isDark={isDark} />;

      case "TABLE":
      case "table": return (
        <>
          {S("layout", "Layout", <>
            {PR("Columns", <NumInput value={content.rows?.[0]?.cells?.length || 0} onChange={v => {
              const count = Number(v);
              const newRows = (Array.isArray(content.rows) ? content.rows : []).map(r => {
                let newCells = [...(r.cells || [])];
                if (newCells.length < count) {
                  for (let i = newCells.length; i < count; i++) newCells.push({ id: `c_${Date.now()}_c${i}`, text: "" });
                } else if (newCells.length > count) {
                  newCells = newCells.slice(0, count);
                }
                return { ...r, cells: newCells };
              });
              upd({ rows: newRows });
            }} t={t} isDark={isDark} />)}
            {PR("Rows", <NumInput value={content.rows?.length || 0} onChange={v => {
              const count = Number(v);
              let newRows = [...(content.rows || [])];
              if (newRows.length < count) {
                const colCount = newRows[0]?.cells?.length || 2;
                for (let i = newRows.length; i < count; i++) {
                  const cells = [];
                  for (let j = 0; j < colCount; j++) cells.push({ id: `c_${Date.now()}_r${i}_c${j}`, text: "" });
                  newRows.push({ id: `tr_${Date.now()}_r${i}`, cells, isHeader: (i === 0 && content.enableHeader) });
                }
              } else if (newRows.length > count) {
                newRows = newRows.slice(0, count);
              }
              upd({ rows: newRows });
            }} t={t} isDark={isDark} />)}
            {PR("Border", <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, color: t.textMuted }}>More Options</span><PropToggle value={!!content.moreBorder} onChange={v => upd({ moreBorder: v })} /></div>)}
            {content.moreBorder && <>
              {PR("Style", <SelectDD value={content.borderStyle || "solid"} options={[{ label: "Solid", val: "solid" }, { label: "Dashed", val: "dashed" }, { label: "Dotted", val: "dotted" }]} onChange={v => upd({ borderStyle: v })} t={t} />)}
              {PR("Width", <NumInput value={content.borderWidth || 1} unit="px" onChange={v => upd({ borderWidth: Number(v) })} t={t} isDark={isDark} />)}
              {PR("Color", <ColorPicker value={content.borderColor || "#DDDDDD"} onChange={v => upd({ borderColor: v })} t={t} isDark={isDark} />)}
            </>}
            {PR("Striped Rows", <PropToggle value={!!content.striped} onChange={v => upd({ striped: v })} />)}
          </>)}

          {S("header", "Header", <>
            {PR("Enable Header", <PropToggle value={!!content.enableHeader} onChange={v => {
              const newRows = (Array.isArray(content.rows) ? content.rows : []).map((r, i) => i === 0 ? { ...r, isHeader: v } : r);
              upd({ enableHeader: v, rows: newRows });
            }} />)}
            {content.enableHeader && <>
              {PR("Font Family", <SelectDD value={content.headerFontFamily || "inherit"} options={[{ label: "Body Font", val: "inherit" }]} onChange={v => upd({ headerFontFamily: v })} t={t} />)}
              {PR("Background", <ColorPicker value={content.headerBg || "#EBEBEB"} onChange={v => upd({ headerBg: v })} t={t} isDark={isDark} />)}
              {PR("Font Weight", <SelectDD value={content.headerFontWeight || "bold"} options={[{ label: "Bold", val: "bold" }, { label: "Regular", val: "normal" }]} onChange={v => upd({ headerFontWeight: v })} t={t} />)}
              {PR("Font Size", <NumInput value={content.headerFontSize || 14} unit="px" onChange={v => upd({ headerFontSize: Number(v) })} t={t} isDark={isDark} />)}
              {PR("Color", <ColorPicker value={content.headerColor || "#1F2937"} onChange={v => upd({ headerColor: v })} t={t} isDark={isDark} />)}
              {PR("Text Align", <AlignToggle value={content.headerTextAlign || "left"} onChange={v => upd({ headerTextAlign: v })} t={t} isDark={isDark} />)}
            </>}
          </>)}

          {S("content", "Content", <>
            {PR("Font Family", <SelectDD value={content.fontFamily || "inherit"} options={[{ label: "Body Font", val: "inherit" }]} onChange={v => upd({ fontFamily: v })} t={t} />)}
            {PR("Background", <ColorPicker value={content.bg || "#ffffff"} onChange={v => upd({ bg: v })} t={t} isDark={isDark} />)}
            {PR("Font Weight", <SelectDD value={content.fontWeight || "normal"} options={[{ label: "Regular", val: "normal" }, { label: "Bold", val: "bold" }]} onChange={v => upd({ fontWeight: v })} t={t} />)}
            {PR("Font Size", <NumInput value={content.fontSize || 14} unit="px" onChange={v => upd({ fontSize: Number(v) })} t={t} isDark={isDark} />)}
            {PR("Text Color", <ColorPicker value={content.color || "#1F2937"} onChange={v => upd({ color: v })} t={t} isDark={isDark} />)}
            {PR("Text Align", <AlignToggle value={content.textAlign || "left"} onChange={v => upd({ textAlign: v })} t={t} isDark={isDark} />)}
            {PR("Vertical Align", <VerticalAlignToggle value={content.verticalAlign || "middle"} onChange={v => upd({ verticalAlign: v })} t={t} isDark={isDark} />)}
            {PR("Line Height", <NumInput value={content.lineHeight || 140} unit="%" onChange={v => upd({ lineHeight: Number(v) })} t={t} isDark={isDark} />)}
            {PR("Letter Spacing", <NumInput value={content.letterSpacing || 0} unit="px" onChange={v => upd({ letterSpacing: Number(v) })} t={t} isDark={isDark} />)}
            {PR("Padding", <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, color: t.textMuted }}>More Options</span><PropToggle value={!!content.morePadding} onChange={v => upd({ morePadding: v })} /></div>)}
            {content.morePadding && (
              <NumInput value={content.cellPadding || 12} unit="px" onChange={v => upd({ cellPadding: Number(v) })} t={t} isDark={isDark} />
            )}
          </>)}

          {S("footer", "Footer", <>
            {PR("Enable Footer", <PropToggle value={!!content.enableFooter} onChange={v => upd({ enableFooter: v })} />)}
          </>)}

          <General />
        </>
      );

      case "COLUMNS": return (
        <>
          <DispCond />
          {S("main", "Columns",
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[[[100]], [[50, 50]], [[67, 33]], [[33, 67]], [[33, 33, 33]], [[50, 25, 25]], [[25, 25, 25, 25]]].map((layout) => {
                const key = layout[0].join("-");
                const active = (content.layout || "100") === key;
                return (
                  <div key={key} onClick={() => upd({ layout: key })} style={{ display: "flex", gap: 2, height: 26, cursor: "pointer", opacity: active ? 1 : 0.45, border: active ? "1px solid #3B82F6" : "1px solid transparent", borderRadius: 3, padding: 1 }}>
                    {(Array.isArray(layout[0]) ? layout[0] : []).map((col, j) => (
                      <div key={j} style={{ flex: col, background: active ? "#3B82F6" : (isDark ? "#374151" : "#D1D5DB"), borderRadius: 1 }} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {S("row-params", "Row Properties",
            PR("Background Color", <input type="color" value={content.rowBg || "#ffffff"} onChange={e => upd({ rowBg: e.target.value })} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />)
          )}
          {(Array.isArray(content.columns) ? content.columns : []).map((col, idx) =>
            S(`col-${idx}`, `Column ${idx + 1}`, <>
              {PR("Background", <input type="color" value={col.settings?.bgColor || "transparent"} onChange={e => { const newCols = [...content.columns]; newCols[idx] = { ...newCols[idx], settings: { ...newCols[idx].settings, bgColor: e.target.value } }; upd({ columns: newCols }); }} style={{ width: 32, height: 28, border: `1px solid ${t.border}`, borderRadius: 3, cursor: "pointer", padding: 1 }} />)}
              {PR("Padding", <input value={col.settings?.padding || "10px"} onChange={e => { const newCols = [...content.columns]; newCols[idx] = { ...newCols[idx], settings: { ...newCols[idx].settings, padding: e.target.value } }; upd({ columns: newCols }); }} style={{ ...inpStyle(t), width: 80 }} />)}
            </>)
          )}
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
          <button
            title="Clear content"
            onClick={() => { if (blockType === "HTML") upd({ html: "" }); else if (onDelete) onDelete(rowId); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}
          ><Trash2 size={13} /></button>
          <button
            title="Duplicate block"
            onClick={() => onDuplicate && onDuplicate(rowId)}
            style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}
          ><Copy size={13} /></button>
          <button onClick={onClose} title="Close" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}><XIcon size={13} /></button>
        </div>
      </div>
      {/* Desktop/Mobile tabs — hidden for HTML block */}
      {blockType !== "HTML" && (
        <div style={{ display: "flex", borderBottom: `1px solid ${t.border}` }}>
          {["Desktop"].map((tab, i) => (
            <button key={tab} style={{ flex: 1, padding: "7px", fontSize: 11.5, border: "none", background: i === 0 ? t.surface : "transparent", cursor: "pointer", color: i === 0 ? t.text : t.textMuted, fontWeight: i === 0 ? 600 : 400, borderBottom: i === 0 ? `2px solid ${isDark ? "#60A5FA" : "#3B82F6"}` : "2px solid transparent" }}>{tab}</button>
          ))}
          <button onClick={onClose} style={{ padding: "4px 8px", border: "none", background: "transparent", cursor: "pointer", color: t.textMuted }}><XIcon size={13} /></button>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto" }}>{renderProps()}</div>
    </div>
  );
}

// ── HTML Block Panel (stable component — defined outside BlockPropsPanel to prevent remount on every render) ──

function PaddingInput({ value, onChange, t, isDark }) {
  const v = typeof value === "number" ? value : 10;
  return (
    <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden", fontSize: 11 }}>
      <input
        type="number"
        value={v}
        min={0}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: 36, padding: "4px", border: "none", borderRight: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 11, textAlign: "center", outline: "none" }}
      />
      <div style={{ padding: "4px 6px", background: isDark ? "#1F2937" : "#F3F4F6", borderRight: `1px solid ${t.border}`, color: t.textMuted, fontSize: 10, display: "flex", alignItems: "center" }}>px</div>
      <button onClick={() => onChange(Math.max(0, v - 1))} style={{ width: 22, background: t.surface, border: "none", borderRight: `1px solid ${t.border}`, cursor: "pointer", color: t.textMuted, fontSize: 14, lineHeight: 1 }}>−</button>
      <button onClick={() => onChange(v + 1)} style={{ width: 22, background: t.surface, border: "none", cursor: "pointer", color: t.textMuted, fontSize: 14, lineHeight: 1 }}>+</button>
    </div>
  );
}

const HTML_DEFAULT = "<strong>Hello, world!</strong>";

function HtmlSectionHeader({ label, isOpen, onToggle, t, isDark }) {
  return (
    <div onClick={onToggle} style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", cursor: "pointer", borderBottom: `1px solid ${t.border}`, background: isDark ? "#161616" : "#F9FAFB" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{label}</span>
      {isOpen ? <ChevronUp size={13} color={t.textMuted} /> : <ChevronDown size={12} strokeWidth={2.5} style={{ opacity: 0.7 }} />}
    </div>
  );
}

function HtmlBlockPanel({ rowId, content, upd, t, isDark }) {
  const [localHtml, setLocalHtml] = useState(content.html ?? HTML_DEFAULT);
  const [mainOpen, setMainOpen] = useState(true);
  const [generalOpen, setGeneralOpen] = useState(true);

  // Sync textarea when switching to a different HTML block
  useEffect(() => { setLocalHtml(content.html ?? HTML_DEFAULT); }, [rowId]);

  return (
    <>
      <div>
        <HtmlSectionHeader label="HTML" isOpen={mainOpen} onToggle={() => setMainOpen(p => !p)} t={t} isDark={isDark} />
        {mainOpen && (
          <div style={{ padding: 14, borderBottom: `1px solid ${t.border}` }}>
            <textarea
              value={localHtml}
              onChange={e => setLocalHtml(e.target.value)}
              onBlur={() => upd({ html: localHtml })}
              style={{ width: "100%", height: 200, padding: "8px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 11, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none", lineHeight: 1.5 }}
            />
          </div>
        )}
      </div>

      <div>
        <HtmlSectionHeader label="Canvas" isOpen={true} onToggle={() => { }} t={t} isDark={isDark} />
        <div style={{ padding: 14, borderBottom: `1px solid ${t.border}` }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>Height</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: t.textMuted }}>Auto On</span>
                <div onClick={() => upd({ autoHeight: content.autoHeight === undefined ? false : !content.autoHeight })} style={{ width: 34, height: 18, background: (content.autoHeight !== false) ? "#3B82F6" : "#D1D5DB", borderRadius: 9, display: "flex", alignItems: "center", padding: "0 2px", cursor: "pointer", transition: "background 0.2s" }}>
                  <div style={{ width: 14, height: 14, background: "#fff", borderRadius: "50%", marginLeft: (content.autoHeight !== false) ? "16px" : "0", transition: "margin-left 0.2s" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range" min="10" max="1000" value={parseInt(content.height || "300")}
                onChange={e => upd({ height: e.target.value + "px", autoHeight: false })}
                style={{ flex: 1, height: 4, accentColor: "#3B82F6" }}
              />
              <span style={{ fontSize: 11, color: t.textMuted, width: 35 }}>{content.autoHeight !== false ? "auto" : (content.height || "300px")}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <HtmlSectionHeader label="General" isOpen={generalOpen} onToggle={() => setGeneralOpen(p => !p)} t={t} isDark={isDark} />
        {generalOpen && (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, borderBottom: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 4 }}>Container Padding</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Top", key: "paddingTop" },
                { label: "Right", key: "paddingRight" },
                { label: "Left", key: "paddingLeft" },
                { label: "Bottom", key: "paddingBottom" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4 }}>{label}</div>
                  <PaddingInput value={content[key] ?? 10} onChange={v => upd({ [key]: v })} t={t} isDark={isDark} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const inpStyle = t => ({ width: "100%", padding: "6px 8px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, fontSize: 11.5, outline: "none", boxSizing: "border-box" });

// ── Content Tab ───────────────────────────────────────────────────────────────

function ContentTab({ t, isDark, onAddRow }) {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {CONTENT_BLOCKS.map(block => {
          return (
            <div
              key={block.label}
              draggable
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                background: isDark ? "#1F2937" : "#fff", border: `1px solid ${t.border}`, borderRadius: 4,
                padding: "13px 6px", cursor: "grab", color: t.text,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "border-color 0.15s, transform 0.1s",
                position: "relative"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = isDark ? "#60A5FA" : "#3B82F6"; e.currentTarget.style.transform = "scale(1.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "scale(1)"; }}
              onDragStart={e => { e.dataTransfer.setData("blockLabel", block.label); }}
              onClick={() => onAddRow(null, block.label)}
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
          <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden", fontSize: 13 }}>
            <input type="text" defaultValue="780" style={{ width: 80, padding: "8px", textAlign: "center", border: "none", borderRight: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 13 }} />
            <div style={{ width: 34, padding: "8px", textAlign: "center", background: isDark ? "#1F2937" : "#F3F4F6", borderRight: `1px solid ${t.border}`, fontSize: 12, color: t.textMuted }}>px</div>
            <button style={{ width: 32, background: t.surface, border: "none", borderRight: `1px solid ${t.border}`, cursor: "pointer", color: t.textMuted, fontSize: 15 }}>-</button>
            <button style={{ width: 32, background: t.surface, border: "none", cursor: "pointer", color: t.textMuted, fontSize: 15 }}>+</button>
          </div>
        </PR>
        <PR label="Content Height">
          <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden", fontSize: 13 }}>
            <input type="text" defaultValue="auto" style={{ width: 80, padding: "8px", textAlign: "center", border: "none", borderRight: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 13 }} />
            <div style={{ width: 34, padding: "8px", textAlign: "center", background: isDark ? "#1F2937" : "#F3F4F6", borderRight: `1px solid ${t.border}`, fontSize: 12, color: t.textMuted }}>px</div>
            <button style={{ width: 32, background: t.surface, border: "none", borderRight: `1px solid ${t.border}`, cursor: "pointer", color: t.textMuted, fontSize: 15 }}>-</button>
            <button style={{ width: 32, background: t.surface, border: "none", cursor: "pointer", color: t.textMuted, fontSize: 15 }}>+</button>
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
        <span style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>Preheader Text</span>
        <input type="text" placeholder="Enter Preheader Text" style={{ width: "100%", padding: "8px 0", border: "none", borderBottom: `1px solid ${t.border}`, background: "transparent", color: t.text, outline: "none", fontSize: 13 }} />
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>A preheader is the short summary text that follows the subject line when viewing an email from the inbox.</p>
      </Sec>
      <Sec id="links" label="Links">
        <PR label="Color"><Swatch color="#0000FF" /></PR>
        <PR label="Underline"><Toggle /></PR>
      </Sec>
      <Sec id="accessibility" label="Accessibility">
        <span style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>HTML Title</span>
        <input type="text" placeholder="Enter HTML Title" style={{ width: "100%", padding: "8px 0", border: "none", borderBottom: `1px solid ${t.border}`, background: "transparent", color: t.text, outline: "none", fontSize: 13 }} />
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>Sets the HTML &lt;title&gt; tag in the exported HTML.</p>
      </Sec>
    </div>
  );
}

// ── Images Tab (Unsplash) ─────────────────────────────────────────────────────

function ImagesTab({ t, isDark, setActiveRightTab, hasImageSelected, onInsertImage }) {
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const docSnap = await getDoc(doc(db, "system", "integrations"));
        if (docSnap.exists() && docSnap.data().unsplash_api_key) {
          const key = docSnap.data().unsplash_api_key;
          setApiKey(key);
        } else if (isAdmin) {
          setShowKeyInput(true);
        }
      } catch (err) { console.error(err); }
    };
    fetchKey();
  }, [isAdmin]);

  // Preload random images when API key is available
  useEffect(() => {
    if (apiKey && images.length === 0 && !loading) {
      fetchImages(1);
    }
  }, [apiKey]);

  const fetchImages = async (p = 1) => {
    if (!apiKey) return;
    setLoading(true); setError(null);
    try {
      const endpoint = query.trim()
        ? `https://api.unsplash.com/search/photos?page=${p}&per_page=20&query=${encodeURIComponent(query)}`
        : `https://api.unsplash.com/photos?page=${p}&per_page=20`;

      const res = await fetch(endpoint, { headers: { Authorization: `Client-ID ${apiKey}` } });
      if (res.status === 401) { setError("Invalid API Key."); if (isAdmin) setShowKeyInput(true); setLoading(false); return; }
      if (!res.ok) throw new Error("Failed to fetch images");

      const data = await res.json();
      const results = query.trim() ? data.results : data;

      setImages(prev => p === 1 ? results : [...prev, ...results]);
      setPage(p);
      setHasMore(results.length > 0);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const onSearch = (e) => {
    if (e) e.preventDefault();
    fetchImages(1);
  };

  const onLoadMore = () => {
    fetchImages(page + 1);
  };

  const saveApiKey = async () => {
    try {
      await setDoc(doc(db, "system", "integrations"), { unsplash_api_key: apiKey }, { merge: true });
      setShowKeyInput(false); setError(null);
      fetchImages(1);
    } catch (err) { setError("Failed to save API key."); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px", borderBottom: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px 0", color: t.text }}>Images</h3>
        <form onSubmit={onSearch} style={{ position: "relative", marginBottom: 10 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {(Array.isArray(images) ? images : []).map((img, idx) => (
            <div key={`${img.id}-${idx}`} style={{ position: "relative" }}>
              <div
                draggable
                onDragStart={e => e.dataTransfer.setData("imageUrl", img.urls.regular)}
                onClick={() => hasImageSelected && onInsertImage(img.urls.regular)}
                style={{ height: 110, borderRadius: 4, backgroundImage: `url(${img.urls.small})`, backgroundSize: "cover", backgroundPosition: "center", cursor: hasImageSelected ? "pointer" : "grab", border: `2px solid ${hasImageSelected ? "#3B82F6" : t.border}`, transition: "border-color 0.15s" }}
                title={img.alt_description}
              />
              {hasImageSelected && (
                <div style={{ position: "absolute", inset: 0, borderRadius: 4, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(59,130,246,0.9)", padding: "2px 8px", borderRadius: 4 }}>USE</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: "center", padding: "14px 0", color: t.textMuted, fontSize: 12 }}>Loading images...</div>}

        {!loading && images.length > 0 && hasMore && (
          <button
            onClick={onLoadMore}
            style={{
              width: "100%",
              background: isDark ? "#333" : "#222",
              color: "#fff",
              border: "none",
              padding: "10px",
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              marginTop: 7
            }}
          >
            Load More
          </button>
        )}

        {!loading && images.length === 0 && !error && apiKey && (
          <div style={{ textAlign: "center", padding: "28px 0", color: t.textMuted, fontSize: 12 }}>No images found.</div>
        )}
      </div>
    </div>
  );
}

// ── Uploads Tab ───────────────────────────────────────────────────────────────

function UploadsTab({ t, isDark, uploads, isUploading, uploadProgress, onUpload, onDeleteUpload, hasImageSelected, onInsertImage }) {
  const fileInputRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

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
          : (Array.isArray(uploads) ? uploads : []).map((item, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ position: "relative" }}
            >
              <div
                draggable
                onDragStart={e => e.dataTransfer.setData("imageUrl", item.url)}
                onClick={() => hasImageSelected && onInsertImage(item.url)}
                style={{ height: 90, borderRadius: 4, backgroundImage: `url(${item.url})`, backgroundSize: "cover", backgroundPosition: "center", cursor: hasImageSelected ? "pointer" : "grab", border: `2px solid ${hasImageSelected && hoveredIndex === i ? "#3B82F6" : t.border}`, transition: "border-color 0.15s" }}
              />
              <p style={{ margin: "4px 0 0", fontSize: 10, color: t.textMuted, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }} title={item.path.split('/').pop()}>
                {item.path.split('/').pop().replace(/^\d+_/, '')}
              </p>
              {hoveredIndex === i && (
                <div
                  style={{ position: "absolute", top: 0, left: 0, right: 0, height: 90, borderRadius: 4, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  onClick={() => onInsertImage(item.url)}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: hasImageSelected ? "rgba(59,130,246,0.9)" : "rgba(100,100,100,0.85)", padding: "2px 10px", borderRadius: 4 }}>
                    {hasImageSelected ? "USE" : "Select a block first"}
                  </span>
                </div>
              )}
              {hoveredIndex === i && (
                <button
                  onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }}
                  style={{
                    position: "absolute", top: 5, right: 5,
                    width: 26, height: 26, borderRadius: 6,
                    background: "rgba(220,38,38,0.9)", color: "#fff",
                    border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    zIndex: 10
                  }}
                  title="Delete image"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        }
      </div>
      <DelModal
        open={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onDel={() => {
          if (itemToDelete) onDeleteUpload(itemToDelete);
          setItemToDelete(null);
        }}
        t={t}
        isDark={isDark}
      >
        <div style={{ padding: "8px 0" }}>
          <p style={{ fontSize: 13, color: t.textMuted, margin: "0 0 12px 0" }}>
            Are you sure you want to delete this image?
          </p>
          {itemToDelete && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: t.surface, borderRadius: 8, border: `1px solid ${t.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 4, backgroundImage: `url(${itemToDelete.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {itemToDelete.path.split('/').pop().replace(/^\d+_/, '')}
              </span>
            </div>
          )}
          <p style={{ fontSize: 12, color: "#EF4444", fontWeight: 600, marginTop: 12 }}>
            This action cannot be undone and will remove the file from storage.
          </p>
        </div>
      </DelModal>
    </div>
  );
}



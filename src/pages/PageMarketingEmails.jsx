import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Search, FileText, Send, Inbox, LayoutTemplate, X, ChevronRight, Trash2, MoreHorizontal, Clock, Edit2, Copy, Save } from "lucide-react";
import { TanStackTable, PromptModal, DelModal } from "../components";
import { db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { getCollectionPaths } from "../utils";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric", hour12: true });
};

const ActionCell = ({ row, isDark, t, actions }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    if (showMenu) document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [showMenu]);

  const email = row.original;

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? "#333" : "#F3F4F6"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <MoreHorizontal size={16} />
      </button>
      {showMenu && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, width: 190,
          background: isDark ? "#1e293b" : "#fff", border: `1px solid ${t.border}`,
          borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 100,
          padding: 4, overflow: "hidden"
        }}>
          {[
            { label: "Edit name", icon: Edit2, action: () => actions.onEditName(email) },
            { label: "Clone", icon: Copy, action: () => actions.onClone(email) },
            { label: "Save as new template", icon: Save, action: () => actions.onSaveAsTemplate(email) },
            { label: "Delete", icon: Trash2, action: () => actions.onDelete(email), danger: true },
          ].map((m, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setShowMenu(false); m.action(); }}
              style={{
                width: "100%", padding: "7px 12px", background: "transparent", border: "none",
                color: m.danger ? "#EF4444" : t.text, fontSize: "12.5px", fontWeight: 500,
                cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                borderRadius: 4
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <m.icon size={13} strokeWidth={2} /> {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const getMarketingEmailColumns = (isDark, t, actions) => [
  {
    id: "select",
    header: ({ table }) => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
        <input className="ts-checkbox" type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />
      </div>
    ),
    cell: ({ row }) => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
        <input className="ts-checkbox" type="checkbox" checked={row.getIsSelected()} disabled={!row.getCanSelect()} onChange={row.getToggleSelectedHandler()} />
      </div>
    ),
    size: 40,
    enableSorting: false,
  },
  {
    header: "Title",
    accessorKey: "title",
    size: 360,
    cell: ({ getValue, row }) => (
      <span
        onClick={() => actions.onOpen(row.original)}
        style={{ fontSize: "12.5px", fontWeight: 600, color: isDark ? "#60A5FA" : "#2563EB", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
        onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
      >
        {getValue() || "—"}
      </span>
    ),
  },
  {
    header: "Type",
    accessorKey: "type",
    size: 110,
    cell: ({ getValue }) => {
      const type = getValue() || "Marketing";
      return (
        <span style={{ 
          fontSize: "10px", 
          fontWeight: 700, 
          padding: "2px 8px", 
          borderRadius: 4, 
          background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", 
          color: t.accent,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}`,
          textTransform: "uppercase",
          letterSpacing: "0.02em"
        }}>
          {type}
        </span>
      );
    },
  },
  {
    header: "Recipients",
    accessorKey: "recipients",
    size: 160,
    cell: ({ getValue }) => (
      <span style={{ fontSize: "12px", color: t.textMuted }}>{getValue() || "—"}</span>
    ),
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    size: 160,
    cell: ({ getValue }) => (
      <span style={{ fontFamily: t.mono, fontSize: "11.5px", color: t.idText }}>{formatDate(getValue())}</span>
    ),
  },
  {
    header: "Last Updated",
    accessorKey: "updatedAt",
    size: 160,
    cell: ({ getValue }) => (
      <span style={{ fontFamily: t.mono, fontSize: "11.5px", color: t.idText }}>{formatDate(getValue())}</span>
    ),
  },
  {
    header: "Status",
    accessorKey: "status",
    size: 110,
    cell: ({ getValue }) => {
      const status = getValue() || "Draft";
      const dotColor = status === "Sent" ? "#22c55e" : status === "Draft" ? "#9CA3AF" : status === "Scheduled" ? "#F59E0B" : "#F59E0B";
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: "12px", fontWeight: 500, color: t.text }}>{status}</span>
        </div>
      );
    },
  },
  {
    header: "Schedule",
    accessorKey: "scheduledAt",
    size: 160,
    cell: ({ getValue, row }) => {
      const val = getValue();
      const status = row.original.status;
      if (status !== "Scheduled") return <span style={{ fontSize: "12px", color: t.textMuted }}>—</span>;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={12} color="#F59E0B" />
          <span style={{ fontFamily: t.mono, fontSize: "11.5px", color: "#F59E0B" }}>{formatDate(val)}</span>
        </div>
      );
    },
  },
  {
    header: "Actions",
    id: "actions",
    size: 70,
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => <ActionCell row={row} isDark={isDark} t={t} actions={actions} />,
  },
];

const DUMMY_DRAFTS = [
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
  { id: 16, title: "Monthly Portfolio Performance Update", recipients: "125 recipients", createdAt: "2026-04-18T10:00:00", updatedAt: "2026-04-18T10:05:00", status: "Scheduled", scheduledAt: "2026-04-20T09:00:00" },
];

export default function PageMarketingEmails({ t, isDark, setActivePage, MARKETING_EMAILS = [], setActiveEmailTemplate, activeTenantId }) {
  const [activeTab, setActiveTab] = useState("Draft");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [pageSize, setPageSize] = useState(25);
  const gridRef = useRef(null);

  const emails = useMemo(() => {
    const source = (Array.isArray(MARKETING_EMAILS) && MARKETING_EMAILS.length > 0) ? MARKETING_EMAILS : DUMMY_DRAFTS;
    return (Array.isArray(source) ? source : []).map(e => ({
      ...e,
      title: e.title || e.name || "Untitled",
      recipients: Array.isArray(e.recipients) ? `${e.recipients.length} recipients` : (e.recipients || "No recipients"),
      createdAt: e.createdAt || e.created_at || "",
      updatedAt: e.updatedAt || e.updated_at || "",
      status: e.status || "Draft",
      type: e.settings?.type || e.type || "Marketing"
    }));
  }, [MARKETING_EMAILS]);

  const drafts = emails.filter(e => (e.status || "Draft") === "Draft");
  const sent = emails.filter(e => e.status === "Sent");
  const scheduled = emails.filter(e => e.status === "Scheduled");
  const inbox = emails.filter(e => e.status === "Inbox");

  const tabs = [
    { label: "Draft", icon: FileText, count: drafts.length },
    { label: "Sent", icon: Send, count: sent.length },
    { label: "Scheduled", icon: Clock, count: scheduled.length },
    { label: "Inbox", icon: Inbox, count: inbox.length },
  ];

  const tableData = useMemo(() => {
    if (activeTab === "Draft") return drafts;
    if (activeTab === "Sent") return sent;
    if (activeTab === "Scheduled") return scheduled;
    if (activeTab === "Inbox") return inbox;
    return [];
  }, [activeTab, drafts, sent, scheduled, inbox]);

  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const columnDefs = useMemo(
    () => getMarketingEmailColumns(isDark, t, {
      onOpen: (email) => {
        setActiveEmailTemplate({ ...email, _useMode: true });
        setActivePage("Email Builder");
      },
      onEditName: (email) => setItemToEdit(email),
      onClone: async (email) => {
        if (!activeTenantId) return;
        const paths = getCollectionPaths(activeTenantId);
        const colRef = collection(db, paths.marketingEmails);
        await addDoc(colRef, {
          ...email,
          id: undefined, // Let Firestore generate a new ID
          title: `${email.title} (Copy)`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      },
      onSaveAsTemplate: async (email) => {
        if (!activeTenantId) return;
        const sanitizedName = email.title.replace(/[/\s]+/g, "_").trim();
        const path = `tenants/${activeTenantId}/templates/${sanitizedName}_backup.json`;
        const templateRef = ref(storage, path);
        const templateData = {
          name: `${email.title} (From Campaign)`,
          settings: email.settings || {},
          rows: email.rows || [],
          updatedAt: new Date().toISOString(),
          category: "Your templates"
        };
        const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: "application/json" });
        await uploadBytes(templateRef, blob);
        alert("Campaign saved to your template library!");
      },
      onDelete: (email) => setItemToDelete(email),
    }),
    [isDark, t, setActivePage, setActiveEmailTemplate, activeTenantId]
  );

  const [isImporting, setIsImporting] = useState(false);
  const handleImportToLive = async () => {
    if (!activeTenantId || isImporting) return;
    setIsImporting(true);
    try {
      const paths = getCollectionPaths(activeTenantId);
      const colRef = collection(db, paths.marketingEmails);
      
      for (const draft of DUMMY_DRAFTS) {
        await addDoc(colRef, {
          title: draft.title,
          status: "Draft",
          recipients: [],
          rows: [], // Default empty body
          settings: {
            subject: draft.title,
            previewText: "",
            from: "",
            fromName: "American Vision Group",
            bgColor: "#F4F4F4"
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isDemo: true
        });
      }
      // Re-fetch should happen automatically via the listener in App.jsx
    } catch (err) {
      console.error("Error importing drafts:", err);
      alert("Failed to import drafts. Check console for details.");
    } finally {
      setIsImporting(false);
    }
  };

  // Auto-calculate page size based on available height
  useEffect(() => {
    const calculate = () => {
      const available = window.innerHeight - 380 - 90;
      setPageSize(Math.max(15, Math.floor(available / 40)));
    };
    const timer = setTimeout(calculate, 100);
    calculate();
    window.addEventListener("resize", calculate);
    return () => { clearTimeout(timer); window.removeEventListener("resize", calculate); };
  }, []);

  const dummyTemplates = [
    { id: "t1", name: "Blank Template", category: "System" },
    { id: "t2", name: "Monthly Newsletter", category: "My Templates" },
    { id: "t3", name: "Deal Announcement", category: "System" },
    { id: "t4", name: "Capital Call Notice", category: "My Templates" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Marketing Emails</h1>
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>Manage your campaigns, newsletters, and communications.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setActivePage("Manage Templates")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: t.text, fontWeight: 600, fontSize: 13, border: `1px solid ${t.border}`, cursor: "pointer" }}
          >
            <LayoutTemplate size={16} /> Templates
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: t.accentGrad, color: "#fff", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.25)" }}
          >
            <Plus size={16} /> New Draft
          </button>
          
          {MARKETING_EMAILS.length === 0 && (
            <button
              onClick={handleImportToLive}
              disabled={isImporting}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: isDark ? "rgba(34,197,94,0.15)" : "#F0FDF4", color: "#22C55E", fontWeight: 600, fontSize: 13, border: "1px solid #22C55E", cursor: isImporting ? "not-allowed" : "pointer" }}
            >
              {isImporting ? "Importing..." : "Save Restored Drafts to Live"}
            </button>
          )}
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
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", color: isActive ? t.text : t.textMuted, borderBottom: isActive ? `2px solid ${isDark ? "#60A5FA" : "#3B82F6"}` : "2px solid transparent", fontWeight: isActive ? 600 : 500, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
            >
              {tab.label}
              <span style={{ 
                background: isActive ? (isDark ? "rgba(59,130,246,0.3)" : "#E5E7EB") : (isDark ? "#374151" : "#F3F4F6"), 
                padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, 
                color: isActive ? (isDark ? "#60A5FA" : "#6B7280") : t.textMuted,
                marginLeft: 4
              }}>
                {tab.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, marginLeft: 12 }}>
          <button
            disabled={selectedRows.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.03)" : "#fff", color: selectedRows.length > 0 ? "#EF4444" : t.textMuted, fontSize: 13, fontWeight: 500, cursor: selectedRows.length > 0 ? "pointer" : "not-allowed", opacity: selectedRows.length > 0 ? 1 : 0.6 }}
          >
            <Trash2 size={15} /> Delete {selectedRows.length > 0 ? `(${selectedRows.length})` : ""}
          </button>
        </div>
      </div>

      {/* TanStack Table */}
      <div style={{ height: "calc(100vh - 380px)", width: "100%", minHeight: 400 }}>
        <TanStackTable
          ref={gridRef}
          data={tableData}
          columns={columnDefs}
          isDark={isDark}
          t={t}
          pageSize={pageSize}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          onSelectionChange={setSelectedRows}
          getRowId={(row) => String(row.id)}
        />
      </div>

      <PromptModal
        open={!!itemToEdit}
        onClose={() => setItemToEdit(null)}
        title="Rename Email"
        label="Enter a new title for this email campaign:"
        defaultValue={itemToEdit?.title}
        t={t}
        isDark={isDark}
        onConfirm={async (newName) => {
          if (!activeTenantId || !itemToEdit || !newName) return;
          const paths = getCollectionPaths(activeTenantId);
          const docRef = doc(db, paths.marketingEmails, itemToEdit.id);
          await updateDoc(docRef, { title: newName, updatedAt: new Date().toISOString() });
          setItemToEdit(null);
        }}
      />

      <DelModal
        open={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Delete Email"
        t={t}
        isDark={isDark}
        onDel={async () => {
          if (!activeTenantId || !itemToDelete) return;
          const paths = getCollectionPaths(activeTenantId);
          const docRef = doc(db, paths.marketingEmails, itemToDelete.id);
          await deleteDoc(docRef);
          setItemToDelete(null);
        }}
      >
        <div style={{ padding: "8px 0" }}>
          <p style={{ margin: "0 0 10px 0", fontSize: 13, color: t.text }}>Are you sure you want to delete <strong>{itemToDelete?.title}</strong>?</p>
          <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>This draft will be permanently removed from your campaign list.</p>
        </div>
      </DelModal>

      {/* Template Modal */}
      {showTemplateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: t.cardBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 16, width: "90%", maxWidth: 640, boxShadow: "0 20px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${t.border}` }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: t.text }}>Select a Template</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: t.textMuted }}>Start from scratch or pick an existing layout.</p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textMuted }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {dummyTemplates.map(tmp => (
                <div
                  key={tmp.id}
                  onClick={() => { setShowTemplateModal(false); setActivePage("Email Builder"); }}
                  style={{ border: `1px solid ${t.border}`, borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, background: isDark ? "rgba(255,255,255,0.02)" : "#fff", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? "#60A5FA" : "#3B82F6"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "translateY(0)"; }}
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

import React, { useState, useMemo, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Plus, Search, FileText, Send, Inbox, LayoutTemplate, X, ChevronRight, Trash2, MoreHorizontal, Clock, Edit2, Copy, Save, Check } from "lucide-react";
import { TanStackTable, PromptModal, DelModal } from "../components";
import { db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { getCollectionPaths } from "../utils";

const formatDate = (dateVal) => {
  if (!dateVal) return "";
  let d = dateVal;
  // Handle Firestore Timestamp
  if (dateVal && typeof dateVal.toDate === "function") {
    d = dateVal.toDate();
  } else if (typeof dateVal === "string") {
    d = new Date(dateVal);
  }
  
  const finalDate = new Date(d);
  if (isNaN(finalDate.getTime())) return "—";

  return finalDate.toLocaleString("en-US", { 
    month: "numeric", day: "numeric", year: "numeric", 
    hour: "numeric", minute: "numeric", hour12: true 
  });
};

const ActionCell = ({ row, isDark, t, actions }) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const clickOut = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    if (showMenu) document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [showMenu]);

  const email = row.original;

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (!showMenu) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 190
      });
    }
    setShowMenu(!showMenu);
  };

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        onClick={toggleMenu}
        style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? "#333" : "#F3F4F6"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <MoreHorizontal size={16} />
      </button>
      {showMenu && ReactDOM.createPortal(
        <div onMouseDown={e => e.stopPropagation()} style={{
          position: "absolute", top: coords.top, left: coords.left, width: 190,
          background: isDark ? "#1e293b" : "#fff", border: `1px solid ${t.border}`,
          borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 99999,
          padding: 4, overflow: "hidden", pointerEvents: "auto"
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
        </div>,
        document.body
      )}
    </div>
  );
};

const getMarketingEmailColumns = (isDark, t, actions, activeTab) => {
  const allCols = [
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
    header: "Name",
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
    cell: ({ getValue, row }) => {
      const status = getValue() || "Draft";
      const dotColor = status === "Sent" ? "#22c55e" : status === "Draft" ? "#9CA3AF" : status === "Scheduled" ? "#F59E0B" : "#F59E0B";
      const isScheduled = status === "Scheduled";
      return (
        <div 
          onClick={(e) => {
            if (isScheduled) {
              e.stopPropagation();
              actions.onEditSchedule(row.original);
            }
          }}
          style={{ display: "flex", alignItems: "center", gap: 6, cursor: isScheduled ? "pointer" : "default" }}
        >
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
          <span 
            style={{ 
              fontSize: "12px", 
              fontWeight: 500, 
              color: isScheduled ? (isDark ? "#60A5FA" : "#2563EB") : t.text,
            }}
            onMouseEnter={e => { if (isScheduled) e.currentTarget.style.textDecoration = "underline"; }}
            onMouseLeave={e => { if (isScheduled) e.currentTarget.style.textDecoration = "none"; }}
          >
            {status}
          </span>
        </div>
      );
    },
  },
  ...(activeTab === "Scheduled" ? [
    {
      header: "Scheduled Date",
      accessorKey: "scheduledDate",
      size: 120,
      cell: ({ row }) => {
        const val = row.original.scheduledAt;
        if (!val) return <span style={{ fontSize: "12px", color: t.textMuted }}>—</span>;
        const d = new Date(val);
        return <span style={{ fontFamily: t.mono, fontSize: "11.5px", color: "#F59E0B" }}>{d.toLocaleDateString()}</span>;
      },
    },
    {
      header: "Scheduled Time",
      accessorKey: "scheduledTime",
      size: 120,
      cell: ({ row }) => {
        const val = row.original.scheduledAt;
        if (!val) return <span style={{ fontSize: "12px", color: t.textMuted }}>—</span>;
        const d = new Date(val);
        return <span style={{ fontFamily: t.mono, fontSize: "11.5px", color: "#F59E0B" }}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
      },
    }
  ] : []),
  {
    header: "Actions",
    id: "actions",
    size: 70,
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => <ActionCell row={row} isDark={isDark} t={t} actions={actions} />,
  },
  ];

  return allCols;
};

const getActivityLogColumns = (isDark, t) => [
  {
    header: "Recipient",
    accessorKey: "recipient",
    size: 250,
    cell: ({ getValue }) => <span style={{ fontSize: "12.5px", fontWeight: 600, color: t.text }}>{getValue() || "—"}</span>,
  },
  {
    header: "Subject",
    accessorKey: "subject",
    size: 250,
    cell: ({ getValue }) => <span style={{ fontSize: "12px", color: t.textMuted }}>{getValue() || "—"}</span>,
  },
  {
    header: "Sent At",
    accessorKey: "sentAt",
    size: 180,
    cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: "11.5px", color: t.idText }}>{formatDate(getValue())}</span>,
  },
  {
    header: "Status",
    accessorKey: "status",
    size: 120,
    cell: ({ getValue }) => {
      const status = getValue() || "Pending";
      const isDelivered = status === "Delivered";
      return (
        <span style={{ 
          fontSize: "10px", 
          fontWeight: 700, 
          padding: "2px 8px", 
          borderRadius: 4, 
          background: isDelivered ? (isDark ? "rgba(34,197,94,0.15)" : "#F0FDF4") : (isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2"), 
          color: isDelivered ? "#22C55E" : "#EF4444",
          border: `1px solid ${isDelivered ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          textTransform: "uppercase",
        }}>
          {status}
        </span>
      );
    },
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

export default function PageMarketingEmails({ t, isDark, setActivePage, MARKETING_EMAILS = [], setActiveEmailTemplate, activeTenantId, USERS = [], CONTACTS = [] }) {
  const [activeTab, setActiveTab] = React.useState("Draft");
  const [showTemplateModal, setShowTemplateModal] = React.useState(false);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [pageSize, setPageSize] = React.useState(25);
  const gridRef = React.useRef(null);
  const [emailConfig, setEmailConfig] = React.useState(null);
  const [loadingEmail, setLoadingEmail] = React.useState(true);

  const [activityLogs, setActivityLogs] = React.useState([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);

  React.useEffect(() => {
    if (activeTenantId) {
      setLoadingEmail(true);
      getDoc(doc(db, "tenants", activeTenantId)).then(snap => {
        if (snap.exists()) {
          setEmailConfig(snap.data()?.emailSetup || { method: "SMTP", api: { provider: "SendGrid" }, smtp: {} });
        }
      }).finally(() => setLoadingEmail(false));
    }
  }, [activeTenantId]);

  React.useEffect(() => {
    if (activeTenantId && activeTab === "Activity") {
      setLoadingLogs(true);
      const q = query(collection(db, `tenants/${activeTenantId}/comms_log`), where("type", "==", "Marketing"));
      getDocs(q).then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setActivityLogs(list.sort((a, b) => b.sentAt?.seconds - a.sentAt?.seconds));
      }).finally(() => setLoadingLogs(false));
    }
  }, [activeTenantId, activeTab]);

  const emails = React.useMemo(() => {
    const source = (Array.isArray(MARKETING_EMAILS) && MARKETING_EMAILS.length > 0) ? MARKETING_EMAILS : DUMMY_DRAFTS;
    return (Array.isArray(source) ? source : []).map(e => ({
      ...e,
      title: e.settings?.subject || e.title || e.name || "Untitled",
      recipients: (Array.isArray(e.settings?.recipients) && e.settings.recipients.length > 0) 
        ? `${e.settings.recipients.length} recipients` 
        : (Array.isArray(e.recipients) ? `${e.recipients.length} recipients` : (e.recipients || "No recipients")),
      createdAt: e.createdAt || e.created_at || "",
      updatedAt: e.updatedAt || e.updated_at || "",
      status: e.status || "Draft",
      type: e.settings?.type || e.type || "Marketing",
      scheduledAt: e.scheduledAt || e.settings?.scheduledAt || "",
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
    { label: "Activity", icon: FileText, count: activityLogs.length },
  ];

  const tableData = React.useMemo(() => {
    if (activeTab === "Draft") return drafts;
    if (activeTab === "Sent") return sent;
    if (activeTab === "Scheduled") return scheduled;
    if (activeTab === "Inbox") return inbox;
    if (activeTab === "Activity") return activityLogs;
    return [];
  }, [activeTab, drafts, sent, scheduled, inbox, activityLogs]);

  const [itemToEdit, setItemToEdit] = React.useState(null);
  const [itemToDelete, setItemToDelete] = React.useState(null);
  const [itemToReschedule, setItemToReschedule] = React.useState(null);
  const [scheduleData, setScheduleData] = React.useState({ date: "", time: "", subject: "", recipients: [] });
  const [recipientSearch, setRecipientSearch] = React.useState("");

  React.useEffect(() => {
    if (itemToReschedule) {
      const s = itemToReschedule.settings || {};
      const sched = s.scheduledAt || "";
      let dStr = "", tStr = "";
      if (sched.includes("T")) {
        [dStr, tStr] = sched.split("T");
        tStr = tStr.slice(0, 5);
      }
      setScheduleData({
        date: dStr,
        time: tStr,
        subject: s.subject || itemToReschedule.title || "",
        recipients: Array.isArray(s.recipients) ? s.recipients : []
      });
    } else {
       setRecipientSearch("");
    }
  }, [itemToReschedule]);

  const columnDefs = React.useMemo(
    () => {
      if (activeTab === "Activity") return getActivityLogColumns(isDark, t);
      return getMarketingEmailColumns(isDark, t, {
        onOpen: (email) => {
          setActiveEmailTemplate({ ...email, _useMode: true });
          setActivePage("Email Builder");
        },
        onEditName: (email) => setItemToEdit(email),
        onClone: async (email) => {
          if (!activeTenantId) return;
          
          let newTitle = email.title || "Untitled";
          const match = newTitle.match(/(.*)\s\((\d+)\)$/);
          if (match) {
            const base = match[1];
            const num = parseInt(match[2], 10);
            newTitle = `${base} (${num + 1})`;
          } else {
            newTitle = `${newTitle} (2)`;
          }

          const { id, ...emailData } = email;

          const paths = getCollectionPaths(activeTenantId);
          const colRef = collection(db, paths.marketingEmails);
          await addDoc(colRef, {
            ...emailData,
            title: newTitle,
            status: "Draft", // Clones should start as drafts
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
        onEditSchedule: (email) => setItemToReschedule(email),
      }, activeTab);
    },
    [isDark, t, setActivePage, setActiveEmailTemplate, activeTenantId, activeTab, activityLogs]
  );

  const [isImporting, setIsImporting] = React.useState(false);
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
  React.useEffect(() => {
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
      <div style={{ 
        marginBottom: 20, 
        padding: "14px 20px", 
        borderRadius: 12, 
        background: (emailConfig?.common?.fromEmail) ? (isDark ? "rgba(52,211,153,0.05)" : "#f0fdf4") : (isDark ? "rgba(248,113,113,0.05)" : "#fef2f2"),
        border: `1px solid ${(emailConfig?.common?.fromEmail) ? (isDark ? "rgba(52,211,153,0.2)" : "#bbf7d0") : (isDark ? "rgba(248,113,113,0.2)" : "#fecaca")}`,
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        gap: 16,
        animation: "slideIn 0.3s ease-out"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: (emailConfig?.common?.fromEmail) ? t.accentGrad : (isDark ? "#2d0a0a" : "#fee2e2"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {(emailConfig?.common?.fromEmail) ? "📧" : "⚠️"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
              {(emailConfig?.common?.fromEmail) ? `Email Infrastructure Active: ${emailConfig.common.fromName || "American Vision Group"}` : "Email Setup Incomplete"}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted }}>
              {(emailConfig?.common?.fromEmail) 
                ? `Sending via ${emailConfig.method === "API" ? emailConfig.api.provider : "SMTP Relay"} • ${emailConfig.common.fromEmail}` 
                : "Configure your ESP (SendGrid, Mailgun) or SMTP settings in Company settings to enable campaign dispatches."}
            </div>
          </div>
        </div>
        {!(emailConfig?.common?.fromEmail) && (
          <button onClick={() => setActivePage("Company")} style={{ padding: "7px 14px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Setup Email
          </button>
        )}
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
            onClick={() => setItemToDelete(selectedRows)}
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
          initialSorting={[{ id: "updatedAt", desc: true }]}
        />
      </div>

      {/* Rename Modal */}
      {itemToEdit && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setItemToEdit(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 24, width: 460, maxWidth: "90vw", padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: 26, fontWeight: 600, color: "#374151", margin: "0 0 24px 0", lineHeight: 1.3 }}>Enter a new name for this email:</h2>
            
            <input 
              autoFocus
              defaultValue={itemToEdit.title}
              id="rename-input"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const val = e.target.value;
                  if (val && activeTenantId) {
                    const paths = getCollectionPaths(activeTenantId);
                    const docRef = doc(db, paths.marketingEmails, itemToEdit.id);
                    updateDoc(docRef, { title: val, updatedAt: new Date().toISOString() });
                    setItemToEdit(null);
                  }
                }
              }}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 16, color: "#374151", marginBottom: 32, outline: "none" }}
            />

            <div style={{ display: "flex", gap: 16, width: "100%", justifyContent: "center" }}>
              <button 
                onClick={async () => {
                  const val = document.getElementById("rename-input").value;
                  if (val && activeTenantId) {
                    const paths = getCollectionPaths(activeTenantId);
                    const docRef = doc(db, paths.marketingEmails, itemToEdit.id);
                    await updateDoc(docRef, { title: val, updatedAt: new Date().toISOString() });
                    setItemToEdit(null);
                  }
                }}
                style={{ padding: "12px 36px", borderRadius: 10, background: "#1D4ED8", color: "#fff", border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#1E40AF"}
                onMouseLeave={e => e.currentTarget.style.background = "#1D4ED8"}
              >
                Rename
              </button>
              <button 
                onClick={() => setItemToEdit(null)}
                style={{ padding: "12px 36px", borderRadius: 10, background: "#fff", color: "#1D4ED8", border: "1px solid #1D4ED8", fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <DelModal
        open={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title={Array.isArray(itemToDelete) ? "Delete Selected Emails" : "Delete Email"}
        t={t}
        isDark={isDark}
        onDel={async () => {
          if (!activeTenantId || !itemToDelete) return;
          const paths = getCollectionPaths(activeTenantId);
          const items = Array.isArray(itemToDelete) ? itemToDelete : [itemToDelete];
          
          for (const item of items) {
            if (!item.id || typeof item.id === 'number') continue; // Skip dummy data
            const docRef = doc(db, paths.marketingEmails, item.id);
            await deleteDoc(docRef);
          }
          
          if (Array.isArray(itemToDelete)) {
             gridRef.current?.resetRowSelection();
             setSelectedRows([]);
          }
          setItemToDelete(null);
        }}
      >
        <div style={{ padding: "8px 0" }}>
          {Array.isArray(itemToDelete) ? (
            <>
              <p style={{ margin: "0 0 10px 0", fontSize: 13, color: t.text }}>Are you sure you want to delete <strong>{itemToDelete.length}</strong> selected email(s)?</p>
              <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>These campaigns will be permanently removed.</p>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 10px 0", fontSize: 13, color: t.text }}>Are you sure you want to delete <strong>{itemToDelete?.title}</strong>?</p>
              <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>This draft will be permanently removed from your campaign list.</p>
            </>
          )}
        </div>
      </DelModal>

      {/* Reschedule Modal */}
      {itemToReschedule && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setItemToReschedule(null)}>
          <div style={{ width: "100%", maxWidth: 480, background: isDark ? "#1e293b" : "#fff", border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: "0 20px 48px rgba(0,0,0,0.25)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Edit Schedule</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>All times in Eastern Time (ET)</div>
              </div>
              <button onClick={() => setItemToReschedule(null)} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
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
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Subject</label>
                <input type="text" value={scheduleData.subject} onChange={e => setScheduleData(d => ({ ...d, subject: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb", color: t.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Recipients</label>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: t.textMuted, pointerEvents: "none" }} />
                  <input value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} placeholder="Search users or contacts…"
                    style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: 8, border: `1px solid ${t.border}`, background: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb", color: t.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                </div>
                {scheduleData.recipients.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {scheduleData.recipients.map(r => (
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
                        recipients: selected ? d.recipients.filter(r => r.email !== email) : [...d.recipients, { name, email }]
                      }))}
                        style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`, background: selected ? (isDark ? "rgba(59,130,246,0.12)" : "#EFF6FF") : "transparent" }}
                      >
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
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setItemToReschedule(null)}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                disabled={!scheduleData.date || !scheduleData.time || scheduleData.recipients.length === 0}
                onClick={async () => {
                   if (!activeTenantId || !itemToReschedule) return;
                   const paths = getCollectionPaths(activeTenantId);
                   const scheduledAt = `${scheduleData.date}T${scheduleData.time}:00`;
                   const newSettings = {
                      ...(itemToReschedule.settings || {}),
                      scheduledAt,
                      subject: scheduleData.subject,
                      recipients: scheduleData.recipients,
                   };

                   const docRef = doc(db, paths.marketingEmails, itemToReschedule.id);
                   await updateDoc(docRef, { settings: newSettings, updatedAt: new Date().toISOString() });

                   const jobsRef = collection(db, paths.scheduledJobs);
                   const q = query(jobsRef, where("campaignId", "==", itemToReschedule.id), where("jobStatus", "==", "Pending"));
                   const jobSnap = await getDocs(q);
                   if (!jobSnap.empty) {
                      await updateDoc(jobSnap.docs[0].ref, {
                        scheduledAt,
                        subject: scheduleData.subject,
                        recipients: scheduleData.recipients,
                        settings: newSettings
                      });
                   } else {
                      await addDoc(jobsRef, {
                        campaignId: itemToReschedule.id,
                        title: itemToReschedule.title,
                        scheduledAt,
                        subject: scheduleData.subject,
                        recipients: scheduleData.recipients,
                        settings: newSettings,
                        jobStatus: "Pending",
                        createdAt: serverTimestamp()
                      });
                   }

                   setItemToReschedule(null);
                }}
                style={{ padding: "9px 20px", borderRadius: 8, background: "#1D4ED8", color: "#fff", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
                Update Schedule
              </button>
            </div>
          </div>
        </div>
      )}

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

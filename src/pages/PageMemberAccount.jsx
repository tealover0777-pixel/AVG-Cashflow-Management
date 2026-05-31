import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp, collection, query, onSnapshot, addDoc } from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { Bdg, FF, FIn, FSel, TanStackTable, Tooltip, Modal, ConfirmModal } from "../components.jsx";
import InvestmentDocumentsTab from "../components/InvestmentDocumentsTab";
import InvestmentChangelogTab from "../components/InvestmentChangelogTab";
import { getContactTransactionColumns } from "../components/ContactTransactionsTanStackConfig";
import { fmtCurr } from "../utils";
import { getDimension } from "../utils/dimensionResolver";
import {
  ArrowUp,
  Info,
  RotateCcw,
  TrendingUp,
  PieChart,
  Coins,
  Undo,
  History,
  User,
  Wallet,
  FileText,
  Settings,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  LogOut,
  ChevronRight,
  PlusCircle
} from "lucide-react";

export default function PageMemberAccount({
  t,
  isDark,
  CONTACTS = [],
  INVESTMENTS = [],
  SCHEDULES = [],
  DEALS = [],
  DIMENSIONS = [],
  tenantId = "",
  LEDGER = [],
  USERS = [],
  loading = false,
  initialTab = "Dashboard",
  readOnly = false
}) {
  const { user, hasPermission, isSuperAdmin } = useAuth();
  const contact = CONTACTS[0]; // Since CONTACTS is globally filtered for the logged-in member

  const [activeTab, setActiveTab] = useState(initialTab);
  const [distributionFilter, setDistributionFilter] = useState("all");
  const [transactionSubTab, setTransactionSubTab] = useState("Capital Transactions");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("");
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [newInvModalOpen, setNewInvModalOpen] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Populate editData when contact is loaded
  useEffect(() => {
    if (contact) {
      setEditData({
        ...contact,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        contact_type: contact.contact_type || contact.type || "Individual",
        role_type: contact.role_type || contact.role || "Member",
        email: contact.email || "",
        phone: contact.phone || "",
        address: contact.address || "",
        bank_information: contact.bank_information || contact.bank_name || "",
        bank_address: contact.bank_address || "",
        bank_routing_number: contact.bank_routing_number || "",
        bank_account_number: contact.bank_account_number || "",
        tax_id: contact.tax_id || "",
        payment_method: contact.payment_method || "",
        investor_type: contact.investor_type || "Fixed",
        marketing_emails: contact.marketing_emails || "Subscribed"
      });
      setIsEditing(false);
    }
  }, [contact]);

  // Real-time Notes fetching
  useEffect(() => {
    if (!tenantId || !contact?.id) return;
    const q = query(collection(db, "tenants", tenantId, "contacts", contact.id, "notes"));
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        const da = a.created_at?.seconds || 0;
        const db = b.created_at?.seconds || 0;
        return db - da;
      }));
    }, (err) => {
      console.error("Notes unsub error:", err);
    });
    return () => unsub();
  }, [tenantId, contact?.id]);

  const dpId = contact ? String(contact.id || "").trim() : "";
  const dpDocId = contact ? String(contact.docId || "").trim() : "";

  // Get investments for this contact
  const partyInvestments = useMemo(() => {
    if (!contact) return [];
    return INVESTMENTS.filter(c => {
      const cPId = String(c.contact_id || "").trim();
      return (cPId === dpId || (dpDocId && cPId === dpDocId));
    });
  }, [INVESTMENTS, contact, dpId, dpDocId]);

  // Auto-select first investment if none selected
  useEffect(() => {
    if (partyInvestments.length > 0 && !selectedInvestmentId) {
      setSelectedInvestmentId(partyInvestments[0].id);
    }
  }, [partyInvestments, selectedInvestmentId]);

  const selectedInv = useMemo(() => {
    return partyInvestments.find(i => i.id === selectedInvestmentId || i.investment_id === selectedInvestmentId);
  }, [partyInvestments, selectedInvestmentId]);

  // Get payment schedules for this contact/investments
  const partySchedules = useMemo(() => {
    if (!contact) return [];
    return SCHEDULES.filter(s => {
      const sPId = String(s.contact_id || "").trim();
      const isMatched = sPId === dpId || (dpDocId && sPId === dpDocId);
      return isMatched || partyInvestments.some(c => c.id === s.investment);
    }).sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return da - db;
    });
  }, [SCHEDULES, contact, dpId, dpDocId, partyInvestments]);

  // Metrics calculations
  const investedAmount = useMemo(() => {
    return partyInvestments.reduce((sum, c) => {
      const amtStr = String(c.amount || 0).replace(/[^0-9.-]/g, '');
      return sum + (Number(amtStr) || 0);
    }, 0);
  }, [partyInvestments]);

  const contributions = useMemo(() => {
    const list = partySchedules.filter(s => (s.payment_type || s.type) === "INVESTOR_PRINCIPAL_DEPOSIT" || (s.type === 'deposit'));
    
    // Add placeholder entries for investments that do not have any schedules populated
    partyInvestments.forEach(inv => {
      const hasSchedules = SCHEDULES.some(s => {
        const sInvId = String(s.investment_id || s.investment || "").trim();
        const curInvId = String(inv.id || inv.investment_id || "").trim();
        return curInvId && sInvId === curInvId;
      });

      if (!hasSchedules) {
        list.push({
          deal_id: inv.deal_id,
          project: inv.deal || inv.deal_name,
          type: "INVESTOR_PRINCIPAL_DEPOSIT",
          memo: `Initial for ${inv.id} (No schedule populated)`,
          amount: inv.amount || 0,
          signed_payment_amount: Number(String(inv.amount || 0).replace(/[^0-9.-]/g, "")) || 0,
          receivedDate: inv.start_date || "—",
          isUnpopulatedPlaceholder: true,
          investment: inv.id
        });
      }
    });

    return list;
  }, [partySchedules, partyInvestments, SCHEDULES]);

  const totalContributions = useMemo(() => {
    return contributions.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g, '')) || 0), 0);
  }, [contributions]);

  const withdrawals = useMemo(() => {
    return partySchedules.filter(s => {
      const st = (s.PaymentStatus || s.status || "").toLowerCase();
      return st === "withdrawal" || st === "withdrawals" || st === "withdrawl";
    });
  }, [partySchedules]);

  const totalWithdrawals = useMemo(() => {
    return withdrawals.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g, '')) || 0), 0);
  }, [withdrawals]);

  const capitalBalance = totalContributions - Math.abs(totalWithdrawals);

  const distributions = useMemo(() => {
    return partySchedules.filter(s => {
      const ty = (s.payment_type || s.type || "").toLowerCase();
      return ty.includes("interest") || ty.includes("distribution");
    });
  }, [partySchedules]);

  const distributedAmount = useMemo(() => {
    return distributions.reduce((sum, s) => {
      const st = (s.status || s.PaymentStatus || "").trim().toLowerCase();
      if (st === "paid" || st === "distributed" || st === "completed" || st === "settled" || st === "partial") {
        return sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g, '')) || 0);
      }
      return sum;
    }, 0);
  }, [distributions]);

  const avgYield = useMemo(() => {
    let totalAmount = 0;
    let weightedRateSum = 0;
    partyInvestments.forEach(inv => {
      const amtStr = String(inv.amount || 0).replace(/[^0-9.-]/g, '');
      const amt = Number(amtStr) || 0;
      const rate = Number(inv.rate || inv.interest_rate || 0) || 0;
      weightedRateSum += amt * rate;
      totalAmount += amt;
    });
    return totalAmount > 0 ? (weightedRateSum / totalAmount).toFixed(1) : "0.0";
  }, [partyInvestments]);

  const distributionGrouped = useMemo(() => {
    const groups = {};
    partyInvestments.forEach(inv => {
      const deal = DEALS.find(d => d.id === inv.deal_id || d.name === inv.deal);
      const dealName = inv.deal || inv.deal_name || deal?.name || "Other Investment";
      
      const invSchedules = partySchedules.filter(s => 
        s.investment === inv.id && 
        ((s.payment_type || s.type || "").toLowerCase().includes("interest") || (s.payment_type || s.type || "").toLowerCase().includes("distribution"))
      );
      
      const totalDist = invSchedules.reduce((sum, s) => {
        const st = (s.status || s.PaymentStatus || "").trim().toLowerCase();
        if (st === "paid" || st === "distributed" || st === "completed" || st === "settled" || st === "partial") {
          return sum + (Number(s.signed_payment_amount || s.payment_amount || s.amount || 0) || 0);
        }
        return sum;
      }, 0);

      const paidSchedules = invSchedules
        .filter(s => {
          const st = (s.status || s.PaymentStatus || "").trim().toLowerCase();
          return st === "paid" || st === "distributed" || st === "completed" || st === "settled" || st === "partial";
        })
        .sort((a, b) => new Date(b.receivedDate || b.dueDate || b.date).getTime() - new Date(a.receivedDate || a.dueDate || a.date).getTime());
      
      const lastDate = paidSchedules.length > 0 ? (paidSchedules[0].receivedDate || paidSchedules[0].dueDate || paidSchedules[0].date) : null;
      const lastAmt = paidSchedules.length > 0 ? Number(paidSchedules[0].signed_payment_amount || paidSchedules[0].payment_amount || paidSchedules[0].amount || 0) : 0;
      
      groups[inv.id] = {
        investmentId: inv.id,
        dealName,
        totalDistributed: totalDist,
        lastDate,
        lastAmount: lastAmt
      };
    });
    return Object.values(groups);
  }, [partyInvestments, partySchedules, DEALS]);

  // Dimension option fallbacks
  const roleOpts = getDimension(DIMENSIONS, "ContactRole");
  const contactTypeOpts = getDimension(DIMENSIONS, "ContactType");
  const investorTypeOpts = getDimension(DIMENSIONS, "InvestorType");
  const paymentMethods = getDimension(DIMENSIONS, "PaymentMethod");

  // Profile Save Changes handler
  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      const payload = {
        contact_name: editData.contact_type === "Company" ? (editData.company_name || "") : `${editData.first_name || ""} ${editData.last_name || ""}`.trim(),
        first_name: editData.first_name || "",
        last_name: editData.last_name || "",
        contact_type: editData.contact_type || "",
        role_type: editData.role_type || "",
        investor_type: editData.investor_type || "",
        email: editData.email || "",
        phone: editData.phone || "",
        address: editData.address || "",
        tax_id: editData.tax_id || "",
        company_name: editData.company_name || "",
        bank_information: editData.bank_information || "",
        bank_address: editData.bank_address || "",
        bank_routing_number: editData.bank_routing_number || "",
        bank_account_number: editData.bank_account_number || "",
        payment_method: editData.payment_method || "",
        marketing_emails: editData.marketing_emails || "Subscribed",
        notes: editData.notes || "",
        updated_at: serverTimestamp(),
      };

      const docRef = contact._path ? doc(db, contact._path) : doc(db, "tenants", tenantId, "contacts", contact.docId || contact.id);
      await updateDoc(docRef, payload);

      try {
        const tenantPath = docRef.path.split("/contacts")[0];
        const ledgerRef = collection(db, tenantPath, "ledger");
        await addDoc(ledgerRef, {
          entity_type: "Contact",
          entity_id: contact.id || contact.docId,
          note: `Member profile self-updated: ${Object.keys(payload).filter(k => k !== 'updated_at').join(", ")}`,
          created_at: serverTimestamp(),
          user_id: user?.uid || "system"
        });
      } catch (lErr) {
        console.warn("Ledger write omitted or failed:", lErr);
      }

      showToast("Profile updated successfully", "success");
      setIsEditing(false);
    } catch (err) {
      console.error("Save profile error:", err);
      showToast("Failed to update profile: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!tenantId || !contact?.id || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const noteCol = collection(db, "tenants", tenantId, "contacts", contact.id, "notes");
      await addDoc(noteCol, {
        text: noteText.trim(),
        author: user?.displayName || user?.email || "Member",
        created_at: serverTimestamp()
      });
      setNoteText("");
      showToast("Note added successfully", "success");
    } catch (err) {
      console.error("Save note error:", err);
      showToast("Failed to save note: " + err.message, "error");
    } finally {
      setSavingNote(false);
    }
  };

  const setED = (newVal) => {
    const next = { ...editData, ...newVal };
    if (newVal.hasOwnProperty('first_name') || newVal.hasOwnProperty('last_name')) {
      next.contact_name = `${next.first_name || ""} ${next.last_name || ""}`.trim();
    }
    setEditData(next);
  };

  // Render Deal Table for Contributions/Withdrawals
  const renderDealTable = (items, emptyMsg) => {
    if (!items || items.length === 0) return <div style={{ fontSize: 13, color: t.textMuted, padding: "16px 24px" }}>{emptyMsg}</div>;
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA", borderBottom: `1px solid ${t.surfaceBorder}` }}>
          <tr>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>DEAL</th>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>TYPE</th>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>MEMO</th>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted, textAlign: "right" }}>AMOUNT</th>
            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted, textAlign: "right" }}>RECEIVED DATE</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => {
            const d = DEALS.find(dd => dd.id === s.deal_id);
            const dealName = d?.name || s.deal_id || s.project || "—";
            const amtNum = Number(String(s.signed_payment_amount || s.payment_amount || s.amount || 0).replace(/[^0-9.-]/g, ''));
            const amtColor = amtNum > 0 ? (isDark ? "#34D399" : "#10B981") : amtNum < 0 ? (isDark ? "#F87171" : "#EF4444") : (isDark ? "#fff" : "#1C1917");
            const isPl = !!s.isUnpopulatedPlaceholder;
            const rowBg = isPl ? (isDark ? "rgba(234, 179, 8, 0.15)" : "#FEF9C3") : "transparent";
            return (
              <tr key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${t.surfaceBorder}` : "none", background: rowBg }}>
                <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{dealName}</td>
                <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary }}>{s.type || s.payment_type}</td>
                <td style={{ padding: "14px 24px", fontSize: 13, color: isPl ? (isDark ? "#FDE047" : "#A16207") : t.textSecondary, fontWeight: isPl ? 600 : 400 }}>{s.memo || s.notes || "—"}</td>
                <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 600, color: amtColor, textAlign: "right" }}>{fmtCurr(s.signed_payment_amount || s.payment_amount || s.amount)}</td>
                <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary, textAlign: "right" }}>{s.receivedDate || s.dueDate || s.date || "—"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  };

  // Unify tabs list
  const tabs = ["Dashboard", "Profile", "Transactions", "Documents", "Investment Details", "Notes", "Changelog", "Sharing"];

  // Donut Chart logic
  const dealDistribution = useMemo(() => {
    const map = {};
    let total = 0;
    partyInvestments.forEach(inv => {
      const dealName = inv.deal || inv.deal_name || DEALS.find(d => d.id === inv.deal_id)?.name || "Other";
      const amount = Number(String(inv.amount || 0).replace(/[^0-9.-]/g, '')) || 0;
      map[dealName] = (map[dealName] || 0) + amount;
      total += amount;
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [partyInvestments, DEALS]);

  const donutColors = isDark
    ? ["#6366F1", "#10B981", "#F59E0B", "#0EA5E9", "#F43F5E", "#EA580C", "#D946EF", "#14B8A6"]
    : ["#4F46E5", "#059669", "#D97706", "#0284C7", "#E11D48", "#EA580C", "#C084FC", "#0D9488"];

  const donutGradient = useMemo(() => {
    let accumulated = 0;
    const gradientParts = [];
    dealDistribution.forEach((item, index) => {
      const color = donutColors[index % donutColors.length];
      const start = accumulated;
      const end = accumulated + item.percentage;
      gradientParts.push(`${color} ${start.toFixed(1)}% ${end.toFixed(1)}%`);
      accumulated = end;
    });
    return gradientParts.length > 0
      ? `conic-gradient(${gradientParts.join(', ')})`
      : `conic-gradient(${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} 0% 100%)`;
  }, [dealDistribution, isDark]);

  // SVG Sparkline Chart logic
  const chartPoints = useMemo(() => {
    const txs = partySchedules
      .filter(s => {
        const type = (s.payment_type || s.type || "").toLowerCase();
        const status = (s.status || s.PaymentStatus || "").toLowerCase();
        return type.includes("principal_deposit") || type.includes("deposit") || type.includes("fund") ||
          status.includes("withdrawal") || type.includes("withdrawal") || type.includes("repayment");
      })
      .map(s => {
        const date = new Date(s.receivedDate || s.dueDate || s.date || 0);
        const isDeposit = (s.payment_type || s.type || "").toLowerCase().includes("deposit") || (s.payment_type || s.type || "").toLowerCase().includes("fund");
        const amt = Number(String(s.signed_payment_amount || s.payment_amount || s.amount || 0).replace(/[^0-9.-]/g, '')) || 0;
        return {
          date,
          amount: isDeposit ? amt : -Math.abs(amt)
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (txs.length === 0) return [];

    let currentBal = 0;
    return txs.map(t => {
      currentBal += t.amount;
      return { date: t.date, balance: currentBal };
    });
  }, [partySchedules]);

  const svgPathData = useMemo(() => {
    const points = [...chartPoints];
    const width = 800;
    const height = 200;

    if (points.length === 0) {
      return {
        path: "M 0 150 Q 200 130 400 140 T 800 80",
        fill: "M 0 150 Q 200 130 400 140 T 800 80 L 800 200 L 0 200 Z",
        lastX: 800,
        lastY: 80
      };
    }

    const firstDate = points[0].date;
    const startDate = new Date(firstDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    points.unshift({ date: startDate, balance: 0 });

    const minTime = points[0].date.getTime();
    const maxTime = points[points.length - 1].date.getTime();
    const timeRange = maxTime - minTime || 1;

    const balances = points.map(p => p.balance);
    const maxBal = Math.max(...balances, 10000);
    const minBal = Math.min(...balances, 0);
    const balRange = maxBal - minBal || 1;

    const paddingX = 40;
    const paddingY = 40;

    const svgPoints = points.map(p => {
      const x = paddingX + ((p.date.getTime() - minTime) / timeRange) * (width - 2 * paddingX);
      const y = (height - paddingY) - ((p.balance - minBal) / balRange) * (height - 2 * paddingY);
      return { x, y };
    });

    let path = `M ${svgPoints[0].x.toFixed(1)} ${svgPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < svgPoints.length; i++) {
      const p0 = svgPoints[i - 1];
      const p = svgPoints[i];
      const cpX1 = p0.x + (p.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p.x - p0.x) / 2;
      const cpY2 = p.y;
      path += ` C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }

    const lastPoint = svgPoints[svgPoints.length - 1];
    const fillPath = `${path} L ${lastPoint.x.toFixed(1)} ${height} L ${svgPoints[0].x.toFixed(1)} ${height} Z`;

    return {
      path,
      fill: fillPath,
      lastX: lastPoint.x,
      lastY: lastPoint.y
    };
  }, [chartPoints]);

  // Recent Activity timeline mapper
  const recentActivity = useMemo(() => {
    const getTimestamp = (val) => {
      if (!val) return 0;
      if (typeof val === "object" && val.seconds) return val.seconds * 1000;
      const t = new Date(val).getTime();
      return isNaN(t) ? 0 : t;
    };
    return [...partySchedules]
      .sort((a, b) => {
        const dateA = getTimestamp(a.updated_at || a.receivedDate || a.dueDate || a.date);
        const dateB = getTimestamp(b.updated_at || b.receivedDate || b.dueDate || b.date);
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [partySchedules]);

  const getActivityDetails = (item) => {
    const type = (item.payment_type || item.type || "").toLowerCase();
    const status = (item.status || item.PaymentStatus || "").toLowerCase();
    const deal = DEALS.find(d => d.id === item.deal_id);
    const dealName = deal?.name || item.deal_id || "Portfolio";
    const isPaid = status === "paid" || status === "distributed" || status === "completed" || status === "settled";

    if (type.includes("interest") || type.includes("distribution")) {
      return {
        title: isPaid ? "Interest Paid" : "Interest Due",
        sub: `${dealName} Investment`,
        icon: Coins,
        iconColor: isPaid ? (isDark ? "#34D399" : "#10B981") : (isDark ? "#FBBF24" : "#D97706"),
        iconBg: isPaid ? (isDark ? "rgba(52, 211, 153, 0.1)" : "#ECFDF5") : (isDark ? "rgba(251, 191, 36, 0.1)" : "#FEF3C7"),
        iconBorder: isPaid ? (isDark ? "rgba(52, 211, 153, 0.2)" : "#A7F3D0") : (isDark ? "rgba(251, 191, 36, 0.2)" : "#FDE68A"),
        amtColor: isPaid ? (isDark ? "#34D399" : "#10B981") : (isDark ? "#FBBF24" : "#D97706"),
        prefix: isPaid ? "+" : ""
      };
    } else if (type.includes("principal_deposit") || type.includes("deposit") || type.includes("fund")) {
      return {
        title: isPaid ? "Capital Investment" : "Capital Investment (Scheduled)",
        sub: `${dealName}`,
        icon: PlusCircle,
        iconColor: isDark ? "#818CF8" : "#4a20dd",
        iconBg: isDark ? "rgba(99, 102, 241, 0.1)" : "#EEF2FF",
        iconBorder: isDark ? "rgba(99, 102, 241, 0.2)" : "#C7D2FE",
        amtColor: isDark ? "#fff" : "#1C1917",
        prefix: ""
      };
    } else if (status.includes("withdrawal") || type.includes("withdrawal") || type.includes("repayment") || type.includes("principal_payment")) {
      return {
        title: isPaid ? "Return of Capital" : "Return of Capital (Due)",
        sub: `${dealName} (Exit)`,
        icon: Undo,
        iconColor: isPaid ? (isDark ? "#FBBF24" : "#D97706") : (isDark ? "#A78BFA" : "#7C3AED"),
        iconBg: isPaid ? (isDark ? "rgba(251, 191, 36, 0.1)" : "#FEF3C7") : (isDark ? "rgba(139, 92, 246, 0.1)" : "#F3E8FF"),
        iconBorder: isPaid ? (isDark ? "rgba(251, 191, 36, 0.2)" : "#FDE68A") : (isDark ? "rgba(139, 92, 246, 0.25)" : "#E9D5FF"),
        amtColor: isPaid ? (isDark ? "#FBBF24" : "#D97706") : (isDark ? "#A78BFA" : "#7C3AED"),
        prefix: isPaid ? "-" : ""
      };
    } else {
      return {
        title: isPaid ? (item.payment_type || item.type || "Transaction") : `${item.payment_type || item.type || "Transaction"} (Due)`,
        sub: `${dealName}`,
        icon: Coins,
        iconColor: isDark ? "#818CF8" : "#4a20dd",
        iconBg: isDark ? "rgba(99, 102, 241, 0.1)" : "#EEF2FF",
        iconBorder: isDark ? "rgba(99, 102, 241, 0.2)" : "#C7D2FE",
        amtColor: isDark ? "#fff" : "#1C1917",
        prefix: ""
      };
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return "—";
    if (typeof dateVal === "object" && dateVal.seconds) {
      const d = new Date(dateVal.seconds * 1000);
      return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };

  const glassCardStyle = {
    background: isDark ? "rgba(28, 25, 23, 0.7)" : "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB"}`,
    borderRadius: "12px",
    boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.02)",
    padding: "24px",
    display: "flex",
    flexDirection: "column"
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "Investments":
        // Filter distributions by selected investment if filter is not "all"
        const filteredDistributions = distributionFilter === "all"
          ? distributionGrouped
          : distributionGrouped.filter(g => g.investmentId === distributionFilter);

        // Find date of the last paid distribution across all active investments
        const lastPaidDate = (() => {
          const allDates = distributionGrouped.map(g => g.lastDate).filter(Boolean);
          if (allDates.length === 0) return "—";
          const sorted = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          return formatDate(sorted[0]);
        })();

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "32px" }}>
            {/* Bento Grid summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {/* Capital Under Management Card (gradient background) */}
              <div style={{
                ...glassCardStyle,
                background: isDark
                  ? "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(74,32,221,0.2))"
                  : "linear-gradient(135deg, #6344f5, #4a20dd)",
                color: "#fff",
                border: "none",
                position: "relative"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8 }}>Capital Under Management</p>
                  <span className="material-symbols-outlined" style={{ opacity: 0.8 }}>account_balance</span>
                </div>
                <p style={{ fontSize: "36px", fontWeight: 700, margin: "0" }} className="tabular-nums">
                  {fmtCurr(investedAmount)}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.15)", width: "fit-content", padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", marginTop: "16px" }}>
                  <TrendingUp size={12} />
                  <span>+12.5% YoY</span>
                </div>
              </div>

              {/* Total Distributed Card */}
              <div style={glassCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: t.textMuted, letterSpacing: "0.1em" }}>Total Distributed</p>
                  <span className="material-symbols-outlined" style={{ color: isDark ? "#818CF8" : "#4a20dd" }}>payments</span>
                </div>
                <p style={{ fontSize: "28px", fontWeight: 700, color: isDark ? "#fff" : "#111827", margin: "0" }} className="tabular-nums">
                  {fmtCurr(distributedAmount)}
                </p>
                <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "20px", marginBottom: "0" }}>
                  Last payment: {lastPaidDate}
                </p>
              </div>

              {/* Average Yield Card */}
              <div style={glassCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: t.textMuted, letterSpacing: "0.1em" }}>Average Yield</p>
                  <span className="material-symbols-outlined" style={{ color: isDark ? "#FBBF24" : "#D97706" }}>analytics</span>
                </div>
                <p style={{ fontSize: "28px", fontWeight: 700, color: isDark ? "#fff" : "#111827", margin: "0" }} className="tabular-nums">
                  {avgYield}%
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
                  <div style={{ display: "flex", marginLeft: "4px" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: isDark ? "#3730A3" : "#C7D2FE", border: `2px solid ${isDark ? "#1C1917" : "#fff"}`, zIndex: 3 }} />
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: isDark ? "#1E1B4B" : "#E0E7FF", border: `2px solid ${isDark ? "#1C1917" : "#fff"}`, marginLeft: "-8px", zIndex: 2 }} />
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: isDark ? "#312E81" : "#EEF2FF", border: `2px solid ${isDark ? "#1C1917" : "#fff"}`, marginLeft: "-8px", zIndex: 1 }} />
                  </div>
                  <span style={{ fontSize: "12px", color: t.textMuted }}>Across {partyInvestments.length} properties</span>
                </div>
              </div>
            </div>

            {/* Section 1: Active Investments Table */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "4px", height: "24px", background: isDark ? "#818CF8" : "#4a20dd", borderRadius: "2px" }} />
                <h4 style={{ fontSize: "18px", fontWeight: 700, color: isDark ? "#fff" : "#111827", margin: "0" }}>Active Investments</h4>
              </div>
              <div style={{ ...glassCardStyle, padding: "0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: isDark ? "rgba(255,255,255,0.01)" : "#FAFAFA", borderBottom: `1px solid ${t.surfaceBorder}` }}>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted }}>DEAL NAME</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "right" }}>TOTAL VALUE</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "right" }}>TOTAL DISTRIBUTED</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "center" }}>DATE PLACED</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "center" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partyInvestments.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "40px 24px", textAlign: "center", color: t.textMuted, fontSize: "13px" }}>No active investments.</td>
                      </tr>
                    ) : (
                      partyInvestments.map((inv, idx) => {
                        const deal = DEALS.find(d => d.id === inv.deal_id || d.name === inv.deal);
                        const dealName = inv.deal || inv.deal_name || deal?.name || "Other Investment";
                        const rate = inv.rate || inv.interest_rate || "0";
                        
                        // Compute total paid distributions for this specific investment
                        const totalDist = partySchedules
                          .filter(s => s.investment === inv.id && 
                            ((s.payment_type || s.type || "").toLowerCase().includes("interest") || (s.payment_type || s.type || "").toLowerCase().includes("distribution"))
                          )
                          .reduce((sum, s) => {
                            const st = (s.status || s.PaymentStatus || "").trim().toLowerCase();
                            if (st === "paid" || st === "distributed" || st === "completed" || st === "settled" || st === "partial") {
                              return sum + (Number(s.signed_payment_amount || s.payment_amount || s.amount || 0) || 0);
                            }
                            return sum;
                          }, 0);

                        return (
                          <tr key={inv.id || idx} style={{ borderBottom: `1px solid ${t.surfaceBorder}` }}>
                            <td style={{ padding: "16px 24px" }}>
                              <div style={{ fontSize: "13.5px", fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{dealName}</div>
                              <div style={{ fontSize: "11px", color: isDark ? "#818CF8" : "#4a20dd", fontWeight: 500, marginTop: "2px" }}>Rate: {rate}%</div>
                            </td>
                            <td style={{ padding: "16px 24px", textAlign: "right", fontSize: "14px", fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }} className="tabular-nums">{fmtCurr(inv.amount)}</td>
                            <td style={{ padding: "16px 24px", textAlign: "right", fontSize: "14px", color: t.textSecondary }} className="tabular-nums">{fmtCurr(totalDist)}</td>
                            <td style={{ padding: "16px 24px", textAlign: "center", fontSize: "13px", color: t.textSecondary }}>{formatDate(inv.start_date)}</td>
                            <td style={{ padding: "16px 24px", textAlign: "center" }}>
                              <button style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer" }} onClick={() => { setSelectedInvestmentId(inv.id); setActiveTab("Investment Details"); }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>more_vert</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Distributions Table */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "4px", height: "24px", background: isDark ? "#FBBF24" : "#D97706", borderRadius: "2px" }} />
                  <h4 style={{ fontSize: "18px", fontWeight: 700, color: isDark ? "#fff" : "#111827", margin: "0" }}>Distributions</h4>
                </div>
                {/* Select by Investment Filter */}
                <div style={{ position: "relative" }}>
                  <select
                    value={distributionFilter}
                    onChange={e => setDistributionFilter(e.target.value)}
                    style={{
                      appearance: "none",
                      display: "block",
                      width: "200px",
                      background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                      border: `1px solid ${t.surfaceBorder}`,
                      padding: "8px 36px 8px 16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: t.text,
                      fontWeight: 500,
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    <option value="all">Select by Investment</option>
                    {partyInvestments.map(inv => {
                      const deal = DEALS.find(d => d.id === inv.deal_id || d.name === inv.deal);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.deal || inv.deal_name || deal?.name || "Investment"}
                        </option>
                      );
                    })}
                  </select>
                  <span className="material-symbols-outlined" style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: t.textMuted,
                    pointerEvents: "none",
                    fontSize: "18px"
                  }}>expand_more</span>
                </div>
              </div>
              <div style={{ ...glassCardStyle, padding: "0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: isDark ? "rgba(255,255,255,0.01)" : "#FAFAFA", borderBottom: `1px solid ${t.surfaceBorder}` }}>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted }}>DEAL NAME</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "right" }}>TOTAL DISTRIBUTED</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "center" }}>LAST DISTRIBUTION DATE</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "right" }}>LAST DISTRIBUTED AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDistributions.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "40px 24px", textAlign: "center", color: t.textMuted, fontSize: "13px" }}>No distribution records found.</td>
                      </tr>
                    ) : (
                      filteredDistributions.map((g, idx) => (
                        <tr key={g.investmentId || idx} style={{ borderBottom: `1px solid ${t.surfaceBorder}` }}>
                          <td style={{ padding: "16px 24px", fontSize: "13.5px", fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{g.dealName}</td>
                          <td style={{ padding: "16px 24px", textAlign: "right", fontSize: "14px", fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }} className="tabular-nums">{fmtCurr(g.totalDistributed)}</td>
                          <td style={{ padding: "16px 24px", textAlign: "center", fontSize: "13px", color: t.textSecondary }}>{formatDate(g.lastDate)}</td>
                          <td style={{ padding: "16px 24px", textAlign: "right" }}>
                            <span style={{
                              display: "inline-flex",
                              padding: "4px 12px",
                              borderRadius: "9999px",
                              background: isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5",
                              color: isDark ? "#34D399" : "#059669",
                              fontSize: "13px",
                              fontWeight: 700
                            }} className="tabular-nums">
                              {fmtCurr(g.lastAmount)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Support Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "24px" }}>
              {/* Featured Asset block */}
              <div style={{
                position: "relative",
                height: "240px",
                borderRadius: "16px",
                overflow: "hidden"
              }} className="group">
                <img
                  alt="Palm Springs Villa"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYcxrTf_9eoqM-wj-oMsOKR0JHh1GGxPWvOArKS4ykDt9vAwknXVC1fCXgNAGbPxdt3n7zHsIDxO_mzFOnTy0f9NgbdC4FFTfssUvJwOqFMQxSj7c02aPi6Jl4vThxA6rzcLHGjJa5MZFpCc9_u6tt0fdbJiCs-jIisnKjvGPJPKKKQlHJQApHRUKgjV6vozgFDR4XjnfHri_heomrNy7LEf92q3nj1zR9ssMtDo2Xcz6vcr_rbce-l_FyxRkwzyyYag3hVYF4e0o"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.5s ease"
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1.0)"}
                />
                <div style={{
                  position: "absolute",
                  inset: "0",
                  background: "linear-gradient(to top, rgba(25, 28, 29, 0.85) 0%, rgba(25, 28, 29, 0) 70%)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "end",
                  padding: "24px",
                  color: "#fff"
                }}>
                  <span style={{
                    background: isDark ? "#818CF8" : "#4a20dd",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    width: "fit-content",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "8px"
                  }}>Featured Asset</span>
                  <h5 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0" }}>Palm Springs Villa</h5>
                  <p style={{ fontSize: "13px", opacity: 0.8, margin: "0" }}>8% Fixed Annual Return</p>
                </div>
              </div>

              {/* Portfolio Analytics block */}
              <div style={{
                ...glassCardStyle,
                background: isDark ? "rgba(74,32,221,0.05)" : "rgba(74,32,221,0.02)",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: isDark ? "rgba(74,32,221,0.15)" : "#EEF2FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px"
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "24px", color: isDark ? "#818CF8" : "#4a20dd" }}>analytics</span>
                </div>
                <h5 style={{ fontSize: "16px", fontWeight: 700, color: isDark ? "#fff" : "#111827", margin: "0 0 6px 0" }}>Portfolio Analytics</h5>
                <p style={{ fontSize: "13px", color: t.textSecondary, maxWidth: "300px", margin: "0 0 16px 0" }}>
                  Deep dive into your investment performance metrics and tax reporting.
                </p>
                <button
                  onClick={() => setActiveTab("Transactions")}
                  style={{
                    background: "none",
                    border: "none",
                    color: isDark ? "#818CF8" : "#4a20dd",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <span>View Detailed Report</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        );

      case "Dashboard":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "32px" }}>
            {/* Row 1: Bento Grid metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "20px" }}>
              {/* Portfolio Balance / SVG sparkline (8 cols) */}
              <div style={{ ...glassCardStyle, gridColumn: "span 8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Portfolio Balance</p>
                    <h3 style={{ fontSize: "36px", fontWeight: 700, color: isDark ? "#fff" : "#4a20dd", fontFamily: t.titleFont }}>
                      {fmtCurr(investedAmount)}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", background: isDark ? "rgba(52, 211, 153, 0.15)" : "#ECFDF5", color: isDark ? "#34D399" : "#059669", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700 }}>
                        <TrendingUp size={12} />
                        +12.5%
                      </span>
                      <span style={{ fontSize: "12px", color: t.textMuted }}>vs last month</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "4px", background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: "4px", borderRadius: "8px" }}>
                    {["1M", "3M", "1Y", "2Y", "MAX"].map(period => (
                      <button key={period} style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600, color: period === "1Y" ? (isDark ? "#fff" : "#4a20dd") : t.textMuted, background: period === "1Y" ? (isDark ? "rgba(255,255,255,0.1)" : "#fff") : "transparent", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG sparkline visualization */}
                <div style={{ flex: 1, position: "relative", minHeight: "160px" }}>
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200" style={{ width: "100%", height: "160px" }}>
                    <defs>
                      <linearGradient id="sparklineGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? "#818CF8" : "#4a20dd"} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={isDark ? "#818CF8" : "#4a20dd"} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line stroke={isDark ? "rgba(255,255,255,0.05)" : "#E5E7EB"} strokeDasharray="4" x1="0" x2="800" y1="50" y2="50" />
                    <line stroke={isDark ? "rgba(255,255,255,0.05)" : "#E5E7EB"} strokeDasharray="4" x1="0" x2="800" y1="100" y2="100" />
                    <line stroke={isDark ? "rgba(255,255,255,0.05)" : "#E5E7EB"} strokeDasharray="4" x1="0" x2="800" y1="150" y2="150" />
                    <path d={svgPathData.fill} fill="url(#sparklineGrad)" />
                    <path d={svgPathData.path} fill="none" stroke={isDark ? "#818CF8" : "#4a20dd"} strokeWidth="3" />
                    <circle cx={svgPathData.lastX} cy={svgPathData.lastY} fill={isDark ? "#818CF8" : "#4a20dd"} r="6" stroke={isDark ? "#1C1917" : "#fff"} strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {/* Investment Overview Donut Chart (4 cols) */}
              <div style={{ ...glassCardStyle, gridColumn: "span 4" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                  <PieChart size={18} style={{ color: t.textMuted }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: isDark ? "#fff" : "#111827" }}>Investment Overview</h3>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{
                    background: donutGradient,
                    borderRadius: "50%",
                    position: "relative",
                    width: "140px",
                    height: "140px",
                    marginBottom: "20px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)"
                  }}>
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "70%",
                      height: "70%",
                      backgroundColor: isDark ? "#1C1917" : "#ffffff",
                      borderRadius: "50%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <span style={{ fontSize: "9px", color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Assets</span>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>100%</span>
                    </div>
                  </div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {dealDistribution.length === 0 ? (
                      <div style={{ textAlign: "center", fontSize: "13px", color: t.textMuted }}>No active investments</div>
                    ) : (
                      dealDistribution.map((item, idx) => {
                        const color = donutColors[idx % donutColors.length];
                        return (
                          <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
                              <span style={{ color: t.textSecondary, fontWeight: 500 }}>{item.name}</span>
                            </div>
                            <span style={{ fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }} className="tabular-nums">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Tables grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "20px" }}>
              {/* Current Investments (7 cols) */}
              <div style={{ ...glassCardStyle, gridColumn: "span 7", padding: "0", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Wallet size={18} style={{ color: t.textMuted }} />
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: isDark ? "#fff" : "#111827" }}>Current Investments</h3>
                  </div>
                  <button onClick={() => setActiveTab("Investment Details")} style={{ background: "none", border: "none", color: isDark ? "#818CF8" : "#4a20dd", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                    View Details
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead style={{ background: isDark ? "rgba(255,255,255,0.01)" : "#FAFAFA", borderBottom: `1px solid ${t.surfaceBorder}`, position: "sticky", top: "0" }}>
                      <tr>
                        <th style={{ padding: "12px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted }}>DEAL</th>
                        <th style={{ padding: "12px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "right" }}>VALUE</th>
                        <th style={{ padding: "12px 24px", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "right" }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody style={{ divideY: `1px solid ${t.surfaceBorder}` }}>
                      {partyInvestments.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: "40px 24px", textAlign: "center", color: t.textMuted, fontSize: "13px" }}>
                            No active investments.
                          </td>
                        </tr>
                      ) : (
                        partyInvestments.map((inv, idx) => {
                          const deal = DEALS.find(d => d.id === inv.deal_id || d.name === inv.deal);
                          const dealName = inv.deal || inv.deal_name || deal?.name || "Other Investment";
                          const dealType = deal?.deal_type || inv.type || "Real Estate";
                          const dealState = deal?.asset_state || "California";
                          return (
                            <tr key={inv.id || idx} style={{ borderBottom: `1px solid ${t.surfaceBorder}` }}>
                              <td style={{ padding: "16px 24px" }}>
                                <p style={{ fontSize: "13.5px", fontWeight: 600, color: isDark ? "#fff" : "#1C1917", margin: "0" }}>{dealName}</p>
                                <p style={{ fontSize: "11px", color: t.textMuted, margin: "2px 0 0 0" }}>{dealType} • {dealState}</p>
                              </td>
                              <td style={{ padding: "16px 24px", textAlign: "right", fontSize: "14px", fontWeight: 600, color: isDark ? "#fff" : "#1c1917" }} className="tabular-nums">
                                {fmtCurr(inv.amount)}
                              </td>
                              <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                <span style={{ background: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF", color: isDark ? "#A5B4FC" : "#4F46E5", padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
                                  {(inv.status || "Active").toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Activity (5 cols) */}
              <div style={{ ...glassCardStyle, gridColumn: "span 5", padding: "0" }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <History size={18} style={{ color: t.textMuted }} />
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: isDark ? "#fff" : "#111827" }}>Recent Activity</h3>
                  </div>
                </div>
                <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
                  {recentActivity.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: "13px" }}>No recent activity records.</div>
                  ) : (
                    recentActivity.map((item, idx) => {
                      const details = getActivityDetails(item);
                      const IconComp = details.icon;
                      return (
                        <div key={item.id || idx} style={{ display: "flex", gap: "16px", position: "relative" }}>
                          {idx < recentActivity.length - 1 && (
                            <div style={{ position: "absolute", top: "32px", bottom: "-20px", left: "15px", width: "1px", background: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB" }} />
                          )}
                          <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: details.iconBg,
                            border: `1px solid ${details.iconBorder}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            zIndex: 2
                          }}>
                            <IconComp size={14} style={{ color: details.iconColor }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <p style={{ fontSize: "13px", fontWeight: 600, color: isDark ? "#fff" : "#111827", margin: "0" }}>{details.title}</p>
                                  <span style={{ 
                                    fontSize: "9px", 
                                    fontWeight: 700, 
                                    textTransform: "uppercase", 
                                    padding: "2px 6px", 
                                    borderRadius: "4px",
                                    letterSpacing: "0.03em",
                                    lineHeight: 1,
                                    background: item.status?.toLowerCase() === "paid" || item.status?.toLowerCase() === "distributed" || item.status?.toLowerCase() === "completed" || item.status?.toLowerCase() === "settled" 
                                      ? (isDark ? "rgba(52, 211, 153, 0.12)" : "#E6F4EA") 
                                      : (isDark ? "rgba(251, 191, 36, 0.12)" : "#FEF7E0"),
                                    color: item.status?.toLowerCase() === "paid" || item.status?.toLowerCase() === "distributed" || item.status?.toLowerCase() === "completed" || item.status?.toLowerCase() === "settled" 
                                      ? (isDark ? "#34D399" : "#137333") 
                                      : (isDark ? "#FBBF24" : "#B06000"),
                                    border: `1px solid ${
                                      item.status?.toLowerCase() === "paid" || item.status?.toLowerCase() === "distributed" || item.status?.toLowerCase() === "completed" || item.status?.toLowerCase() === "settled" 
                                        ? (isDark ? "rgba(52, 211, 153, 0.25)" : "#CEEAD6") 
                                        : (isDark ? "rgba(251, 191, 36, 0.25)" : "#FADF91")
                                    }`
                                  }}>
                                    {item.status || "Due"}
                                  </span>
                                </div>
                                <p style={{ fontSize: "11px", color: t.textMuted, margin: "2px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{details.sub}</p>
                              </div>
                              <span style={{ fontSize: "11px", color: t.textMuted }} className="tabular-nums">{formatDate(item.updated_at || item.receivedDate || item.dueDate || item.date)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: details.amtColor }} className="tabular-nums">
                                {details.prefix}{fmtCurr(item.signed_payment_amount || item.payment_amount || item.amount)}
                              </span>
                              <ChevronRight size={14} style={{ color: t.textMuted, opacity: 0.5, cursor: "pointer" }} onClick={() => setActiveTab("Transactions")} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "Profile":
        const activeEditing = isEditing && !readOnly;
        const showData = activeEditing ? editData : contact;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800, paddingBottom: "32px" }}>
            {!readOnly && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                {activeEditing ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, background: t.accentGrad, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, boxShadow: `0 4px 12px ${t.accentShadow}`, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
                    <button onClick={() => setIsEditing(false)} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", color: t.textSecondary, border: `1px solid ${t.surfaceBorder}`, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditing(true)} style={{ padding: "8px 20px", borderRadius: 8, background: t.accentGrad, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, boxShadow: `0 4px 12px ${t.accentShadow}` }}>Edit Profile</button>
                )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <FF label="First Name" t={t}>
                {activeEditing ? <FIn value={editData.first_name} onChange={e => setED({ first_name: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.first_name || "—"}</div>}
              </FF>
              <FF label="Last Name" t={t}>
                {activeEditing ? <FIn value={editData.last_name} onChange={e => setED({ last_name: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.last_name || "—"}</div>}
              </FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <FF label="Contact Type" t={t}>
                {activeEditing ? <FSel value={editData.contact_type} options={contactTypeOpts} onChange={e => setED({ contact_type: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.contact_type || showData.type || "—"}</div>}
              </FF>
              <FF label="Role" t={t}>
                {activeEditing ? <FSel value={editData.role_type} options={roleOpts} onChange={e => setED({ role_type: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.role_type || showData.role || "—"}</div>}
              </FF>
            </div>
            {(activeEditing ? editData.contact_type === "Company" : (showData.contact_type === "Company" || showData.type === "Company" || showData.company_name)) && (
              <FF label="Company Name" t={t}>
                {activeEditing ? <FIn value={editData.company_name} onChange={e => setED({ company_name: e.target.value })} placeholder="e.g. Acme Corp" t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.company_name || "—"}</div>}
              </FF>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <FF label="Investor Type" t={t}>
                {activeEditing ? <FSel value={editData.investor_type} options={investorTypeOpts} onChange={e => setED({ investor_type: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.investor_type || "—"}</div>}
              </FF>
              <FF label="Tax ID" t={t}>
                {activeEditing ? <FIn value={editData.tax_id} onChange={e => setED({ tax_id: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.tax_id || "—"}</div>}
              </FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <FF label="Email" t={t}>
                {activeEditing ? <FIn value={editData.email} onChange={e => setED({ email: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.email || "—"}</div>}
              </FF>
              <FF label="Phone" t={t}>
                {activeEditing ? <FIn value={editData.phone} onChange={e => setED({ phone: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.phone || "—"}</div>}
              </FF>
            </div>
            <FF label="Address" t={t}>
              {activeEditing ? <FIn value={editData.address} onChange={e => setED({ address: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.address || "—"}</div>}
            </FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <FF label="Bank Name" t={t}>
                {activeEditing ? <FIn value={editData.bank_information} onChange={e => setED({ bank_information: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_information || "—"}</div>}
              </FF>
              <FF label="Bank Address" t={t}>
                {activeEditing ? <FIn value={editData.bank_address} onChange={e => setED({ bank_address: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_address || "—"}</div>}
              </FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <FF label="Bank Routing Number" t={t}>
                {activeEditing ? <FIn value={editData.bank_routing_number} onChange={e => setED({ bank_routing_number: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_routing_number || "—"}</div>}
              </FF>
              <FF label="Bank Account Number" t={t}>
                {activeEditing ? <FIn value={editData.bank_account_number} onChange={e => setED({ bank_account_number: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.bank_account_number || "—"}</div>}
              </FF>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <FF label="Payment Method" t={t}>
                {activeEditing ? <FSel value={editData.payment_method} options={paymentMethods} onChange={e => setED({ payment_method: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.payment_method || "—"}</div>}
              </FF>
              <FF label="Marketing Emails?" t={t}>
                {activeEditing ? <FSel value={editData.marketing_emails} options={["Subscribed", "Unsubscribed"]} onChange={e => setED({ marketing_emails: e.target.value })} t={t} /> : <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500 }}>{showData.marketing_emails || "—"}</div>}
              </FF>
            </div>
            <FF label="Notes" t={t}>
              {activeEditing ? (
                <textarea
                  value={editData.notes || ""}
                  onChange={e => setED({ notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  style={{ width: "100%", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, padding: "12px 16px", color: t.text, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              ) : (
                <div style={{ padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.text, fontWeight: 500, minHeight: 46, whiteSpace: "pre-wrap" }}>
                  {showData.notes || "—"}
                </div>
              )}
            </FF>
          </div>
        );

      case "Transactions":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Inner Sub-tab navigation */}
            <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: 4, borderRadius: 8, alignSelf: "flex-start" }}>
              {["Capital Transactions", "Distributions"].map(sub => (
                <button
                  key={sub}
                  onClick={() => setTransactionSubTab(sub)}
                  style={{ padding: "6px 16px", borderRadius: 6, background: transactionSubTab === sub ? (isDark ? "#3B82F6" : "#fff") : "transparent", color: transactionSubTab === sub ? (isDark ? "#fff" : "#111827") : t.textSecondary, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}>
                  {sub}
                </button>
              ))}
            </div>

            {transactionSubTab === "Capital Transactions" ? (
              <div>
                <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
                  <div style={{ width: 280, padding: "24px", borderRadius: 16, background: isDark ? "linear-gradient(145deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.05) 100%)" : "linear-gradient(145deg, #EFF6FF 0%, #DBEAFE 100%)", border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "#BFDBFE"}`, boxShadow: isDark ? "none" : "0 4px 6px -1px rgba(59, 130, 246, 0.1)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#93C5FD" : "#1D4ED8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <ArrowUp size={16} /> Capital balance
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: isDark ? "#fff" : "#1E3A8A", marginBottom: 4 }}>{fmtCurr(capitalBalance)}</div>
                    <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.6)" : "#3B82F6" }}>Total contributions - Total withdrawals</div>
                  </div>
                </div>

                <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>Contributions</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{fmtCurr(totalContributions)}</div>
                  </div>
                  {renderDealTable(contributions, "No contributions found.")}
                </div>

                <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>Withdrawals</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{fmtCurr(Math.abs(totalWithdrawals))}</div>
                  </div>
                  {renderDealTable(withdrawals, "No withdrawals found.")}
                </div>

                <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>All Transactions</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>
                      {fmtCurr(partySchedules.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || String(s.amount || 0).replace(/[^0-9.-]/g, '')) || 0), 0))}
                    </div>
                  </div>
                  <div style={{ height: "calc(100vh - 340px)" }}>
                    <TanStackTable
                      data={partySchedules}
                      columns={getContactTransactionColumns(isDark, t, { DEALS })}
                      isDark={isDark}
                      t={t}
                      pageSize={50}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>
                      Distributions
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{fmtCurr(distributedAmount)}</div>
                  </div>
                  <div style={{ height: "calc(100vh - 340px)" }}>
                    <TanStackTable
                      data={distributions}
                      columns={getContactTransactionColumns(isDark, t, { DEALS })}
                      isDark={isDark}
                      t={t}
                      pageSize={50}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "Documents":
        return (
          <InvestmentDocumentsTab
            t={t}
            isDark={isDark}
            tenantId={tenantId}
            contact={contact}
            DEALS={DEALS}
            INVESTMENTS={INVESTMENTS}
          />
        );

      case "Investment Details":
        return (
          <div style={{ maxWidth: 800, paddingBottom: "32px" }}>
            <div style={{ marginBottom: 16 }}>
              <button 
                onClick={() => setActiveTab("Investments")} 
                style={{ background: "none", border: "none", color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}
              >
                <span>‹</span> Back to Investments
              </button>
            </div>
            {partyInvestments.length > 1 && (
              <div style={{ marginBottom: 24, padding: "16px 20px", background: isDark ? "rgba(59,130,246,0.1)" : "#EFF6FF", borderRadius: 12, border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "#BFDBFE"}` }}>
                <FF label="Switch Investment" t={t}>
                  <select
                    value={selectedInvestmentId}
                    onChange={e => setSelectedInvestmentId(e.target.value)}
                    style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
                  >
                    {partyInvestments.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.investment_name || inv.id} ({inv.deal || "No Deal"}) — {fmtCurr(inv.amount)}
                      </option>
                    ))}
                  </select>
                </FF>
              </div>
            )}

            {!selectedInv ? (
              <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>No investment selected or available.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <FF label="Investment ID" t={t}>
                    <div style={{ padding: "10px 13px", background: isDark ? "rgba(255,255,255,0.03)" : "#f9f9f9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.textMuted, fontSize: 13, fontFamily: t.mono }}>{selectedInv.id}</div>
                  </FF>
                  <FF label="Deal ID" t={t}>
                    <div style={{ padding: "10px 13px", background: isDark ? "rgba(255,255,255,0.03)" : "#f9f9f9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, color: t.textMuted, fontSize: 13, fontFamily: t.mono }}>
                      {selectedInv.deal_id ? `${selectedInv.deal_id} - ${selectedInv.deal || selectedInv.deal_name || DEALS.find(d => d.id === selectedInv.deal_id)?.name || ""}`.replace(/ - $/, "") : "—"}
                    </div>
                  </FF>
                  <FF label="Type" t={t}>
                    <FIn value={selectedInv.type || selectedInv.investment_type || ""} disabled t={t} />
                  </FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <FF label="Amount" t={t}>
                    <FIn value={fmtCurr(selectedInv.amount)} disabled t={t} />
                  </FF>
                  <FF label="Rate (%)" t={t}>
                    <FIn value={selectedInv.rate || selectedInv.interest_rate || ""} disabled t={t} />
                  </FF>
                  <FF label="Frequency" t={t}>
                    <FIn value={selectedInv.freq || selectedInv.payment_frequency || ""} disabled t={t} />
                  </FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <FF label="Term (months)" t={t}>
                    <FIn value={selectedInv.term_months || ""} disabled t={t} />
                  </FF>
                  <FF label="Status" t={t}>
                    <FIn value={selectedInv.status || "Open"} disabled t={t} />
                  </FF>
                  <FF label="Calculator" t={t}>
                    <FIn value={selectedInv.calculator || "—"} disabled t={t} />
                  </FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FF label="Start Date" t={t}>
                    <FIn value={selectedInv.start_date || ""} disabled t={t} />
                  </FF>
                  <FF label="Maturity Date" t={t}>
                    <FIn value={selectedInv.maturity_date || ""} disabled t={t} />
                  </FF>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FF label="Payment Method" t={t}>
                    <FIn value={selectedInv.payment_method || ""} disabled t={t} />
                  </FF>
                  <FF label="Rollover at Maturity" t={t}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", height: 40 }}>
                        <input type="checkbox" checked={!!selectedInv.rollover} disabled style={{ width: 18, height: 18 }} />
                        <span style={{ marginLeft: 10, fontSize: 13, color: t.textSecondary }}>Rollover Principal</span>
                      </div>
                      {selectedInv.rollover && (
                        <div style={{
                          padding: "10px 14px",
                          background: isDark ? "rgba(99,102,241,0.08)" : "#EEF2FF",
                          border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "#C7D2FE"}`,
                          borderRadius: 8,
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start"
                        }}>
                          <RotateCcw size={16} style={{ marginTop: 2, color: isDark ? "#818CF8" : "#4F46E5", flexShrink: 0 }} />
                          <div style={{ fontSize: 12, color: isDark ? "#A5B4FC" : "#3730A3", lineHeight: 1.5 }}>
                            <strong>Principal Rollover Enabled:</strong> The final principal payment will be marked as <strong>ROLLOVER</strong> in the schedule.
                          </div>
                        </div>
                      )}
                    </div>
                  </FF>
                </div>
              </div>
            )}
          </div>
        );

      case "Notes":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700, paddingBottom: "32px" }}>
            {!readOnly && (
              <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Add Note</div>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Write a note to add to your account record..."
                  rows={4}
                  style={{ width: "100%", padding: "10px 13px", borderRadius: 9, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(0,0,0,0.2)" : "#fff", color: t.text, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button
                    disabled={savingNote || !noteText.trim()}
                    onClick={handleAddNote}
                    style={{ padding: "9px 22px", borderRadius: 9, background: noteText.trim() ? t.accentGrad : (isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb"), color: noteText.trim() ? "#fff" : t.textMuted, border: "none", fontWeight: 700, fontSize: 13.5, cursor: noteText.trim() && !savingNote ? "pointer" : "default", boxShadow: noteText.trim() ? `0 4px 12px ${t.accentShadow}` : "none" }}
                  >
                    {savingNote ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>
            )}

            {notes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: 13.5 }}>No notes yet. Add the first one above.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {notes.map((n, i) => (
                  <div key={n.id || i} style={{ background: isDark ? "#1C1917" : "#fff", border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 13.5, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.text}</div>
                    <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 10, display: "flex", gap: 12 }}>
                      <span>{n.author || "—"}</span>
                      <span>{n.created_at?.toDate ? n.created_at.toDate().toLocaleString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "Changelog":
        return (
          <InvestmentChangelogTab
            t={t}
            isDark={isDark}
            LEDGER={LEDGER}
            USERS={USERS}
            currentUser={user}
            contact={contact}
            selectedInvestmentId={selectedInvestmentId}
          />
        );

      case "Sharing":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5, padding: "60px 0" }}>
            <Info size={48} style={{ marginBottom: 16, color: t.textMuted }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: isDark ? "#fff" : "#111827" }}>Investment Sharing</div>
            <div style={{ fontSize: 14, color: t.textMuted, marginTop: 8 }}>Secure document and portal access controls coming soon.</div>
          </div>
        );

      default:
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
            <Info size={48} style={{ marginBottom: 16, color: t.textMuted }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: isDark ? "#fff" : "#111827" }}>Coming Soon</div>
            <div style={{ fontSize: 14, color: t.textMuted, marginTop: 8 }}>This tab is under construction.</div>
          </div>
        );
    }
  };

  if (!contact) {
    if (loading) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.textMuted, fontSize: 14 }}>
          Loading account details...
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: t.textMuted, gap: 16, padding: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxWidth: 450, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? "#fff" : "#1C1917" }}>No Profile Linked</div>
          <div style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.6 }}>
            Your user account is not currently linked to an investor or borrower profile.
          </div>
          <div style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.5, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", border: `1px solid ${t.surfaceBorder}`, padding: "12px 18px", borderRadius: 10, marginTop: 8 }}>
            Please contact support to link your user credentials with your contact profile.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
      {/* Header Container */}
      <div style={{ padding: "0 0 20px 0", borderBottom: `1px solid ${t.surfaceBorder}`, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 4, fontFamily: t.titleFont }}>
              {activeTab === "Investments" ? "My Investments" : "My Dashboard"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: t.textMuted }}>
                {activeTab === "Investments" ? (
                  "Overview of your current capital deployment and yield performance."
                ) : (
                  <>Welcome back, <strong>{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Member"}</strong></>
                )}
              </span>
              <div style={{ width: 1, height: 14, background: t.surfaceBorder }} />

            </div>
          </div>
        </div>
      </div>

      {/* Tab Render panel */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {renderTabContent()}
      </div>

      {/* Toast popup */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : (isDark ? "#2d0a0a" : "#fef2f2"), border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, color: toast.type === "success" ? "#22c55e" : "#ef4444", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
        </div>
      )}
    </div>
  );
}

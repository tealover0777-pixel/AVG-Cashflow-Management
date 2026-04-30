/**
 * AVG Cashflow Management — Root App
 * State management, Firestore hooks, data transforms, layout, CSS.
 */
import React, { useState, useMemo, useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { createRoot } from "react-dom/client";
import { auth, db, storage } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { useFirestoreCollection } from "./useFirestoreCollection";
import { mkTheme, getNav, getCollectionPaths, DIM_STYLES, DEFAULT_DIM_STYLE, MONTHLY, initials, av, fmtCurr, fmtDate, parseTemplateJson } from "./utils";
import PageDashboard from "./pages/PageDashboard";
import PageDeals from "./pages/PageDeals";
import PageContacts from "./pages/PageContacts";
import PageInvestments from "./pages/PageInvestments";
import PageSchedule from "./pages/PageSchedule";
import PagePayments from "./pages/PagePayments";
import PageFees from "./pages/PageFees";
import PageTenants from "./pages/PageTenants";
import PageUserProfiles from "./pages/PageUserProfiles";
import PageRoles from "./pages/PageRoles";
import PageSuperAdmin from "./pages/PageSuperAdmin";
import PageProfile from "./pages/PageProfile";
import PageReports from "./pages/PageReports";
import PageDimensions from "./pages/PageDimensions";
import PageMarketingEmails from "./pages/PageMarketingEmails";
import PageManageTemplates from "./pages/PageManageTemplates";
import PageSelectTemplate from "./pages/PageSelectTemplate";
import PageEmailBuilder from "./pages/PageEmailBuilder";
import PageCompany from "./pages/PageCompany";
import {
  LayoutDashboard, Briefcase, Users, PieChart, Calendar, 
  CreditCard, BarChart3, Settings, Shield, UserCircle, 
  HelpCircle, LogOut, ChevronDown, Sparkles, Sun, Moon, 
  TableProperties, Hash, LayoutGrid, Coins, CircleDollarSign,
  UserSquare, ShieldAlert, Building2, ShieldCheck, UserPlus,
  Bot, Box, CalendarDays, User, ChevronRight, Server, HeartHandshake, Landmark,
  Megaphone, Mail
} from "lucide-react";
import { Tooltip } from "./components";
import SidebarHelp from "./components/SidebarHelp";
import PageAdminHelp from "./pages/PageAdminHelp";
import PageDealSummary from "./pages/PageDealSummary";


const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    LayoutDashboard, Briefcase, LayoutGrid, Users, Coins, Settings, 
    CircleDollarSign, UserSquare, ShieldAlert, Building2, ShieldCheck, 
    UserPlus, Bot, Box, BarChart3, CalendarDays, PieChart, CreditCard, 
    User, ChevronRight, HelpCircle, LogOut, Sparkles, Sun, Moon,
    Shield, UserCircle, ChevronDown, TableProperties, Hash, Calendar,
    Server, HeartHandshake, Landmark, Megaphone, Mail
  };
  const LucideIcon = icons[name];
  return LucideIcon ? <LucideIcon size={size} color={color} style={{ flexShrink: 0 }} /> : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "red", fontFamily: "sans-serif" }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
function AppContent() {
  const authProps = useAuth();
  let { user, profile, loading: authLoading, login, logout, isSuperAdmin, isTenantAdmin, isMember, isGlobalRole, tenantId, hasPermission, isR10010 } = authProps;

  // ─────────────────────────────────────────────────────────────────────────────
  // THEME & NAVIGATION STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("avg_theme");
    return saved !== null ? saved === "dark" : true;
  });
  
  // Hash Routing Logic
  const pageToHash = (page) => page.replace(/\s+/g, "-");
  const hashToPage = (hash) => {
    const clean = hash.replace(/^#/, "").replace(/-/g, " ");
    // Special handling for casing if needed, but the Nav labels are mostly Title Case
    // We'll try to find an exact match in the flat nav list to be safe
    return clean; 
  };

  const [activePage, setActivePage] = useState(() => {
    const initialHash = window.location.hash;
    if (initialHash) return hashToPage(initialHash);
    return "Dashboard";
  });

  useEffect(() => {
    const handlePopState = () => {
      const newPage = hashToPage(window.location.hash || "#Dashboard");
      setActivePage(newPage);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const currentHash = window.location.hash;
    const targetHash = `#${pageToHash(activePage)}`;
    if (currentHash !== targetHash) {
      window.history.pushState(null, "", targetHash);
    }
  }, [activePage]);

  const [prevPage, setPrevPage] = useState("Manage Templates");
  const [activeEmailTemplate, setActiveEmailTemplate] = useState(null);

  useEffect(() => {
    if (activePage !== "Email Builder") setPrevPage(activePage);
  }, [activePage]);

  const [selectedDealId, setSelectedDealId] = useState(null);
  const [selectedDistMemoId, setSelectedDistMemoId] = useState(null);
  const [activeTenantId, setActiveTenantId] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({}); // Track which menus are expanded (all collapsed by default)

  // Email Template Caching
  const [allTemplates, setAllTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesFetched, setTemplatesFetched] = useState(false);

  const fetchTemplates = async (force = false) => {
    if (templatesFetched && !force) return;
    setLoadingTemplates(true);
    try {
      const globalRef = ref(storage, "global_templates");
      const globalRes = await listAll(globalRef);
      const globalFiles = (await Promise.all(
        globalRes.items.map(async (item) => {
          try {
            const url = await getDownloadURL(item);
            const res = await fetch(url, { cache: "no-store" });
            const text = await res.text();
            return parseTemplateJson(text, item.fullPath, true);
          } catch (e) {
            console.warn("Failed to catch global template:", item.name, e);
            return null;
          }
        })
      )).filter(Boolean);

      let tenantFiles = [];
      // Use actual tenant path: activeTenantId when scoped, or JWT tenantId when in GLOBAL mode
      const tenantStorageId = (activeTenantId && activeTenantId !== "GLOBAL") ? activeTenantId : tenantId;
      if (tenantStorageId) {
        const tenantRef = ref(storage, `tenants/${tenantStorageId}/templates`);
        const tenantRes = await listAll(tenantRef);
        tenantFiles = (await Promise.all(
          tenantRes.items.map(async (item) => {
            try {
              const url = await getDownloadURL(item);
              const res = await fetch(url, { cache: "no-store" });
              const text = await res.text();
              return parseTemplateJson(text, item.fullPath, false);
            } catch (e) {
              console.warn("Failed to catch tenant template:", item.name, e);
              return null;
            }
          })
        )).filter(Boolean);
      }

      setAllTemplates([...globalFiles, ...tenantFiles]);
      setTemplatesFetched(true);
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Trigger fetch when entering email-related pages
  useEffect(() => {
    if (activePage === "Manage Templates" || activePage === "Email Builder" || activePage === "Select Template") {
      fetchTemplates();
    }
  }, [activePage, activeTenantId]);
  const t = mkTheme(isDark);

  useEffect(() => {
    localStorage.setItem("avg_theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    if (tenantId && !activeTenantId) setActiveTenantId(tenantId);
  }, [tenantId]);

  const isGlobalConsolidated = activeTenantId === "GLOBAL";
  // We only fetch single-tenant data if activeTenantId is physically set.
  // Super admins/Global roles can fetch "GLOBAL" which uses group queries.
  const fetchPaths = getCollectionPaths(isGlobalConsolidated ? "" : (activeTenantId || "T_PENDING"));

  const { data: rawDeals, loading: l1, error: e1 } = useFirestoreCollection(isGlobalConsolidated ? "deals" : (activeTenantId ? fetchPaths.deals : null), isGlobalConsolidated);
  const { data: rawContacts, loading: l2, error: e2 } = useFirestoreCollection(isGlobalConsolidated ? "contacts" : (activeTenantId ? fetchPaths.contacts : null), isGlobalConsolidated);
  const { data: rawInvestments, loading: l3, error: e3 } = useFirestoreCollection(isGlobalConsolidated ? "investments" : (activeTenantId ? fetchPaths.investments : null), isGlobalConsolidated);
  const { data: rawSchedules, loading: l4, error: e4 } = useFirestoreCollection(isGlobalConsolidated ? "paymentSchedules" : (activeTenantId ? fetchPaths.paymentSchedules : null), isGlobalConsolidated);
  const { data: rawPayments, loading: l5, error: e5 } = useFirestoreCollection(isGlobalConsolidated ? "payments" : (activeTenantId ? fetchPaths.payments : null), isGlobalConsolidated);
  const { data: rawFees, loading: l6, error: e6 } = useFirestoreCollection(isGlobalConsolidated ? "fees" : (activeTenantId ? fetchPaths.fees : null), isGlobalConsolidated);
  const { data: rawTenants, loading: l8, error: e8 } = useFirestoreCollection(isSuperAdmin ? getCollectionPaths("").tenants : null);
  
  // User Profiles: Always use tenant-specific path (no platform users)
  // Only use collection group in GLOBAL consolidated mode
  const userFetchPath = (activeTenantId && (isSuperAdmin || isTenantAdmin || hasPermission("USER_PROFILE_*")))
    ? (isGlobalConsolidated ? "users" : fetchPaths.users)
    : null;
  const { data: rawUsers, loading: l9, error: e9 } = useFirestoreCollection(userFetchPath, isGlobalConsolidated);

  // Fetch global_users to get first_name/last_name for User Profiles
  const { data: globalUsers, loading: l13, error: e13 } = useFirestoreCollection("global_users");

  const { data: rawRoles, loading: l10, error: e10 } = useFirestoreCollection((activeTenantId && (isSuperAdmin || isTenantAdmin || hasPermission("ROLE_TYPE_*"))) ? (isGlobalConsolidated ? "roles" : fetchPaths.roles) : null);
  const { data: rawDimensions, loading: l7, error: e7 } = useFirestoreCollection(user ? fetchPaths.dimensions : null);
  const { data: rawACHBatches, loading: l11, error: e11 } = useFirestoreCollection(isGlobalConsolidated ? "achBatches" : (activeTenantId ? fetchPaths.achBatches : null), isGlobalConsolidated);
  const { data: rawLedger, loading: l12, error: e12 } = useFirestoreCollection(isGlobalConsolidated ? "ledger" : (activeTenantId ? fetchPaths.ledger : null), isGlobalConsolidated);
  const { data: rawMarketingEmails, loading: l14, error: e14 } = useFirestoreCollection(isGlobalConsolidated ? "marketingEmails" : (activeTenantId ? fetchPaths.marketingEmails : null), isGlobalConsolidated);


  const shouldFetch = !!activeTenantId || isGlobalRole;

  const loading = authLoading || (shouldFetch && (l1 || l2 || l3 || l4 || l5 || l6 || l11 || l12 || l14)) || (isSuperAdmin && l8) || (activeTenantId && (isSuperAdmin || isTenantAdmin || hasPermission("USER_PROFILE_*") || hasPermission("ROLE_TYPE_*")) && (l9 || l10)) || (user && l7);
  const dataPresent = rawDeals.length > 0 || rawInvestments.length > 0;
  const showLoading = loading && !dataPresent;

  const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11 || e12 || e13 || e14;

  // Auto-select first tenant for Super Admins if none selected
  useEffect(() => {
    if (isSuperAdmin && !activeTenantId && rawTenants.length > 0) {
      setActiveTenantId(rawTenants[0].id || rawTenants[0].tenant_id || "");
    }
  }, [isSuperAdmin, activeTenantId, rawTenants]);

  const memberContactId = useMemo(() => {
    if (!isMember) return null;

    // 1. Check explicit profile field
    if (profile?.contact_id || profile?.party_id) return profile.contact_id || profile.party_id;
    // 2. Check notes field
    const noteId = (profile?.notes || "").split(" — ")[1];
    if (noteId) return noteId;
    // 3. Fallback: Lookup by email in rawContacts
    const foundByEmail = rawContacts.find(p => p.email && p.email.toLowerCase() === user?.email?.toLowerCase());
    if (foundByEmail) return foundByEmail.id || foundByEmail.doc_id;

    return null;
  }, [profile, user, rawContacts, isMember]);

  const forceFilter = isMember;

  // ── Normalize Firestore field names → what UI components expect ──
  const fmtDate = v => {
    if (!v) return "";
    if (v.seconds) return new Date(v.seconds * 1000).toISOString().slice(0, 10);
    return String(v);
  };

  const DEALS = rawDeals
    .filter(d => {
      if (!forceFilter) return true;
      if (!memberContactId) return false;
      const mId = String(memberContactId).trim();
      return rawInvestments.some(c => (c.deal_id === d.id || c.deal_name === d.deal_name) && (String(c.contact_id || c.party_id || "").trim() === mId || String(c.counterparty_id || "").trim() === mId));
    })
    .map(d => {
      const dealId = d.id;
      const valuation = Number(String(d.valuation_amount || 0).replace(/[^0-9.]/g, "")) || 0;
      
      // Calculate Fundraising Progress from associated investments
      const dealInvestments = rawInvestments.filter(c => c.deal_id === dealId || c.deal_name === d.deal_name);
      const totalCommitted = dealInvestments.reduce((sum, c) => sum + (Number(String(c.amount || 0).replace(/[^0-9.-]/g, "")) || 0), 0);
      const fundraisingProgress = valuation > 0 ? (totalCommitted / valuation) * 100 : 0;

      // NEW Fund Balance Logic: (TYPE = INVESTOR_PRINCIPAL_DEPOSIT) - (STATUS = "Withdrawl")
      const fundBalance = rawSchedules.reduce((sum, sch) => {
        if (sch.deal_id !== dealId && sch.deal_name !== d.deal_name) return sum;
        const amt = Number(String(sch.signed_payment_amount || 0).replace(/[^0-9.-]/g, "")) || 0;
        // Matches the standard "INVESTOR_PRINCIPAL_DEPOSIT" type
        const typeMatch = (sch.payment_type || "").toUpperCase() === "INVESTOR_PRINCIPAL_DEPOSIT";
        const isWithdrawal = (sch.status || "").toLowerCase().includes("withdraw"); // Handles "Withdrawl" and "Withdrawal"
        
        let res = sum;
        if (typeMatch) res += amt;
        if (isWithdrawal) res -= amt;
        return res;
      }, 0);

      return {
        id: dealId,
        docId: d.doc_id || d.id,
        _path: d._path,
        name: d.deal_name || "",
        status: d.status || "",
        currency: d.currency || "",
        description: d.description || "",
        created: fmtDate(d.created_at),
        startDate: fmtDate(d.start_date),
        endDate: fmtDate(d.end_date),
        valuation: fmtCurr(d.valuation_amount),
        valuationRaw: valuation,
        fundraisingAmount: totalCommitted,
        fundraisingProgress,
        fundBalance: fmtCurr(fundBalance),
        fundBalanceRaw: fundBalance,
        type: d.deal_type || "",
        feeIds: typeof d.fees === "string" && d.fees ? d.fees.split(",").map(s => s.trim()) : [],
      };
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const CONTACTS = rawContacts
    .filter(d => {
      if (!forceFilter) return true;
      if (!memberContactId) return false;
      return d.id === memberContactId;
    })
    .map(d => ({
      id: d.id, docId: d.doc_id || d.id, _path: d._path, name: d.contact_name || d.party_name || "", type: d.contact_type || d.party_type || "", role: d.role_type || "",
      party_id: d.party_id || d.contact_id || "", 
      contact_id: d.contact_id || d.party_id || "",
      first_name: d.first_name || "", last_name: d.last_name || "",
      email: d.email || "", phone: d.phone || "", investor_type: d.investor_type || "",
      address: d.address || "", bank_information: d.bank_information || "",
      bank_address: d.bank_address || "", bank_routing_number: d.bank_routing_number || "", bank_account_number: d.bank_account_number || "",
      tax_id: d.tax_id || "", payment_method: d.payment_method || "",
      created_at: fmtDate(d.created_at), updated_at: fmtDate(d.updated_at),
    }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
 
  const INVESTMENTS = rawInvestments
    .filter(d => {
      if (!forceFilter) return true;
      if (!memberContactId) return false;
      const mId = String(memberContactId).trim();
      const dPId = String(d.contact_id || d.party_id || "").trim();
      const mContact = rawContacts.find(p => String(p.id || "").trim() === mId);
      const mDocId = mContact ? String(mContact.doc_id || mContact.id || "").trim() : "";
      return (dPId === mId || (mDocId && dPId === mDocId));
    })
    .map(d => {
      const dealId = d.deal_id || "";
      const contactId = String(d.contact_id || d.party_id || "").trim();
      const invContactName = String(d.contact_name || d.party_name || d.contact || "").trim();
      const dealMatch = rawDeals.find(deal => deal.id === dealId || deal.deal_id === dealId);
      const contactMatch = rawContacts.find(c => {
        const cId = String(c.id || "").trim();
        const cDocId = String(c.doc_id || "").trim();
        const cPartyId = String(c.party_id || "").trim();
        const cContactId = String(c.contact_id || "").trim();
        const cName = String(c.contact_name || c.party_name || "").trim();
        
        return (contactId && (cId === contactId || cDocId === contactId || cPartyId === contactId || cContactId === contactId)) ||
               (invContactName && cName === invContactName);
      });

      return {
        id: d.investment_id || d.id,
        docId: d.doc_id || d.id,
        _path: d._path,
        investment_id: d.investment_id || "",
        investment_name: d.investment_name || "",
        deal: dealMatch?.deal_name || d.deal_name || d.deal_id || "",
        deal_id: dealId,
        contact: contactMatch?.contact_name || contactMatch?.party_name || d.contact_name || d.party_name || d.contact_id || d.party_id || "",
        first_name: contactMatch?.first_name || (contactMatch?.contact_name || contactMatch?.party_name || d.contact_name || d.party_name || "").split(" ")[0] || "",
        last_name: contactMatch?.last_name || (contactMatch?.contact_name || contactMatch?.party_name || d.contact_name || d.party_name || "").split(" ").slice(1).join(" ") || "",
        contact_id: d.contact_id || contactMatch?.id || "",
        email: contactMatch?.email || d.email || "",
        phone: contactMatch?.phone || d.phone || "",
        type: d.investment_type || "",
        amount: fmtCurr(d.amount),
        rate: d.interest_rate ? `${d.interest_rate}%` : "",
        freq: d.payment_frequency || "",
        status: d.status || "",
        calculator: d.calculator || "",
        term_months: d.term_months != null ? String(d.term_months) : "",
        start_date: fmtDate(d.start_date),
        maturity_date: fmtDate(d.maturity_date),
        fees: d.fees || "",
        feeIds: typeof d.fees === "string" && d.fees ? d.fees.split(",").map(s => s.trim()) : [],
        created_at: fmtDate(d.created_at),
        updated_at: fmtDate(d.updated_at),
        payment_method: d.payment_method || "",
        rollover: d.rollover || false,
      };
    })
    .sort((a, b) => (a.investment_name || a.id || "").localeCompare(b.investment_name || b.id || ""));

  const SCHEDULES = rawSchedules
    .filter(d => {
      if (!forceFilter) return true;
      if (!memberContactId) return false;
      const mId = String(memberContactId).trim();
      const dPId = String(d.contact_id || d.party_id || "").trim();
      const mContact = rawContacts.find(p => String(p.id || "").trim() === mId);
      const mDocId = mContact ? String(mContact.doc_id || mContact.id || "").trim() : "";
      return (dPId === mId || (mDocId && dPId === mDocId));
    })
    .map(d => {
      let dir = d.direction_from_company || "";
      let signed = d.signed_payment_amount;
      let principal = d.principal_amount;
      if (isMember) {
        dir = (dir === "IN") ? "OUT" : (dir === "OUT" ? "IN" : dir);
        if (signed != null) signed = -signed;
        if (principal != null) principal = -principal;
      }

      // Payment types that should fall back to principal_amount if payment_amount is missing
      const principalPTs = ["INVESTOR_PRINCIPAL_PAYMENT", "BORROWER_PRINCIPAL_RECEIVED", "BORROWER_DISBURSEMENT", "INVESTOR_PRINCIPAL_DEPOSIT", "REPAYMENT", "BORROWER_REPAYMENT"];
      const isPrincipal = principalPTs.includes(d.payment_type);

      const dealId = String(d.deal_id || d.project || "").trim();
      const contactId = String(d.contact_id || d.party_id || "").trim();
      const schContactName = String(d.contact_name || d.party_name || d.contact || "").trim();
      
      const dealMatch = rawDeals.find(deal => 
        String(deal.id || "").trim() === dealId || 
        String(deal.deal_id || "").trim() === dealId ||
        String(deal.deal_name || "").trim() === dealId
      );
      
      const contactMatch = rawContacts.find(c => {
        const cId = String(c.id || "").trim();
        const cDocId = String(c.doc_id || "").trim();
        const cPartyId = String(c.party_id || "").trim();
        const cContactId = String(c.contact_id || "").trim();
        const cName = String(c.contact_name || c.party_name || "").trim();
        
        return (contactId && (cId === contactId || cDocId === contactId || cPartyId === contactId || cContactId === contactId)) ||
               (schContactName && cName === schContactName);
      });

      return {
        schedule_id: d.schedule_id || d.id, docId: d.doc_id || d.id, _path: d._path, investment: d.investment_id || "", dueDate: fmtDate(d.due_date),
        batch_id: d.batch_id || d.ach_batch_id || "",
        type: d.payment_type || d.type || "",
        payment: d.payment_amount != null ? d.payment_amount : (Math.abs(d.signed_payment_amount || 0) || (isPrincipal ? d.principal_amount : 0)),
        payment_method: d.payment_method || "",
        status: d.status || "", direction: dir, fee_id: d.fee_id || "", fee_name: d.fee_name || "",
        contact_id: contactId,
        contact: contactMatch?.contact_name || contactMatch?.party_name || d.contact_name || d.party_name || d.contact_id || d.party_id || "",
        period_number: d.period_number != null ? String(d.period_number) : "",
        principal_amount: principal,
        deal_id: dealId,
        deal: dealMatch?.deal_name || d.deal_name || d.deal_id || "",
        signed_payment_amount: signed,
        linked: d.linked_to_parent || d.linked || "", // Backward link to parent
        linked_schedule_id: d.linked_schedule_id || "", // Forward link to child
        original_payment_amount: d.original_payment_amount,
        payment_amount: d.payment_amount,
        notes: d.notes || "",
        applied_to: d.applied_to || "",
        active_version: d.active_version !== undefined ? d.active_version : true,
        version_num: d.version_num || 1,
        version_id: d.version_id || `${d.schedule_id || d.id}-V${d.version_num || 1}`,
        term_start: fmtDate(d.term_start), term_end: fmtDate(d.term_end),
        _undo_snapshot: d._undo_snapshot || null,
        previous_version_id: d.previous_version_id || "",
        updated_at: d.updated_at, 
        updated_by: d.updated_by || "",
        rollover: d.rollover || false,
        dist_memo_id: d.dist_memo_id || "",
        id: d.id,
      };
    });

  const PAYMENTS = rawPayments
    .filter(d => {
      if (!forceFilter) return true;
      if (!memberContactId) return false;
      const mId = String(memberContactId).trim();
      const mContact = rawContacts.find(p => String(p.id || "").trim() === mId);
      const mDocId = mContact ? String(mContact.doc_id || mContact.id || "").trim() : "";

      const dPId = String(d.contact_id || d.party_id || "").trim();
      if (dPId === mId || (mDocId && dPId === mDocId)) return true;
      if (d.investment_id) {
        return rawInvestments.some(c => (c.investment_id === d.investment_id || c.id === d.investment_id) && (String(c.contact_id || c.party_id || "").trim() === mId || (mDocId && String(c.contact_id || c.party_id || "").trim() === mDocId)));
      }
      return false;
    })
    .map(d => {
      let dir = d.direction || "Received";
      if (isMember) {
        dir = (dir === "Received") ? "Disbursed" : (dir === "Disbursed" ? "Received" : dir);
      }
      const contactId = d.contact_id || d.party_id || "";
      const contactMatch = rawContacts.find(c => c.id === contactId || c.doc_id === contactId || c.party_id === contactId || c.contact_id === contactId);

      const batchMatch = rawACHBatches.find(b => b.batch_id === d.batch_id);

      return {
        id: d.id, docId: d.doc_id || d.id, _path: d._path,
        display_id: d.schedule_id || d.display_id || d.id || "",
        investment: d.investment_id || "",
        contact: contactMatch?.contact_name || contactMatch?.party_name || d.contact_name || d.party_name || d.contact_id || d.party_id || "",
        contact_id: contactId,
        first_name: contactMatch?.first_name || d.first_name || "",
        last_name: contactMatch?.last_name || d.last_name || "",
        type: d.payment_type || "",
        amount: d.amount,
        date: fmtDate(d.payment_date),
        method: d.payment_method || "",
        direction: dir,
        status: d.status || "Pending",
        batch_id: d.batch_id || "",
        batch_status: batchMatch?.status || "",
        dist_memo_name: batchMatch?.memo || "",
        note: d.notes || ""
      };
    });

  const FEES_DATA = rawFees.map(d => ({
    id: d.id, docId: d.doc_id || d.id, name: d.fee_name || "", fee_type: d.fee_type || "", method: d.calculation_method || "",
    rate: Number(String(d.default_rate).replace(/[^0-9.-]/g, "")) || 0, 
    signed_rate: Number(d.signed_rate) || 0,
    applied_to: d.applied_to || "Principal Amount", direction: d.direction || "IN", fee_charge_at: d.fee_charge_at || "", fee_frequency: d.fee_frequency || "",
    description: d.description || "",
  }));
  const ACH_BATCHES = rawACHBatches.map(d => ({
    id: d.batch_id || d.id, docId: d.doc_id || d.id, _path: d._path, batch_id: d.batch_id || "", status: d.status || "", created_at: fmtDate(d.created_at), updated_at: fmtDate(d.updated_at),
    dist_memo_id: d.dist_memo_id || "", memo: d.memo || ""
  }));
  const LEDGER = rawLedger.map(d => ({
    id: d.ledger_id || d.id, docId: d.doc_id || d.id, _path: d._path, entity_type: d.entity_type || "", entity_id: d.entity_id || "", amount: d.amount || 0, currency: d.currency || "", note: d.notes || d.note || "", user_id: d.user_id || "", created_at: fmtDate(d.created_at),
  }));


  const TENANTS = rawTenants.map(d => {
    const ownerId = d.owner_id || "";
    const tId = d.id || d.tenant_id || "";
    const ownerUser = globalUsers.find(u => 
      u.id === ownerId || 
      (u.user_id === ownerId && u.tenantId === tId)
    );

    return {
      id: d.id || d.tenant_id || "",
      docId: d.doc_id || d.id,
      _path: d._path,
      name: d.tenant_name || "",
      logo: d.tenant_logo || "",
      owner_id: ownerId,
      owner_first_name: ownerUser?.first_name || "",
      owner_last_name: ownerUser?.last_name || "",
      owner_doc_id: ownerUser?.doc_id || ownerUser?.id || "",
      email: d.tenant_email || ownerUser?.email || "",
      phone: d.tenant_phone || ownerUser?.phone || ownerUser?.phone_number || "",
      notes: d.Notes || d.notes || ownerUser?.notes || "",
      features: d.features || { show_payment_lag: true, show_scheduled_payment_date: true },
      created_at: fmtDate(d.created_at),
      updated_at: fmtDate(d.updated_at),
    };
  });

  const activeTenant = useMemo(() => {
    if (activeTenantId) return TENANTS.find(t2 => t2.id === activeTenantId) || null;
    if (isGlobalRole && TENANTS.length > 0) return TENANTS[0];
    return null;
  }, [isGlobalRole, activeTenantId, TENANTS]);

  // Fetch tenant doc directly for non-super-admin users (who don't load the full tenants collection)
  const [myTenant, setMyTenant] = useState(null);
  useEffect(() => {
    if (isSuperAdmin || !activeTenantId || activeTenantId === "GLOBAL") return;
    if (activeTenant) { setMyTenant(null); return; } // Already have it from TENANTS
    getDoc(doc(db, "tenants", activeTenantId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setMyTenant({ id: snap.id, name: d.tenant_name || "", logo: d.tenant_logo || "", features: d.features || { show_payment_lag: true, show_scheduled_payment_date: true } });
      }
    }).catch(() => { });
  }, [activeTenantId, isSuperAdmin, activeTenant]);

  const resolvedTenant = activeTenant || myTenant;
  const determinedLogo = resolvedTenant?.logo || null;
  const determinedTenantName = resolvedTenant?.name || "";
  const tenantFeatures = resolvedTenant?.features || { show_payment_lag: true, show_scheduled_payment_date: true };

  // Merge Firestore dimensions with local styling
  const DIMENSIONS = rawDimensions.map(d => {
    const style = DIM_STYLES[d.category || d.name] || DEFAULT_DIM_STYLE;
    const items = d.options || d.items || [];
    return { name: d.category || d.name || d.id, items, ...style, doc_id: d.id || d.doc_id };
  });

  const nav = getNav(isSuperAdmin, isTenantAdmin, hasPermission, isR10010);

  if (!user) {
    return <LoginScreen login={login} t={t} isDark={isDark} />;
  }

  if (profile?.status === "Inactive") {
    return <InactiveScreen logout={logout} t={t} isDark={isDark} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: t.body, fontFamily: t.font, color: t.text, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&family=Cormorant+Garamond:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"}; }
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translate(-50%, 4px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <div style={{ width: 228, background: t.sidebar, backdropFilter: t.glass ? "blur(20px)" : "none", borderRight: `1px solid ${t.sidebarBorder}`, display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: t.sidebarShadow }}>
        {/* Logo */}
        <div style={{ padding: determinedLogo ? "0 0 20px" : "26px 22px 24px", borderBottom: `1px solid ${t.sidebarBorder}`, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%", justifyContent: "center" }}>
            {determinedLogo ? (
              <img src={determinedLogo} alt="Logo" style={{ width: "100%", height: "auto", maxHeight: 120, objectFit: "contain" }} />
            ) : (<>
              <div style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", justifyContent: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: t.logoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", boxShadow: t.logoShadow, letterSpacing: "-1px" }}>A</div>
                <div>
                  <div style={{ fontFamily: isDark ? "'Syne',sans-serif" : "'Cormorant Garamond',serif", fontWeight: isDark ? 800 : 700, fontSize: isDark ? 14 : 17, color: isDark ? "#fff" : "#1C1917", lineHeight: 1 }}>AVG</div>
                  <div style={{ fontSize: 9.5, color: t.textMuted, letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 2 }}>Cashflow Mgmt</div>
                </div>
              </div>
            </>)}
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ padding: isDark ? "16px 12px" : "0 12px", flex: 1, display: "flex", flexDirection: "column", gap: isDark ? 2 : 1, marginTop: isDark ? 0 : 12, overflowY: "auto" }}>
          {nav.map(item => {
            const isActive = activePage === item.label;
            const isExpanded = expandedMenus[item.label];

            // Expandable parent item
            if (item.expandable && item.children) {
              return (
                <div key={item.label}>
                  {/* Parent item */}
                  <div
                    className="nav-item"
                    onClick={() => setExpandedMenus(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: "transparent",
                      borderLeft: "2px solid transparent",
                      color: t.navText,
                      fontSize: 13.5,
                      fontWeight: 500,
                      cursor: "pointer",
                      position: "relative"
                    }}
                  >
                    <Icon name={item.icon} size={18} color={t.navText} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <ChevronDown size={14} style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.6 }} />
                  </div>

                  {/* Child items */}
                  {isExpanded && item.children.map(child => {
                    const isChildActive = activePage === child.label;
                    return (
                      <div
                        key={child.label}
                        className="nav-item"
                        onClick={() => {
                          setActivePage(child.label);
                          // Clear selectedDealId when navigating to Deals list
                          if (child.label === "Deals") {
                            setSelectedDealId(null);
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px 10px 36px",
                          background: isChildActive ? t.navActive : "transparent",
                          borderLeft: `2px solid ${isChildActive ? t.navActivePill : "transparent"}`,
                          color: isChildActive ? t.navActiveText : t.navText,
                          fontSize: 13,
                          fontWeight: isChildActive ? 600 : 400,
                          cursor: "pointer",
                          position: "relative"
                        }}
                      >
                        {!isDark && isChildActive && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: "0 3px 3px 0", background: t.navActivePill }} />}
                        <Icon name={child.icon} size={16} color={isChildActive ? t.navActiveText : t.navText} />
                        {child.label}
                      </div>
                    );
                  })}
                </div>
              );
            }

            // Regular non-expandable item
            return (
              <div key={item.label} className="nav-item" onClick={() => {
                setActivePage(item.label);
                // Clear selectedDealId when navigating away from Deal Summary
                if (item.label !== "Deal Summary") {
                  setSelectedDealId(null);
                }
              }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: isActive ? t.navActive : "transparent", borderLeft: `2px solid ${isActive ? t.navActivePill : "transparent"}`, color: isActive ? t.navActiveText : t.navText, fontSize: 13.5, fontWeight: isActive ? 600 : 400, position: "relative", cursor: "pointer" }}>
                {!isDark && isActive && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: "0 3px 3px 0", background: t.navActivePill }} />}
                <Icon name={item.icon} size={18} color={isActive ? t.navActiveText : t.navText} />
                {item.label}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: "16px", borderTop: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Tooltip text="View your profile settings" t={t}>
              <div onClick={() => setActivePage("Profile")} style={{ cursor: "pointer", width: isDark ? 32 : 34, height: isDark ? 32 : 34, borderRadius: isDark ? 8 : 9, background: isDark ? "linear-gradient(135deg,#60A5FA,#3B82F6)" : "linear-gradient(135deg,#F472B6,#EC4899)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <User size={18} />
              </div>
            </Tooltip>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isDark ? 11 : 12, fontWeight: isDark ? 500 : 700, color: isDark ? "rgba(255,255,255,0.9)" : "#292524", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(() => {
                  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
                  return fullName ? `${fullName} (${user.email})` : user.email;
                })()}
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.role}{profile?.roleName && profile?.roleName !== profile?.role ? ` - ${profile?.roleName}` : ""}
              </div>
            </div>
            <Tooltip text="Sign out of your account" t={t}>
              <div onClick={logout} style={{ color: "#F87171", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <LogOut size={18} />
              </div>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginRight: helpOpen ? 380 : 0, transition: "margin-right 0.2s ease" }}>
        {/* Topbar */}
        <div style={{ height: 58, borderBottom: `1px solid ${t.topbarBorder}`, background: t.topbar, backdropFilter: t.glass ? "blur(10px)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: t.breadcrumb }}>
            <span>AVG Cashflow</span>
            <span style={{ color: isDark ? "rgba(255,255,255,0.2)" : "#D4D0CB" }}>›</span>
            <span style={{ color: t.breadcrumbActive, fontWeight: 500 }}>{activePage}</span>
            {isSuperAdmin && (
              <div style={{ marginLeft: 20, paddingLeft: 20, borderLeft: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: t.textMuted }}>Viewing Tenant:</span>
                <select
                  value={activeTenantId}
                  onChange={e => setActiveTenantId(e.target.value)}
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "#FDFDFC",
                    border: `1px solid ${t.surfaceBorder}`,
                    color: t.text,
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 500,
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit"
                  }}
                >
                  <option value="" disabled>Select Tenant</option>
                  <option value="GLOBAL" style={{ fontWeight: "bold", color: isDark ? "#34D399" : "#059669" }}>Consolidated (All Tenants)</option>
                  {TENANTS.map(ten => <option key={ten.id} value={ten.id}>{ten.name} ({ten.id})</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12.5, alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setActivePage("Profile")}>
              <span style={{ color: t.text, fontWeight: 500 }}>
                {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email}
              </span>
              <span style={{ color: t.textSecondary }}>Profile</span>
            </span>
            <Tooltip text="Ask AI Assistant" t={t}>
              <button className="theme-toggle" onClick={() => setHelpOpen(true)}
                style={{ background: isDark ? "rgba(139, 92, 246, 0.1)" : "#F3E8FF", color: isDark ? "#A78BFA" : "#7C3AED", border: `1px solid ${isDark ? "rgba(139, 92, 246, 0.25)" : "#E9D5FF"}`, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} /> Ask AI
              </button>
            </Tooltip>
            <Tooltip text={isDark ? "Switch to light theme" : "Switch to dark theme"} t={t}>
              <button className="theme-toggle" onClick={() => setIsDark(!isDark)}
                style={{ background: isDark ? "rgba(52,211,153,0.1)" : "#EEF2FF", color: isDark ? "#34D399" : "#4F46E5", border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#C7D2FE"}`, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
                {isDark ? "Light" : "Dark"}
              </button>
            </Tooltip>
            <Tooltip text="Sign out of your account" t={t}>
              <span onClick={logout} style={{ color: t.logoutText, cursor: "pointer", fontWeight: 500, background: t.logoutBg, padding: "4px 12px", borderRadius: 6, border: `1px solid ${t.logoutBorder}`, fontSize: 12 }}>Logout</span>
            </Tooltip>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
          {showLoading
            ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.textMuted, fontSize: 14 }}>Loading data from Firestore...</div>
            : firstError
              ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                <div style={{ color: isDark ? "#F87171" : "#DC2626", fontSize: 16, fontWeight: 600 }}>Firestore Error</div>
                <div style={{ color: t.textMuted, fontSize: 13, maxWidth: 500, textAlign: "center" }}>{firstError.message || "Failed to load data. Check Firestore security rules."}</div>
                <div style={{ color: t.textSubtle, fontSize: 11, marginTop: 8 }}>Open browser DevTools console (F12) for details</div>
              </div>
              : (
                <>
                  {activePage === "Dashboard" && <PageDashboard t={t} isDark={isDark} DEALS={DEALS} INVESTMENTS={INVESTMENTS} CONTACTS={CONTACTS} SCHEDULES={SCHEDULES} PAYMENTS={PAYMENTS} MONTHLY={MONTHLY} DIMENSIONS={DIMENSIONS} setActivePage={setActivePage} />}
                  {activePage === "Deals" && <PageDeals t={t} isDark={isDark} DEALS={DEALS} INVESTMENTS={INVESTMENTS} SCHEDULES={SCHEDULES} FEES_DATA={FEES_DATA} DIMENSIONS={DIMENSIONS} collectionPath={isGlobalConsolidated ? "GROUP:deals" : fetchPaths.deals} setActivePage={setActivePage} setSelectedDealId={setSelectedDealId} tenantFeatures={tenantFeatures} />}
                  {activePage === "Deal Summary" && <PageDealSummary t={t} isDark={isDark} dealId={selectedDealId} DEALS={DEALS} INVESTMENTS={INVESTMENTS} CONTACTS={CONTACTS} DIMENSIONS={DIMENSIONS} FEES_DATA={FEES_DATA} SCHEDULES={SCHEDULES} USERS={rawUsers} LEDGER={LEDGER} setActivePage={setActivePage} selectedDistMemoId={selectedDistMemoId} setSelectedDistMemoId={setSelectedDistMemoId} investmentCollection={isGlobalConsolidated ? "investments" : fetchPaths.investments} scheduleCollection={isGlobalConsolidated ? "paymentSchedules" : fetchPaths.paymentSchedules} tenantId={activeTenantId} tenantFeatures={tenantFeatures} />}
                  {activePage === "Contacts" && <PageContacts t={t} isDark={isDark} CONTACTS={CONTACTS} INVESTMENTS={INVESTMENTS} SCHEDULES={SCHEDULES} DEALS={DEALS} collectionPath={isGlobalConsolidated ? "GROUP:contacts" : fetchPaths.contacts} DIMENSIONS={DIMENSIONS} tenantId={activeTenantId} LEDGER={LEDGER} USERS={rawUsers} ROLES={rawRoles} />}
                  {activePage === "Investments" && <PageInvestments t={t} isDark={isDark} INVESTMENTS={INVESTMENTS} DEALS={DEALS} CONTACTS={CONTACTS} DIMENSIONS={DIMENSIONS} FEES_DATA={FEES_DATA} SCHEDULES={SCHEDULES} LEDGER={LEDGER} USERS={rawUsers} collectionPath={isGlobalConsolidated ? "GROUP:investments" : fetchPaths.investments} schedulePath={isGlobalConsolidated ? "GROUP:paymentSchedules" : fetchPaths.paymentSchedules} tenantId={activeTenantId} />}
                  {activePage === "Payment Schedule" && <PageSchedule t={t} isDark={isDark} SCHEDULES={SCHEDULES} INVESTMENTS={INVESTMENTS} CONTACTS={CONTACTS} DEALS={DEALS} DIMENSIONS={DIMENSIONS} FEES_DATA={FEES_DATA} USERS={rawUsers} LEDGER={LEDGER} collectionPath={isGlobalConsolidated ? "GROUP:paymentSchedules" : fetchPaths.paymentSchedules} setActivePage={setActivePage} setSelectedDealId={setSelectedDealId} selectedDistMemoId={selectedDistMemoId} setSelectedDistMemoId={setSelectedDistMemoId} tenantId={activeTenantId} />}
                  {activePage === "Payments" && <PagePayments t={t} isDark={isDark} PAYMENTS={PAYMENTS} INVESTMENTS={INVESTMENTS} CONTACTS={CONTACTS} SCHEDULES={SCHEDULES} DEALS={DEALS} DIMENSIONS={DIMENSIONS} ACH_BATCHES={ACH_BATCHES} LEDGER={LEDGER} collectionPath={isGlobalConsolidated ? "GROUP:payments" : fetchPaths.payments} achBatchPath={isGlobalConsolidated ? "GROUP:achBatches" : fetchPaths.achBatches} ledgerPath={isGlobalConsolidated ? "GROUP:ledger" : fetchPaths.ledger} setActivePage={setActivePage} setSelectedDistMemoId={setSelectedDistMemoId} setSelectedDealId={setSelectedDealId} />}
                  {activePage === "Fees" && <PageFees t={t} isDark={isDark} FEES_DATA={FEES_DATA} DIMENSIONS={DIMENSIONS} collectionPath={isGlobalConsolidated ? "GROUP:fees" : fetchPaths.fees} />}
                  {activePage === "Platform Tenant Admin" && <PageTenants t={t} isDark={isDark} TENANTS={TENANTS} GLOBAL_USERS={globalUsers} ROLES={rawRoles} collectionPath={fetchPaths.tenants} />}
                  {activePage === "User Profiles" && <PageUserProfiles t={t} isDark={isDark} USERS={rawUsers} GLOBAL_USERS={globalUsers} ROLES={rawRoles} collectionPath={fetchPaths.users} DIMENSIONS={DIMENSIONS} tenantId={activeTenantId} TENANTS={TENANTS} CONTACTS={CONTACTS} />}
                  {activePage === "Role Types" && <PageRoles t={t} isDark={isDark} collectionPath={fetchPaths.roles} DIMENSIONS={DIMENSIONS} USERS={rawUsers} />}
                                    {activePage === "User Admin" && isR10010 && <PageSuperAdmin t={t} isDark={isDark} DIMENSIONS={DIMENSIONS} ROLES={rawRoles} TENANTS={TENANTS} USERS={rawUsers} tenantId={activeTenantId} />}

                  {activePage === "Profile" && <PageProfile t={t} isDark={isDark} setIsDark={setIsDark} ROLES={rawRoles} collectionPath={fetchPaths.users} activeTenantId={activeTenantId} />}
                  {activePage === "Dimensions" && <PageDimensions t={t} isDark={isDark} DIMENSIONS={DIMENSIONS} rawDimensions={rawDimensions} collectionPath={fetchPaths.dimensions} />}
                  {activePage === "Reports" && <PageReports t={t} isDark={isDark} MONTHLY={MONTHLY} activeTenantId={activeTenantId} />}
                  {activePage === "Marketing emails" && <PageMarketingEmails t={t} isDark={isDark} setActivePage={setActivePage} MARKETING_EMAILS={rawMarketingEmails} setActiveEmailTemplate={setActiveEmailTemplate} activeTenantId={activeTenantId} USERS={rawUsers} CONTACTS={CONTACTS} />}
                  {activePage === "Select Template" && <PageSelectTemplate t={t} isDark={isDark} setActivePage={setActivePage} allTemplates={allTemplates} setActiveEmailTemplate={setActiveEmailTemplate} />}
                  {activePage === "Manage Templates" && <PageManageTemplates t={t} isDark={isDark} setActivePage={setActivePage} setActiveEmailTemplate={setActiveEmailTemplate} allTemplates={allTemplates} loading={loadingTemplates} fetchTemplates={fetchTemplates} />}
                  {activePage === "Email Builder" && <PageEmailBuilder t={t} isDark={isDark} setActivePage={setActivePage} activeEmailTemplate={activeEmailTemplate} setActiveEmailTemplate={setActiveEmailTemplate} refreshTemplates={() => fetchTemplates(true)} activeTenantId={activeTenantId} backTo={prevPage} USERS={rawUsers} CONTACTS={CONTACTS} DIMENSIONS={DIMENSIONS} organizationName={determinedTenantName} />}
                  {activePage === "AI Admin" && <PageAdminHelp t={t} isDark={isDark} />}
                  {activePage === "Company" && <PageCompany t={t} isDark={isDark} activeTenantId={activeTenantId} USERS={rawUsers.sort((a, b) => (a.displayName || a.name || "").localeCompare(b.displayName || b.name || ""))} CONTACTS={CONTACTS} />}
                </>
              )}
        </div>
      </div>
      <SidebarHelp open={helpOpen} onClose={() => setHelpOpen(false)} t={t} isDark={isDark} />
    </div>
  );
}

function InactiveScreen({ logout, t, isDark }) {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "#0C0A09" : "#F5F4F1", color: t.text, fontFamily: t.font, textAlign: "center", padding: 20 }}>
      <div style={{ maxWidth: 400, background: t.surface, padding: 40, borderRadius: 24, border: `1px solid ${t.surfaceBorder}`, boxShadow: t.tableShadow }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <ShieldAlert size={32} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: isDark ? "#fff" : "#1C1917" }}>Account Inactive</h1>
        <p style={{ color: t.textMuted, lineHeight: 1.6, marginBottom: 32, fontSize: 14 }}>Your account has been deactivated by your administrator. Please contact your company's admin or support for assistance.</p>
        <button onClick={logout} style={{ background: t.accentGrad, color: "#fff", padding: "12px 32px", borderRadius: 12, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: `0 4px 12px ${t.accentShadow}` }}>Sign Out</button>
      </div>
    </div>
  );
}

function LoginScreen({ login, t, isDark }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      setError("Invalid credentials");
    }
  };

  const handleResetPassword = async () => {
    if (!email) { setError("Please enter your email address first"); return; }
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
      setError("");
      setResetMsg("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err.code === "auth/user-not-found" ? "No account found with this email" : "Failed to send reset email. Please try again.");
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "#0C0A09" : "#F5F4F1" }}>
      <form onSubmit={handleSubmit} style={{ background: t.surface, padding: 32, borderRadius: 20, width: 360, border: `1px solid ${t.surfaceBorder}`, boxShadow: t.tableShadow }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: isDark ? "#fff" : "#1C1917" }}>Welcome Back</h2>
        <p style={{ fontSize: 13.5, color: t.textMuted, marginBottom: 24 }}>Login to manage your cashflow</p>

        {error && <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {resetMsg && <div style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22C55E", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{resetMsg}</div>}

        <div style={{ display: "grid", gap: 16 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: 12, borderRadius: 10, border: `1px solid ${t.surfaceBorder}`, background: "#fff", color: "#000", outline: "none" }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: 12, borderRadius: 10, border: `1px solid ${t.surfaceBorder}`, background: "#fff", color: "#000", outline: "none" }} />
          <button type="submit" style={{ background: t.accentGrad, color: "#fff", padding: 12, borderRadius: 10, fontWeight: 700, border: "none", cursor: "pointer", marginTop: 8 }}>Sign In</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button type="button" onClick={handleResetPassword} style={{ background: "none", border: "none", color: t.accent, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Forgot password?</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

// ─── Mount ──────────────────────────────────────────────────────────────────────
createRoot(document.getElementById("root")).render(<App />);

/**
 * AVG Cashflow Management — Root App
 * State management, Firestore hooks, data transforms, layout, CSS.
 */
import React, { useState, useMemo, useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { createRoot } from "react-dom/client";
import { db, auth } from "./firebase";
import { useFirestoreCollection } from "./useFirestoreCollection";
import { mkTheme, getNav, getCollectionPaths, DIM_STYLES, DEFAULT_DIM_STYLE, MONTHLY, initials, av } from "./utils";
import PageDashboard from "./pages/PageDashboard";
import PageProjects from "./pages/PageProjects";
import PageParties from "./pages/PageParties";
import PageContracts from "./pages/PageContracts";
import PageSchedule from "./pages/PageSchedule";
import PagePayments from "./pages/PagePayments";
import PageFees from "./pages/PageFees";
import PageTenants from "./pages/PageTenants";
import PageUserProfiles from "./pages/PageUserProfiles";
import PageRoles from "./pages/PageRoles";
import PageSuperAdmin from "./pages/PageSuperAdmin";
import PageProfile from "./pages/PageProfile";
import PageDimensions from "./pages/PageDimensions";
import PageReports from "./pages/PageReports";

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
  const { user, profile, loading: authLoading, login, logout, isSuperAdmin, isTenantAdmin, tenantId, hasPermission } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const [activeTenantId, setActiveTenantId] = useState("");
  const t = mkTheme(isDark);

  useEffect(() => {
    if (tenantId && !activeTenantId) setActiveTenantId(tenantId);
  }, [tenantId]);

  const COLLECTION_PATHS = useMemo(() => getCollectionPaths(activeTenantId), [activeTenantId]);

  // ── Firestore real-time data ──
  // Only fetch if activeTenantId is available
  const shouldFetch = !!activeTenantId;

  const { data: rawProjects, loading: l1, error: e1 } = useFirestoreCollection(shouldFetch ? COLLECTION_PATHS.projects : null);
  const { data: rawParties, loading: l2, error: e2 } = useFirestoreCollection(shouldFetch ? COLLECTION_PATHS.parties : null);
  const { data: rawContracts, loading: l3, error: e3 } = useFirestoreCollection(shouldFetch ? COLLECTION_PATHS.contracts : null);
  const { data: rawSchedules, loading: l4, error: e4 } = useFirestoreCollection(shouldFetch ? COLLECTION_PATHS.paymentSchedules : null);
  const { data: PAYMENTS, loading: l5, error: e5 } = useFirestoreCollection(shouldFetch ? COLLECTION_PATHS.payments : null);
  const { data: rawFees, loading: l6, error: e6 } = useFirestoreCollection(shouldFetch ? COLLECTION_PATHS.fees : null);
  const { data: rawTenants, loading: l8, error: e8 } = useFirestoreCollection(isSuperAdmin ? getCollectionPaths("").tenants : null);
  const { data: rawUsers, loading: l9, error: e9 } = useFirestoreCollection((shouldFetch && (isSuperAdmin || isTenantAdmin)) ? COLLECTION_PATHS.users : null);
  const { data: rawRoles, loading: l10, error: e10 } = useFirestoreCollection((shouldFetch && (isSuperAdmin || isTenantAdmin)) ? COLLECTION_PATHS.roles : null);
  const { data: rawDimensions, loading: l7, error: e7 } = useFirestoreCollection(user ? COLLECTION_PATHS.dimensions : null);

  const loading = authLoading || (shouldFetch && (l1 || l2 || l3 || l4 || l5 || l6)) || ((isSuperAdmin) && l8) || (shouldFetch && (isSuperAdmin || isTenantAdmin) && (l9 || l10)) || (user && l7);

  const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10;

  // Auto-select first tenant for Super Admins if none selected
  useEffect(() => {
    if (isSuperAdmin && !activeTenantId && rawTenants.length > 0) {
      setActiveTenantId(rawTenants[0].id || rawTenants[0].tenant_id || "");
    }
  }, [isSuperAdmin, activeTenantId, rawTenants]);

  // ── Normalize Firestore field names → what UI components expect ──
  const fmtCurr = v => {
    if (v == null || v === "") return "";
    const n = Number(String(v).replace(/[^0-9.-]/g, ""));
    if (isNaN(n)) return String(v);
    return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtDate = v => {
    if (!v) return "";
    if (v.seconds) return new Date(v.seconds * 1000).toISOString().slice(0, 10);
    return String(v);
  };

  const PROJECTS = rawProjects.map(d => ({
    id: d.id,
    docId: d.doc_id || d.id,
    name: d.project_name || "",
    status: d.status || "",
    currency: d.currency || "",
    description: d.description || "",
    created: fmtDate(d.created_at),
    startDate: fmtDate(d.start_date),
    endDate: fmtDate(d.end_date),
    valuation: fmtCurr(d.valuation_amount),
    feeIds: typeof d.fees === "string" && d.fees ? d.fees.split(",").map(s => s.trim()) : [],
  }));

  const PARTIES = rawParties.map(d => ({
    id: d.id, docId: d.doc_id || d.id, name: d.party_name || "", type: d.party_type || "", role: d.role_type || "",
    email: d.email || "", phone: d.phone || "", investor_type: d.investor_type || "",
    address: d.address || "", bank_information: d.bank_information || "", tax_id: d.tax_id || "",
    created_at: fmtDate(d.created_at), updated_at: fmtDate(d.updated_at),
  }));

  const CONTRACTS = rawContracts.map(d => ({
    id: d.contract_id || d.id,
    docId: d.doc_id || d.id,
    contract_id: d.contract_id || "",
    project: d.project_name || d.project_id || "",
    project_id: d.project_id || "",
    party: d.counterparty_name || d.counterparty_id || "",
    party_id: d.counterparty_id || "",
    type: d.contract_type || "",
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
  }));

  const SCHEDULES = rawSchedules.map(d => ({
    id: d.id, docId: d.doc_id || d.id, contract: d.contract_id || "", dueDate: fmtDate(d.due_date),
    type: d.payment_type || "", payment: fmtCurr(d.payment_amount),
    status: d.status || "", direction: d.direction_from_company || "", fee_id: d.fee_id || "",
    party_id: d.party_id || "", period_number: d.period_number != null ? String(d.period_number) : "",
    principal_amount: fmtCurr(d.principal_amount),
    project_id: d.project_id || "",
    signed_payment_amount: fmtCurr(d.signed_payment_amount),
    linked: d.linked_schedule_id || "", notes: d.notes || "",
  }));

  const FEES_DATA = rawFees.map(d => ({
    id: d.id, docId: d.doc_id || d.id, name: d.fee_name || "", fee_type: d.fee_type || "", method: d.calculation_method || "",
    rate: d.default_rate || "", fee_charge_at: d.fee_charge_at || "", fee_frequency: d.fee_frequency || "",
    description: d.description || "",
  }));

  const TENANTS = rawTenants.map(d => ({
    id: d.id || d.tenant_id || "",
    docId: d.doc_id || d.id,
    name: d.tenant_name || "",
    logo: d.tenant_logo || "",
    owner_id: d.owner_id || "",
    email: d.tenant_email || "",
    phone: d.tenant_phone || "",
    notes: d.Notes || "",
    created_at: fmtDate(d.created_at),
    updated_at: fmtDate(d.updated_at),
  }));

  // Merge Firestore dimensions with local styling
  const DIMENSIONS = rawDimensions.map(d => {
    const style = DIM_STYLES[d.category || d.name] || DEFAULT_DIM_STYLE;
    const items = d.options || d.items || [];
    return { name: d.category || d.name || d.id, items, ...style };
  });

  const pageMap = {
    "Dashboard": <PageDashboard t={t} isDark={isDark} PROJECTS={PROJECTS} CONTRACTS={CONTRACTS} PARTIES={PARTIES} SCHEDULES={SCHEDULES} MONTHLY={MONTHLY} />,
    "Projects": <PageProjects t={t} isDark={isDark} PROJECTS={PROJECTS} FEES_DATA={FEES_DATA} collectionPath={COLLECTION_PATHS.projects} />,
    "Parties": <PageParties t={t} isDark={isDark} PARTIES={PARTIES} collectionPath={COLLECTION_PATHS.parties} DIMENSIONS={DIMENSIONS} />,
    "Contracts": <PageContracts t={t} isDark={isDark} CONTRACTS={CONTRACTS} PROJECTS={PROJECTS} PARTIES={PARTIES} DIMENSIONS={DIMENSIONS} FEES_DATA={FEES_DATA} SCHEDULES={SCHEDULES} collectionPath={COLLECTION_PATHS.contracts} schedulePath={COLLECTION_PATHS.paymentSchedules} />,
    "Payment Schedule": <PageSchedule t={t} isDark={isDark} SCHEDULES={SCHEDULES} CONTRACTS={CONTRACTS} DIMENSIONS={DIMENSIONS} FEES_DATA={FEES_DATA} collectionPath={COLLECTION_PATHS.paymentSchedules} />,
    "Payments": <PagePayments t={t} isDark={isDark} PAYMENTS={PAYMENTS} collectionPath={COLLECTION_PATHS.payments} />,
    "Fees": <PageFees t={t} isDark={isDark} FEES_DATA={FEES_DATA} DIMENSIONS={DIMENSIONS} collectionPath={COLLECTION_PATHS.fees} />,
    "Tenants": <PageTenants t={t} isDark={isDark} TENANTS={TENANTS} collectionPath={COLLECTION_PATHS.tenants} />,
    "User Profiles": <PageUserProfiles t={t} isDark={isDark} USERS={rawUsers} ROLES={rawRoles} collectionPath={COLLECTION_PATHS.users} DIMENSIONS={DIMENSIONS} tenantId={activeTenantId} TENANTS={TENANTS} />,
    "Roles": <PageRoles t={t} isDark={isDark} collectionPath={COLLECTION_PATHS.roles} DIMENSIONS={DIMENSIONS} USERS={rawUsers} />,
    "Super Admin": <PageSuperAdmin t={t} isDark={isDark} DIMENSIONS={DIMENSIONS} />,
    "Profile": <PageProfile t={t} isDark={isDark} />,
    "Dimensions": <PageDimensions t={t} isDark={isDark} DIMENSIONS={DIMENSIONS} />,
    "Reports": <PageReports t={t} isDark={isDark} MONTHLY={MONTHLY} />,
  };

  const nav = getNav(isSuperAdmin, isTenantAdmin, hasPermission);

  if (!user) {
    return <LoginScreen login={login} t={t} isDark={isDark} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: t.body, fontFamily: t.font, color: t.text, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&family=Cormorant+Garamond:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${t.scrollTrack}; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 10px; }
        .nav-item   { transition: all 0.18s ease; cursor: pointer; border-radius: 10px; }
        .nav-item:hover { background: ${t.navHover} !important; }
        .data-row   { transition: all 0.18s ease; cursor: pointer; }
        .data-row:hover { background: ${t.rowHover} !important; ${isDark ? "transform:translateX(3px);" : ""} }
        .activity-row { transition: all 0.15s ease; }
        .activity-row:hover { background: ${isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9"} !important; }
        .action-btn { transition: all 0.15s ease; cursor: pointer; background: none; border: none; }
        .action-btn:hover { transform: scale(1.15); opacity: 1 !important; }
        .primary-btn { transition: all 0.2s ease; cursor: pointer; border: none; }
        .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px ${t.accentShadow} !important; }
        .success-btn { transition: all 0.2s ease; cursor: pointer; border: none; }
        .success-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }
        .success-btn:not(:disabled):hover { transform: translateY(-1px); }
        .stat-card  { transition: all 0.2s ease; }
        .stat-card:hover { transform: translateY(-3px); }
        .dim-card   { transition: all 0.2s ease; }
        .dim-card:hover { transform: translateY(-2px); }
        .filter-chip { transition: all 0.15s ease; cursor: pointer; }
        .report-tab { transition: all 0.15s ease; cursor: pointer; }
        .export-btn { transition: all 0.15s ease; }
        .export-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .theme-toggle { transition: all 0.2s ease; cursor: pointer; border: none; }
        .theme-toggle:hover { opacity: 0.85; transform: scale(1.05); }
      `}</style>

      {/* ── Sidebar ── */}
      <div style={{ width: 228, background: t.sidebar, backdropFilter: t.glass ? "blur(20px)" : "none", borderRight: `1px solid ${t.sidebarBorder}`, display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: t.sidebarShadow }}>
        {/* Logo */}
        <div style={{ padding: "26px 22px 24px", borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: t.logoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", boxShadow: t.logoShadow, letterSpacing: "-1px" }}>A</div>
            <div>
              <div style={{ fontFamily: isDark ? "'Syne',sans-serif" : "'Cormorant Garamond',serif", fontWeight: isDark ? 800 : 700, fontSize: isDark ? 14 : 17, color: isDark ? "#fff" : "#1C1917", lineHeight: 1 }}>AVG</div>
              <div style={{ fontSize: 9.5, color: t.textMuted, letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 2 }}>Cashflow Mgmt</div>
            </div>
          </div>
        </div>

        {/* Nav label (light only) */}
        {!isDark && <div style={{ padding: "20px 22px 8px" }}><span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: t.textSubtle }}>Menu</span></div>}

        {/* Nav items */}
        <nav style={{ padding: isDark ? "16px 12px" : "0 12px", flex: 1, display: "flex", flexDirection: "column", gap: isDark ? 2 : 1, marginTop: isDark ? 0 : 12, overflowY: "auto" }}>
          {nav.map(item => {
            const isActive = activePage === item.label;
            return (
              <div key={item.label} className="nav-item" onClick={() => setActivePage(item.label)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: isActive ? t.navActive : "transparent", borderLeft: `2px solid ${isActive ? t.navActivePill : "transparent"}`, color: isActive ? t.navActiveText : t.navText, fontSize: 13.5, fontWeight: isActive ? 600 : 400, position: "relative" }}>
                {!isDark && isActive && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: "0 3px 3px 0", background: t.navActivePill }} />}
                <span style={{ fontSize: 13, opacity: isActive ? 1 : (isDark ? 0.8 : 0.6) }}>{item.icon}</span>
                {item.label}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: "16px", borderTop: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div onClick={() => setActivePage("Profile")} style={{ cursor: "pointer", width: isDark ? 32 : 34, height: isDark ? 32 : 34, borderRadius: isDark ? 8 : 9, background: isDark ? "linear-gradient(135deg,#60A5FA,#3B82F6)" : "linear-gradient(135deg,#F472B6,#EC4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
              {(profile?.name || user.email || "A").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isDark ? 11 : 12, fontWeight: isDark ? 500 : 700, color: isDark ? "rgba(255,255,255,0.9)" : "#292524", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(profile?.user_name || profile?.name) ? `${profile?.user_name || profile?.name} (${user.email})` : user.email}
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.role}{profile?.roleName ? ` - ${profile?.roleName}` : ""}
              </div>
            </div>
            <div onClick={logout} style={{ fontSize: 16, color: "#F87171", cursor: "pointer" }}>⎋</div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
                  {TENANTS.map(ten => <option key={ten.id} value={ten.id}>{ten.name} ({ten.id})</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12.5, alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setActivePage("Profile")}>
              <span style={{ color: t.text, fontWeight: 500 }}>{profile?.user_name || profile?.name || user.email}</span>
              <span style={{ color: t.textSecondary }}>Profile</span>
            </span>
            <button className="theme-toggle" onClick={() => setIsDark(!isDark)}
              style={{ background: isDark ? "rgba(52,211,153,0.1)" : "#EEF2FF", color: isDark ? "#34D399" : "#4F46E5", border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#C7D2FE"}`, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
              {isDark ? "☀ Light" : "☽ Dark"}
            </button>
            <span onClick={logout} style={{ color: t.logoutText, cursor: "pointer", fontWeight: 500, background: t.logoutBg, padding: "4px 12px", borderRadius: 6, border: `1px solid ${t.logoutBorder}`, fontSize: 12 }}>Logout</span>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
          {loading
            ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.textMuted, fontSize: 14 }}>Loading data from Firestore...</div>
            : firstError
              ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                <div style={{ color: isDark ? "#F87171" : "#DC2626", fontSize: 16, fontWeight: 600 }}>Firestore Error</div>
                <div style={{ color: t.textMuted, fontSize: 13, maxWidth: 500, textAlign: "center" }}>{firstError.message || "Failed to load data. Check Firestore security rules."}</div>
                <div style={{ color: t.textSubtle, fontSize: 11, marginTop: 8 }}>Open browser DevTools console (F12) for details</div>
              </div>
              : pageMap[activePage]}
        </div>
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

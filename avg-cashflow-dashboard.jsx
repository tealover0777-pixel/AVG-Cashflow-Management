import { useState } from "react";

// ── Shared shell config ────────────────────────────────────────────────
const navItems = [
  { label: "Dashboard", icon: "⬡" },
  { label: "Projects", icon: "▦" },
  { label: "Parties", icon: "◎" },
  { label: "Contracts", icon: "◈" },
  { label: "Payment Schedule", icon: "▤" },
  { label: "Payments", icon: "◇" },
  { label: "Fees", icon: "◉" },
  { label: "Dimensions", icon: "⊞" },
  { label: "Reports", icon: "╱╲" },
];

const light = {
  body: "#F8F7F4", sidebar: "#FFFFFF", sidebarBorder: "#EAE8E4",
  topbar: "#FFFFFF", topbarBorder: "#EAE8E4",
  surface: "#FFFFFF", surfaceBorder: "#EAE8E4",
  text: "#1C1917", textMuted: "#A8A29E", textSubtle: "#C4C0BA", textSecondary: "#78716C",
  accent: "#4F46E5", accentGrad: "linear-gradient(135deg, #4F46E5, #7C3AED)",
  accentShadow: "rgba(79, 70, 229, 0.25)", logoGrad: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
  logoShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
  navActive: "#EEF2FF", navActiveText: "#4F46E5", navActivePill: "#4F46E5",
  navHover: "rgba(79, 70, 229, 0.06)", navText: "#78716C",
  breadcrumb: "#A8A29E", breadcrumbActive: "#4F46E5",
  searchBg: "#FFFFFF", searchBorder: "#E5E3DF", searchText: "#292524",
  searchFocusBorder: "#A5B4FC", searchFocusShadow: "rgba(165,180,252,0.25)",
  searchPlaceholder: "#A8A29E", searchIcon: "#C4C0BA",
  logoutBg: "#FFF7ED", logoutBorder: "#FED7AA", logoutText: "#C2410C",
  scrollTrack: "#F1F0EE", scrollThumb: "#D1CFC9",
  fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
  titleFont: "'Cormorant Garamond',serif", monoFont: "'JetBrains Mono',monospace",
  glass: false, sidebarShadow: "2px 0 12px rgba(0,0,0,0.04)",
};

const dark = {
  body: "radial-gradient(ellipse at 20% 50%, #0d1f2d 0%, #080f1a 60%, #050c15 100%)",
  sidebar: "rgba(255,255,255,0.03)", sidebarBorder: "rgba(255,255,255,0.06)",
  topbar: "rgba(255,255,255,0.02)", topbarBorder: "rgba(255,255,255,0.06)",
  surface: "rgba(255,255,255,0.02)", surfaceBorder: "rgba(255,255,255,0.07)",
  text: "#e2e8f0", textMuted: "rgba(255,255,255,0.35)", textSubtle: "rgba(255,255,255,0.3)",
  textSecondary: "rgba(255,255,255,0.4)",
  accent: "#34D399", accentGrad: "linear-gradient(135deg, #34D399, #059669)",
  accentShadow: "rgba(52,211,153,0.35)", logoGrad: "linear-gradient(135deg, #34D399, #059669)",
  logoShadow: "0 4px 12px rgba(52,211,153,0.3)",
  navActive: "rgba(52,211,153,0.1)", navActiveText: "#34D399", navActivePill: "#34D399",
  navHover: "rgba(255,255,255,0.07)", navText: "rgba(255,255,255,0.5)",
  breadcrumb: "rgba(255,255,255,0.3)", breadcrumbActive: "#34D399",
  searchBg: "rgba(255,255,255,0.05)", searchBorder: "rgba(255,255,255,0.1)", searchText: "#fff",
  searchFocusBorder: "rgba(52,211,153,0.5)", searchFocusShadow: "rgba(52,211,153,0.1)",
  searchPlaceholder: "rgba(255,255,255,0.3)", searchIcon: "rgba(255,255,255,0.3)",
  logoutBg: "rgba(248,113,113,0.1)", logoutBorder: "rgba(248,113,113,0.2)", logoutText: "#F87171",
  scrollTrack: "transparent", scrollThumb: "rgba(255,255,255,0.1)",
  fontFamily: "'DM Sans','Segoe UI',sans-serif",
  titleFont: "'Syne',sans-serif", monoFont: "'JetBrains Mono',monospace",
  glass: true, sidebarShadow: "none",
};

// ── Mock data ──────────────────────────────────────────────────────────
const summary = {
  totalContracts: 42, activeContracts: 38,
  totalParties: 20, totalProjects: 7,
  paymentsThisMonth: 12, totalInvested: 4820000,
  overdue: 3, paidThisMonth: 9,
};

const recentActivity = [
  { id: "PS10082", type: "Payment", desc: "Monthly interest — C10012", date: "2026-02-15", status: "Paid", amount: "+$18,400" },
  { id: "PS10081", type: "Payment", desc: "Quarterly interest — C10009", date: "2026-02-14", status: "Due", amount: "$22,750" },
  { id: "C10014", type: "Contract", desc: "New contract added for Kies Capital Group", date: "2026-02-12", status: "Active", amount: "$500,000" },
  { id: "PS10079", type: "Payment", desc: "Monthly interest — C10007", date: "2026-02-10", status: "Missed", amount: "$9,600" },
  { id: "P10007", type: "Project", desc: "Palm Springs project updated", date: "2026-02-08", status: "Active", amount: "" },
];

const upcomingPayments = [
  { id: "PS10085", contract: "C10003", party: "Pao Fu Chen", amount: "$21,000", due: "2026-02-28", type: "Interest" },
  { id: "PS10086", contract: "C10005", party: "Tina Lee", amount: "$8,500", due: "2026-02-28", type: "Interest" },
  { id: "PS10087", contract: "C10011", party: "Mong Tung Lee", amount: "$14,200", due: "2026-03-01", type: "Interest" },
  { id: "PS10088", contract: "C10002", party: "Kies Capital Group", amount: "$31,250", due: "2026-03-15", type: "Principal" },
];

const statusColor = (status, isDark) => ({
  Paid:    { bg: isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5", color: isDark ? "#34D399" : "#059669", border: isDark ? "rgba(52,211,153,0.3)" : "#A7F3D0" },
  Active:  { bg: isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF", color: isDark ? "#60A5FA" : "#2563EB", border: isDark ? "rgba(96,165,250,0.3)" : "#BFDBFE" },
  Due:     { bg: isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB", color: isDark ? "#FBBF24" : "#D97706", border: isDark ? "rgba(251,191,36,0.3)" : "#FDE68A" },
  Missed:  { bg: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: isDark ? "rgba(248,113,113,0.3)" : "#FECACA" },
  Closed:  { bg: isDark ? "rgba(255,255,255,0.08)" : "#F9FAFB", color: isDark ? "rgba(255,255,255,0.4)" : "#6B7280", border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB" },
})[status] || { bg: "transparent", color: "#888", border: "#ccc" };

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const t = isDark ? dark : light;

  const statCards = [
    { label: "Active Contracts", value: summary.activeContracts, icon: "◈", accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
    { label: "Total Parties", value: summary.totalParties, icon: "◎", accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
    { label: "Payments Due", value: summary.paymentsThisMonth, icon: "▤", accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" },
    { label: "Overdue", value: summary.overdue, icon: "◉", accent: isDark ? "#F87171" : "#DC2626", bg: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2", border: isDark ? "rgba(248,113,113,0.15)" : "#FECACA" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: t.body, fontFamily: t.fontFamily, color: t.text, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&family=Cormorant+Garamond:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${t.scrollTrack}; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 10px; }
        .nav-item { transition: all 0.18s ease; cursor: pointer; border-radius: 10px; }
        .nav-item:hover { background: ${t.navHover} !important; }
        .stat-card { transition: all 0.2s ease; }
        .stat-card:hover { transform: translateY(-3px); }
        .activity-row { transition: all 0.15s ease; }
        .activity-row:hover { background: ${isDark ? "rgba(255,255,255,0.03)" : "#FAFAF9"} !important; }
        .theme-toggle { transition: all 0.2s ease; cursor: pointer; border: none; }
        .theme-toggle:hover { opacity: 0.85; transform: scale(1.05); }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 228, background: t.sidebar, backdropFilter: t.glass ? "blur(20px)" : "none", borderRight: `1px solid ${t.sidebarBorder}`, display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: t.sidebarShadow }}>
        <div style={{ padding: "26px 22px 24px", borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: t.logoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", boxShadow: t.logoShadow, letterSpacing: "-1px" }}>A</div>
            <div>
              <div style={{ fontFamily: isDark ? "'Syne',sans-serif" : "'Cormorant Garamond',serif", fontWeight: isDark ? 800 : 700, fontSize: isDark ? 14 : 17, color: isDark ? "#fff" : "#1C1917", letterSpacing: isDark ? "-0.3px" : "-0.5px", lineHeight: 1 }}>AVG</div>
              <div style={{ fontSize: 9.5, color: t.textMuted, letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 2 }}>Cashflow Mgmt</div>
            </div>
          </div>
        </div>
        {!isDark && <div style={{ padding: "20px 22px 8px" }}><span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: t.textSubtle }}>Menu</span></div>}
        <nav style={{ padding: isDark ? "16px 12px" : "0 12px", flex: 1, display: "flex", flexDirection: "column", gap: isDark ? 2 : 1, marginTop: isDark ? 0 : 12 }}>
          {navItems.map(item => {
            const isActive = activeNav === item.label;
            return (
              <div key={item.label} className="nav-item" onClick={() => setActiveNav(item.label)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: isActive ? t.navActive : "transparent", borderLeft: `2px solid ${isActive ? t.navActivePill : "transparent"}`, color: isActive ? t.navActiveText : t.navText, fontSize: 13.5, fontWeight: isActive ? 600 : 400, position: "relative" }}>
                {!isDark && isActive && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: "0 3px 3px 0", background: t.navActivePill }} />}
                <span style={{ fontSize: 13, opacity: isActive ? 1 : (isDark ? 0.8 : 0.6) }}>{item.icon}</span>
                {item.label}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "16px", borderTop: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: isDark ? 32 : 34, height: isDark ? 32 : 34, borderRadius: isDark ? 8 : 9, background: isDark ? "linear-gradient(135deg,#60A5FA,#3B82F6)" : "linear-gradient(135deg,#F472B6,#EC4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>AD</div>
            <div>
              <div style={{ fontSize: isDark ? 12 : 13, fontWeight: isDark ? 500 : 600, color: isDark ? "rgba(255,255,255,0.8)" : "#292524" }}>Admin</div>
              <div style={{ fontSize: isDark ? 10 : 11, color: t.textMuted }}>Super User</div>
            </div>
            {!isDark && <div style={{ marginLeft: "auto", fontSize: 16, color: t.textSubtle, cursor: "pointer" }}>⋯</div>}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ height: 58, borderBottom: `1px solid ${t.topbarBorder}`, background: t.topbar, backdropFilter: t.glass ? "blur(10px)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: t.breadcrumb }}>
            <span>AVG Cashflow</span>
            <span style={{ color: isDark ? "rgba(255,255,255,0.2)" : "#D4D0CB" }}>›</span>
            <span style={{ color: t.breadcrumbActive, fontWeight: 500 }}>Dashboard</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12.5, alignItems: "center" }}>
            <span style={{ color: t.textSecondary, cursor: "pointer" }}>Profile</span>
            <span style={{ color: t.textSecondary, cursor: "pointer" }}>Settings</span>
            <button className="theme-toggle" onClick={() => setIsDark(!isDark)} style={{ background: isDark ? "rgba(52,211,153,0.1)" : "#EEF2FF", color: isDark ? "#34D399" : "#4F46E5", border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#C7D2FE"}`, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
              {isDark ? "☀ Light" : "☽ Dark"}
            </button>
            <span style={{ color: t.logoutText, cursor: "pointer", fontWeight: 500, background: t.logoutBg, padding: "4px 12px", borderRadius: 6, border: `1px solid ${t.logoutBorder}`, fontSize: 12 }}>Logout</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>

          {/* Page Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: t.titleFont, fontWeight: isDark ? 800 : 700, fontSize: isDark ? 30 : 38, color: isDark ? "#fff" : "#1C1917", letterSpacing: isDark ? "-1px" : "-1.5px", lineHeight: 1, marginBottom: 6 }}>Dashboard</h1>
            <p style={{ fontSize: 13.5, color: t.textMuted }}>Welcome to AVG Cashflow Management</p>
          </div>

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            {statCards.map(s => (
              <div key={s.label} className="stat-card" style={{ background: s.bg, borderRadius: 14, padding: "20px 22px", border: `1px solid ${s.border}`, backdropFilter: t.glass ? "blur(10px)" : "none", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</span>
                  {!isDark && <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: s.accent }}>{s.icon}</div>}
                </div>
                <div style={{ fontFamily: t.titleFont, fontSize: isDark ? 28 : 36, fontWeight: isDark ? 800 : 700, color: s.accent, lineHeight: 1, letterSpacing: isDark ? "-0.5px" : "-1px" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Total Invested Banner */}
          <div style={{ background: t.accentGrad, borderRadius: 14, padding: "20px 28px", marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 4px 20px ${t.accentShadow}` }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Total Capital Under Management</div>
              <div style={{ fontFamily: t.titleFont, fontSize: 36, fontWeight: isDark ? 800 : 700, color: isDark ? "#050c15" : "#fff", letterSpacing: "-1.5px", lineHeight: 1 }}>
                ${summary.totalInvested.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)", marginBottom: 4 }}>{summary.paidThisMonth} payments collected this month</div>
              <div style={{ fontFamily: t.monoFont, fontSize: 13, color: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.9)", fontWeight: 600 }}>{summary.totalProjects} active projects</div>
            </div>
          </div>

          {/* Two columns: Recent Activity + Upcoming Payments */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* Recent Activity */}
            <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", backdropFilter: t.glass ? "blur(20px)" : "none" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>Recent Activity</span>
                <span style={{ fontSize: 11, color: t.accent, cursor: "pointer", fontWeight: 500 }}>View all →</span>
              </div>
              {recentActivity.map((item, i) => {
                const sc = statusColor(item.status, isDark);
                return (
                  <div key={item.id} className="activity-row" style={{ padding: "12px 20px", borderBottom: i < recentActivity.length - 1 ? `1px solid ${t.surfaceBorder}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: sc.bg, border: `1px solid ${sc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: sc.color, flexShrink: 0 }}>
                      {item.type === "Payment" ? "▤" : item.type === "Contract" ? "◈" : "▦"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.desc}</div>
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2, fontFamily: t.monoFont }}>{item.id} · {item.date}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {item.amount && <div style={{ fontSize: 12, fontWeight: 600, color: sc.color }}>{item.amount}</div>}
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{item.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upcoming Payments */}
            <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", backdropFilter: t.glass ? "blur(20px)" : "none" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>Upcoming Payments</span>
                <span style={{ fontSize: 11, color: t.accent, cursor: "pointer", fontWeight: 500 }}>View all →</span>
              </div>
              {upcomingPayments.map((item, i) => (
                <div key={item.id} className="activity-row" style={{ padding: "12px 20px", borderBottom: i < upcomingPayments.length - 1 ? `1px solid ${t.surfaceBorder}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? "rgba(251,191,36,0.12)" : "#FFFBEB", border: `1px solid ${isDark ? "rgba(251,191,36,0.25)" : "#FDE68A"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: isDark ? "#FBBF24" : "#D97706", flexShrink: 0 }}>▤</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917" }}>{item.party}</div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2, fontFamily: t.monoFont }}>{item.contract} · {item.type}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: isDark ? "#FBBF24" : "#D97706" }}>{item.amount}</div>
                    <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 2 }}>Due {item.due}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

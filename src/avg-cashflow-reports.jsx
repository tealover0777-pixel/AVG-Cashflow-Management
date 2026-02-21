import { useState } from "react";

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
  accentShadow: "rgba(79,70,229,0.25)", logoGrad: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
  logoShadow: "0 4px 14px rgba(79,70,229,0.35)",
  navActive: "#EEF2FF", navActiveText: "#4F46E5", navActivePill: "#4F46E5",
  navHover: "rgba(79,70,229,0.06)", navText: "#78716C",
  breadcrumb: "#A8A29E", breadcrumbActive: "#4F46E5",
  logoutBg: "#FFF7ED", logoutBorder: "#FED7AA", logoutText: "#C2410C",
  scrollTrack: "#F1F0EE", scrollThumb: "#D1CFC9",
  barTrack: "#F1F0EE", rowDivider: "#F5F4F1",
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
  logoutBg: "rgba(248,113,113,0.1)", logoutBorder: "rgba(248,113,113,0.2)", logoutText: "#F87171",
  scrollTrack: "transparent", scrollThumb: "rgba(255,255,255,0.1)",
  barTrack: "rgba(255,255,255,0.06)", rowDivider: "rgba(255,255,255,0.04)",
  fontFamily: "'DM Sans','Segoe UI',sans-serif",
  titleFont: "'Syne',sans-serif", monoFont: "'JetBrains Mono',monospace",
  glass: true, sidebarShadow: "none",
};

// Monthly cashflow data (last 8 months)
const monthlyData = [
  { month: "Jul", received: 48200, disbursed: 0 },
  { month: "Aug", received: 52400, disbursed: 25000 },
  { month: "Sep", received: 61500, disbursed: 0 },
  { month: "Oct", received: 44800, disbursed: 18000 },
  { month: "Nov", received: 57200, disbursed: 0 },
  { month: "Dec", received: 463583, disbursed: 0 }, // includes principal repayment
  { month: "Jan", received: 51000, disbursed: 0 },
  { month: "Feb", received: 10358, disbursed: 25000 },
];

// Capital by project
const projectData = [
  { name: "Palm Springs Villas", total: 810000, pct: 100 },
  { name: "Irvine Office Complex", total: 1850000, pct: 100 },
  { name: "San Diego Condo", total: 320000, pct: 100 },
  { name: "Beverly Hills Estate", total: 500000, pct: 100 },
  { name: "Santa Monica Retail", total: 270000, pct: 100 },
  { name: "Anaheim Hotel (Closed)", total: 0, pct: 100 },
];
const projectMax = Math.max(...projectData.map(p => p.total));

// Investor breakdown
const investorData = [
  { name: "Kies Capital Group", amount: 1250000, pct: 26, role: "Borrower" },
  { name: "Hsiu Ju Hsu Properties", amount: 600000, pct: 12, role: "Investor" },
  { name: "Suet Fong Yu Ho", amount: 500000, pct: 10, role: "Investor" },
  { name: "Pao Fu Chen", amount: 450000, pct: 9, role: "Investor" },
  { name: "Edward R. Brodersen", amount: 200000, pct: 4, role: "Investor" },
  { name: "Others (15)", amount: 1820000, pct: 38, role: "Mixed" },
];

const reportTabs = ["Cashflow", "Capital", "Investors"];

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeNav, setActiveNav] = useState("Reports");
  const [activeTab, setActiveTab] = useState("Cashflow");
  const t = isDark ? dark : light;

  const maxBar = Math.max(...monthlyData.map(d => Math.max(d.received, d.disbursed)));
  const totalReceived = monthlyData.reduce((s, d) => s + d.received, 0);
  const totalDisbursed = monthlyData.reduce((s, d) => s + d.disbursed, 0);

  const kpiCards = [
    { label: "Total Capital Deployed", value: "$4,820,000", sub: "Across 7 projects", accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
    { label: "Cash Received (YTD)", value: `$${totalReceived.toLocaleString()}`, sub: "Interest + principal", accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
    { label: "Avg Interest Rate", value: "9.85%", sub: "Weighted across contracts", accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" },
    { label: "Collection Rate", value: "94.2%", sub: "Paid vs scheduled", accent: isDark ? "#A78BFA" : "#7C3AED", bg: isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE" },
  ];

  const projectColors = [
    isDark ? "#60A5FA" : "#3B82F6",
    isDark ? "#34D399" : "#059669",
    isDark ? "#FBBF24" : "#D97706",
    isDark ? "#A78BFA" : "#7C3AED",
    isDark ? "#F472B6" : "#BE185D",
    isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB",
  ];

  const investorColors = [
    isDark ? "#F87171" : "#DC2626",
    isDark ? "#60A5FA" : "#3B82F6",
    isDark ? "#34D399" : "#059669",
    isDark ? "#FBBF24" : "#D97706",
    isDark ? "#A78BFA" : "#7C3AED",
    isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB",
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
        .report-tab { transition: all 0.18s ease; cursor: pointer; }
        .theme-toggle { transition: all 0.2s ease; cursor: pointer; border: none; }
        .theme-toggle:hover { opacity: 0.85; transform: scale(1.05); }
        .export-btn { transition: all 0.15s ease; cursor: pointer; border: none; }
        .export-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 228, background: t.sidebar, backdropFilter: t.glass ? "blur(20px)" : "none", borderRight: `1px solid ${t.sidebarBorder}`, display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: t.sidebarShadow }}>
        <div style={{ padding: "26px 22px 24px", borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: t.logoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", boxShadow: t.logoShadow }}>A</div>
            <div>
              <div style={{ fontFamily: isDark ? "'Syne',sans-serif" : "'Cormorant Garamond',serif", fontWeight: isDark ? 800 : 700, fontSize: isDark ? 14 : 17, color: isDark ? "#fff" : "#1C1917", lineHeight: 1 }}>AVG</div>
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
        <div style={{ height: 58, borderBottom: `1px solid ${t.topbarBorder}`, background: t.topbar, backdropFilter: t.glass ? "blur(10px)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: t.breadcrumb }}>
            <span>AVG Cashflow</span>
            <span style={{ color: isDark ? "rgba(255,255,255,0.2)" : "#D4D0CB" }}>›</span>
            <span style={{ color: t.breadcrumbActive, fontWeight: 500 }}>Reports</span>
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

        <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
          {/* Header */}
          <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ fontFamily: t.titleFont, fontWeight: isDark ? 800 : 700, fontSize: isDark ? 30 : 38, color: isDark ? "#fff" : "#1C1917", letterSpacing: isDark ? "-1px" : "-1.5px", lineHeight: 1, marginBottom: 6 }}>Reports</h1>
              <p style={{ fontSize: 13.5, color: t.textMuted }}>Analytics and financial summaries</p>
            </div>
            <button className="export-btn" style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}>
              ↓ Export PDF
            </button>
          </div>

          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            {kpiCards.map(s => (
              <div key={s.label} className="stat-card" style={{ background: s.bg, borderRadius: 14, padding: "20px 22px", border: `1px solid ${s.border}`, backdropFilter: t.glass ? "blur(10px)" : "none", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</span>
                <div style={{ fontFamily: t.titleFont, fontSize: isDark ? 22 : 26, fontWeight: isDark ? 800 : 700, color: s.accent, lineHeight: 1, letterSpacing: "-0.5px" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Report Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: isDark ? "rgba(255,255,255,0.04)" : "#F1F0EE", padding: 4, borderRadius: 10, width: "fit-content" }}>
            {reportTabs.map(tab => (
              <div key={tab} className="report-tab" onClick={() => setActiveTab(tab)} style={{ padding: "7px 18px", borderRadius: 8, fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, background: activeTab === tab ? (isDark ? "rgba(52,211,153,0.15)" : "#fff") : "transparent", color: activeTab === tab ? t.accent : t.textSecondary, border: activeTab === tab ? `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#E5E3DF"}` : "1px solid transparent", boxShadow: activeTab === tab ? (isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)") : "none" }}>
                {tab}
              </div>
            ))}
          </div>

          {/* ── Cashflow Tab ── */}
          {activeTab === "Cashflow" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Bar chart */}
              <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: "20px", backdropFilter: t.glass ? "blur(20px)" : "none", gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>Monthly Cashflow</div>
                    <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 2 }}>Jul 2025 – Feb 2026</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: isDark ? "#34D399" : "#059669" }} />
                      <span style={{ color: t.textMuted }}>Received</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: isDark ? "#F87171" : "#DC2626" }} />
                      <span style={{ color: t.textMuted }}>Disbursed</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 140 }}>
                  {monthlyData.map(d => {
                    const recH = maxBar > 0 ? (d.received / maxBar) * 120 : 0;
                    const disH = maxBar > 0 ? (d.disbursed / maxBar) * 120 : 0;
                    return (
                      <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 120 }}>
                          <div style={{ width: "45%", height: recH, borderRadius: "4px 4px 0 0", background: isDark ? "rgba(52,211,153,0.7)" : "#059669", minHeight: recH > 0 ? 3 : 0, transition: "height 0.3s ease" }} title={`$${d.received.toLocaleString()}`} />
                          <div style={{ width: "45%", height: disH, borderRadius: "4px 4px 0 0", background: isDark ? "rgba(248,113,113,0.7)" : "#DC2626", minHeight: disH > 0 ? 3 : 0, transition: "height 0.3s ease" }} title={`$${d.disbursed.toLocaleString()}`} />
                        </div>
                        <div style={{ fontSize: 10.5, color: t.textMuted, fontFamily: t.monoFont }}>{d.month}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary totals */}
              <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: "20px", backdropFilter: t.glass ? "blur(20px)" : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 16 }}>Period Summary</div>
                {[
                  { label: "Total Received", value: `$${totalReceived.toLocaleString()}`, color: isDark ? "#34D399" : "#059669" },
                  { label: "Total Disbursed", value: `$${totalDisbursed.toLocaleString()}`, color: isDark ? "#F87171" : "#DC2626" },
                  { label: "Net Cashflow", value: `$${(totalReceived - totalDisbursed).toLocaleString()}`, color: isDark ? "#FBBF24" : "#D97706" },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${t.rowDivider}` : "none" }}>
                    <span style={{ fontSize: 12.5, color: t.textMuted }}>{row.label}</span>
                    <span style={{ fontFamily: t.monoFont, fontSize: 14, fontWeight: 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Payment type breakdown */}
              <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: "20px", backdropFilter: t.glass ? "blur(20px)" : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 16 }}>By Payment Type</div>
                {[
                  { label: "Interest", pct: 72, color: isDark ? "#60A5FA" : "#3B82F6" },
                  { label: "Principal", pct: 24, color: isDark ? "#34D399" : "#059669" },
                  { label: "Fees", pct: 4, color: isDark ? "#FBBF24" : "#D97706" },
                ].map(row => (
                  <div key={row.label} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, color: t.textMuted }}>{row.label}</span>
                      <span style={{ fontFamily: t.monoFont, fontSize: 12, fontWeight: 600, color: row.color }}>{row.pct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 6, background: t.barTrack, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${row.pct}%`, borderRadius: 6, background: row.color, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Capital Tab ── */}
          {activeTab === "Capital" && (
            <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: "20px", backdropFilter: t.glass ? "blur(20px)" : "none" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 20 }}>Capital Deployed by Project</div>
              {projectData.map((p, i) => {
                const color = projectColors[i];
                const barPct = projectMax > 0 ? (p.total / projectMax) * 100 : 0;
                return (
                  <div key={p.name} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.8)" : "#44403C" }}>{p.name}</span>
                      <span style={{ fontFamily: t.monoFont, fontSize: 12.5, fontWeight: 700, color }}>${p.total.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 8, background: t.barTrack, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${barPct}%`, borderRadius: 8, background: color, transition: "width 0.4s ease", opacity: p.total === 0 ? 0.2 : 1 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Investors Tab ── */}
          {activeTab === "Investors" && (
            <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, padding: "20px", backdropFilter: t.glass ? "blur(20px)" : "none" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 20 }}>Capital by Party</div>
              {investorData.map((inv, i) => {
                const color = investorColors[i];
                return (
                  <div key={inv.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < investorData.length - 1 ? `1px solid ${t.rowDivider}` : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}22`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color, flexShrink: 0 }}>
                      {inv.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917", marginBottom: 4 }}>{inv.name}</div>
                      <div style={{ height: 5, borderRadius: 5, background: t.barTrack, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${inv.pct}%`, borderRadius: 5, background: color }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: t.monoFont, fontSize: 13, fontWeight: 700, color }}>${inv.amount.toLocaleString()}</div>
                      <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 2 }}>{inv.pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

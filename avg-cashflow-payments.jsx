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
  tableHeader: "#FAFAF9", rowDivider: "#F5F4F1", rowHover: "#FAFAF9",
  text: "#1C1917", textMuted: "#A8A29E", textSubtle: "#C4C0BA", textSecondary: "#78716C",
  accent: "#4F46E5", accentGrad: "linear-gradient(135deg, #4F46E5, #7C3AED)",
  accentShadow: "rgba(79,70,229,0.25)", logoGrad: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
  logoShadow: "0 4px 14px rgba(79,70,229,0.35)",
  navActive: "#EEF2FF", navActiveText: "#4F46E5", navActivePill: "#4F46E5",
  navHover: "rgba(79,70,229,0.06)", navText: "#78716C",
  breadcrumb: "#A8A29E", breadcrumbActive: "#4F46E5",
  searchBg: "#FFFFFF", searchBorder: "#E5E3DF", searchText: "#292524",
  searchFocusBorder: "#A5B4FC", searchFocusShadow: "rgba(165,180,252,0.25)",
  searchPlaceholder: "#A8A29E", searchIcon: "#C4C0BA",
  idText: "#C4C0BA", editBtnBg: "#EEF2FF", editBtnColor: "#4F46E5",
  deleteBtnBg: "#FEF2F2", deleteBtnColor: "#DC2626",
  logoutBg: "#FFF7ED", logoutBorder: "#FED7AA", logoutText: "#C2410C",
  pageBtnActive: "#4F46E5", pageBtnActiveTxt: "#fff",
  pageBtnBg: "#FFFFFF", pageBtnBorder: "#E5E3DF", pageBtnText: "#78716C",
  scrollTrack: "#F1F0EE", scrollThumb: "#D1CFC9",
  fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
  titleFont: "'Cormorant Garamond',serif", monoFont: "'JetBrains Mono',monospace",
  glass: false, sidebarShadow: "2px 0 12px rgba(0,0,0,0.04)", tableShadow: "0 2px 12px rgba(0,0,0,0.05)",
};

const dark = {
  body: "radial-gradient(ellipse at 20% 50%, #0d1f2d 0%, #080f1a 60%, #050c15 100%)",
  sidebar: "rgba(255,255,255,0.03)", sidebarBorder: "rgba(255,255,255,0.06)",
  topbar: "rgba(255,255,255,0.02)", topbarBorder: "rgba(255,255,255,0.06)",
  surface: "rgba(255,255,255,0.02)", surfaceBorder: "rgba(255,255,255,0.07)",
  tableHeader: "rgba(255,255,255,0.04)", rowDivider: "rgba(255,255,255,0.04)", rowHover: "rgba(255,255,255,0.04)",
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
  idText: "rgba(255,255,255,0.35)", editBtnBg: "rgba(96,165,250,0.12)", editBtnColor: "#60A5FA",
  deleteBtnBg: "rgba(248,113,113,0.12)", deleteBtnColor: "#F87171",
  logoutBg: "rgba(248,113,113,0.1)", logoutBorder: "rgba(248,113,113,0.2)", logoutText: "#F87171",
  pageBtnActive: "#34D399", pageBtnActiveTxt: "#050c15",
  pageBtnBg: "rgba(255,255,255,0.04)", pageBtnBorder: "rgba(255,255,255,0.08)", pageBtnText: "rgba(255,255,255,0.5)",
  scrollTrack: "transparent", scrollThumb: "rgba(255,255,255,0.1)",
  fontFamily: "'DM Sans','Segoe UI',sans-serif",
  titleFont: "'Syne',sans-serif", monoFont: "'JetBrains Mono',monospace",
  glass: true, sidebarShadow: "none", tableShadow: "none",
};

// Actual cash payments received/disbursed (different from scheduled entries)
const payments = [
  { id: "PAY10000", schedule: "PS10052", contract: "C10002", party: "Kies Capital Group", type: "Interest", amount: "$8,333", date: "2026-02-28", method: "Wire", direction: "Received", note: "" },
  { id: "PAY10001", schedule: "PS10055", contract: "C10006", party: "Kolina Lee", type: "Interest", amount: "$2,025", date: "2026-01-31", method: "Check", direction: "Received", note: "" },
  { id: "PAY10002", schedule: "PS10059", contract: "C10000", party: "Pao Fu Chen", type: "Principal", amount: "$450,000", date: "2025-12-31", method: "Wire", direction: "Received", note: "Full repayment" },
  { id: "PAY10003", schedule: "PS10045", contract: "C10003", party: "Tina Lee", type: "Interest", amount: "$2,667", date: "2025-12-31", method: "ACH", direction: "Received", note: "" },
  { id: "PAY10004", schedule: "PS10038", contract: "C10001", party: "Edward R. Brodersen", type: "Interest", amount: "$1,583", date: "2025-11-30", method: "Wire", direction: "Received", note: "" },
  { id: "PAY10005", schedule: "", contract: "C10005", party: "Gilberto", type: "Fee", amount: "$500", date: "2025-11-15", method: "Check", direction: "Received", note: "Late payment fee" },
  { id: "PAY10006", schedule: "PS10022", contract: "C10008", party: "Hsiu Ju Hsu Properties", type: "Interest", amount: "$5,500", date: "2025-09-30", method: "Wire", direction: "Received", note: "" },
  { id: "PAY10007", schedule: "", contract: "", party: "Palm Springs Villas", type: "Disbursement", amount: "$25,000", date: "2026-02-10", method: "Wire", direction: "Disbursed", note: "Construction draw #4" },
];

const typeCfg = (type, isDark) => ({
  Interest:     { bg: isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF", color: isDark ? "#60A5FA" : "#2563EB", border: isDark ? "rgba(96,165,250,0.3)" : "#BFDBFE" },
  Principal:    { bg: isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5", color: isDark ? "#34D399" : "#059669", border: isDark ? "rgba(52,211,153,0.3)" : "#A7F3D0" },
  Fee:          { bg: isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB", color: isDark ? "#FBBF24" : "#D97706", border: isDark ? "rgba(251,191,36,0.3)" : "#FDE68A" },
  Disbursement: { bg: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: isDark ? "rgba(248,113,113,0.3)" : "#FECACA" },
})[type] || { bg: "transparent", color: "#888", border: "#ccc" };

const filters = ["All", "Received", "Disbursed"];

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeNav, setActiveNav] = useState("Payments");
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const t = isDark ? dark : light;

  const filtered = payments.filter(p => {
    const matchSearch = p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.party.toLowerCase().includes(search.toLowerCase()) ||
      p.contract.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "All" || p.direction === activeFilter;
    return matchSearch && matchFilter;
  });

  const totalReceived = payments.filter(p => p.direction === "Received").reduce((sum, p) => sum + parseFloat(p.amount.replace(/[$,]/g, "")), 0);
  const totalDisbursed = payments.filter(p => p.direction === "Disbursed").reduce((sum, p) => sum + parseFloat(p.amount.replace(/[$,]/g, "")), 0);

  const statData = [
    { label: "Total Transactions", value: payments.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
    { label: "Total Received", value: `$${totalReceived.toLocaleString()}`, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0", large: true },
    { label: "Total Disbursed", value: `$${totalDisbursed.toLocaleString()}`, accent: isDark ? "#F87171" : "#DC2626", bg: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2", border: isDark ? "rgba(248,113,113,0.15)" : "#FECACA", large: true },
    { label: "Net Cash Flow", value: `$${(totalReceived - totalDisbursed).toLocaleString()}`, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A", large: true },
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
        .data-row { transition: all 0.18s ease; cursor: pointer; }
        .data-row:hover { background: ${t.rowHover} !important; ${isDark ? "transform: translateX(3px);" : `box-shadow: inset 3px 0 0 ${t.accent};`} }
        .action-btn { transition: all 0.15s ease; cursor: pointer; background: none; border: none; }
        .action-btn:hover { transform: scale(1.15); opacity: 1 !important; }
        .primary-btn { transition: all 0.2s ease; cursor: pointer; border: none; }
        .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px ${t.accentShadow} !important; }
        .stat-card { transition: all 0.2s ease; }
        .stat-card:hover { transform: translateY(-3px); }
        .filter-chip { transition: all 0.15s ease; cursor: pointer; }
        .search-input:focus { outline: none; border-color: ${t.searchFocusBorder} !important; box-shadow: 0 0 0 3px ${t.searchFocusShadow} !important; }
        .search-input::placeholder { color: ${t.searchPlaceholder}; }
        .theme-toggle { transition: all 0.2s ease; cursor: pointer; border: none; }
        .theme-toggle:hover { opacity: 0.85; transform: scale(1.05); }
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
            <span style={{ color: t.breadcrumbActive, fontWeight: 500 }}>Payments</span>
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
              <h1 style={{ fontFamily: t.titleFont, fontWeight: isDark ? 800 : 700, fontSize: isDark ? 30 : 38, color: isDark ? "#fff" : "#1C1917", letterSpacing: isDark ? "-1px" : "-1.5px", lineHeight: 1, marginBottom: 6 }}>Payments</h1>
              <p style={{ fontSize: 13.5, color: t.textMuted }}>Track actual cash receipts and disbursements</p>
            </div>
            <button className="primary-btn" style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Record Payment
            </button>
          </div>

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            {statData.map(s => (
              <div key={s.label} className="stat-card" style={{ background: s.bg, borderRadius: 14, padding: "20px 22px", border: `1px solid ${s.border}`, backdropFilter: t.glass ? "blur(10px)" : "none", display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</span>
                <div style={{ fontFamily: t.titleFont, fontSize: s.large ? (isDark ? 22 : 28) : (isDark ? 28 : 36), fontWeight: isDark ? 800 : 700, color: s.accent, lineHeight: 1, letterSpacing: "-0.5px" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {filters.map(f => {
                const isActive = activeFilter === f;
                const color = f === "Received" ? (isDark ? "#34D399" : "#059669") : f === "Disbursed" ? (isDark ? "#F87171" : "#DC2626") : t.accent;
                const bg = f === "Received" ? (isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5") : f === "Disbursed" ? (isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2") : (isDark ? "rgba(52,211,153,0.15)" : t.accent);
                const border = f === "Received" ? (isDark ? "rgba(52,211,153,0.3)" : "#A7F3D0") : f === "Disbursed" ? (isDark ? "rgba(248,113,113,0.3)" : "#FECACA") : (isDark ? "rgba(52,211,153,0.3)" : t.accent);
                return (
                  <span key={f} className="filter-chip" onClick={() => setActiveFilter(f)} style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isActive ? bg : (isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF"), color: isActive ? (f === "All" ? (isDark ? "#34D399" : "#fff") : color) : t.textSecondary, border: `1px solid ${isActive ? border : (isDark ? "rgba(255,255,255,0.08)" : "#E5E3DF")}`, cursor: "pointer" }}>
                    {f}
                  </span>
                );
              })}
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.searchIcon, fontSize: 15, pointerEvents: "none" }}>⌕</span>
              <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 10, padding: "9px 14px 9px 34px", color: t.searchText, fontSize: 13, width: 240 }} />
            </div>
          </div>

          {/* Table */}
          <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", backdropFilter: t.glass ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
            <div style={{ display: "grid", gridTemplateColumns: "110px 90px 90px 1fr 110px 120px 100px 100px 1fr 80px", padding: "12px 22px", background: t.tableHeader, borderBottom: `1px solid ${t.surfaceBorder}` }}>
              {["PAY ID", "SCHED", "CONTRACT", "PARTY", "TYPE", "AMOUNT", "DATE", "METHOD", "NOTE", "ACTIONS"].map(col => (
                <div key={col} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "1px", color: isDark ? "rgba(255,255,255,0.3)" : "#C4C0BA", textTransform: "uppercase", fontFamily: t.monoFont }}>{col}</div>
              ))}
            </div>

            {filtered.map((p, i) => {
              const tc = typeCfg(p.type, isDark);
              const isHov = hoveredRow === p.id;
              const isIncoming = p.direction === "Received";
              return (
                <div key={p.id} className="data-row" onMouseEnter={() => setHoveredRow(p.id)} onMouseLeave={() => setHoveredRow(null)}
                  style={{ display: "grid", gridTemplateColumns: "110px 90px 90px 1fr 110px 120px 100px 100px 1fr 80px", padding: "12px 22px", borderBottom: i < filtered.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
                  <div style={{ fontFamily: t.monoFont, fontSize: 10.5, color: t.idText }}>{p.id}</div>
                  <div style={{ fontFamily: t.monoFont, fontSize: 10.5, color: isDark ? "rgba(255,255,255,0.4)" : "#A8A29E" }}>{p.schedule || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
                  <div style={{ fontFamily: t.monoFont, fontSize: 11.5, color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 500 }}>{p.contract || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.party}</div>
                  <div><span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>{p.type}</span></div>
                  <div style={{ fontFamily: t.monoFont, fontSize: 12.5, fontWeight: 700, color: isIncoming ? (isDark ? "#34D399" : "#059669") : (isDark ? "#F87171" : "#DC2626") }}>
                    {isIncoming ? "+" : "−"}{p.amount}
                  </div>
                  <div style={{ fontFamily: t.monoFont, fontSize: 11, color: t.textMuted }}>{p.date}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{p.method}</div>
                  <div style={{ fontSize: 11.5, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.note || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
                  <div style={{ display: "flex", gap: 6, opacity: isHov ? 1 : (isDark ? 0.4 : 0), transition: "opacity 0.15s ease" }}>
                    <button className="action-btn" style={{ width: 30, height: 30, borderRadius: 7, background: t.editBtnBg, color: t.editBtnColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✎</button>
                    <button className="action-btn" style={{ width: 30, height: 30, borderRadius: 7, background: t.deleteBtnBg, color: t.deleteBtnColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⊗</button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ padding: "48px", textAlign: "center", color: t.textMuted, fontSize: 13 }}>No payments found.</div>}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: t.textSubtle }}>
              Showing <strong style={{ color: t.textSecondary }}>{filtered.length}</strong> of <strong style={{ color: t.textSecondary }}>{payments.length}</strong> payments
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {["‹", "1", "2", "›"].map((p, i) => (
                <span key={i} style={{ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: i === 1 ? 700 : 400, background: i === 1 ? t.pageBtnActive : t.pageBtnBg, color: i === 1 ? t.pageBtnActiveTxt : t.pageBtnText, border: `1px solid ${i === 1 ? t.pageBtnActive : t.pageBtnBorder}`, cursor: "pointer" }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

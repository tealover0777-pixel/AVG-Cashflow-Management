import { useState } from "react";

const parties = [
  { id: "M10000", name: "Pao Fu Chen", type: "Individual", role: "Investor", email: "avc@yahoo.com", phone: "" },
  { id: "M10001", name: "Edward R. Brodersen", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10002", name: "Gilberto", type: "Individual", role: "Borrower", email: "", phone: "" },
  { id: "M10003", name: "Tina Lee", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10004", name: "Suet Fong Yu Ho", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10005", name: "Kies Capital Group", type: "Company", role: "Borrower", email: "", phone: "" },
  { id: "M10006", name: "Kolina Lee", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10007", name: "Peter & Rebecca Lu", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10008", name: "Hsiu Ju Hsu Properties", type: "Company", role: "Investor", email: "", phone: "" },
  { id: "M10009", name: "Justine Trieu", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10010", name: "Anthony Hsu (Hsu Lu Hui)", type: "Individual", role: "Borrower", email: "", phone: "" },
  { id: "M10011", name: "Mong Tung Lee", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10012", name: "Samuel Chen (Chen Hui Chou)", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10013", name: "Hata You", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10014", name: "Annie Yeh", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10015", name: "Ting Ting Yu", type: "Individual", role: "Borrower", email: "", phone: "" },
  { id: "M10016", name: "Teck Chew", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10017", name: "Yu Ying Lin", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10018", name: "Daisy Chow", type: "Individual", role: "Investor", email: "", phone: "" },
  { id: "M10019", name: "AVDE Fixed", type: "Company", role: "Investor", email: "", phone: "" },
];

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

// ── Light-mode config ──────────────────────────────────────────────────
const lightTheme = {
  body: "#F8F7F4",
  sidebar: "#FFFFFF",
  sidebarBorder: "#EAE8E4",
  topbar: "#FFFFFF",
  topbarBorder: "#EAE8E4",
  surface: "#FFFFFF",
  surfaceBorder: "#EAE8E4",
  tableHeader: "#FAFAF9",
  rowDivider: "#F5F4F1",
  rowHover: "#FAFAF9",
  rowHoverAccent: "#4F46E5",
  text: "#1C1917",
  textMuted: "#A8A29E",
  textSubtle: "#C4C0BA",
  textSecondary: "#78716C",
  accent: "#4F46E5",
  accentGrad: "linear-gradient(135deg, #4F46E5, #7C3AED)",
  accentShadow: "rgba(79, 70, 229, 0.25)",
  logoGrad: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
  logoShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
  navActive: "#EEF2FF",
  navActiveText: "#4F46E5",
  navActivePill: "#4F46E5",
  navHover: "rgba(79, 70, 229, 0.06)",
  navHoverText: "#4F46E5",
  navText: "#78716C",
  breadcrumb: "#A8A29E",
  breadcrumbActive: "#4F46E5",
  searchBg: "#FFFFFF",
  searchBorder: "#E5E3DF",
  searchText: "#292524",
  searchFocusBorder: "#A5B4FC",
  searchFocusShadow: "rgba(165, 180, 252, 0.25)",
  searchPlaceholder: "#A8A29E",
  searchIcon: "#C4C0BA",
  chipActive: "#4F46E5",
  chipActiveBg: "#4F46E5",
  chipActiveBorder: "#4F46E5",
  chipText: "#78716C",
  chipBg: "#FFFFFF",
  chipBorder: "#E5E3DF",
  chipHoverBg: "#E0E7FF",
  chipHoverText: "#4338CA",
  chipHoverBorder: "#C7D2FE",
  idText: "#C4C0BA",
  emailActive: "#4F46E5",
  emailEmpty: "#D4D0CB",
  editBtnBg: "#EEF2FF",
  editBtnColor: "#4F46E5",
  deleteBtnBg: "#FEF2F2",
  deleteBtnColor: "#DC2626",
  logoutBg: "#FFF7ED",
  logoutBorder: "#FED7AA",
  logoutText: "#C2410C",
  pageBtnActive: "#4F46E5",
  pageBtnActiveTxt: "#fff",
  pageBtnBg: "#FFFFFF",
  pageBtnBorder: "#E5E3DF",
  pageBtnText: "#78716C",
  scrollTrack: "#F1F0EE",
  scrollThumb: "#D1CFC9",
  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
  titleFont: "'Cormorant Garamond', serif",
  monoFont: "'JetBrains Mono', monospace",
  titleSize: 38,
  titleWeight: 700,
  roleConfigs: {
    Investor: { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
    Borrower: { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  },
  avatarPalette: [
    { bg: "#E0E7FF", color: "#4338CA" },
    { bg: "#FCE7F3", color: "#9D174D" },
    { bg: "#D1FAE5", color: "#065F46" },
    { bg: "#FEF3C7", color: "#92400E" },
    { bg: "#DBEAFE", color: "#1E40AF" },
    { bg: "#FEE2E2", color: "#991B1B" },
    { bg: "#F3E8FF", color: "#6B21A8" },
    { bg: "#CCFBF1", color: "#0F766E" },
  ],
  stats: [
    { label: "Total Parties", icon: "◎", accent: "#4F46E5", lightBg: "#EEF2FF", border: "#C7D2FE", roleKey: null },
    { label: "Investors", icon: "◈", accent: "#059669", lightBg: "#ECFDF5", border: "#A7F3D0", roleKey: "Investor" },
    { label: "Borrowers", icon: "◉", accent: "#C2410C", lightBg: "#FFF7ED", border: "#FED7AA", roleKey: "Borrower" },
    { label: "Companies", icon: "▦", accent: "#7C3AED", lightBg: "#F5F3FF", border: "#DDD6FE", typeKey: "Company" },
  ],
  glassSidebar: false,
  glassTopbar: false,
  glassTable: false,
  glassCard: false,
  sidebarShadow: "2px 0 12px rgba(0,0,0,0.04)",
  tableShadow: "0 2px 12px rgba(0,0,0,0.05)",
  cardShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

// ── Dark-mode config ───────────────────────────────────────────────────
const darkTheme = {
  body: "radial-gradient(ellipse at 20% 50%, #0d1f2d 0%, #080f1a 60%, #050c15 100%)",
  sidebar: "rgba(255,255,255,0.03)",
  sidebarBorder: "rgba(255,255,255,0.06)",
  topbar: "rgba(255,255,255,0.02)",
  topbarBorder: "rgba(255,255,255,0.06)",
  surface: "rgba(255,255,255,0.02)",
  surfaceBorder: "rgba(255,255,255,0.07)",
  tableHeader: "rgba(255,255,255,0.04)",
  rowDivider: "rgba(255,255,255,0.04)",
  rowHover: "rgba(255,255,255,0.04)",
  rowHoverAccent: "#34D399",
  text: "#e2e8f0",
  textMuted: "rgba(255,255,255,0.35)",
  textSubtle: "rgba(255,255,255,0.3)",
  textSecondary: "rgba(255,255,255,0.4)",
  accent: "#34D399",
  accentGrad: "linear-gradient(135deg, #34D399, #059669)",
  accentShadow: "rgba(52, 211, 153, 0.35)",
  logoGrad: "linear-gradient(135deg, #34D399, #059669)",
  logoShadow: "0 4px 12px rgba(52, 211, 153, 0.3)",
  navActive: "rgba(52, 211, 153, 0.1)",
  navActiveText: "#34D399",
  navActivePill: "#34D399",
  navHover: "rgba(255,255,255,0.07)",
  navHoverText: "#fff",
  navText: "rgba(255,255,255,0.5)",
  breadcrumb: "rgba(255,255,255,0.3)",
  breadcrumbActive: "#34D399",
  searchBg: "rgba(255,255,255,0.05)",
  searchBorder: "rgba(255,255,255,0.1)",
  searchText: "#fff",
  searchFocusBorder: "rgba(52, 211, 153, 0.5)",
  searchFocusShadow: "rgba(52, 211, 153, 0.1)",
  searchPlaceholder: "rgba(255,255,255,0.3)",
  searchIcon: "rgba(255,255,255,0.3)",
  chipActive: "#34D399",
  chipActiveBg: "rgba(52, 211, 153, 0.15)",
  chipActiveBorder: "rgba(52, 211, 153, 0.4)",
  chipText: "rgba(255,255,255,0.5)",
  chipBg: "rgba(255,255,255,0.04)",
  chipBorder: "rgba(255,255,255,0.08)",
  chipHoverBg: "rgba(52, 211, 153, 0.1)",
  chipHoverText: "#34D399",
  chipHoverBorder: "rgba(52, 211, 153, 0.3)",
  idText: "rgba(255,255,255,0.35)",
  emailActive: "#60A5FA",
  emailEmpty: "rgba(255,255,255,0.12)",
  editBtnBg: "rgba(96, 165, 250, 0.12)",
  editBtnColor: "#60A5FA",
  deleteBtnBg: "rgba(248, 113, 113, 0.12)",
  deleteBtnColor: "#F87171",
  logoutBg: "rgba(248, 113, 113, 0.1)",
  logoutBorder: "rgba(248, 113, 113, 0.2)",
  logoutText: "#F87171",
  pageBtnActive: "#34D399",
  pageBtnActiveTxt: "#050c15",
  pageBtnBg: "rgba(255,255,255,0.04)",
  pageBtnBorder: "rgba(255,255,255,0.08)",
  pageBtnText: "rgba(255,255,255,0.5)",
  scrollTrack: "transparent",
  scrollThumb: "rgba(255,255,255,0.1)",
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  titleFont: "'Syne', sans-serif",
  monoFont: "'JetBrains Mono', monospace",
  titleSize: 30,
  titleWeight: 800,
  roleConfigs: {
    Investor: { bg: "rgba(52, 211, 153, 0.15)", color: "#34D399", border: "rgba(52, 211, 153, 0.3)" },
    Borrower: { bg: "rgba(251, 146, 60, 0.15)", color: "#FB923C", border: "rgba(251, 146, 60, 0.3)" },
  },
  avatarPalette: [
    { bg: "rgba(52, 211, 153, 0.15)", color: "#34D399" },
    { bg: "rgba(96, 165, 250, 0.15)", color: "#60A5FA" },
    { bg: "rgba(251, 146, 60, 0.15)", color: "#FB923C" },
    { bg: "rgba(244, 114, 182, 0.15)", color: "#F472B6" },
    { bg: "rgba(167, 139, 250, 0.15)", color: "#A78BFA" },
    { bg: "rgba(251, 191, 36, 0.15)", color: "#FBBF24" },
    { bg: "rgba(45, 212, 191, 0.15)", color: "#2DD4BF" },
    { bg: "rgba(248, 113, 113, 0.15)", color: "#F87171" },
  ],
  stats: [
    { label: "Total Parties", icon: "◎", accent: "#60A5FA", lightBg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.15)", roleKey: null },
    { label: "Investors", icon: "◈", accent: "#34D399", lightBg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.15)", roleKey: "Investor" },
    { label: "Borrowers", icon: "◉", accent: "#FB923C", lightBg: "rgba(251,146,60,0.08)", border: "rgba(251,146,60,0.15)", roleKey: "Borrower" },
    { label: "Companies", icon: "▦", accent: "#A78BFA", lightBg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.15)", typeKey: "Company" },
  ],
  glassSidebar: true,
  glassTopbar: true,
  glassTable: true,
  glassCard: true,
  sidebarShadow: "none",
  tableShadow: "none",
  cardShadow: "none",
};

function getInitials(name) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function getAvatar(name, palette) {
  let hash = 0;
  for (let c of name) hash = (hash + c.charCodeAt(0)) % palette.length;
  return palette[hash];
}

function getStatValue(stat) {
  if (stat.roleKey) return parties.filter(p => p.role === stat.roleKey).length;
  if (stat.typeKey) return parties.filter(p => p.type === stat.typeKey).length;
  return parties.length;
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [activeNav, setActiveNav] = useState("Parties");
  const [activeChip, setActiveChip] = useState("All");

  const t = isDark ? darkTheme : lightTheme;

  const filtered = parties.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (activeChip === "Investors") return p.role === "Investor";
    if (activeChip === "Borrowers") return p.role === "Borrower";
    if (activeChip === "Companies") return p.type === "Company";
    return true;
  });

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: t.body,
      fontFamily: t.fontFamily,
      color: t.text,
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&family=Cormorant+Garamond:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${t.scrollTrack}; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 10px; }
        .nav-item { transition: all 0.18s ease; cursor: pointer; border-radius: 10px; }
        .nav-item:hover { background: ${t.navHover} !important; color: ${t.navHoverText} !important; }
        .party-row { transition: all 0.18s ease; cursor: pointer; }
        .party-row:hover { background: ${t.rowHover} !important; ${isDark ? "transform: translateX(3px);" : `box-shadow: inset 3px 0 0 ${t.rowHoverAccent};`} }
        .action-btn { transition: all 0.15s ease; cursor: pointer; background: none; border: none; }
        .action-btn:hover { transform: scale(1.15); opacity: 1 !important; }
        .new-party-btn { transition: all 0.2s ease; cursor: pointer; border: none; }
        .new-party-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px ${t.accentShadow} !important; }
        .stat-card { transition: all 0.2s ease; cursor: default; }
        .stat-card:hover { transform: translateY(-3px); }
        .search-input:focus { outline: none; border-color: ${t.searchFocusBorder} !important; box-shadow: 0 0 0 3px ${t.searchFocusShadow} !important; }
        .search-input::placeholder { color: ${t.searchPlaceholder}; }
        .filter-chip { transition: all 0.15s ease; cursor: pointer; }
        .filter-chip:hover { background: ${t.chipHoverBg} !important; color: ${t.chipHoverText} !important; border-color: ${t.chipHoverBorder} !important; }
        .theme-toggle { transition: all 0.2s ease; cursor: pointer; border: none; }
        .theme-toggle:hover { opacity: 0.85; transform: scale(1.05); }
      `}</style>

      {/* ── Sidebar ── */}
      <div style={{
        width: 228,
        background: t.sidebar,
        backdropFilter: t.glassSidebar ? "blur(20px)" : "none",
        borderRight: `1px solid ${t.sidebarBorder}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        boxShadow: t.sidebarShadow,
      }}>
        {/* Logo */}
        <div style={{ padding: "26px 22px 24px", borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: t.logoGrad,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, fontWeight: 800, color: "#fff",
              boxShadow: t.logoShadow,
              letterSpacing: "-1px",
            }}>A</div>
            <div>
              <div style={{
                fontFamily: isDark ? "'Syne', sans-serif" : "'Cormorant Garamond', serif",
                fontWeight: isDark ? 800 : 700,
                fontSize: isDark ? 14 : 17,
                color: isDark ? "#fff" : "#1C1917",
                letterSpacing: isDark ? "-0.3px" : "-0.5px",
                lineHeight: 1,
              }}>AVG</div>
              <div style={{
                fontSize: 9.5, color: t.textMuted,
                letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 2,
              }}>Cashflow Mgmt</div>
            </div>
          </div>
        </div>

        {/* Nav label */}
        {!isDark && (
          <div style={{ padding: "20px 22px 8px" }}>
            <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: t.textSubtle }}>
              Menu
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ padding: isDark ? "16px 12px" : "0 12px", flex: 1, display: "flex", flexDirection: "column", gap: isDark ? 2 : 1, marginTop: isDark ? 0 : 12 }}>
          {navItems.map(item => {
            const isActive = activeNav === item.label;
            return (
              <div
                key={item.label}
                className="nav-item"
                onClick={() => setActiveNav(item.label)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px",
                  background: isActive ? t.navActive : "transparent",
                  borderLeft: isActive ? `2px solid ${t.navActivePill}` : "2px solid transparent",
                  color: isActive ? t.navActiveText : t.navText,
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 400,
                  position: "relative",
                }}
              >
                {/* Light mode uses a different active indicator */}
                {!isDark && isActive && (
                  <div style={{
                    position: "absolute", left: 0, top: "20%", bottom: "20%",
                    width: 3, borderRadius: "0 3px 3px 0",
                    background: t.navActivePill,
                  }} />
                )}
                <span style={{ fontSize: 13, opacity: isActive ? 1 : (isDark ? 0.8 : 0.6) }}>{item.icon}</span>
                {item.label}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: "16px", borderTop: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: isDark ? 32 : 34,
              height: isDark ? 32 : 34,
              borderRadius: isDark ? 8 : 9,
              background: isDark
                ? "linear-gradient(135deg, #60A5FA, #3B82F6)"
                : "linear-gradient(135deg, #F472B6, #EC4899)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff",
              boxShadow: isDark
                ? "none"
                : "0 2px 8px rgba(236, 72, 153, 0.3)",
            }}>AD</div>
            <div>
              <div style={{ fontSize: isDark ? 12 : 13, fontWeight: isDark ? 500 : 600, color: isDark ? "rgba(255,255,255,0.8)" : "#292524" }}>Admin</div>
              <div style={{ fontSize: isDark ? 10 : 11, color: t.textMuted }}>Super User</div>
            </div>
            {!isDark && (
              <div style={{ marginLeft: "auto", fontSize: 16, color: t.textSubtle, cursor: "pointer" }}>⋯</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <div style={{
          height: 58,
          borderBottom: `1px solid ${t.topbarBorder}`,
          background: t.topbar,
          backdropFilter: t.glassTopbar ? "blur(10px)" : "none",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: t.breadcrumb }}>
            <span>AVG Cashflow</span>
            <span style={{ color: isDark ? "rgba(255,255,255,0.2)" : "#D4D0CB" }}>›</span>
            <span style={{ color: t.breadcrumbActive, fontWeight: 500 }}>Parties</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12.5, alignItems: "center" }}>
            <span style={{ color: t.textSecondary, cursor: "pointer" }}>Profile</span>
            <span style={{ color: t.textSecondary, cursor: "pointer" }}>Settings</span>

            {/* Theme Toggle */}
            <button
              className="theme-toggle"
              onClick={() => setIsDark(!isDark)}
              style={{
                background: isDark ? "rgba(52, 211, 153, 0.1)" : "#EEF2FF",
                color: isDark ? "#34D399" : "#4F46E5",
                border: `1px solid ${isDark ? "rgba(52, 211, 153, 0.25)" : "#C7D2FE"}`,
                padding: "4px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {isDark ? "☀ Light" : "☽ Dark"}
            </button>

            <span style={{
              color: t.logoutText, cursor: "pointer", fontWeight: 500,
              background: t.logoutBg, padding: "4px 12px", borderRadius: 6,
              border: `1px solid ${t.logoutBorder}`, fontSize: 12,
            }}>Logout</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>

          {/* Page Header */}
          <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{
                fontFamily: t.titleFont,
                fontWeight: t.titleWeight,
                fontSize: t.titleSize,
                color: isDark ? "#fff" : "#1C1917",
                letterSpacing: isDark ? "-1px" : "-1.5px",
                lineHeight: 1, marginBottom: 6,
              }}>Parties</h1>
              <p style={{ fontSize: 13.5, color: t.textMuted, fontWeight: 400 }}>
                Manage Investors, Borrowers, and Companies
              </p>
            </div>
            <button className="new-party-btn" style={{
              background: t.accentGrad,
              color: isDark ? (isDark ? "#050c15" : "#fff") : "#fff",
              padding: "11px 22px", borderRadius: 11,
              fontSize: 13.5, fontWeight: 600,
              boxShadow: `0 4px 16px ${isDark ? "rgba(52, 211, 153, 0.2)" : "rgba(79, 70, 229, 0.25)"}`,
              display: "flex", alignItems: "center", gap: 7,
              letterSpacing: "0.1px",
            }}>
              <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span>
              New Party
            </button>
          </div>

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            {t.stats.map(s => (
              <div key={s.label} className="stat-card" style={{
                background: s.lightBg,
                borderRadius: 14,
                padding: "20px 22px",
                border: `1px solid ${s.border}`,
                backdropFilter: t.glassCard ? "blur(10px)" : "none",
                boxShadow: t.cardShadow,
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    {s.label}
                  </span>
                  {!isDark && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: s.lightBg,
                      border: `1px solid ${s.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, color: s.accent,
                    }}>{s.icon}</div>
                  )}
                </div>
                <div style={{
                  fontFamily: t.titleFont,
                  fontSize: isDark ? 28 : 36,
                  fontWeight: t.titleWeight,
                  color: s.accent,
                  lineHeight: 1,
                  letterSpacing: isDark ? "-0.5px" : "-1px",
                }}>
                  {getStatValue(s)}
                </div>
              </div>
            ))}
          </div>

          {/* Table Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            {/* Filter chips */}
            <div style={{ display: "flex", gap: 8 }}>
              {["All", "Investors", "Borrowers", "Companies"].map((chip) => {
                const isChipActive = activeChip === chip;
                return (
                  <span
                    key={chip}
                    className="filter-chip"
                    onClick={() => setActiveChip(chip)}
                    style={{
                      fontSize: 12, fontWeight: isChipActive ? 600 : 500,
                      padding: "5px 14px", borderRadius: 20,
                      background: isChipActive ? t.chipActiveBg : t.chipBg,
                      color: isChipActive ? (isDark ? "#050c15" : "#fff") : t.chipText,
                      border: `1px solid ${isChipActive ? t.chipActiveBorder : t.chipBorder}`,
                      cursor: "pointer",
                    }}
                  >
                    {chip}
                  </span>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: t.searchIcon, fontSize: 15, lineHeight: 1, pointerEvents: "none",
              }}>⌕</span>
              <input
                className="search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search parties..."
                style={{
                  background: t.searchBg,
                  border: `1px solid ${t.searchBorder}`,
                  borderRadius: 10,
                  padding: "9px 14px 9px 34px",
                  color: t.searchText,
                  fontSize: 13,
                  width: 240,
                  transition: "all 0.2s ease",
                  boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: t.surface,
            borderRadius: 16,
            border: `1px solid ${t.surfaceBorder}`,
            overflow: "hidden",
            backdropFilter: t.glassTable ? "blur(20px)" : "none",
            boxShadow: t.tableShadow,
          }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "90px 1.5fr 100px 100px 90px 1fr 120px 1.2fr 100px 100px 100px 100px 100px",
              padding: "12px 22px",
              background: t.tableHeader,
              borderBottom: `1px solid ${t.surfaceBorder}`,
            }}>
              {["ID", "NAME", "TYPE", "ROLE", "INV TYPE", "EMAIL", "PHONE", "ADDRESS", "TAX ID", "BANK INFO", "CREATED", "UPDATED", "ACTIONS"].map(col => (
                <div key={col} style={{
                  fontSize: 10.5, fontWeight: 600,
                  letterSpacing: "1px", color: isDark ? "rgba(255,255,255,0.3)" : "#C4C0BA",
                  textTransform: "uppercase",
                  fontFamily: t.monoFont,
                }}>{col}</div>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((party, i) => {
              const role = t.roleConfigs[party.role] || t.roleConfigs.Investor;
              const av = getAvatar(party.name, t.avatarPalette);
              const isHovered = hoveredRow === party.id;
              return (
                <div
                  key={party.id}
                  className="party-row"
                  onMouseEnter={() => setHoveredRow(party.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 1.5fr 100px 100px 90px 1fr 120px 1.2fr 100px 100px 100px 100px 100px",
                    padding: "12px 22px",
                    borderBottom: i < filtered.length - 1 ? `1px solid ${t.rowDivider}` : "none",
                    alignItems: "center",
                    background: isHovered ? t.rowHover : "transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* ID */}
                  <div style={{
                    fontFamily: t.monoFont,
                    fontSize: 11, color: t.idText, letterSpacing: "0.5px",
                  }}>{party.id}</div>

                  {/* Name + Avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: av.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: av.color,
                      flexShrink: 0, letterSpacing: "0.3px",
                      border: `1px solid ${av.color}${isDark ? "44" : "22"}`,
                    }}>
                      {getInitials(party.name)}
                    </div>
                    <span style={{
                      fontSize: 13.5, fontWeight: 500,
                      color: isDark
                        ? "rgba(255,255,255,0.85)"
                        : (isHovered ? "#1C1917" : "#44403C"),
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {party.name}
                    </span>
                  </div>

                  {/* Type */}
                  <div style={{ fontSize: 12.5, color: t.textMuted }}>
                    {party.type === "Company" ? (
                      <span style={{ color: isDark ? "#A78BFA" : "#7C3AED", fontWeight: 500 }}>◈ Company</span>
                    ) : (
                      <span style={{ color: t.textMuted }}>◎ Individual</span>
                    )}
                  </div>

                  {/* Role Badge */}
                  <div>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600,
                      padding: "4px 11px", borderRadius: 20,
                      background: role.bg, color: role.color,
                      border: `1px solid ${role.border}`,
                      letterSpacing: "0.2px",
                    }}>
                      {party.role}
                    </span>
                  </div>

                  {/* INV TYPE */}
                  <div style={{ fontSize: 12.5, color: t.textMuted }}>Fixed</div>

                  {/* Email */}
                  <div style={{
                    fontSize: 12.5,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {party.email
                      ? <span style={{ color: t.emailActive, fontWeight: 400 }}>{party.email}</span>
                      : <span style={{ color: t.emailEmpty }}>—</span>
                    }
                  </div>

                  {/* PHONE */}
                  <div style={{ fontSize: 12.5, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{party.phone || "—"}</div>
                  {/* ADDRESS */}
                  <div style={{ fontSize: 12.5, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>—</div>
                  {/* TAX ID */}
                  <div style={{ fontSize: 12.5, color: t.textMuted }}>—</div>
                  {/* BANK INFO */}
                  <div style={{ fontSize: 12.5, color: t.textMuted }}>—</div>
                  {/* CREATED */}
                  <div style={{ fontSize: 12.5, color: t.textMuted }}>—</div>
                  {/* UPDATED */}
                  <div style={{ fontSize: 12.5, color: t.textMuted }}>—</div>


                  {/* Actions */}
                  <div style={{
                    display: "flex", gap: 6,
                    opacity: isHovered ? 1 : (isDark ? 0.4 : 0),
                    transition: "opacity 0.15s ease",
                  }}>
                    <button className="action-btn" title="Edit" style={{
                      width: 30, height: 30, borderRadius: 7,
                      background: t.editBtnBg, color: t.editBtnColor,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13,
                    }}>✎</button>
                    <button className="action-btn" title="Delete" style={{
                      width: 30, height: 30, borderRadius: 7,
                      background: t.deleteBtnBg, color: t.deleteBtnColor,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13,
                    }}>⊗</button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ padding: "48px 22px", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                No parties found matching your search.
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: t.textSubtle }}>
              Showing{" "}
              <strong style={{ color: t.textSecondary }}>{filtered.length}</strong>
              {" "}of{" "}
              <strong style={{ color: t.textSecondary }}>{parties.length}</strong>
              {" "}parties
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {["‹", "1", "2", "3", "›"].map((p, i) => (
                <span key={i} style={{
                  width: 30, height: 30, borderRadius: 7,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: i === 1 ? 700 : 400,
                  background: i === 1 ? t.pageBtnActive : t.pageBtnBg,
                  color: i === 1 ? t.pageBtnActiveTxt : t.pageBtnText,
                  border: `1px solid ${i === 1 ? t.pageBtnActive : t.pageBtnBorder}`,
                  cursor: "pointer",
                }}>{p}</span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

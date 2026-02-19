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
  editBtnBg: "#EEF2FF", editBtnColor: "#4F46E5",
  deleteBtnBg: "#FEF2F2", deleteBtnColor: "#DC2626",
  addItemBg: "#F5F3FF", addItemColor: "#7C3AED", addItemBorder: "#DDD6FE",
  logoutBg: "#FFF7ED", logoutBorder: "#FED7AA", logoutText: "#C2410C",
  scrollTrack: "#F1F0EE", scrollThumb: "#D1CFC9",
  tagBg: "#EEF2FF", tagColor: "#4F46E5", tagBorder: "#C7D2FE",
  fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
  titleFont: "'Cormorant Garamond',serif", monoFont: "'JetBrains Mono',monospace",
  glass: false, sidebarShadow: "2px 0 12px rgba(0,0,0,0.04)",
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
  editBtnBg: "rgba(96,165,250,0.12)", editBtnColor: "#60A5FA",
  deleteBtnBg: "rgba(248,113,113,0.12)", deleteBtnColor: "#F87171",
  addItemBg: "rgba(167,139,250,0.12)", addItemColor: "#A78BFA", addItemBorder: "rgba(167,139,250,0.25)",
  logoutBg: "rgba(248,113,113,0.1)", logoutBorder: "rgba(248,113,113,0.2)", logoutText: "#F87171",
  scrollTrack: "transparent", scrollThumb: "rgba(255,255,255,0.1)",
  tagBg: "rgba(52,211,153,0.12)", tagColor: "#34D399", tagBorder: "rgba(52,211,153,0.25)",
  fontFamily: "'DM Sans','Segoe UI',sans-serif",
  titleFont: "'Syne',sans-serif", monoFont: "'JetBrains Mono',monospace",
  glass: true, sidebarShadow: "none",
};

// Dimension groups — these are the reference/lookup lists that power dropdowns
const dimensionGroups = [
  {
    name: "Contract Type",
    key: "ContractType",
    description: "Types of investment contracts",
    accent: isDark => isDark ? "#60A5FA" : "#3B82F6",
    bg: isDark => isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF",
    border: isDark => isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE",
    items: ["Loan", "Mortgage", "Equity", "Bridge Loan", "Mezzanine"],
  },
  {
    name: "Payment Frequency",
    key: "PaymentFrequency",
    description: "How often payments are made",
    accent: isDark => isDark ? "#34D399" : "#059669",
    bg: isDark => isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5",
    border: isDark => isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0",
    items: ["Monthly", "Quarterly", "Semi-Annual", "Annual", "At Maturity"],
  },
  {
    name: "Payment Status",
    key: "PaymentStatus",
    description: "Possible statuses for a payment",
    accent: isDark => isDark ? "#FBBF24" : "#D97706",
    bg: isDark => isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB",
    border: isDark => isDark ? "rgba(251,191,36,0.15)" : "#FDE68A",
    items: ["Due", "Paid", "Missed", "Cancelled", "Deferred"],
  },
  {
    name: "Contract Status",
    key: "ContractStatus",
    description: "Lifecycle states of a contract",
    accent: isDark => isDark ? "#A78BFA" : "#7C3AED",
    bg: isDark => isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF",
    border: isDark => isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE",
    items: ["Active", "Closed", "Pending", "Defaulted"],
  },
  {
    name: "Payment Type",
    key: "PaymentType",
    description: "Nature of the scheduled payment",
    accent: isDark => isDark ? "#F472B6" : "#BE185D",
    bg: isDark => isDark ? "rgba(244,114,182,0.08)" : "#FDF2F8",
    border: isDark => isDark ? "rgba(244,114,182,0.15)" : "#FBCFE8",
    items: ["Interest", "Principal", "Interest + Principal", "Fee", "Catch-Up"],
  },
  {
    name: "Calculation Method",
    key: "CalculationMethod",
    description: "Day-count conventions for interest",
    accent: isDark => isDark ? "#2DD4BF" : "#0F766E",
    bg: isDark => isDark ? "rgba(45,212,191,0.08)" : "#F0FDFA",
    border: isDark => isDark ? "rgba(45,212,191,0.15)" : "#99F6E4",
    items: ["30/360", "ACT/360", "ACT/365", "ACT/ACT"],
  },
  {
    name: "Currency",
    key: "Currency",
    description: "Supported currencies",
    accent: isDark => isDark ? "#FB923C" : "#C2410C",
    bg: isDark => isDark ? "rgba(251,146,60,0.08)" : "#FFF7ED",
    border: isDark => isDark ? "rgba(251,146,60,0.15)" : "#FED7AA",
    items: ["USD", "CAD", "EUR", "TWD"],
  },
  {
    name: "Party Type",
    key: "PartyType",
    description: "Classification of parties",
    accent: isDark => isDark ? "#F87171" : "#DC2626",
    bg: isDark => isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2",
    border: isDark => isDark ? "rgba(248,113,113,0.15)" : "#FECACA",
    items: ["Individual", "Company", "Trust", "Partnership"],
  },
];

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeNav, setActiveNav] = useState("Dimensions");
  const [editingGroup, setEditingGroup] = useState(null);
  const [newItem, setNewItem] = useState("");
  const t = isDark ? dark : light;

  const totalValues = dimensionGroups.reduce((sum, g) => sum + g.items.length, 0);

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
        .dim-card { transition: all 0.2s ease; }
        .dim-card:hover { transform: translateY(-2px); }
        .tag-item { transition: all 0.15s ease; }
        .tag-delete { opacity: 0; transition: all 0.15s ease; cursor: pointer; }
        .tag-item:hover .tag-delete { opacity: 1; }
        .theme-toggle { transition: all 0.2s ease; cursor: pointer; border: none; }
        .theme-toggle:hover { opacity: 0.85; transform: scale(1.05); }
        .add-input:focus { outline: none; border-color: ${t.searchFocusBorder} !important; }
        .add-input::placeholder { color: ${t.searchPlaceholder}; }
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
            <span style={{ color: t.breadcrumbActive, fontWeight: 500 }}>Dimensions</span>
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
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: t.titleFont, fontWeight: isDark ? 800 : 700, fontSize: isDark ? 30 : 38, color: isDark ? "#fff" : "#1C1917", letterSpacing: isDark ? "-1px" : "-1.5px", lineHeight: 1, marginBottom: 6 }}>Dimensions</h1>
            <p style={{ fontSize: 13.5, color: t.textMuted }}>
              Reference data · <strong style={{ color: t.textSecondary }}>{dimensionGroups.length}</strong> groups · <strong style={{ color: t.textSecondary }}>{totalValues}</strong> values
            </p>
          </div>

          {/* Dimension Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {dimensionGroups.map(group => {
              const accent = group.accent(isDark);
              const bg = group.bg(isDark);
              const border = group.border(isDark);
              const isEditing = editingGroup === group.key;

              return (
                <div key={group.key} className="dim-card" style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", backdropFilter: t.glass ? "blur(20px)" : "none" }}>
                  {/* Card Header */}
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: bg }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: accent }}>{group.name}</div>
                      <div style={{ fontSize: 11.5, color: isDark ? "rgba(255,255,255,0.4)" : "#78716C", marginTop: 2 }}>{group.description}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: t.monoFont, fontSize: 11, color: accent, background: isDark ? "rgba(255,255,255,0.08)" : "#fff", padding: "2px 8px", borderRadius: 20, border: `1px solid ${border}` }}>
                        {group.items.length} values
                      </span>
                      <button onClick={() => setEditingGroup(isEditing ? null : group.key)} style={{ width: 28, height: 28, borderRadius: 7, background: isEditing ? accent : t.editBtnBg, color: isEditing ? (isDark ? "#050c15" : "#fff") : t.editBtnColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, border: "none", cursor: "pointer", transition: "all 0.15s ease" }}>
                        {isEditing ? "✓" : "✎"}
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {group.items.map(item => (
                      <div key={item} className="tag-item" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 500, padding: "5px 12px", borderRadius: 20, background: t.tagBg, color: t.tagColor, border: `1px solid ${t.tagBorder}` }}>
                        {item}
                        {isEditing && (
                          <span className="tag-delete" style={{ fontSize: 13, color: isDark ? "#F87171" : "#DC2626", fontWeight: 700, lineHeight: 1, marginLeft: 2 }}>×</span>
                        )}
                      </div>
                    ))}

                    {/* Add item input shown when editing */}
                    {isEditing && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          className="add-input"
                          value={newItem}
                          onChange={e => setNewItem(e.target.value)}
                          placeholder="Add value..."
                          style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 20, padding: "5px 12px", color: t.searchText, fontSize: 12.5, width: 120, transition: "all 0.15s ease" }}
                        />
                        <button style={{ width: 28, height: 28, borderRadius: 8, background: t.addItemBg, color: t.addItemColor, border: `1px solid ${t.addItemBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

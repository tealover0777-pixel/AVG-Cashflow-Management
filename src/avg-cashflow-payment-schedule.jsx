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
  checkActive: "#4F46E5",
  logoutBg: "#FFF7ED", logoutBorder: "#FED7AA", logoutText: "#C2410C",
  pageBtnActive: "#4F46E5", pageBtnActiveTxt: "#fff",
  pageBtnBg: "#FFFFFF", pageBtnBorder: "#E5E3DF", pageBtnText: "#78716C",
  scrollTrack: "#F1F0EE", scrollThumb: "#D1CFC9",
  bulkBg: "#F1F5F9", bulkBorder: "#E2E8F0",
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
  checkActive: "#34D399",
  logoutBg: "rgba(248,113,113,0.1)", logoutBorder: "rgba(248,113,113,0.2)", logoutText: "#F87171",
  pageBtnActive: "#34D399", pageBtnActiveTxt: "#050c15",
  pageBtnBg: "rgba(255,255,255,0.04)", pageBtnBorder: "rgba(255,255,255,0.08)", pageBtnText: "rgba(255,255,255,0.5)",
  scrollTrack: "transparent", scrollThumb: "rgba(255,255,255,0.1)",
  bulkBg: "rgba(255,255,255,0.04)", bulkBorder: "rgba(255,255,255,0.08)",
  fontFamily: "'DM Sans','Segoe UI',sans-serif",
  titleFont: "'Syne',sans-serif", monoFont: "'JetBrains Mono',monospace",
  glass: true, sidebarShadow: "none", tableShadow: "none",
};

const schedules = [
  { id: "PS10050", contract: "C10000", linked: "", dueDate: "2026-02-28", type: "Interest", principal: "$450,000", payment: "$3,750", status: "Due" },
  { id: "PS10051", contract: "C10001", linked: "", dueDate: "2026-02-28", type: "Interest", principal: "$200,000", payment: "$1,583", status: "Due" },
  { id: "PS10052", contract: "C10002", linked: "", dueDate: "2026-02-28", type: "Interest", principal: "$1,250,000", payment: "$8,333", status: "Paid" },
  { id: "PS10053", contract: "C10003", linked: "", dueDate: "2026-02-28", type: "Interest", principal: "$320,000", payment: "$2,667", status: "Due" },
  { id: "PS10054", contract: "C10004", linked: "", dueDate: "2026-03-31", type: "Interest", principal: "$500,000", payment: "$5,000", status: "Due" },
  { id: "PS10055", contract: "C10006", linked: "", dueDate: "2026-01-31", type: "Interest", principal: "$270,000", payment: "$2,025", status: "Paid" },
  { id: "PS10056", contract: "C10007", linked: "", dueDate: "2026-01-31", type: "Interest", principal: "$160,000", payment: "$1,333", status: "Missed" },
  { id: "PS10057", contract: "C10007", linked: "PS10056", dueDate: "2026-02-28", type: "Interest", principal: "$160,000", payment: "$1,333", status: "Due" },
  { id: "PS10058", contract: "C10008", linked: "", dueDate: "2026-12-31", type: "Interest", principal: "$600,000", payment: "$5,500", status: "Due" },
  { id: "PS10059", contract: "C10000", linked: "", dueDate: "2025-12-31", type: "Principal", principal: "$450,000", payment: "$450,000", status: "Paid" },
];

const statusCfg = (status, isDark) => ({
  Paid:      { bg: isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5", color: isDark ? "#34D399" : "#059669", border: isDark ? "rgba(52,211,153,0.3)" : "#A7F3D0" },
  Due:       { bg: isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB", color: isDark ? "#FBBF24" : "#D97706", border: isDark ? "rgba(251,191,36,0.3)" : "#FDE68A" },
  Missed:    { bg: isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", color: isDark ? "#F87171" : "#DC2626", border: isDark ? "rgba(248,113,113,0.3)" : "#FECACA" },
  Cancelled: { bg: isDark ? "rgba(255,255,255,0.07)" : "#F9FAFB", color: isDark ? "rgba(255,255,255,0.4)" : "#6B7280", border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB" },
})[status] || { bg: "transparent", color: "#888", border: "#ccc" };

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeNav, setActiveNav] = useState("Payment Schedule");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const t = isDark ? dark : light;

  const toggleRow = (id) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };
  const toggleAll = () => setSelected(selected.size === schedules.length ? new Set() : new Set(schedules.map(s => s.id)));

  const statData = [
    { label: "Total", value: schedules.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
    { label: "Due", value: schedules.filter(s => s.status === "Due").length, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" },
    { label: "Paid", value: schedules.filter(s => s.status === "Paid").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
    { label: "Missed", value: schedules.filter(s => s.status === "Missed").length, accent: isDark ? "#F87171" : "#DC2626", bg: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2", border: isDark ? "rgba(248,113,113,0.15)" : "#FECACA" },
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
            <span style={{ color: t.breadcrumbActive, fontWeight: 500 }}>Payment Schedule</span>
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
              <h1 style={{ fontFamily: t.titleFont, fontWeight: isDark ? 800 : 700, fontSize: isDark ? 30 : 38, color: isDark ? "#fff" : "#1C1917", letterSpacing: isDark ? "-1px" : "-1.5px", lineHeight: 1, marginBottom: 6 }}>Payment Schedule</h1>
              <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage payment schedules and statuses</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {selected.size > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: t.bulkBg, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.bulkBorder}` }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{selected.size} selected · Mark as:</span>
                  {["Paid", "Missed"].map(s => {
                    const sc = statusCfg(s, isDark);
                    return (
                      <span key={s} style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, cursor: "pointer" }}>{s}</span>
                    );
                  })}
                </div>
              )}
              <button className="primary-btn" style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Schedule
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            {statData.map(s => (
              <div key={s.label} className="stat-card" style={{ background: s.bg, borderRadius: 14, padding: "20px 22px", border: `1px solid ${s.border}`, backdropFilter: t.glass ? "blur(10px)" : "none", display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</span>
                <div style={{ fontFamily: t.titleFont, fontSize: isDark ? 28 : 36, fontWeight: isDark ? 800 : 700, color: s.accent, lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", backdropFilter: t.glass ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 110px 90px 90px 110px 110px 110px 110px 100px 80px", padding: "12px 22px", background: t.tableHeader, borderBottom: `1px solid ${t.surfaceBorder}`, alignItems: "center" }}>
              <input type="checkbox" checked={selected.size === schedules.length && schedules.length > 0} onChange={toggleAll} style={{ accentColor: t.checkActive, width: 14, height: 14 }} />
              {["ID", "CONTRACT", "LINKED", "DUE DATE", "TYPE", "PRINCIPAL", "PAYMENT", "STATUS", "ACTIONS"].map(col => (
                <div key={col} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "1px", color: isDark ? "rgba(255,255,255,0.3)" : "#C4C0BA", textTransform: "uppercase", fontFamily: t.monoFont }}>{col}</div>
              ))}
            </div>

            {schedules.map((s, i) => {
              const sc = statusCfg(s.status, isDark);
              const isHov = hoveredRow === s.id;
              const isSel = selected.has(s.id);
              return (
                <div key={s.id} className="data-row" onMouseEnter={() => setHoveredRow(s.id)} onMouseLeave={() => setHoveredRow(null)}
                  style={{ display: "grid", gridTemplateColumns: "40px 110px 90px 90px 110px 110px 110px 110px 100px 80px", padding: "12px 22px", borderBottom: i < schedules.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isSel ? (isDark ? "rgba(52,211,153,0.04)" : "#F0FDF4") : isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
                  <input type="checkbox" checked={isSel} onChange={() => toggleRow(s.id)} style={{ accentColor: t.checkActive, width: 14, height: 14 }} onClick={e => e.stopPropagation()} />
                  <div style={{ fontFamily: t.monoFont, fontSize: 11, color: t.idText }}>{s.id}</div>
                  <div style={{ fontFamily: t.monoFont, fontSize: 11.5, color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 500 }}>{s.contract}</div>
                  <div style={{ fontFamily: t.monoFont, fontSize: 11, color: t.textMuted }}>{s.linked || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
                  <div style={{ fontFamily: t.monoFont, fontSize: 12, color: isDark ? "rgba(255,255,255,0.7)" : "#44403C" }}>{s.dueDate}</div>
                  <div style={{ fontSize: 12.5, color: t.textMuted }}>{s.type}</div>
                  <div style={{ fontFamily: t.monoFont, fontSize: 12, color: t.textMuted }}>{s.principal}</div>
                  <div style={{ fontFamily: t.monoFont, fontSize: 12.5, fontWeight: 700, color: isDark ? "#60A5FA" : "#4F46E5" }}>{s.payment}</div>
                  <div><span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{s.status}</span></div>
                  <div style={{ display: "flex", gap: 6, opacity: isHov ? 1 : (isDark ? 0.4 : 0), transition: "opacity 0.15s ease" }}>
                    <button className="action-btn" style={{ width: 30, height: 30, borderRadius: 7, background: t.editBtnBg, color: t.editBtnColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✎</button>
                    <button className="action-btn" style={{ width: 30, height: 30, borderRadius: 7, background: t.deleteBtnBg, color: t.deleteBtnColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⊗</button>
                  </div>
                </div>
              );
            })}
            {schedules.length === 0 && <div style={{ padding: "48px", textAlign: "center", color: t.textMuted, fontSize: 13 }}>No schedules found.</div>}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: t.textSubtle }}>
              Showing <strong style={{ color: t.textSecondary }}>{schedules.length}</strong> of <strong style={{ color: t.textSecondary }}>{schedules.length}</strong> schedules
              {selected.size > 0 && <span style={{ color: t.accent, marginLeft: 8 }}>· {selected.size} selected</span>}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {["‹", "1", "2", "3", "›"].map((p, i) => (
                <span key={i} style={{ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: i === 1 ? 700 : 400, background: i === 1 ? t.pageBtnActive : t.pageBtnBg, color: i === 1 ? t.pageBtnActiveTxt : t.pageBtnText, border: `1px solid ${i === 1 ? t.pageBtnActive : t.pageBtnBorder}`, cursor: "pointer" }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AVG Cashflow Management — Utilities
 * Theme tokens, constants, helper functions, avatar/badge utilities.
 */

// ─────────────────────────────────────────────────────────────────────────────
// THEME TOKENS
// ─────────────────────────────────────────────────────────────────────────────
export const mkTheme = (isDark) => isDark ? {
  body: "radial-gradient(ellipse at 20% 50%, #0d1f2d 0%, #080f1a 60%, #050c15 100%)",
  sidebar: "rgba(255,255,255,0.03)", sidebarBorder: "rgba(255,255,255,0.06)",
  topbar: "rgba(255,255,255,0.02)", topbarBorder: "rgba(255,255,255,0.06)",
  surface: "rgba(255,255,255,0.02)", surfaceBorder: "rgba(255,255,255,0.07)",
  tableHeader: "rgba(255,255,255,0.04)", rowDivider: "rgba(255,255,255,0.04)", rowHover: "rgba(255,255,255,0.04)",
  text: "#e2e8f0", textMuted: "rgba(255,255,255,0.7)", textSubtle: "rgba(255,255,255,0.6)", textSecondary: "rgba(255,255,255,0.75)",
  accent: "#34D399", accentGrad: "linear-gradient(135deg,#34D399,#059669)", accentShadow: "rgba(52,211,153,0.35)",
  logoGrad: "linear-gradient(135deg,#34D399,#059669)", logoShadow: "0 4px 12px rgba(52,211,153,0.3)",
  navActive: "rgba(52,211,153,0.1)", navActiveText: "#34D399", navActivePill: "#34D399",
  navHover: "rgba(255,255,255,0.07)", navText: "rgba(255,255,255,0.75)",
  breadcrumb: "rgba(255,255,255,0.6)", breadcrumbActive: "#34D399",
  searchBg: "rgba(255,255,255,0.05)", searchBorder: "rgba(255,255,255,0.1)", searchText: "#fff",
  searchFocus: "rgba(52,211,153,0.5)", searchShadow: "rgba(52,211,153,0.1)", searchPh: "rgba(255,255,255,0.6)", searchIcon: "rgba(255,255,255,0.6)",
  idText: "rgba(255,255,255,0.6)", editBtn: ["rgba(96,165,250,0.12)", "#60A5FA"], deleteBtn: ["rgba(248,113,113,0.12)", "#F87171"],
  logoutBg: "rgba(248,113,113,0.1)", logoutBorder: "rgba(248,113,113,0.2)", logoutText: "#F87171",
  pageBtnActive: "#34D399", pageBtnActiveTxt: "#050c15", pageBtnBg: "rgba(255,255,255,0.04)", pageBtnBorder: "rgba(255,255,255,0.08)", pageBtnText: "rgba(255,255,255,0.75)",
  scrollTrack: "transparent", scrollThumb: "rgba(255,255,255,0.1)",
  barTrack: "rgba(255,255,255,0.06)", chipBg: "rgba(255,255,255,0.04)", chipBorder: "rgba(255,255,255,0.08)",
  tagBg: "rgba(52,211,153,0.12)", tagColor: "#34D399", tagBorder: "rgba(52,211,153,0.25)",
  addItemBg: "rgba(167,139,250,0.12)", addItemColor: "#A78BFA", addItemBorder: "rgba(167,139,250,0.25)",
  checkActive: "#34D399", successGrad: "linear-gradient(135deg,#34D399,#059669)", successShadow: "rgba(52,211,153,0.3)",
  bulkBg: "rgba(255,255,255,0.04)", bulkBorder: "rgba(255,255,255,0.08)",
  glass: true, sidebarShadow: "none", tableShadow: "none",
  font: "'DM Sans','Segoe UI',sans-serif", titleFont: "'Syne',sans-serif", mono: "'JetBrains Mono',monospace",
  titleSize: 30, titleWeight: 800, titleTracking: "-1px",
} : {
  body: "#F8F7F4", sidebar: "#FFFFFF", sidebarBorder: "#EAE8E4",
  topbar: "#FFFFFF", topbarBorder: "#EAE8E4",
  surface: "#FFFFFF", surfaceBorder: "#EAE8E4",
  tableHeader: "#FAFAF9", rowDivider: "#F5F4F1", rowHover: "#FAFAF9",
  text: "#1C1917", textMuted: "#57534E", textSubtle: "#78716C", textSecondary: "#44403C",
  accent: "#4F46E5", accentGrad: "linear-gradient(135deg,#4F46E5,#7C3AED)", accentShadow: "rgba(79,70,229,0.25)",
  logoGrad: "linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)", logoShadow: "0 4px 14px rgba(79,70,229,0.35)",
  navActive: "#EEF2FF", navActiveText: "#4F46E5", navActivePill: "#4F46E5",
  navHover: "rgba(79,70,229,0.06)", navText: "#44403C",
  breadcrumb: "#57534E", breadcrumbActive: "#4F46E5",
  searchBg: "#FFFFFF", searchBorder: "#E5E3DF", searchText: "#292524",
  searchFocus: "#A5B4FC", searchShadow: "rgba(165,180,252,0.25)", searchPh: "#78716C", searchIcon: "#78716C",
  idText: "#78716C", editBtn: ["#EEF2FF", "#4F46E5"], deleteBtn: ["#FEF2F2", "#DC2626"],
  logoutBg: "#FFF7ED", logoutBorder: "#FED7AA", logoutText: "#C2410C",
  pageBtnActive: "#4F46E5", pageBtnActiveTxt: "#fff", pageBtnBg: "#FFFFFF", pageBtnBorder: "#E5E3DF", pageBtnText: "#44403C",
  scrollTrack: "#F1F0EE", scrollThumb: "#D1CFC9",
  barTrack: "#F1F0EE", chipBg: "#FFFFFF", chipBorder: "#E5E3DF",
  tagBg: "#EEF2FF", tagColor: "#4F46E5", tagBorder: "#C7D2FE",
  addItemBg: "#F5F3FF", addItemColor: "#7C3AED", addItemBorder: "#DDD6FE",
  checkActive: "#4F46E5", successGrad: "linear-gradient(135deg,#10B981,#059669)", successShadow: "rgba(16,185,129,0.25)",
  bulkBg: "#F1F5F9", bulkBorder: "#E2E8F0",
  glass: false, sidebarShadow: "2px 0 12px rgba(0,0,0,0.04)", tableShadow: "0 2px 12px rgba(0,0,0,0.05)",
  font: "'Plus Jakarta Sans','Inter',sans-serif", titleFont: "'Cormorant Garamond',serif", mono: "'JetBrains Mono',monospace",
  titleSize: 38, titleWeight: 700, titleTracking: "-1.5px",
};

const NAV_ITEMS = [
  { label: "Dashboard", icon: "⬡" },
  { label: "Projects", icon: "▦" },
  { label: "Parties", icon: "◎" },
  { label: "Contracts", icon: "◈" },
  { label: "Payment Schedule", icon: "▤" },
  { label: "Payments", icon: "◇" },
  { label: "Fees", icon: "◉" },
  { label: "Tenants", icon: "🏢", superOnly: true },
  { label: "Users", icon: "👥", adminOnly: true },
  { label: "Roles", icon: "🛡️", adminOnly: true },
  { label: "Super Admin", icon: "⚡", superOnly: true },
  { label: "Dimensions", icon: "⊞" },
  { label: "Reports", icon: "╱╲" },
  { label: "Profile", icon: "👤", hidden: true },
];

export const getNav = (isSuper, isAdmin, hasPermission) => {
  return NAV_ITEMS.filter(item => {
    if (item.hidden) return false;
    if (item.superOnly && !isSuper) return false;
    if (item.adminOnly && !isAdmin && !isSuper) return false;

    // Apply granular RBAC per section if not a super admin
    if (!isSuper && hasPermission) {
      if (item.label === "Projects" && !hasPermission("PROJECT_VIEW")) return false;
      if (item.label === "Parties" && !hasPermission("TENANT_VIEW")) return false;
      if (item.label === "Contracts" && !hasPermission("CONTRACT_VIEW")) return false;
      if (item.label === "Payment Schedule" && !hasPermission("PAYMENT_SCHEDULE_VIEW")) return false;
      if (item.label === "Payments" && !hasPermission("PAYMENT_SCHEDULE_VIEW")) return false;
      if (item.label === "Fees" && !hasPermission("FEE_VIEW")) return false;
      if (item.label === "Users" && !hasPermission("USER_VIEW")) return false;
      if (item.label === "Roles" && !hasPermission("ROLE_VIEW")) return false;
      if (item.label === "Tenants" && !hasPermission("PLATFORM_TENANT_VIEW")) return false;
      if (item.label === "Dimensions" && !hasPermission("DIMENTION_VIEW")) return false;
      if (item.label === "Reports" && !hasPermission("REPORT_VIEW")) return false;
    }

    return true;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE COLLECTION PATHS
// ─────────────────────────────────────────────────────────────────────────────
export const getCollectionPaths = (tenantId) => {
  const tenantPath = `tenants/${tenantId}`;
  return {
    projects: `${tenantPath}/projects`,
    parties: `${tenantPath}/parties`,
    contracts: `${tenantPath}/contracts`,
    paymentSchedules: `${tenantPath}/paymentSchedules`,
    payments: `${tenantPath}/payments`,
    fees: `${tenantPath}/fees`,
    users: `${tenantPath}/users`,
    roles: `${tenantPath}/roles`,
    tenants: "tenants",
    dimensions: "dimensions",
  };
};
// Dimension styling config — items come from Firestore, colors are local
export const DIM_STYLES = {
  "Contract Type": { accent: d => d ? "#60A5FA" : "#3B82F6", bg: d => d ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: d => d ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
  "Payment Frequency": { accent: d => d ? "#34D399" : "#059669", bg: d => d ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: d => d ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
  "Payment Status": { accent: d => d ? "#FBBF24" : "#D97706", bg: d => d ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: d => d ? "rgba(251,191,36,0.15)" : "#FDE68A" },
  "Contract Status": { accent: d => d ? "#A78BFA" : "#7C3AED", bg: d => d ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: d => d ? "rgba(167,139,250,0.15)" : "#DDD6FE" },
  "Payment Type": { accent: d => d ? "#F472B6" : "#BE185D", bg: d => d ? "rgba(244,114,182,0.08)" : "#FDF2F8", border: d => d ? "rgba(244,114,182,0.15)" : "#FBCFE8" },
  "Calculation Method": { accent: d => d ? "#2DD4BF" : "#0F766E", bg: d => d ? "rgba(45,212,191,0.08)" : "#F0FDFA", border: d => d ? "rgba(45,212,191,0.15)" : "#99F6E4" },
  "Currency": { accent: d => d ? "#FB923C" : "#C2410C", bg: d => d ? "rgba(251,146,60,0.08)" : "#FFF7ED", border: d => d ? "rgba(251,146,60,0.15)" : "#FED7AA" },
  "Party Type": { accent: d => d ? "#F87171" : "#DC2626", bg: d => d ? "rgba(248,113,113,0.08)" : "#FEF2F2", border: d => d ? "rgba(248,113,113,0.15)" : "#FECACA" },
};
export const DEFAULT_DIM_STYLE = { accent: d => d ? "#A8A29E" : "#78716C", bg: d => d ? "rgba(255,255,255,0.05)" : "#F9FAFB", border: d => d ? "rgba(255,255,255,0.1)" : "#E5E7EB" };
export const MONTHLY = [
  { month: "Jul", received: 48200, disbursed: 0 }, { month: "Aug", received: 52400, disbursed: 25000 },
  { month: "Sep", received: 61500, disbursed: 0 }, { month: "Oct", received: 44800, disbursed: 18000 },
  { month: "Nov", received: 57200, disbursed: 0 }, { month: "Dec", received: 463583, disbursed: 0 },
  { month: "Jan", received: 51000, disbursed: 0 }, { month: "Feb", received: 10358, disbursed: 25000 },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export const initials = name => name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

// --- Robust Payment Calculation Helpers ---
export const normalizeDateAtNoon = (date) => {
  if (!date) return null;
  let d;
  if (typeof date === "string") {
    const parts = date.split(/[-/ \.]/);
    if (parts.length >= 3) {
      let year, month, day;
      if (parts[0].length === 4) { // YYYY-MM-DD
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else if (parts[2].length === 4) { // MM/DD/YYYY
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      } else {
        d = new Date(date);
        d.setHours(12, 0, 0, 0);
        return d;
      }
      return new Date(year, month, day, 12, 0, 0);
    }
  }
  d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
};

export const hybridDays = (startDate, quarterEnd) => {
  const start = new Date(startDate);
  const end = new Date(quarterEnd);
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    const isMonthEnd = (dt) => {
      const nextDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
      return dt.getDate() === nextDay.getDate();
    };
    if (start.getDate() === 1 && isMonthEnd(end)) return 30;
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  }
  const isMonthEnd = (dt) => {
    const nextDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
    return dt.getDate() === nextDay.getDate();
  };
  const quarterEndIsMonthEnd = isMonthEnd(end);
  const firstMonthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const daysFirstPart = Math.floor((firstMonthEnd - start) / (1000 * 60 * 60 * 24));
  let totalDays = daysFirstPart;
  let d = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  while (d <= end) {
    if (d.getMonth() === end.getMonth() && d.getFullYear() === end.getFullYear()) {
      if (quarterEndIsMonthEnd) totalDays += 30;
      else totalDays += Math.floor((end - d) / (1000 * 60 * 60 * 24));
      break;
    } else {
      totalDays += 30;
    }
    d.setMonth(d.getMonth() + 1);
  }
  return totalDays;
};

export const pmtCalculator_ACT360_30360 = (periodStart, periodEnd, investDate, investAmount, interestRate, frequency) => {
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);
  const iDate = new Date(investDate);
  if (pEnd <= iDate) return 0;
  else if (pStart < iDate && pEnd > iDate) {
    return investAmount * (interestRate / 360) * hybridDays(iDate, pEnd);
  } else {
    let periodsPerYear = 1;
    const f = frequency ? frequency.toLowerCase() : "";
    if (f.includes("month")) periodsPerYear = 12;
    else if (f.includes("quart")) periodsPerYear = 4;
    else if (f.includes("semi")) periodsPerYear = 2;
    else if (f.includes("annu")) periodsPerYear = 1;
    else return investAmount * (interestRate / 360) * hybridDays(pStart, pEnd);
    return investAmount * (interestRate / periodsPerYear);
  }
};

export const getFeeFrequencyString = (ca) => {
  const l = (ca || "").toLowerCase();
  if (l.includes("month")) return "Monthly";
  if (l.includes("quart")) return "Quarterly";
  if (l.includes("semi")) return "Semi-Annual";
  if (l.includes("year")) return "Annual";
  return "Monthly";
};

export const feeCalculator_ACT360_30360 = (fee, principal, startDate, endDate, investDate) => {
  if (!fee) return 0;
  const { method, rate, frequency, fee_charge_at } = fee;
  const defaultRate = parseFloat(String(rate).replace(/[^0-9.\-]/g, ""));
  if (isNaN(defaultRate)) return 0;
  if (method === "% of Amount") {
    if (frequency === "One_Time") return (defaultRate / 100) * principal;
    else {
      const freqStr = getFeeFrequencyString(fee_charge_at);
      return pmtCalculator_ACT360_30360(startDate, endDate, investDate, principal, defaultRate / 100, freqStr);
    }
  } else if (method === "Fixed Amount") return defaultRate;
  return 0;
};

export const getFrequencyValue = (freq) => {
  if (!freq) return 1;
  const f = freq.toLowerCase();
  if (f.includes("month")) return 12;
  if (f.includes("quart")) return 4;
  if (f.includes("semi")) return 2;
  if (f.includes("annu")) return 1;
  return 1;
};

export const sortData = (data, sortConfig) => {
  if (!sortConfig || !sortConfig.key) return data;
  return [...data].sort((a, b) => {
    let aV = a[sortConfig.key], bV = b[sortConfig.key];
    if (aV === null || aV === undefined) aV = ""; if (bV === null || bV === undefined) bV = "";
    const aS = String(aV), bS = String(bV);
    const parse = s => Number(s.replace(/[^0-9.-]/g, ""));
    const isN = s => /^-?\$?[\d,]+(\.\d+)?%?$/.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parse(s));
    if (isN(aS) && isN(bS)) {
      const an = parse(aS), bn = parse(bS);
      return sortConfig.direction === "asc" ? an - bn : bn - an;
    }
    return sortConfig.direction === "asc" ? aS.localeCompare(bS, undefined, { numeric: true, sensitivity: 'base' }) : bS.localeCompare(aS, undefined, { numeric: true, sensitivity: 'base' });
  });
};
export const avatarDark = ["rgba(52,211,153,0.15)", "rgba(96,165,250,0.15)", "rgba(251,146,60,0.15)", "rgba(244,114,182,0.15)", "rgba(167,139,250,0.15)", "rgba(251,191,36,0.15)", "rgba(45,212,191,0.15)", "rgba(248,113,113,0.15)"];
export const avatarDarkC = ["#34D399", "#60A5FA", "#FB923C", "#F472B6", "#A78BFA", "#FBBF24", "#2DD4BF", "#F87171"];
export const avatarLight = [{ bg: "#E0E7FF", c: "#4338CA" }, { bg: "#FCE7F3", c: "#9D174D" }, { bg: "#D1FAE5", c: "#065F46" }, { bg: "#FEF3C7", c: "#92400E" }, { bg: "#DBEAFE", c: "#1E40AF" }, { bg: "#FEE2E2", c: "#991B1B" }, { bg: "#F3E8FF", c: "#6B21A8" }, { bg: "#CCFBF1", c: "#0F766E" }];
export const hashN = (s, n) => { let h = 0; for (let c of s) h = (h + c.charCodeAt(0)) % n; return h; };
export const av = (name, isDark) => isDark
  ? { bg: avatarDark[hashN(name, 8)], c: avatarDarkC[hashN(name, 8)] }
  : avatarLight[hashN(name, 8)].c ? { bg: avatarLight[hashN(name, 8)].bg, c: avatarLight[hashN(name, 8)].c } : { bg: "#E0E7FF", c: "#4338CA" };

export const badge = (status, isDark) => ({
  Active: [isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5", isDark ? "#34D399" : "#059669", isDark ? "rgba(52,211,153,0.3)" : "#A7F3D0"],
  Open: [isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF", isDark ? "#60A5FA" : "#2563EB", isDark ? "rgba(96,165,250,0.3)" : "#BFDBFE"],
  Closed: [isDark ? "rgba(255,255,255,0.07)" : "#F9FAFB", isDark ? "rgba(255,255,255,0.4)" : "#6B7280", isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB"],
  Due: [isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB", isDark ? "#FBBF24" : "#D97706", isDark ? "rgba(251,191,36,0.3)" : "#FDE68A"],
  Paid: [isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5", isDark ? "#34D399" : "#059669", isDark ? "rgba(52,211,153,0.3)" : "#A7F3D0"],
  Missed: [isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2", isDark ? "#F87171" : "#DC2626", isDark ? "rgba(248,113,113,0.3)" : "#FECACA"],
  Overdue: [isDark ? "rgba(249,115,22,0.15)" : "#FFF7ED", isDark ? "#FB923C" : "#C2410C", isDark ? "rgba(249,115,22,0.3)" : "#FED7AA"],
  Pending: [isDark ? "rgba(167,139,250,0.15)" : "#F5F3FF", isDark ? "#A78BFA" : "#7C3AED", isDark ? "rgba(167,139,250,0.3)" : "#DDD6FE"],
  Partial: [isDark ? "rgba(56,189,248,0.15)" : "#F0F9FF", isDark ? "#38BDF8" : "#0284C7", isDark ? "rgba(56,189,248,0.3)" : "#BAE6FD"],
  Cancelled: [isDark ? "rgba(244,114,182,0.15)" : "#FDF2F8", isDark ? "#F472B6" : "#DB2777", isDark ? "rgba(244,114,182,0.3)" : "#FBCFE8"],
  Waived: [isDark ? "rgba(148,163,184,0.15)" : "#F8FAFC", isDark ? "#94A3B8" : "#475569", isDark ? "rgba(148,163,184,0.3)" : "#CBD5E1"],
  Scheduled: [isDark ? "rgba(45,212,191,0.15)" : "#F0FDFA", isDark ? "#2DD4BF" : "#0D9488", isDark ? "rgba(45,212,191,0.3)" : "#99F6E4"],
  Investor: [isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5", isDark ? "#34D399" : "#059669", isDark ? "rgba(52,211,153,0.3)" : "#A7F3D0"],
  Borrower: [isDark ? "rgba(251,146,60,0.15)" : "#FFF7ED", isDark ? "#FB923C" : "#C2410C", isDark ? "rgba(251,146,60,0.3)" : "#FED7AA"],
})[status] || [isDark ? "rgba(148,163,184,0.1)" : "#F1F5F9", isDark ? "#94A3B8" : "#64748B", isDark ? "rgba(148,163,184,0.2)" : "#CBD5E1"];

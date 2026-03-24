import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
/**
 * AVG Cashflow Management — Utilities
 * Theme tokens, constants, helper functions, avatar/badge utilities.
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export const fmtCurr = n => {
  if (n == null || n === "") return "";
  const num = Number(String(n).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return String(n);
  const sign = num < 0 ? "-" : "";
  return sign + "$" + Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


export const mkId = (pre = "S") => `${pre}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

// THEME TOKENS
// ─────────────────────────────────────────────────────────────────────────────
export const mkTheme = (isDark) => isDark ? {
  body: "radial-gradient(ellipse at 50% 50%, #0c182d 0%, #050c15 100%)",
  sidebar: "rgba(255,255,255,0.03)", sidebarBorder: "rgba(255,255,255,0.06)",
  topbar: "rgba(255,255,255,0.02)", topbarBorder: "rgba(255,255,255,0.06)",
  surface: "rgba(255,255,255,0.02)", surfaceBorder: "rgba(255,255,255,0.07)",
  tableHeader: "#0F172A", rowDivider: "rgba(255,255,255,0.04)", columnDivider: "rgba(255,255,255,0.06)", rowHover: "rgba(255,255,255,0.04)",
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
  tooltipBg: "rgba(17, 24, 39, 0.95)", tooltipText: "#FFFFFF", tooltipBorder: "rgba(255, 255, 255, 0.1)", tooltipShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
  glass: true, sidebarShadow: "none", tableShadow: "none",
  font: "'DM Sans','Segoe UI',sans-serif", titleFont: "'Syne',sans-serif", mono: "'JetBrains Mono',monospace",
  titleSize: 30, titleWeight: 800, titleTracking: "-1px",
} : {
  body: "#F8F7F4", sidebar: "#FFFFFF", sidebarBorder: "#EAE8E4",
  topbar: "#FFFFFF", topbarBorder: "#EAE8E4",
  surface: "#FFFFFF", surfaceBorder: "#EAE8E4",
  tableHeader: "#FAFAF9", rowDivider: "#F5F4F1", columnDivider: "#E8E6E2", rowHover: "#FAFAF9",
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
  tooltipBg: "rgba(31, 41, 55, 0.95)", tooltipText: "#FFFFFF", tooltipBorder: "rgba(255, 255, 255, 0.2)", tooltipShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
  glass: false, sidebarShadow: "2px 0 12px rgba(0,0,0,0.04)", tableShadow: "0 2px 12px rgba(0,0,0,0.05)",
  font: "'Plus Jakarta Sans','Inter',sans-serif", titleFont: "'Cormorant Garamond',serif", mono: "'JetBrains Mono',monospace",
  titleSize: 38, titleWeight: 700, titleTracking: "-1.5px",
};

const NAV_ITEMS = [
  { label: "Dashboard", icon: "LayoutDashboard" },
  {
    label: "Investor Portal",
    icon: "Briefcase",
    expandable: true,
    children: [
      { label: "Deals", icon: "LayoutGrid" },
    ]
  },
  {
    label: "Settings",
    icon: "Settings",
    expandable: true,
    children: [
      { label: "Fees", icon: "CircleDollarSign" },
      { label: "User Profiles", icon: "UserSquare" },
    ]
  },
  {
    label: "Administration",
    icon: "ShieldAlert",
    expandable: true,
    children: [
      { label: "Tenants", icon: "Building2" },
      { label: "Role Types", icon: "ShieldCheck" },
      { label: "User Admin", icon: "UserPlus" },
      { label: "AI Admin", icon: "Bot" },
      { label: "Dimensions", icon: "Box" },
      { label: "Reports", icon: "BarChart3" },
      { label: "Contacts", icon: "Users" },
      { label: "Investments", icon: "Coins" },
      { label: "Payment Schedule", icon: "CalendarDays" },
      { label: "Payments", icon: "CreditCard" },
    ]
  },
  { label: "Profile", icon: "User", hidden: true },
];

export const getNav = (isSuper, isAdmin, hasPermission, isR10010) => {
  // Helper function to check if a single item should be visible
  const isItemVisible = (item) => {
    if (item.hidden) return false;

    // User Admin section is restricted ONLY to R10010 role
    if (item.label === "User Admin") return isR10010;

    // AI Admin restricted to Super Admins (you can change this to global roles if needed)
    if (item.label === "AI Admin") return isSuper;

    if (isSuper) return true; // Super Admins always see everything else

    if (!hasPermission) return false;

    // Granular RBAC per section
    if (item.label === "Dashboard" && !hasPermission("DASHBOARD_VIEW")) return false;
    if (item.label === "Deals" && !hasPermission("DEAL_VIEW")) return false;
    if (item.label === "Contacts") {
      const hasContact = hasPermission("CONTACT_VIEW") || hasPermission("PARTY_VIEW");
      if (!hasContact) return false;
    }
    if (item.label === "Investments") {
      const hasInvest = hasPermission("INVESTMENT_VIEW") || hasPermission("CONTRACT_VIEW");
      if (!hasInvest) return false;
    }
    if (item.label === "Payment Schedule" && !hasPermission("PAYMENT_SCHEDULE_VIEW")) return false;
    if (item.label === "Payments" && !hasPermission("PAYMENT_VIEW")) return false;
    if (item.label === "Fees" && !hasPermission("FEE_VIEW")) return false;
    if (item.label === "User Profiles" && !hasPermission("USER_PROFILE_VIEW")) return false;
    if (item.label === "Role Types" && !hasPermission("ROLE_TYPE_VIEW")) return false;
    if (item.label === "Tenants" && !(hasPermission("PLATFORM_TENANT_VIEW") || hasPermission("TENANT_VIEW"))) return false;
    if (item.label === "Dimensions" && !(hasPermission("DIMENSION_VIEW") || hasPermission("DIMENTION_VIEW"))) return false;
    if (item.label === "Reports" && !hasPermission("REPORT_VIEW")) return false;

    return true;
  };

  // Process items and filter children
  const nav = NAV_ITEMS.map(item => {
    // If item has children, filter them
    if (item.children) {
      const visibleChildren = item.children.filter(isItemVisible);
      // Only include parent if it has visible children
      if (visibleChildren.length === 0) return null;
      return { ...item, children: visibleChildren };
    }
    return item;
  }).filter(item => item && isItemVisible(item));

  if (typeof window !== 'undefined') window.__NAV__ = nav;
  return nav;
};

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE COLLECTION PATHS
// ─────────────────────────────────────────────────────────────────────────────
export const getCollectionPaths = (tenantId) => {
  const tenantPath = `tenants/${tenantId}`;
  return {
    deals: `${tenantPath}/deals`,
    parties: `${tenantPath}/parties`,
    investments: `${tenantPath}/investments`,
    paymentSchedules: `${tenantPath}/paymentSchedules`,
    payments: `${tenantPath}/payments`,
    fees: `${tenantPath}/fees`,
    users: `${tenantPath}/users`,
    achBatches: `${tenantPath}/achBatches`,
    ledger: `${tenantPath}/ledger`,
    distributionBatches: `${tenantPath}/distributionBatches`,
    roles: "role_types",
    tenants: "tenants",
    dimensions: "dimensions",
  };
};
// Dimension styling config — items come from Firestore, colors are local
export const DIM_STYLES = {
  "Investment Type": { accent: d => d ? "#60A5FA" : "#3B82F6", bg: d => d ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: d => d ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
  "ScheduleFrequency": { accent: d => d ? "#34D399" : "#059669", bg: d => d ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: d => d ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
  "ScheduleStatus": { accent: d => d ? "#FBBF24" : "#D97706", bg: d => d ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: d => d ? "rgba(251,191,36,0.15)" : "#FDE68A" },
  "PaymentStatus": { accent: d => d ? "#10B981" : "#059669", bg: d => d ? "rgba(16,185,129,0.08)" : "#ECFDF5", border: d => d ? "rgba(16,185,129,0.15)" : "#A7F3D0" },
  "ACHBatchStatus": { accent: d => d ? "#6366F1" : "#4338CA", bg: d => d ? "rgba(99,102,241,0.08)" : "#EEF2FF", border: d => d ? "rgba(99,102,241,0.15)" : "#C7D2FE" },
  "Investment Status": { accent: d => d ? "#A78BFA" : "#7C3AED", bg: d => d ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: d => d ? "rgba(167,139,250,0.15)" : "#DDD6FE" },
  "Payment Type": { accent: d => d ? "#F472B6" : "#BE185D", bg: d => d ? "rgba(244,114,182,0.08)" : "#FDF2F8", border: d => d ? "rgba(244,114,182,0.15)" : "#FBCFE8" },
  "Calculation Method": { accent: d => d ? "#2DD4BF" : "#0F766E", bg: d => d ? "rgba(45,212,191,0.08)" : "#F0FDFA", border: d => d ? "rgba(45,212,191,0.15)" : "#99F6E4" },
  "Currency": { accent: d => d ? "#FB923C" : "#C2410C", bg: d => d ? "rgba(251,146,60,0.08)" : "#FFF7ED", border: d => d ? "rgba(251,146,60,0.15)" : "#FED7AA" },
  "Contact Type": { accent: d => d ? "#F87171" : "#DC2626", bg: d => d ? "rgba(248,113,113,0.08)" : "#FEF2F2", border: d => d ? "rgba(248,113,113,0.15)" : "#FECACA" },
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
  // Handle Firestore Timestamp objects
  if (date && typeof date.toDate === "function") {
    const d = date.toDate();
    d.setHours(12, 0, 0, 0);
    return d;
  }
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
      }
      if (year !== undefined) {
        d = new Date(year, month, day, 12, 0, 0);
        return isNaN(d.getTime()) ? null : d;
      }
    }
  }
  d = new Date(date);
  if (isNaN(d.getTime())) return null;
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

  let periodsPerYear = 1;
  const f = frequency ? frequency.toLowerCase() : "";
  if (f.includes("month")) periodsPerYear = 12;
  else if (f.includes("quart")) periodsPerYear = 4;
  else if (f.includes("semi")) periodsPerYear = 2;
  else if (f.includes("annu")) periodsPerYear = 1;

  if (pStart < iDate && pEnd > iDate) {
    // Initial Proration
    return investAmount * (interestRate / 360) * hybridDays(iDate, pEnd);
  } else {
    const expectedDays = 360 / periodsPerYear;
    const actualDays = hybridDays(pStart, pEnd);
    // Prorate if actual days is less than what's expected for a full period (e.g. 90 days for quarterly)
    if (actualDays > 0 && actualDays < expectedDays) {
      return investAmount * (interestRate / 360) * actualDays;
    }
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
  Rollover: [isDark ? "rgba(79,70,229,0.15)" : "#EEF2FF", isDark ? "#818CF8" : "#4F46E5", isDark ? "rgba(79,70,229,0.3)" : "#C7D2FE"],
  Scheduled: [isDark ? "rgba(45,212,191,0.15)" : "#F0FDFA", isDark ? "#2DD4BF" : "#0D9488", isDark ? "rgba(45,212,191,0.3)" : "#99F6E4"],
  Investor: [isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5", isDark ? "#34D399" : "#059669", isDark ? "rgba(52,211,153,0.3)" : "#A7F3D0"],
  Borrower: [isDark ? "rgba(251,146,60,0.15)" : "#FFF7ED", isDark ? "#FB923C" : "#C2410C", isDark ? "rgba(251,146,60,0.3)" : "#FED7AA"],
})[status] || [isDark ? "rgba(148,163,184,0.1)" : "#F1F5F9", isDark ? "#94A3B8" : "#64748B", isDark ? "rgba(148,163,184,0.2)" : "#CBD5E1"];

/**
 * AVG Cashflow Management — Unified React App
 * Single-file SPA: all 9 pages, working sidebar navigation, shared dark/light toggle.
 */
import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const mkTheme = (isDark) => isDark ? {
  body: "radial-gradient(ellipse at 20% 50%, #0d1f2d 0%, #080f1a 60%, #050c15 100%)",
  sidebar: "rgba(255,255,255,0.03)", sidebarBorder: "rgba(255,255,255,0.06)",
  topbar: "rgba(255,255,255,0.02)", topbarBorder: "rgba(255,255,255,0.06)",
  surface: "rgba(255,255,255,0.02)", surfaceBorder: "rgba(255,255,255,0.07)",
  tableHeader: "rgba(255,255,255,0.04)", rowDivider: "rgba(255,255,255,0.04)", rowHover: "rgba(255,255,255,0.04)",
  text: "#e2e8f0", textMuted: "rgba(255,255,255,0.35)", textSubtle: "rgba(255,255,255,0.3)", textSecondary: "rgba(255,255,255,0.4)",
  accent: "#34D399", accentGrad: "linear-gradient(135deg,#34D399,#059669)", accentShadow: "rgba(52,211,153,0.35)",
  logoGrad: "linear-gradient(135deg,#34D399,#059669)", logoShadow: "0 4px 12px rgba(52,211,153,0.3)",
  navActive: "rgba(52,211,153,0.1)", navActiveText: "#34D399", navActivePill: "#34D399",
  navHover: "rgba(255,255,255,0.07)", navText: "rgba(255,255,255,0.5)",
  breadcrumb: "rgba(255,255,255,0.3)", breadcrumbActive: "#34D399",
  searchBg: "rgba(255,255,255,0.05)", searchBorder: "rgba(255,255,255,0.1)", searchText: "#fff",
  searchFocus: "rgba(52,211,153,0.5)", searchShadow: "rgba(52,211,153,0.1)", searchPh: "rgba(255,255,255,0.3)", searchIcon: "rgba(255,255,255,0.3)",
  idText: "rgba(255,255,255,0.35)", editBtn: ["rgba(96,165,250,0.12)", "#60A5FA"], deleteBtn: ["rgba(248,113,113,0.12)", "#F87171"],
  logoutBg: "rgba(248,113,113,0.1)", logoutBorder: "rgba(248,113,113,0.2)", logoutText: "#F87171",
  pageBtnActive: "#34D399", pageBtnActiveTxt: "#050c15", pageBtnBg: "rgba(255,255,255,0.04)", pageBtnBorder: "rgba(255,255,255,0.08)", pageBtnText: "rgba(255,255,255,0.5)",
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
  text: "#1C1917", textMuted: "#A8A29E", textSubtle: "#C4C0BA", textSecondary: "#78716C",
  accent: "#4F46E5", accentGrad: "linear-gradient(135deg,#4F46E5,#7C3AED)", accentShadow: "rgba(79,70,229,0.25)",
  logoGrad: "linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)", logoShadow: "0 4px 14px rgba(79,70,229,0.35)",
  navActive: "#EEF2FF", navActiveText: "#4F46E5", navActivePill: "#4F46E5",
  navHover: "rgba(79,70,229,0.06)", navText: "#78716C",
  breadcrumb: "#A8A29E", breadcrumbActive: "#4F46E5",
  searchBg: "#FFFFFF", searchBorder: "#E5E3DF", searchText: "#292524",
  searchFocus: "#A5B4FC", searchShadow: "rgba(165,180,252,0.25)", searchPh: "#A8A29E", searchIcon: "#C4C0BA",
  idText: "#C4C0BA", editBtn: ["#EEF2FF", "#4F46E5"], deleteBtn: ["#FEF2F2", "#DC2626"],
  logoutBg: "#FFF7ED", logoutBorder: "#FED7AA", logoutText: "#C2410C",
  pageBtnActive: "#4F46E5", pageBtnActiveTxt: "#fff", pageBtnBg: "#FFFFFF", pageBtnBorder: "#E5E3DF", pageBtnText: "#78716C",
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

// ─────────────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────────────
const NAV = [
  { label: "Dashboard",        icon: "⬡" },
  { label: "Projects",         icon: "▦" },
  { label: "Parties",          icon: "◎" },
  { label: "Contracts",        icon: "◈" },
  { label: "Payment Schedule", icon: "▤" },
  { label: "Payments",         icon: "◇" },
  { label: "Fees",             icon: "◉" },
  { label: "Dimensions",       icon: "⊞" },
  { label: "Reports",          icon: "╱╲" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
const PARTIES = [
  { id:"M10000",name:"Pao Fu Chen",type:"Individual",role:"Investor",email:"avc@yahoo.com" },
  { id:"M10001",name:"Edward R. Brodersen",type:"Individual",role:"Investor",email:"" },
  { id:"M10002",name:"Gilberto",type:"Individual",role:"Borrower",email:"" },
  { id:"M10003",name:"Tina Lee",type:"Individual",role:"Investor",email:"" },
  { id:"M10004",name:"Suet Fong Yu Ho",type:"Individual",role:"Investor",email:"" },
  { id:"M10005",name:"Kies Capital Group",type:"Company",role:"Borrower",email:"" },
  { id:"M10006",name:"Kolina Lee",type:"Individual",role:"Investor",email:"" },
  { id:"M10007",name:"Peter & Rebecca Lu",type:"Individual",role:"Investor",email:"" },
  { id:"M10008",name:"Hsiu Ju Hsu Properties",type:"Company",role:"Investor",email:"" },
  { id:"M10009",name:"Justine Trieu",type:"Individual",role:"Investor",email:"" },
  { id:"M10010",name:"Anthony Hsu (Hsu Lu Hui)",type:"Individual",role:"Borrower",email:"" },
  { id:"M10011",name:"Mong Tung Lee",type:"Individual",role:"Investor",email:"" },
  { id:"M10012",name:"Samuel Chen (Chen Hui Chou)",type:"Individual",role:"Investor",email:"" },
  { id:"M10013",name:"Hata You",type:"Individual",role:"Investor",email:"" },
  { id:"M10014",name:"Annie Yeh",type:"Individual",role:"Investor",email:"" },
  { id:"M10015",name:"Ting Ting Yu",type:"Individual",role:"Borrower",email:"" },
  { id:"M10016",name:"Teck Chew",type:"Individual",role:"Investor",email:"" },
  { id:"M10017",name:"Yu Ying Lin",type:"Individual",role:"Investor",email:"" },
  { id:"M10018",name:"Daisy Chow",type:"Individual",role:"Investor",email:"" },
  { id:"M10019",name:"AVDE Fixed",type:"Company",role:"Investor",email:"" },
];
const PROJECTS = [
  { id:"PR10000",name:"Palm Springs Villas",status:"Active",currency:"USD",description:"Residential development",created:"2024-01-15" },
  { id:"PR10001",name:"Irvine Office Complex",status:"Active",currency:"USD",description:"Commercial office build-out",created:"2024-02-20" },
  { id:"PR10002",name:"San Diego Condo",status:"Active",currency:"USD",description:"Mixed-use condo tower",created:"2024-03-08" },
  { id:"PR10003",name:"Beverly Hills Estate",status:"Active",currency:"USD",description:"Luxury single-family home",created:"2024-04-01" },
  { id:"PR10004",name:"Riverside Warehouse",status:"Closed",currency:"USD",description:"Industrial storage facility",created:"2023-11-05" },
  { id:"PR10005",name:"Santa Monica Retail",status:"Active",currency:"USD",description:"High-street retail space",created:"2024-05-12" },
  { id:"PR10006",name:"Anaheim Hotel",status:"Closed",currency:"USD",description:"Boutique hotel renovation",created:"2023-09-18" },
];
const CONTRACTS = [
  { id:"C10000",project:"Palm Springs Villas",party:"Pao Fu Chen",type:"Loan",amount:"$450,000",rate:"10%",freq:"Monthly",status:"Active" },
  { id:"C10001",project:"Palm Springs Villas",party:"Edward R. Brodersen",type:"Loan",amount:"$200,000",rate:"9.5%",freq:"Quarterly",status:"Active" },
  { id:"C10002",project:"Irvine Office Complex",party:"Kies Capital Group",type:"Mortgage",amount:"$1,250,000",rate:"8%",freq:"Monthly",status:"Active" },
  { id:"C10003",project:"San Diego Condo",party:"Tina Lee",type:"Loan",amount:"$320,000",rate:"10%",freq:"Monthly",status:"Active" },
  { id:"C10004",project:"Beverly Hills Estate",party:"Suet Fong Yu Ho",type:"Equity",amount:"$500,000",rate:"12%",freq:"Semi-Annual",status:"Active" },
  { id:"C10005",project:"Riverside Warehouse",party:"Gilberto",type:"Loan",amount:"$180,000",rate:"11%",freq:"Monthly",status:"Closed" },
  { id:"C10006",project:"Santa Monica Retail",party:"Kolina Lee",type:"Loan",amount:"$270,000",rate:"9%",freq:"Quarterly",status:"Active" },
  { id:"C10007",project:"Palm Springs Villas",party:"Peter & Rebecca Lu",type:"Loan",amount:"$160,000",rate:"10%",freq:"Monthly",status:"Active" },
  { id:"C10008",project:"Irvine Office Complex",party:"Hsiu Ju Hsu Properties",type:"Equity",amount:"$600,000",rate:"11%",freq:"Annual",status:"Active" },
];
const SCHEDULES = [
  { id:"PS10050",contract:"C10000",linked:"",dueDate:"2026-02-28",type:"Interest",principal:"$450,000",payment:"$3,750",status:"Due" },
  { id:"PS10051",contract:"C10001",linked:"",dueDate:"2026-02-28",type:"Interest",principal:"$200,000",payment:"$1,583",status:"Due" },
  { id:"PS10052",contract:"C10002",linked:"",dueDate:"2026-02-28",type:"Interest",principal:"$1,250,000",payment:"$8,333",status:"Paid" },
  { id:"PS10053",contract:"C10003",linked:"",dueDate:"2026-02-28",type:"Interest",principal:"$320,000",payment:"$2,667",status:"Due" },
  { id:"PS10054",contract:"C10004",linked:"",dueDate:"2026-03-31",type:"Interest",principal:"$500,000",payment:"$5,000",status:"Due" },
  { id:"PS10055",contract:"C10006",linked:"",dueDate:"2026-01-31",type:"Interest",principal:"$270,000",payment:"$2,025",status:"Paid" },
  { id:"PS10056",contract:"C10007",linked:"",dueDate:"2026-01-31",type:"Interest",principal:"$160,000",payment:"$1,333",status:"Missed" },
  { id:"PS10057",contract:"C10007",linked:"PS10056",dueDate:"2026-02-28",type:"Interest",principal:"$160,000",payment:"$1,333",status:"Due" },
];
const PAYMENTS = [
  { id:"PAY10000",schedule:"PS10052",contract:"C10002",party:"Kies Capital Group",type:"Interest",amount:"$8,333",date:"2026-02-28",method:"Wire",direction:"Received",note:"" },
  { id:"PAY10001",schedule:"PS10055",contract:"C10006",party:"Kolina Lee",type:"Interest",amount:"$2,025",date:"2026-01-31",method:"Check",direction:"Received",note:"" },
  { id:"PAY10002",schedule:"PS10059",contract:"C10000",party:"Pao Fu Chen",type:"Principal",amount:"$450,000",date:"2025-12-31",method:"Wire",direction:"Received",note:"Full repayment" },
  { id:"PAY10003",schedule:"PS10045",contract:"C10003",party:"Tina Lee",type:"Interest",amount:"$2,667",date:"2025-12-31",method:"ACH",direction:"Received",note:"" },
  { id:"PAY10004",schedule:"",contract:"",party:"Palm Springs Villas",type:"Disbursement",amount:"$25,000",date:"2026-02-10",method:"Wire",direction:"Disbursed",note:"Construction draw #4" },
];
const FEES_DATA = [
  { id:"FE10000",name:"Origination Fee",method:"Percentage",rate:"1.50%",frequency:"One-time",description:"Charged at contract origination" },
  { id:"FE10001",name:"Monthly Management",method:"Percentage",rate:"0.25%",frequency:"Monthly",description:"Monthly asset management fee" },
  { id:"FE10002",name:"Late Payment Fee",method:"Flat",rate:"$500",frequency:"Per occurrence",description:"Applied when payment is missed" },
  { id:"FE10003",name:"Extension Fee",method:"Percentage",rate:"0.50%",frequency:"One-time",description:"Fee for extending contract maturity" },
  { id:"FE10004",name:"Prepayment Penalty",method:"Percentage",rate:"2.00%",frequency:"One-time",description:"Early repayment penalty on principal" },
  { id:"FE10005",name:"Legal Documentation",method:"Flat",rate:"$1,200",frequency:"One-time",description:"Legal and escrow documentation costs" },
];
const DIMENSIONS = [
  { name:"Contract Type",      items:["Loan","Mortgage","Equity","Bridge Loan","Mezzanine"],           accent:d=>d?"#60A5FA":"#3B82F6",bg:d=>d?"rgba(96,165,250,0.08)":"#EFF6FF",   border:d=>d?"rgba(96,165,250,0.15)":"#BFDBFE" },
  { name:"Payment Frequency",  items:["Monthly","Quarterly","Semi-Annual","Annual","At Maturity"],      accent:d=>d?"#34D399":"#059669",bg:d=>d?"rgba(52,211,153,0.08)":"#ECFDF5",   border:d=>d?"rgba(52,211,153,0.15)":"#A7F3D0" },
  { name:"Payment Status",     items:["Due","Paid","Missed","Cancelled","Deferred"],                    accent:d=>d?"#FBBF24":"#D97706",bg:d=>d?"rgba(251,191,36,0.08)":"#FFFBEB",   border:d=>d?"rgba(251,191,36,0.15)":"#FDE68A" },
  { name:"Contract Status",    items:["Active","Closed","Pending","Defaulted"],                         accent:d=>d?"#A78BFA":"#7C3AED",bg:d=>d?"rgba(167,139,250,0.08)":"#F5F3FF", border:d=>d?"rgba(167,139,250,0.15)":"#DDD6FE" },
  { name:"Payment Type",       items:["Interest","Principal","Interest + Principal","Fee","Catch-Up"],  accent:d=>d?"#F472B6":"#BE185D",bg:d=>d?"rgba(244,114,182,0.08)":"#FDF2F8",  border:d=>d?"rgba(244,114,182,0.15)":"#FBCFE8" },
  { name:"Calculation Method", items:["30/360","ACT/360","ACT/365","ACT/ACT"],                         accent:d=>d?"#2DD4BF":"#0F766E",bg:d=>d?"rgba(45,212,191,0.08)":"#F0FDFA",   border:d=>d?"rgba(45,212,191,0.15)":"#99F6E4" },
  { name:"Currency",           items:["USD","CAD","EUR","TWD"],                                         accent:d=>d?"#FB923C":"#C2410C",bg:d=>d?"rgba(251,146,60,0.08)":"#FFF7ED",  border:d=>d?"rgba(251,146,60,0.15)":"#FED7AA" },
  { name:"Party Type",         items:["Individual","Company","Trust","Partnership"],                    accent:d=>d?"#F87171":"#DC2626",bg:d=>d?"rgba(248,113,113,0.08)":"#FEF2F2",  border:d=>d?"rgba(248,113,113,0.15)":"#FECACA" },
];
const MONTHLY = [
  {month:"Jul",received:48200,disbursed:0},{month:"Aug",received:52400,disbursed:25000},
  {month:"Sep",received:61500,disbursed:0},{month:"Oct",received:44800,disbursed:18000},
  {month:"Nov",received:57200,disbursed:0},{month:"Dec",received:463583,disbursed:0},
  {month:"Jan",received:51000,disbursed:0},{month:"Feb",received:10358,disbursed:25000},
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const initials = name => name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
const avatarDark = ["rgba(52,211,153,0.15)","rgba(96,165,250,0.15)","rgba(251,146,60,0.15)","rgba(244,114,182,0.15)","rgba(167,139,250,0.15)","rgba(251,191,36,0.15)","rgba(45,212,191,0.15)","rgba(248,113,113,0.15)"];
const avatarDarkC= ["#34D399","#60A5FA","#FB923C","#F472B6","#A78BFA","#FBBF24","#2DD4BF","#F87171"];
const avatarLight= [{bg:"#E0E7FF",c:"#4338CA"},{bg:"#FCE7F3",c:"#9D174D"},{bg:"#D1FAE5",c:"#065F46"},{bg:"#FEF3C7",c:"#92400E"},{bg:"#DBEAFE",c:"#1E40AF"},{bg:"#FEE2E2",c:"#991B1B"},{bg:"#F3E8FF",c:"#6B21A8"},{bg:"#CCFBF1",c:"#0F766E"}];
const hashN = (s,n) => { let h=0; for(let c of s)h=(h+c.charCodeAt(0))%n; return h; };
const av = (name,isDark) => isDark
  ? { bg: avatarDark[hashN(name,8)], c: avatarDarkC[hashN(name,8)] }
  : avatarLight[hashN(name,8)].c ? { bg: avatarLight[hashN(name,8)].bg, c: avatarLight[hashN(name,8)].c } : { bg:"#E0E7FF",c:"#4338CA" };

const badge = (status, isDark) => ({
  Active:    [isDark?"rgba(52,211,153,0.15)":"#ECFDF5",  isDark?"#34D399":"#059669", isDark?"rgba(52,211,153,0.3)":"#A7F3D0"],
  Closed:    [isDark?"rgba(255,255,255,0.07)":"#F9FAFB", isDark?"rgba(255,255,255,0.4)":"#6B7280", isDark?"rgba(255,255,255,0.12)":"#E5E7EB"],
  Due:       [isDark?"rgba(251,191,36,0.15)":"#FFFBEB",  isDark?"#FBBF24":"#D97706", isDark?"rgba(251,191,36,0.3)":"#FDE68A"],
  Paid:      [isDark?"rgba(52,211,153,0.15)":"#ECFDF5",  isDark?"#34D399":"#059669", isDark?"rgba(52,211,153,0.3)":"#A7F3D0"],
  Missed:    [isDark?"rgba(248,113,113,0.15)":"#FEF2F2", isDark?"#F87171":"#DC2626", isDark?"rgba(248,113,113,0.3)":"#FECACA"],
  Investor:  [isDark?"rgba(52,211,153,0.15)":"#ECFDF5",  isDark?"#34D399":"#059669", isDark?"rgba(52,211,153,0.3)":"#A7F3D0"],
  Borrower:  [isDark?"rgba(251,146,60,0.15)":"#FFF7ED",  isDark?"#FB923C":"#C2410C", isDark?"rgba(251,146,60,0.3)":"#FED7AA"],
})[status] || ["transparent","#888","#ccc"];

const Bdg = ({status,isDark}) => {
  const [bg,color,border] = badge(status,isDark);
  return <span style={{fontSize:11.5,fontWeight:600,padding:"4px 11px",borderRadius:20,background:bg,color,border:`1px solid ${border}`}}>{status}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: search input, stat card, pagination, action buttons
// ─────────────────────────────────────────────────────────────────────────────
const SearchBox = ({value,onChange,placeholder,t}) => (
  <div style={{position:"relative"}}>
    <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:t.searchIcon,fontSize:15,pointerEvents:"none"}}>⌕</span>
    <input className="search-input" value={value} onChange={onChange} placeholder={placeholder}
      style={{background:t.searchBg,border:`1px solid ${t.searchBorder}`,borderRadius:10,padding:"9px 14px 9px 34px",color:t.searchText,fontSize:13,width:240}} />
  </div>
);

const StatCard = ({label,value,accent,bg,border,titleFont,isDark,icon,large}) => (
  <div className="stat-card" style={{background:bg,borderRadius:14,padding:"20px 22px",border:`1px solid ${border}`,backdropFilter:isDark?"blur(10px)":"none",display:"flex",flexDirection:"column",gap:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:11,fontWeight:600,color:"rgba(128,128,128,0.8)",textTransform:"uppercase",letterSpacing:"0.8px"}}>{label}</span>
      {!isDark && icon && <div style={{width:28,height:28,borderRadius:7,background:bg,border:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:accent}}>{icon}</div>}
    </div>
    <div style={{fontFamily:titleFont,fontSize:large?(isDark?22:28):(isDark?28:36),fontWeight:isDark?800:700,color:accent,lineHeight:1,letterSpacing:"-0.5px"}}>{value}</div>
  </div>
);

const Pagination = ({pages,t}) => (
  <div style={{display:"flex",gap:6}}>
    {pages.map((p,i)=>(
      <span key={i} style={{width:30,height:30,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:i===1?700:400,background:i===1?t.pageBtnActive:t.pageBtnBg,color:i===1?t.pageBtnActiveTxt:t.pageBtnText,border:`1px solid ${i===1?t.pageBtnActive:t.pageBtnBorder}`,cursor:"pointer"}}>{p}</span>
    ))}
  </div>
);

const ActBtns = ({show,t,onEdit,onDel}) => (
  <div style={{display:"flex",gap:6,opacity:show?1:0,transition:"opacity 0.15s ease"}}>
    <button className="action-btn" onClick={e=>{e.stopPropagation();onEdit&&onEdit();}} style={{width:30,height:30,borderRadius:7,background:t.editBtn[0],color:t.editBtn[1],display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✎</button>
    <button className="action-btn" onClick={e=>{e.stopPropagation();onDel&&onDel();}} style={{width:30,height:30,borderRadius:7,background:t.deleteBtn[0],color:t.deleteBtn[1],display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⊗</button>
  </div>
);

const TblHead = ({cols,t,isDark}) => (
  <div style={{display:"grid",gridTemplateColumns:cols.map(c=>c.w).join(" "),padding:"12px 22px",background:t.tableHeader,borderBottom:`1px solid ${t.surfaceBorder}`}}>
    {cols.map(c=><div key={c.l} style={{fontSize:10.5,fontWeight:600,letterSpacing:"1px",color:isDark?"rgba(255,255,255,0.3)":"#C4C0BA",textTransform:"uppercase",fontFamily:t.mono}}>{c.l}</div>)}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MODAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const Modal = ({open,onClose,title,onSave,saveLabel,danger,width,children,t,isDark}) => {
  if(!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)"}}/>
      <div style={{position:"relative",zIndex:1,background:isDark?"#0b1929":"#ffffff",borderRadius:20,border:`1px solid ${t.surfaceBorder}`,width:width||480,maxWidth:"92vw",maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:isDark?"0 40px 100px rgba(0,0,0,0.7)":"0 24px 60px rgba(0,0,0,0.13)"}}>
        <div style={{padding:"22px 26px",borderBottom:`1px solid ${t.surfaceBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:isDark?"rgba(255,255,255,0.02)":"#FAFAF9",borderRadius:"20px 20px 0 0"}}>
          <span style={{fontSize:16,fontWeight:700,color:isDark?"#fff":"#1C1917",fontFamily:t.titleFont,letterSpacing:"-0.4px"}}>{title}</span>
          <button onClick={onClose} className="action-btn" style={{width:28,height:28,borderRadius:8,background:t.deleteBtn[0],color:t.deleteBtn[1],display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:"none",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"24px 26px",overflowY:"auto",flex:1}}>{children}</div>
        <div style={{padding:"16px 26px",borderTop:`1px solid ${t.surfaceBorder}`,display:"flex",justifyContent:"flex-end",gap:10,background:isDark?"rgba(255,255,255,0.02)":"#FAFAF9",borderRadius:"0 0 20px 20px"}}>
          <button onClick={onClose} style={{padding:"10px 22px",borderRadius:10,fontSize:13,fontWeight:500,background:t.chipBg,color:t.textSecondary,border:`1px solid ${t.chipBorder}`,cursor:"pointer"}}>Cancel</button>
          <button onClick={onSave} className="primary-btn" style={{padding:"10px 22px",borderRadius:10,fontSize:13,fontWeight:600,background:danger?"rgba(248,113,113,0.15)":t.accentGrad,color:danger?(isDark?"#F87171":"#DC2626"):"#fff",border:danger?`1px solid ${isDark?"rgba(248,113,113,0.3)":"#FECACA"}`:"none",boxShadow:danger?"none":`0 4px 14px ${t.accentShadow}`,cursor:"pointer"}}>{saveLabel||"Save"}</button>
        </div>
      </div>
    </div>
  );
};

const FF = ({label,t,children}) => (
  <div style={{marginBottom:16}}>
    <div style={{fontSize:10.5,fontWeight:700,color:t.textSecondary,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7,fontFamily:t.mono}}>{label}</div>
    {children}
  </div>
);

const FIn = ({value,onChange,placeholder,t,type}) => (
  <input type={type||"text"} value={value||""} onChange={onChange} placeholder={placeholder||""}
    style={{width:"100%",background:t.searchBg,border:`1px solid ${t.searchBorder}`,borderRadius:9,padding:"10px 13px",color:t.searchText,fontSize:13.5,fontFamily:"inherit",outline:"none"}}/>
);

const FSel = ({value,onChange,options,t}) => (
  <select value={value||options[0]||""} onChange={onChange}
    style={{width:"100%",background:t.searchBg,border:`1px solid ${t.searchBorder}`,borderRadius:9,padding:"10px 13px",color:t.searchText,fontSize:13.5,fontFamily:"inherit",outline:"none",cursor:"pointer"}}>
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
);

const DelModal = ({target,onClose,label,t,isDark}) => (
  <Modal open={!!target} onClose={onClose} title="Confirm Delete" onSave={onClose} saveLabel="Delete" danger t={t} isDark={isDark}>
    <div style={{display:"flex",flexDirection:"column",gap:16,alignItems:"center",textAlign:"center",padding:"8px 0"}}>
      <div style={{width:52,height:52,borderRadius:14,background:isDark?"rgba(248,113,113,0.15)":"#FEF2F2",border:`1px solid ${isDark?"rgba(248,113,113,0.25)":"#FECACA"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:isDark?"#F87171":"#DC2626"}}>⊗</div>
      <div>
        <div style={{fontSize:15,fontWeight:600,color:isDark?"#fff":"#1C1917",marginBottom:8}}>Delete "{target?.name}"?</div>
        <div style={{fontSize:13,color:t.textMuted,lineHeight:1.7}}>{label||"This record"} will be permanently removed.<br/>This action cannot be undone.</div>
      </div>
    </div>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function PageDashboard({t,isDark}) {
  const cards = [
    {label:"Active Contracts",value:CONTRACTS.filter(c=>c.status==="Active").length,accent:isDark?"#60A5FA":"#3B82F6",bg:isDark?"rgba(96,165,250,0.08)":"#EFF6FF",border:isDark?"rgba(96,165,250,0.15)":"#BFDBFE"},
    {label:"Total Parties",value:PARTIES.length,accent:isDark?"#34D399":"#059669",bg:isDark?"rgba(52,211,153,0.08)":"#ECFDF5",border:isDark?"rgba(52,211,153,0.15)":"#A7F3D0"},
    {label:"Payments Due",value:SCHEDULES.filter(s=>s.status==="Due").length,accent:isDark?"#FBBF24":"#D97706",bg:isDark?"rgba(251,191,36,0.08)":"#FFFBEB",border:isDark?"rgba(251,191,36,0.15)":"#FDE68A"},
    {label:"Missed",value:SCHEDULES.filter(s=>s.status==="Missed").length,accent:isDark?"#F87171":"#DC2626",bg:isDark?"rgba(248,113,113,0.08)":"#FEF2F2",border:isDark?"rgba(248,113,113,0.15)":"#FECACA"},
  ];
  const recent = [
    {id:"PS10052",desc:"Interest payment received — C10002",date:"2026-02-28",status:"Paid",amount:"+$8,333"},
    {id:"C10008",desc:"New contract added — Hsiu Ju Hsu Properties",date:"2026-02-20",status:"Active",amount:"$600,000"},
    {id:"PS10056",desc:"Missed payment — C10007",date:"2026-01-31",status:"Missed",amount:"$1,333"},
    {id:"PAY10004",desc:"Construction draw disbursed — Palm Springs",date:"2026-02-10",status:"Due",amount:"-$25,000"},
  ];
  return (
    <>
      <div style={{marginBottom:28}}><h1 style={{fontFamily:t.titleFont,fontWeight:t.titleWeight,fontSize:t.titleSize,color:isDark?"#fff":"#1C1917",letterSpacing:t.titleTracking,lineHeight:1,marginBottom:6}}>Dashboard</h1><p style={{fontSize:13.5,color:t.textMuted}}>Welcome to AVG Cashflow Management</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
        {cards.map(s=><StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
      </div>
      <div style={{background:t.accentGrad,borderRadius:14,padding:"20px 28px",marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:`0 4px 20px ${t.accentShadow}`}}>
        <div><div style={{fontSize:11,fontWeight:600,color:isDark?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>Total Capital Under Management</div><div style={{fontFamily:t.titleFont,fontSize:36,fontWeight:t.titleWeight,color:isDark?"#050c15":"#fff",letterSpacing:"-1.5px",lineHeight:1}}>$4,820,000</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:11,color:isDark?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.7)",marginBottom:4}}>{PROJECTS.filter(p=>p.status==="Active").length} active projects</div><div style={{fontFamily:t.mono,fontSize:13,color:isDark?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.9)",fontWeight:600}}>Avg rate 9.85%</div></div>
      </div>
      <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,overflow:"hidden",backdropFilter:isDark?"blur(20px)":"none"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${t.surfaceBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:600,color:isDark?"#fff":"#1C1917"}}>Recent Activity</span><span style={{fontSize:11,color:t.accent,cursor:"pointer",fontWeight:500}}>View all →</span></div>
        {recent.map((item,i)=>{const [bg,color,border]=badge(item.status,isDark);return(
          <div key={item.id} className="activity-row" style={{padding:"12px 20px",borderBottom:i<recent.length-1?`1px solid ${t.surfaceBorder}`:"none",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:32,height:32,borderRadius:8,background:bg,border:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color,flexShrink:0}}>◇</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:500,color:isDark?"rgba(255,255,255,0.85)":"#1C1917",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.desc}</div><div style={{fontSize:11,color:t.textMuted,marginTop:2,fontFamily:t.mono}}>{item.id} · {item.date}</div></div>
            <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:12,fontWeight:600,color}}>{item.amount}</div><span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:bg,color,border:`1px solid ${border}`}}>{item.status}</span></div>
          </div>
        );})}
      </div>
    </>
  );
}

function PageProjects({t,isDark}) {
  const [search,setSearch]=useState(""); const [hov,setHov]=useState(null);
  const [modal,setModal]=useState({open:false,mode:"add",data:{}});
  const [delT,setDelT]=useState(null);
  const openAdd=()=>setModal({open:true,mode:"add",data:{name:"",status:"Active",currency:"USD",description:""}});
  const openEdit=r=>setModal({open:true,mode:"edit",data:{...r}});
  const close=()=>setModal(m=>({...m,open:false}));
  const setF=(k,v)=>setModal(m=>({...m,data:{...m.data,[k]:v}}));
  const filtered=PROJECTS.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.id.toLowerCase().includes(search.toLowerCase()));
  const cols=[{l:"ID",w:"120px"},{l:"NAME",w:"1fr"},{l:"STATUS",w:"110px"},{l:"CURRENCY",w:"90px"},{l:"DESCRIPTION",w:"1fr"},{l:"CREATED",w:"110px"},{l:"ACTIONS",w:"90px"}];
  return(<>
    <div style={{marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}><div><h1 style={{fontFamily:t.titleFont,fontWeight:t.titleWeight,fontSize:t.titleSize,color:isDark?"#fff":"#1C1917",letterSpacing:t.titleTracking,lineHeight:1,marginBottom:6}}>Projects</h1><p style={{fontSize:13.5,color:t.textMuted}}>Manage your investment projects</p></div><button className="primary-btn" onClick={openAdd} style={{background:t.accentGrad,color:"#fff",padding:"11px 22px",borderRadius:11,fontSize:13.5,fontWeight:600,boxShadow:`0 4px 16px ${t.accentShadow}`,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18,lineHeight:1}}>+</span> New Project</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
      {[{label:"Total",value:PROJECTS.length,accent:isDark?"#60A5FA":"#3B82F6",bg:isDark?"rgba(96,165,250,0.08)":"#EFF6FF",border:isDark?"rgba(96,165,250,0.15)":"#BFDBFE"},{label:"Active",value:PROJECTS.filter(p=>p.status==="Active").length,accent:isDark?"#34D399":"#059669",bg:isDark?"rgba(52,211,153,0.08)":"#ECFDF5",border:isDark?"rgba(52,211,153,0.15)":"#A7F3D0"},{label:"Closed",value:PROJECTS.filter(p=>p.status==="Closed").length,accent:isDark?"rgba(255,255,255,0.4)":"#6B7280",bg:isDark?"rgba(255,255,255,0.05)":"#F9FAFB",border:isDark?"rgba(255,255,255,0.1)":"#E5E7EB"},{label:"USD",value:PROJECTS.filter(p=>p.currency==="USD").length,accent:isDark?"#A78BFA":"#7C3AED",bg:isDark?"rgba(167,139,250,0.08)":"#F5F3FF",border:isDark?"rgba(167,139,250,0.15)":"#DDD6FE"}].map(s=><StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark}/>)}
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><SearchBox value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects..." t={t}/></div>
    <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,overflow:"hidden",backdropFilter:isDark?"blur(20px)":"none",boxShadow:t.tableShadow}}>
      <TblHead cols={cols} t={t} isDark={isDark}/>
      {filtered.map((p,i)=>{const isHov=hov===p.id;return(<div key={p.id} className="data-row" onMouseEnter={()=>setHov(p.id)} onMouseLeave={()=>setHov(null)} style={{display:"grid",gridTemplateColumns:cols.map(c=>c.w).join(" "),padding:"12px 22px",borderBottom:i<filtered.length-1?`1px solid ${t.rowDivider}`:"none",alignItems:"center",background:isHov?t.rowHover:"transparent",transition:"all 0.15s ease"}}>
        <div style={{fontFamily:t.mono,fontSize:11,color:t.idText}}>{p.id}</div>
        <div style={{fontSize:13.5,fontWeight:500,color:isDark?"rgba(255,255,255,0.85)":(isHov?"#1C1917":"#44403C")}}>{p.name}</div>
        <div><Bdg status={p.status} isDark={isDark}/></div>
        <div style={{fontFamily:t.mono,fontSize:12,color:t.textMuted}}>{p.currency}</div>
        <div style={{fontSize:12.5,color:t.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.description}</div>
        <div style={{fontFamily:t.mono,fontSize:11,color:t.idText}}>{p.created}</div>
        <ActBtns show={isHov} t={t} onEdit={()=>openEdit(p)} onDel={()=>setDelT({id:p.id,name:p.name})}/>
      </div>);})}
    </div>
    <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:t.textSubtle}}>Showing <strong style={{color:t.textSecondary}}>{filtered.length}</strong> of <strong style={{color:t.textSecondary}}>{PROJECTS.length}</strong> projects</span><Pagination pages={["‹","1","›"]} t={t}/></div>
    <Modal open={modal.open} onClose={close} title={modal.mode==="add"?"New Project":"Edit Project"} onSave={close} t={t} isDark={isDark}>
      <FF label="Project Name" t={t}><FIn value={modal.data.name} onChange={e=>setF("name",e.target.value)} placeholder="e.g. Palm Springs Villas" t={t}/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e=>setF("status",e.target.value)} options={["Active","Closed"]} t={t}/></FF>
        <FF label="Currency" t={t}><FSel value={modal.data.currency} onChange={e=>setF("currency",e.target.value)} options={["USD","CAD","EUR","TWD"]} t={t}/></FF>
      </div>
      <FF label="Description" t={t}><FIn value={modal.data.description} onChange={e=>setF("description",e.target.value)} placeholder="Brief description..." t={t}/></FF>
    </Modal>
    <DelModal target={delT} onClose={()=>setDelT(null)} label="This project" t={t} isDark={isDark}/>
  </>);
}

function PageParties({t,isDark}) {
  const [search,setSearch]=useState(""); const [hov,setHov]=useState(null); const [chip,setChip]=useState("All");
  const [modal,setModal]=useState({open:false,mode:"add",data:{}});
  const [delT,setDelT]=useState(null);
  const openAdd=()=>setModal({open:true,mode:"add",data:{name:"",type:"Individual",role:"Investor",email:""}});
  const openEdit=r=>setModal({open:true,mode:"edit",data:{...r}});
  const close=()=>setModal(m=>({...m,open:false}));
  const setF=(k,v)=>setModal(m=>({...m,data:{...m.data,[k]:v}}));
  const chips=["All","Investors","Borrowers","Companies"];
  const filtered=PARTIES.filter(p=>{const ms=p.name.toLowerCase().includes(search.toLowerCase())||p.id.toLowerCase().includes(search.toLowerCase()); const mf=chip==="All"||(chip==="Investors"&&p.role==="Investor")||(chip==="Borrowers"&&p.role==="Borrower")||(chip==="Companies"&&p.type==="Company"); return ms&&mf;});
  const cols=[{l:"ID",w:"110px"},{l:"NAME",w:"1fr"},{l:"TYPE",w:"130px"},{l:"ROLE",w:"120px"},{l:"EMAIL",w:"1fr"},{l:"ACTIONS",w:"100px"}];
  return(<>
    <div style={{marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}><div><h1 style={{fontFamily:t.titleFont,fontWeight:t.titleWeight,fontSize:t.titleSize,color:isDark?"#fff":"#1C1917",letterSpacing:t.titleTracking,lineHeight:1,marginBottom:6}}>Parties</h1><p style={{fontSize:13.5,color:t.textMuted}}>Manage Investors, Borrowers, and Companies</p></div><button className="primary-btn" onClick={openAdd} style={{background:t.accentGrad,color:"#fff",padding:"11px 22px",borderRadius:11,fontSize:13.5,fontWeight:600,boxShadow:`0 4px 16px ${t.accentShadow}`,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18,lineHeight:1}}>+</span> New Party</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
      {[{label:"Total Parties",value:PARTIES.length,accent:isDark?"#60A5FA":"#3B82F6",bg:isDark?"rgba(96,165,250,0.08)":"#EFF6FF",border:isDark?"rgba(96,165,250,0.15)":"#BFDBFE"},{label:"Investors",value:PARTIES.filter(p=>p.role==="Investor").length,accent:isDark?"#34D399":"#059669",bg:isDark?"rgba(52,211,153,0.08)":"#ECFDF5",border:isDark?"rgba(52,211,153,0.15)":"#A7F3D0"},{label:"Borrowers",value:PARTIES.filter(p=>p.role==="Borrower").length,accent:isDark?"#FB923C":"#C2410C",bg:isDark?"rgba(251,146,60,0.08)":"#FFF7ED",border:isDark?"rgba(251,146,60,0.15)":"#FED7AA"},{label:"Companies",value:PARTIES.filter(p=>p.type==="Company").length,accent:isDark?"#A78BFA":"#7C3AED",bg:isDark?"rgba(167,139,250,0.08)":"#F5F3FF",border:isDark?"rgba(167,139,250,0.15)":"#DDD6FE"}].map(s=><StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark}/>)}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{display:"flex",gap:8}}>{chips.map((c,i)=>{const isA=chip===c;return(<span key={c} className="filter-chip" onClick={()=>setChip(c)} style={{fontSize:12,fontWeight:isA?600:500,padding:"5px 14px",borderRadius:20,background:isA?t.accent:t.chipBg,color:isA?"#fff":t.textSecondary,border:`1px solid ${isA?t.accent:t.chipBorder}`,cursor:"pointer"}}>{c}</span>);})}</div>
      <SearchBox value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search parties..." t={t}/>
    </div>
    <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,overflow:"hidden",backdropFilter:isDark?"blur(20px)":"none",boxShadow:t.tableShadow}}>
      <TblHead cols={cols} t={t} isDark={isDark}/>
      {filtered.map((p,i)=>{const isHov=hov===p.id;const a=av(p.name,isDark);const [rb,rc,rbr]=badge(p.role,isDark);return(<div key={p.id} className="data-row" onMouseEnter={()=>setHov(p.id)} onMouseLeave={()=>setHov(null)} style={{display:"grid",gridTemplateColumns:cols.map(c=>c.w).join(" "),padding:"12px 22px",borderBottom:i<filtered.length-1?`1px solid ${t.rowDivider}`:"none",alignItems:"center",background:isHov?t.rowHover:"transparent",transition:"all 0.15s ease"}}>
        <div style={{fontFamily:t.mono,fontSize:11,color:t.idText}}>{p.id}</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:9,background:a.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:a.c,flexShrink:0,border:`1px solid ${a.c}${isDark?"44":"22"}`}}>{initials(p.name)}</div><span style={{fontSize:13.5,fontWeight:500,color:isDark?"rgba(255,255,255,0.85)":(isHov?"#1C1917":"#44403C")}}>{p.name}</span></div>
        <div style={{fontSize:12.5,color:p.type==="Company"?(isDark?"#A78BFA":"#7C3AED"):t.textMuted}}>{p.type==="Company"?"◈ Company":"◎ Individual"}</div>
        <div><span style={{fontSize:11.5,fontWeight:600,padding:"4px 11px",borderRadius:20,background:rb,color:rc,border:`1px solid ${rbr}`}}>{p.role}</span></div>
        <div style={{fontSize:12.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.email?<span style={{color:isDark?"#60A5FA":"#4F46E5"}}>{p.email}</span>:<span style={{color:isDark?"rgba(255,255,255,0.12)":"#D4D0CB"}}>—</span>}</div>
        <ActBtns show={isHov} t={t} onEdit={()=>openEdit(p)} onDel={()=>setDelT({id:p.id,name:p.name})}/>
      </div>);})}
    </div>
    <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:t.textSubtle}}>Showing <strong style={{color:t.textSecondary}}>{filtered.length}</strong> of <strong style={{color:t.textSecondary}}>{PARTIES.length}</strong> parties</span><Pagination pages={["‹","1","2","3","›"]} t={t}/></div>
    <Modal open={modal.open} onClose={close} title={modal.mode==="add"?"New Party":"Edit Party"} onSave={close} t={t} isDark={isDark}>
      <FF label="Full Name" t={t}><FIn value={modal.data.name} onChange={e=>setF("name",e.target.value)} placeholder="e.g. Pao Fu Chen" t={t}/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FF label="Party Type" t={t}><FSel value={modal.data.type} onChange={e=>setF("type",e.target.value)} options={["Individual","Company","Trust","Partnership"]} t={t}/></FF>
        <FF label="Role" t={t}><FSel value={modal.data.role} onChange={e=>setF("role",e.target.value)} options={["Investor","Borrower"]} t={t}/></FF>
      </div>
      <FF label="Email (optional)" t={t}><FIn value={modal.data.email} onChange={e=>setF("email",e.target.value)} placeholder="email@example.com" t={t} type="email"/></FF>
    </Modal>
    <DelModal target={delT} onClose={()=>setDelT(null)} label="This party" t={t} isDark={isDark}/>
  </>);
}

function PageContracts({t,isDark}) {
  const [search,setSearch]=useState(""); const [hov,setHov]=useState(null); const [sel,setSel]=useState(new Set());
  const [modal,setModal]=useState({open:false,mode:"add",data:{}});
  const [delT,setDelT]=useState(null);
  const openAdd=()=>setModal({open:true,mode:"add",data:{project:"Palm Springs Villas",party:"Pao Fu Chen",type:"Loan",amount:"",rate:"",freq:"Monthly",status:"Active"}});
  const openEdit=r=>setModal({open:true,mode:"edit",data:{...r}});
  const close=()=>setModal(m=>({...m,open:false}));
  const setF=(k,v)=>setModal(m=>({...m,data:{...m.data,[k]:v}}));
  const filtered=CONTRACTS.filter(c=>c.id.toLowerCase().includes(search.toLowerCase())||c.project.toLowerCase().includes(search.toLowerCase())||c.party.toLowerCase().includes(search.toLowerCase()));
  const toggleRow=id=>{const n=new Set(sel);n.has(id)?n.delete(id):n.add(id);setSel(n);};
  const cols=[{l:"",w:"40px"},{l:"ID",w:"100px"},{l:"PROJECT",w:"1fr"},{l:"PARTY",w:"1fr"},{l:"TYPE",w:"100px"},{l:"AMOUNT",w:"110px"},{l:"RATE",w:"80px"},{l:"FREQ",w:"100px"},{l:"STATUS",w:"90px"},{l:"ACTIONS",w:"80px"}];
  const typC={Loan:isDark?"#60A5FA":"#2563EB",Mortgage:isDark?"#A78BFA":"#7C3AED",Equity:isDark?"#FBBF24":"#D97706"};
  return(<>
    <div style={{marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}><div><h1 style={{fontFamily:t.titleFont,fontWeight:t.titleWeight,fontSize:t.titleSize,color:isDark?"#fff":"#1C1917",letterSpacing:t.titleTracking,lineHeight:1,marginBottom:6}}>Contracts</h1><p style={{fontSize:13.5,color:t.textMuted}}>Manage investment contracts</p></div>
      <div style={{display:"flex",gap:10}}>
        <button className="success-btn" disabled={sel.size===0} style={{background:t.successGrad,color:"#fff",padding:"11px 20px",borderRadius:11,fontSize:13,fontWeight:600,boxShadow:`0 4px 16px ${t.successShadow}`,display:"flex",alignItems:"center",gap:6,opacity:sel.size===0?0.45:1}}>▤ Generate{sel.size>0?` (${sel.size})`:""}</button>
        <button className="primary-btn" onClick={openAdd} style={{background:t.accentGrad,color:"#fff",padding:"11px 22px",borderRadius:11,fontSize:13.5,fontWeight:600,boxShadow:`0 4px 16px ${t.accentShadow}`,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18,lineHeight:1}}>+</span> New Contract</button>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
      {[{label:"Total",value:CONTRACTS.length,accent:isDark?"#60A5FA":"#3B82F6",bg:isDark?"rgba(96,165,250,0.08)":"#EFF6FF",border:isDark?"rgba(96,165,250,0.15)":"#BFDBFE"},{label:"Active",value:CONTRACTS.filter(c=>c.status==="Active").length,accent:isDark?"#34D399":"#059669",bg:isDark?"rgba(52,211,153,0.08)":"#ECFDF5",border:isDark?"rgba(52,211,153,0.15)":"#A7F3D0"},{label:"Loans",value:CONTRACTS.filter(c=>c.type==="Loan").length,accent:isDark?"#FBBF24":"#D97706",bg:isDark?"rgba(251,191,36,0.08)":"#FFFBEB",border:isDark?"rgba(251,191,36,0.15)":"#FDE68A"},{label:"Selected",value:sel.size,accent:isDark?"#A78BFA":"#7C3AED",bg:isDark?"rgba(167,139,250,0.08)":"#F5F3FF",border:isDark?"rgba(167,139,250,0.15)":"#DDD6FE"}].map(s=><StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark}/>)}
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><SearchBox value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search contracts..." t={t}/></div>
    <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,overflow:"hidden",backdropFilter:isDark?"blur(20px)":"none",boxShadow:t.tableShadow}}>
      <div style={{display:"grid",gridTemplateColumns:cols.map(c=>c.w).join(" "),padding:"12px 22px",background:t.tableHeader,borderBottom:`1px solid ${t.surfaceBorder}`,alignItems:"center"}}>
        <input type="checkbox" checked={sel.size===filtered.length&&filtered.length>0} onChange={()=>setSel(sel.size===filtered.length?new Set():new Set(filtered.map(c=>c.id)))} style={{accentColor:t.checkActive,width:14,height:14}}/>
        {cols.slice(1).map(c=><div key={c.l} style={{fontSize:10.5,fontWeight:600,letterSpacing:"1px",color:isDark?"rgba(255,255,255,0.3)":"#C4C0BA",textTransform:"uppercase",fontFamily:t.mono}}>{c.l}</div>)}
      </div>
      {filtered.map((c,i)=>{const isHov=hov===c.id;const isSel=sel.has(c.id);return(<div key={c.id} className="data-row" onMouseEnter={()=>setHov(c.id)} onMouseLeave={()=>setHov(null)} style={{display:"grid",gridTemplateColumns:cols.map(c=>c.w).join(" "),padding:"12px 22px",borderBottom:i<filtered.length-1?`1px solid ${t.rowDivider}`:"none",alignItems:"center",background:isSel?(isDark?"rgba(52,211,153,0.05)":"#F0FDF4"):isHov?t.rowHover:"transparent",transition:"all 0.15s ease"}}>
        <input type="checkbox" checked={isSel} onChange={()=>toggleRow(c.id)} style={{accentColor:t.checkActive,width:14,height:14}} onClick={e=>e.stopPropagation()}/>
        <div style={{fontFamily:t.mono,fontSize:11,color:t.idText}}>{c.id}</div>
        <div style={{fontSize:12.5,color:isDark?"rgba(255,255,255,0.7)":"#44403C",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{c.project}</div>
        <div style={{fontSize:12.5,fontWeight:500,color:isDark?"rgba(255,255,255,0.85)":"#1C1917",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{c.party}</div>
        <div style={{fontSize:12.5,fontWeight:500,color:typC[c.type]||t.textMuted}}>{c.type}</div>
        <div style={{fontFamily:t.mono,fontSize:12,fontWeight:600,color:isDark?"#60A5FA":"#4F46E5"}}>{c.amount}</div>
        <div style={{fontFamily:t.mono,fontSize:12,color:t.textMuted}}>{c.rate}</div>
        <div style={{fontSize:11.5,color:t.textMuted}}>{c.freq}</div>
        <div><Bdg status={c.status} isDark={isDark}/></div>
        <ActBtns show={isHov} t={t} onEdit={()=>openEdit(c)} onDel={()=>setDelT({id:c.id,name:c.id})}/>
      </div>);})}
    </div>
    <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:t.textSubtle}}>Showing <strong style={{color:t.textSecondary}}>{filtered.length}</strong> of <strong style={{color:t.textSecondary}}>{CONTRACTS.length}</strong> contracts{sel.size>0&&<span style={{color:t.accent,marginLeft:8}}>· {sel.size} selected</span>}</span><Pagination pages={["‹","1","2","›"]} t={t}/></div>
    <Modal open={modal.open} onClose={close} title={modal.mode==="add"?"New Contract":"Edit Contract"} onSave={close} width={560} t={t} isDark={isDark}>
      <FF label="Project" t={t}><FSel value={modal.data.project} onChange={e=>setF("project",e.target.value)} options={PROJECTS.map(p=>p.name)} t={t}/></FF>
      <FF label="Party" t={t}><FSel value={modal.data.party} onChange={e=>setF("party",e.target.value)} options={PARTIES.map(p=>p.name)} t={t}/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        <FF label="Type" t={t}><FSel value={modal.data.type} onChange={e=>setF("type",e.target.value)} options={["Loan","Mortgage","Equity","Bridge Loan","Mezzanine"]} t={t}/></FF>
        <FF label="Amount" t={t}><FIn value={modal.data.amount} onChange={e=>setF("amount",e.target.value)} placeholder="$0" t={t}/></FF>
        <FF label="Rate" t={t}><FIn value={modal.data.rate} onChange={e=>setF("rate",e.target.value)} placeholder="10%" t={t}/></FF>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FF label="Frequency" t={t}><FSel value={modal.data.freq} onChange={e=>setF("freq",e.target.value)} options={["Monthly","Quarterly","Semi-Annual","Annual","At Maturity"]} t={t}/></FF>
        <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e=>setF("status",e.target.value)} options={["Active","Closed"]} t={t}/></FF>
      </div>
    </Modal>
    <DelModal target={delT} onClose={()=>setDelT(null)} label="This contract" t={t} isDark={isDark}/>
  </>);
}

function PageSchedule({t,isDark}) {
  const [search,setSearch]=useState(""); const [hov,setHov]=useState(null); const [sel,setSel]=useState(new Set()); const [chip,setChip]=useState("All");
  const [modal,setModal]=useState({open:false,mode:"add",data:{}});
  const [delT,setDelT]=useState(null);
  const openAdd=()=>setModal({open:true,mode:"add",data:{contract:"C10000",dueDate:"",type:"Interest",payment:"",status:"Due"}});
  const openEdit=r=>setModal({open:true,mode:"edit",data:{...r}});
  const close=()=>setModal(m=>({...m,open:false}));
  const setF=(k,v)=>setModal(m=>({...m,data:{...m.data,[k]:v}}));
  const filtered=SCHEDULES.filter(s=>{const ms=s.id.toLowerCase().includes(search.toLowerCase())||s.contract.toLowerCase().includes(search.toLowerCase()); const mf=chip==="All"||s.status===chip; return ms&&mf;});
  const cols=[{l:"",w:"40px"},{l:"ID",w:"110px"},{l:"CONTRACT",w:"90px"},{l:"LINKED",w:"90px"},{l:"DUE DATE",w:"110px"},{l:"TYPE",w:"100px"},{l:"PAYMENT",w:"110px"},{l:"STATUS",w:"100px"},{l:"ACTIONS",w:"80px"}];
  const statsData=[{label:"Total",value:SCHEDULES.length,accent:isDark?"#60A5FA":"#3B82F6",bg:isDark?"rgba(96,165,250,0.08)":"#EFF6FF",border:isDark?"rgba(96,165,250,0.15)":"#BFDBFE"},{label:"Due",value:SCHEDULES.filter(s=>s.status==="Due").length,accent:isDark?"#FBBF24":"#D97706",bg:isDark?"rgba(251,191,36,0.08)":"#FFFBEB",border:isDark?"rgba(251,191,36,0.15)":"#FDE68A"},{label:"Paid",value:SCHEDULES.filter(s=>s.status==="Paid").length,accent:isDark?"#34D399":"#059669",bg:isDark?"rgba(52,211,153,0.08)":"#ECFDF5",border:isDark?"rgba(52,211,153,0.15)":"#A7F3D0"},{label:"Missed",value:SCHEDULES.filter(s=>s.status==="Missed").length,accent:isDark?"#F87171":"#DC2626",bg:isDark?"rgba(248,113,113,0.08)":"#FEF2F2",border:isDark?"rgba(248,113,113,0.15)":"#FECACA"}];
  return(<>
    <div style={{marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}><div><h1 style={{fontFamily:t.titleFont,fontWeight:t.titleWeight,fontSize:t.titleSize,color:isDark?"#fff":"#1C1917",letterSpacing:t.titleTracking,lineHeight:1,marginBottom:6}}>Payment Schedule</h1><p style={{fontSize:13.5,color:t.textMuted}}>Manage payment schedules and statuses</p></div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        {sel.size>0&&<div style={{display:"flex",gap:8,alignItems:"center",background:t.bulkBg,padding:"8px 14px",borderRadius:10,border:`1px solid ${t.bulkBorder}`}}><span style={{fontSize:12,fontWeight:600,color:t.textSecondary}}>{sel.size} selected · Mark as:</span>{["Paid","Missed"].map(s=>{const[bg,color,border]=badge(s,isDark);return<span key={s} style={{fontSize:11.5,fontWeight:600,padding:"3px 10px",borderRadius:20,background:bg,color,border:`1px solid ${border}`,cursor:"pointer"}}>{s}</span>;})}</div>}
        <button className="primary-btn" onClick={openAdd} style={{background:t.accentGrad,color:"#fff",padding:"11px 22px",borderRadius:11,fontSize:13.5,fontWeight:600,boxShadow:`0 4px 16px ${t.accentShadow}`,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18,lineHeight:1}}>+</span> New Schedule</button>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>{statsData.map(s=><StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark}/>)}</div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{display:"flex",gap:8}}>{["All","Due","Paid","Missed"].map(f=>{const isA=chip===f;return<span key={f} className="filter-chip" onClick={()=>setChip(f)} style={{fontSize:12,fontWeight:isA?600:500,padding:"5px 14px",borderRadius:20,background:isA?t.accent:t.chipBg,color:isA?"#fff":t.textSecondary,border:`1px solid ${isA?t.accent:t.chipBorder}`,cursor:"pointer"}}>{f}</span>;})}</div>
      <SearchBox value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search schedules..." t={t}/>
    </div>
    <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,overflow:"hidden",backdropFilter:isDark?"blur(20px)":"none",boxShadow:t.tableShadow}}>
      <div style={{display:"grid",gridTemplateColumns:cols.map(c=>c.w).join(" "),padding:"12px 22px",background:t.tableHeader,borderBottom:`1px solid ${t.surfaceBorder}`,alignItems:"center"}}>
        <input type="checkbox" checked={sel.size===filtered.length&&filtered.length>0} onChange={()=>setSel(sel.size===filtered.length?new Set():new Set(filtered.map(s=>s.id)))} style={{accentColor:t.checkActive,width:14,height:14}}/>
        {cols.slice(1).map(c=><div key={c.l} style={{fontSize:10.5,fontWeight:600,letterSpacing:"1px",color:isDark?"rgba(255,255,255,0.3)":"#C4C0BA",textTransform:"uppercase",fontFamily:t.mono}}>{c.l}</div>)}
      </div>
      {filtered.map((s,i)=>{const isHov=hov===s.id;const isSel=sel.has(s.id);const [bg,color,border]=badge(s.status,isDark);return(<div key={s.id} className="data-row" onMouseEnter={()=>setHov(s.id)} onMouseLeave={()=>setHov(null)} style={{display:"grid",gridTemplateColumns:cols.map(c=>c.w).join(" "),padding:"12px 22px",borderBottom:i<filtered.length-1?`1px solid ${t.rowDivider}`:"none",alignItems:"center",background:isSel?(isDark?"rgba(52,211,153,0.04)":"#F0FDF4"):isHov?t.rowHover:"transparent",transition:"all 0.15s ease"}}>
        <input type="checkbox" checked={isSel} onChange={()=>{const n=new Set(sel);n.has(s.id)?n.delete(s.id):n.add(s.id);setSel(n);}} style={{accentColor:t.checkActive,width:14,height:14}} onClick={e=>e.stopPropagation()}/>
        <div style={{fontFamily:t.mono,fontSize:11,color:t.idText}}>{s.id}</div>
        <div style={{fontFamily:t.mono,fontSize:11.5,color:isDark?"#60A5FA":"#4F46E5",fontWeight:500}}>{s.contract}</div>
        <div style={{fontFamily:t.mono,fontSize:11,color:t.textMuted}}>{s.linked||<span style={{color:isDark?"rgba(255,255,255,0.15)":"#D4D0CB"}}>—</span>}</div>
        <div style={{fontFamily:t.mono,fontSize:12,color:isDark?"rgba(255,255,255,0.7)":"#44403C"}}>{s.dueDate}</div>
        <div style={{fontSize:12.5,color:t.textMuted}}>{s.type}</div>
        <div style={{fontFamily:t.mono,fontSize:12.5,fontWeight:700,color:isDark?"#60A5FA":"#4F46E5"}}>{s.payment}</div>
        <div><span style={{fontSize:11.5,fontWeight:600,padding:"4px 11px",borderRadius:20,background:bg,color,border:`1px solid ${border}`}}>{s.status}</span></div>
        <ActBtns show={isHov} t={t} onEdit={()=>openEdit(s)} onDel={()=>setDelT({id:s.id,name:s.id})}/>
      </div>);})}
    </div>
    <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:t.textSubtle}}>Showing <strong style={{color:t.textSecondary}}>{filtered.length}</strong> of <strong style={{color:t.textSecondary}}>{SCHEDULES.length}</strong> schedules{sel.size>0&&<span style={{color:t.accent,marginLeft:8}}>· {sel.size} selected</span>}</span><Pagination pages={["‹","1","2","3","›"]} t={t}/></div>
    <Modal open={modal.open} onClose={close} title={modal.mode==="add"?"New Schedule Entry":"Edit Schedule Entry"} onSave={close} t={t} isDark={isDark}>
      <FF label="Contract" t={t}><FSel value={modal.data.contract} onChange={e=>setF("contract",e.target.value)} options={CONTRACTS.map(c=>c.id)} t={t}/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FF label="Due Date" t={t}><FIn value={modal.data.dueDate} onChange={e=>setF("dueDate",e.target.value)} placeholder="YYYY-MM-DD" t={t} type="date"/></FF>
        <FF label="Payment Type" t={t}><FSel value={modal.data.type} onChange={e=>setF("type",e.target.value)} options={["Interest","Principal","Interest + Principal","Fee","Catch-Up"]} t={t}/></FF>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FF label="Payment Amount" t={t}><FIn value={modal.data.payment} onChange={e=>setF("payment",e.target.value)} placeholder="$0" t={t}/></FF>
        <FF label="Status" t={t}><FSel value={modal.data.status} onChange={e=>setF("status",e.target.value)} options={["Due","Paid","Missed"]} t={t}/></FF>
      </div>
    </Modal>
    <DelModal target={delT} onClose={()=>setDelT(null)} label="This schedule entry" t={t} isDark={isDark}/>
  </>);
}

function PagePayments({t,isDark}) {
  const [search,setSearch]=useState(""); const [hov,setHov]=useState(null); const [chip,setChip]=useState("All");
  const [modal,setModal]=useState({open:false,mode:"add",data:{}});
  const [delT,setDelT]=useState(null);
  const openAdd=()=>setModal({open:true,mode:"add",data:{contract:"",party:"",type:"Interest",amount:"",date:"",method:"Wire",direction:"Received",note:""}});
  const openEdit=r=>setModal({open:true,mode:"edit",data:{...r}});
  const close=()=>setModal(m=>({...m,open:false}));
  const setF=(k,v)=>setModal(m=>({...m,data:{...m.data,[k]:v}}));
  const filtered=PAYMENTS.filter(p=>{const ms=p.id.toLowerCase().includes(search.toLowerCase())||p.party.toLowerCase().includes(search.toLowerCase()); const mf=chip==="All"||p.direction===chip; return ms&&mf;});
  const cols=[{l:"PAY ID",w:"110px"},{l:"CONTRACT",w:"90px"},{l:"PARTY",w:"1fr"},{l:"TYPE",w:"110px"},{l:"AMOUNT",w:"120px"},{l:"DATE",w:"110px"},{l:"METHOD",w:"90px"},{l:"ACTIONS",w:"80px"}];
  return(<>
    <div style={{marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}><div><h1 style={{fontFamily:t.titleFont,fontWeight:t.titleWeight,fontSize:t.titleSize,color:isDark?"#fff":"#1C1917",letterSpacing:t.titleTracking,lineHeight:1,marginBottom:6}}>Payments</h1><p style={{fontSize:13.5,color:t.textMuted}}>Track actual cash receipts and disbursements</p></div><button className="primary-btn" onClick={openAdd} style={{background:t.accentGrad,color:"#fff",padding:"11px 22px",borderRadius:11,fontSize:13.5,fontWeight:600,boxShadow:`0 4px 16px ${t.accentShadow}`,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18,lineHeight:1}}>+</span> Record Payment</button></div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{display:"flex",gap:8}}>{["All","Received","Disbursed"].map(f=>{const isA=chip===f;return<span key={f} className="filter-chip" onClick={()=>setChip(f)} style={{fontSize:12,fontWeight:isA?600:500,padding:"5px 14px",borderRadius:20,background:isA?t.accent:t.chipBg,color:isA?"#fff":t.textSecondary,border:`1px solid ${isA?t.accent:t.chipBorder}`,cursor:"pointer"}}>{f}</span>;})}</div>
      <SearchBox value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search payments..." t={t}/>
    </div>
    <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,overflow:"hidden",backdropFilter:isDark?"blur(20px)":"none",boxShadow:t.tableShadow}}>
      <TblHead cols={cols} t={t} isDark={isDark}/>
      {filtered.map((p,i)=>{const isHov=hov===p.id;const isIn=p.direction==="Received";return(<div key={p.id} className="data-row" onMouseEnter={()=>setHov(p.id)} onMouseLeave={()=>setHov(null)} style={{display:"grid",gridTemplateColumns:cols.map(c=>c.w).join(" "),padding:"12px 22px",borderBottom:i<filtered.length-1?`1px solid ${t.rowDivider}`:"none",alignItems:"center",background:isHov?t.rowHover:"transparent",transition:"all 0.15s ease"}}>
        <div style={{fontFamily:t.mono,fontSize:10.5,color:t.idText}}>{p.id}</div>
        <div style={{fontFamily:t.mono,fontSize:11.5,color:isDark?"#60A5FA":"#4F46E5",fontWeight:500}}>{p.contract||<span style={{color:isDark?"rgba(255,255,255,0.15)":"#D4D0CB"}}>—</span>}</div>
        <div style={{fontSize:13,fontWeight:500,color:isDark?"rgba(255,255,255,0.85)":"#1C1917",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{p.party}</div>
        <div style={{fontSize:12,color:t.textMuted}}>{p.type}</div>
        <div style={{fontFamily:t.mono,fontSize:12.5,fontWeight:700,color:isIn?(isDark?"#34D399":"#059669"):(isDark?"#F87171":"#DC2626")}}>{isIn?"+":"−"}{p.amount}</div>
        <div style={{fontFamily:t.mono,fontSize:11,color:t.textMuted}}>{p.date}</div>
        <div style={{fontSize:12,color:t.textMuted}}>{p.method}</div>
        <ActBtns show={isHov} t={t} onEdit={()=>openEdit(p)} onDel={()=>setDelT({id:p.id,name:p.id})}/>
      </div>);})}
    </div>
    <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:t.textSubtle}}>Showing <strong style={{color:t.textSecondary}}>{filtered.length}</strong> of <strong style={{color:t.textSecondary}}>{PAYMENTS.length}</strong> payments</span><Pagination pages={["‹","1","›"]} t={t}/></div>
    <Modal open={modal.open} onClose={close} title={modal.mode==="add"?"Record Payment":"Edit Payment"} onSave={close} width={520} t={t} isDark={isDark}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FF label="Direction" t={t}><FSel value={modal.data.direction} onChange={e=>setF("direction",e.target.value)} options={["Received","Disbursed"]} t={t}/></FF>
        <FF label="Payment Type" t={t}><FSel value={modal.data.type} onChange={e=>setF("type",e.target.value)} options={["Interest","Principal","Interest + Principal","Disbursement","Fee"]} t={t}/></FF>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FF label="Contract" t={t}><FIn value={modal.data.contract} onChange={e=>setF("contract",e.target.value)} placeholder="C10000" t={t}/></FF>
        <FF label="Party" t={t}><FIn value={modal.data.party} onChange={e=>setF("party",e.target.value)} placeholder="Party name" t={t}/></FF>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FF label="Amount" t={t}><FIn value={modal.data.amount} onChange={e=>setF("amount",e.target.value)} placeholder="$0" t={t}/></FF>
        <FF label="Date" t={t}><FIn value={modal.data.date} onChange={e=>setF("date",e.target.value)} placeholder="YYYY-MM-DD" t={t} type="date"/></FF>
      </div>
      <FF label="Method" t={t}><FSel value={modal.data.method} onChange={e=>setF("method",e.target.value)} options={["Wire","Check","ACH","Cash"]} t={t}/></FF>
      <FF label="Note (optional)" t={t}><FIn value={modal.data.note} onChange={e=>setF("note",e.target.value)} placeholder="Any remarks..." t={t}/></FF>
    </Modal>
    <DelModal target={delT} onClose={()=>setDelT(null)} label="This payment record" t={t} isDark={isDark}/>
  </>);
}

function PageFees({t,isDark}) {
  const [search,setSearch]=useState(""); const [hov,setHov]=useState(null);
  const [modal,setModal]=useState({open:false,mode:"add",data:{}});
  const [delT,setDelT]=useState(null);
  const openAdd=()=>setModal({open:true,mode:"add",data:{name:"",method:"Percentage",rate:"",frequency:"One-time",description:""}});
  const openEdit=r=>setModal({open:true,mode:"edit",data:{...r}});
  const close=()=>setModal(m=>({...m,open:false}));
  const setF=(k,v)=>setModal(m=>({...m,data:{...m.data,[k]:v}}));
  const filtered=FEES_DATA.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())||f.id.toLowerCase().includes(search.toLowerCase()));
  const cols=[{l:"ID",w:"100px"},{l:"NAME",w:"1fr"},{l:"METHOD",w:"130px"},{l:"RATE",w:"110px"},{l:"FREQUENCY",w:"140px"},{l:"DESCRIPTION",w:"1fr"},{l:"ACTIONS",w:"90px"}];
  const mCfg={Percentage:[isDark?"rgba(96,165,250,0.15)":"#EFF6FF",isDark?"#60A5FA":"#2563EB",isDark?"rgba(96,165,250,0.3)":"#BFDBFE"],Flat:[isDark?"rgba(167,139,250,0.15)":"#F5F3FF",isDark?"#A78BFA":"#7C3AED",isDark?"rgba(167,139,250,0.3)":"#DDD6FE"]};
  return(<>
    <div style={{marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}><div><h1 style={{fontFamily:t.titleFont,fontWeight:t.titleWeight,fontSize:t.titleSize,color:isDark?"#fff":"#1C1917",letterSpacing:t.titleTracking,lineHeight:1,marginBottom:6}}>Fees</h1><p style={{fontSize:13.5,color:t.textMuted}}>Define and manage fee structures</p></div><button className="primary-btn" onClick={openAdd} style={{background:t.accentGrad,color:"#fff",padding:"11px 22px",borderRadius:11,fontSize:13.5,fontWeight:600,boxShadow:`0 4px 16px ${t.accentShadow}`,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18,lineHeight:1}}>+</span> New Fee</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
      {[{label:"Total Fees",value:FEES_DATA.length,accent:isDark?"#60A5FA":"#3B82F6",bg:isDark?"rgba(96,165,250,0.08)":"#EFF6FF",border:isDark?"rgba(96,165,250,0.15)":"#BFDBFE"},{label:"Percentage",value:FEES_DATA.filter(f=>f.method==="Percentage").length,accent:isDark?"#34D399":"#059669",bg:isDark?"rgba(52,211,153,0.08)":"#ECFDF5",border:isDark?"rgba(52,211,153,0.15)":"#A7F3D0"},{label:"Flat",value:FEES_DATA.filter(f=>f.method==="Flat").length,accent:isDark?"#A78BFA":"#7C3AED",bg:isDark?"rgba(167,139,250,0.08)":"#F5F3FF",border:isDark?"rgba(167,139,250,0.15)":"#DDD6FE"},{label:"Recurring",value:FEES_DATA.filter(f=>f.frequency!=="One-time"&&f.frequency!=="Per occurrence").length,accent:isDark?"#FBBF24":"#D97706",bg:isDark?"rgba(251,191,36,0.08)":"#FFFBEB",border:isDark?"rgba(251,191,36,0.15)":"#FDE68A"}].map(s=><StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark}/>)}
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><SearchBox value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fees..." t={t}/></div>
    <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,overflow:"hidden",backdropFilter:isDark?"blur(20px)":"none",boxShadow:t.tableShadow}}>
      <TblHead cols={cols} t={t} isDark={isDark}/>
      {filtered.map((f,i)=>{const isHov=hov===f.id;const[mb,mc,mbr]=mCfg[f.method]||["transparent","#888","#ccc"];return(<div key={f.id} className="data-row" onMouseEnter={()=>setHov(f.id)} onMouseLeave={()=>setHov(null)} style={{display:"grid",gridTemplateColumns:cols.map(c=>c.w).join(" "),padding:"12px 22px",borderBottom:i<filtered.length-1?`1px solid ${t.rowDivider}`:"none",alignItems:"center",background:isHov?t.rowHover:"transparent",transition:"all 0.15s ease"}}>
        <div style={{fontFamily:t.mono,fontSize:11,color:t.idText}}>{f.id}</div>
        <div style={{fontSize:13.5,fontWeight:500,color:isDark?"rgba(255,255,255,0.85)":(isHov?"#1C1917":"#44403C")}}>{f.name}</div>
        <div><span style={{fontSize:11.5,fontWeight:600,padding:"4px 11px",borderRadius:20,background:mb,color:mc,border:`1px solid ${mbr}`}}>{f.method}</span></div>
        <div style={{fontFamily:t.mono,fontSize:12.5,fontWeight:700,color:isDark?"#60A5FA":"#4F46E5"}}>{f.rate}</div>
        <div style={{fontSize:12.5,color:t.textMuted}}>{f.frequency}</div>
        <div style={{fontSize:12.5,color:t.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{f.description}</div>
        <ActBtns show={isHov} t={t} onEdit={()=>openEdit(f)} onDel={()=>setDelT({id:f.id,name:f.name})}/>
      </div>);})}
    </div>
    <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:t.textSubtle}}>Showing <strong style={{color:t.textSecondary}}>{filtered.length}</strong> of <strong style={{color:t.textSecondary}}>{FEES_DATA.length}</strong> fees</span><Pagination pages={["‹","1","›"]} t={t}/></div>
    <Modal open={modal.open} onClose={close} title={modal.mode==="add"?"New Fee":"Edit Fee"} onSave={close} t={t} isDark={isDark}>
      <FF label="Fee Name" t={t}><FIn value={modal.data.name} onChange={e=>setF("name",e.target.value)} placeholder="e.g. Origination Fee" t={t}/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FF label="Method" t={t}><FSel value={modal.data.method} onChange={e=>setF("method",e.target.value)} options={["Percentage","Flat"]} t={t}/></FF>
        <FF label="Rate / Amount" t={t}><FIn value={modal.data.rate} onChange={e=>setF("rate",e.target.value)} placeholder={modal.data.method==="Flat"?"$500":"1.50%"} t={t}/></FF>
      </div>
      <FF label="Frequency" t={t}><FSel value={modal.data.frequency} onChange={e=>setF("frequency",e.target.value)} options={["One-time","Monthly","Quarterly","Annual","Per occurrence"]} t={t}/></FF>
      <FF label="Description" t={t}><FIn value={modal.data.description} onChange={e=>setF("description",e.target.value)} placeholder="Brief description..." t={t}/></FF>
    </Modal>
    <DelModal target={delT} onClose={()=>setDelT(null)} label="This fee definition" t={t} isDark={isDark}/>
  </>);
}

function PageDimensions({t,isDark}) {
  const [editing,setEditing]=useState(null);
  return(<>
    <div style={{marginBottom:28}}><h1 style={{fontFamily:t.titleFont,fontWeight:t.titleWeight,fontSize:t.titleSize,color:isDark?"#fff":"#1C1917",letterSpacing:t.titleTracking,lineHeight:1,marginBottom:6}}>Dimensions</h1><p style={{fontSize:13.5,color:t.textMuted}}>Reference data · <strong style={{color:t.textSecondary}}>{DIMENSIONS.length}</strong> groups · <strong style={{color:t.textSecondary}}>{DIMENSIONS.reduce((s,g)=>s+g.items.length,0)}</strong> values</p></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:20}}>
      {DIMENSIONS.map(g=>{const accent=g.accent(isDark),bg=g.bg(isDark),border=g.border(isDark),isEd=editing===g.name;return(
        <div key={g.name} className="dim-card" style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,overflow:"hidden",backdropFilter:isDark?"blur(20px)":"none"}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${t.surfaceBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:bg}}>
            <div><div style={{fontSize:13.5,fontWeight:700,color:accent}}>{g.name}</div></div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontFamily:t.mono,fontSize:11,color:accent,background:isDark?"rgba(255,255,255,0.08)":"#fff",padding:"2px 8px",borderRadius:20,border:`1px solid ${border}`}}>{g.items.length} values</span>
              <button onClick={()=>setEditing(isEd?null:g.name)} style={{width:28,height:28,borderRadius:7,background:isEd?accent:t.editBtn[0],color:isEd?(isDark?"#050c15":"#fff"):t.editBtn[1],display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,border:"none",cursor:"pointer"}}>
                {isEd?"✓":"✎"}
              </button>
            </div>
          </div>
          <div style={{padding:"16px 20px",display:"flex",flexWrap:"wrap",gap:8}}>
            {g.items.map(item=>(
              <div key={item} style={{display:"flex",alignItems:"center",gap:5,fontSize:12.5,fontWeight:500,padding:"5px 12px",borderRadius:20,background:t.tagBg,color:t.tagColor,border:`1px solid ${t.tagBorder}`}}>
                {item}
                {isEd&&<span style={{fontSize:13,color:isDark?"#F87171":"#DC2626",fontWeight:700,lineHeight:1,marginLeft:2,cursor:"pointer"}}>×</span>}
              </div>
            ))}
            {isEd&&<div style={{display:"flex",alignItems:"center",gap:6}}><input placeholder="Add value..." style={{background:t.searchBg,border:`1px solid ${t.searchBorder}`,borderRadius:20,padding:"5px 12px",color:t.searchText,fontSize:12.5,width:120}}/><button style={{width:28,height:28,borderRadius:8,background:t.addItemBg,color:t.addItemColor,border:`1px solid ${t.addItemBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer",fontWeight:700}}>+</button></div>}
          </div>
        </div>
      );})}
    </div>
  </>);
}

function PageReports({t,isDark}) {
  const [tab,setTab]=useState("Cashflow");
  const maxBar=Math.max(...MONTHLY.map(d=>Math.max(d.received,d.disbursed)));
  const projMax=Math.max(1250000,1850000,320000,500000,270000,600000);
  const projData=[{name:"Palm Springs Villas",total:810000},{name:"Irvine Office Complex",total:1850000},{name:"San Diego Condo",total:320000},{name:"Beverly Hills Estate",total:500000},{name:"Santa Monica Retail",total:270000},{name:"Anaheim Hotel (Closed)",total:0}];
  const invData=[{name:"Kies Capital Group",amount:1250000,pct:26},{name:"Hsiu Ju Hsu Properties",amount:600000,pct:12},{name:"Suet Fong Yu Ho",amount:500000,pct:10},{name:"Pao Fu Chen",amount:450000,pct:9},{name:"Others (16)",amount:2020000,pct:42}];
  const pColors=[isDark?"#60A5FA":"#3B82F6",isDark?"#34D399":"#059669",isDark?"#FBBF24":"#D97706",isDark?"#A78BFA":"#7C3AED",isDark?"#F472B6":"#BE185D",isDark?"rgba(255,255,255,0.2)":"#D1D5DB"];
  const kpi=[{label:"Capital Deployed",value:"$4,820,000",sub:"Across 7 projects",accent:isDark?"#60A5FA":"#3B82F6",bg:isDark?"rgba(96,165,250,0.08)":"#EFF6FF",border:isDark?"rgba(96,165,250,0.15)":"#BFDBFE"},{label:"Cash Received YTD",value:"$788,041",sub:"Interest + principal",accent:isDark?"#34D399":"#059669",bg:isDark?"rgba(52,211,153,0.08)":"#ECFDF5",border:isDark?"rgba(52,211,153,0.15)":"#A7F3D0"},{label:"Avg Interest Rate",value:"9.85%",sub:"Weighted average",accent:isDark?"#FBBF24":"#D97706",bg:isDark?"rgba(251,191,36,0.08)":"#FFFBEB",border:isDark?"rgba(251,191,36,0.15)":"#FDE68A"},{label:"Collection Rate",value:"94.2%",sub:"Paid vs scheduled",accent:isDark?"#A78BFA":"#7C3AED",bg:isDark?"rgba(167,139,250,0.08)":"#F5F3FF",border:isDark?"rgba(167,139,250,0.15)":"#DDD6FE"}];
  return(<>
    <div style={{marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}><div><h1 style={{fontFamily:t.titleFont,fontWeight:t.titleWeight,fontSize:t.titleSize,color:isDark?"#fff":"#1C1917",letterSpacing:t.titleTracking,lineHeight:1,marginBottom:6}}>Reports</h1><p style={{fontSize:13.5,color:t.textMuted}}>Analytics and financial summaries</p></div><button className="export-btn" style={{background:t.accentGrad,color:"#fff",padding:"11px 22px",borderRadius:11,fontSize:13.5,fontWeight:600,boxShadow:`0 4px 16px ${t.accentShadow}`,border:"none",cursor:"pointer"}}>↓ Export PDF</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>{kpi.map(s=><StatCard key={s.label} {...s} large titleFont={t.titleFont} isDark={isDark}/>)}</div>
    <div style={{display:"flex",gap:4,marginBottom:20,background:isDark?"rgba(255,255,255,0.04)":"#F1F0EE",padding:4,borderRadius:10,width:"fit-content"}}>
      {["Cashflow","Capital","Investors"].map(tb=><div key={tb} onClick={()=>setTab(tb)} className="report-tab" style={{padding:"7px 18px",borderRadius:8,fontSize:13,fontWeight:tab===tb?600:400,background:tab===tb?(isDark?"rgba(52,211,153,0.15)":"#fff"):"transparent",color:tab===tb?t.accent:t.textSecondary,border:tab===tb?`1px solid ${isDark?"rgba(52,211,153,0.25)":"#E5E3DF"}`:"1px solid transparent",cursor:"pointer"}}>{tb}</div>)}
    </div>
    {tab==="Cashflow"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,padding:"20px",backdropFilter:isDark?"blur(20px)":"none",gridColumn:"1 / -1"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><div style={{fontSize:13,fontWeight:600,color:isDark?"#fff":"#1C1917"}}>Monthly Cashflow</div><div style={{fontSize:11.5,color:t.textMuted,marginTop:2}}>Jul 2025 – Feb 2026</div></div><div style={{display:"flex",gap:16,fontSize:11.5}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:3,background:isDark?"#34D399":"#059669"}}/><span style={{color:t.textMuted}}>Received</span></div><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:3,background:isDark?"#F87171":"#DC2626"}}/><span style={{color:t.textMuted}}>Disbursed</span></div></div></div>
        <div style={{display:"flex",gap:12,alignItems:"flex-end",height:140}}>{MONTHLY.map(d=>{const rH=maxBar>0?(d.received/maxBar)*120:0;const dH=maxBar>0?(d.disbursed/maxBar)*120:0;return(<div key={d.month} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{display:"flex",gap:3,alignItems:"flex-end",height:120}}><div style={{width:"45%",height:rH,borderRadius:"4px 4px 0 0",background:isDark?"rgba(52,211,153,0.7)":"#059669",minHeight:rH>0?3:0}}/><div style={{width:"45%",height:dH,borderRadius:"4px 4px 0 0",background:isDark?"rgba(248,113,113,0.7)":"#DC2626",minHeight:dH>0?3:0}}/></div><div style={{fontSize:10.5,color:t.textMuted,fontFamily:t.mono}}>{d.month}</div></div>);})}</div>
      </div>
      <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,padding:"20px",backdropFilter:isDark?"blur(20px)":"none"}}>
        <div style={{fontSize:13,fontWeight:600,color:isDark?"#fff":"#1C1917",marginBottom:16}}>Period Summary</div>
        {[{label:"Total Received",value:"$788,041",color:isDark?"#34D399":"#059669"},{label:"Total Disbursed",value:"$68,000",color:isDark?"#F87171":"#DC2626"},{label:"Net Cashflow",value:"$720,041",color:isDark?"#FBBF24":"#D97706"}].map((r,i,arr)=><div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<arr.length-1?`1px solid ${t.rowDivider}`:"none"}}><span style={{fontSize:12.5,color:t.textMuted}}>{r.label}</span><span style={{fontFamily:t.mono,fontSize:14,fontWeight:700,color:r.color}}>{r.value}</span></div>)}
      </div>
      <div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,padding:"20px",backdropFilter:isDark?"blur(20px)":"none"}}>
        <div style={{fontSize:13,fontWeight:600,color:isDark?"#fff":"#1C1917",marginBottom:16}}>By Payment Type</div>
        {[{label:"Interest",pct:72,color:isDark?"#60A5FA":"#3B82F6"},{label:"Principal",pct:24,color:isDark?"#34D399":"#059669"},{label:"Fees",pct:4,color:isDark?"#FBBF24":"#D97706"}].map(r=><div key={r.label} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12.5,color:t.textMuted}}>{r.label}</span><span style={{fontFamily:t.mono,fontSize:12,fontWeight:600,color:r.color}}>{r.pct}%</span></div><div style={{height:6,borderRadius:6,background:t.barTrack,overflow:"hidden"}}><div style={{height:"100%",width:`${r.pct}%`,borderRadius:6,background:r.color}}/></div></div>)}
      </div>
    </div>)}
    {tab==="Capital"&&(<div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,padding:"20px",backdropFilter:isDark?"blur(20px)":"none"}}>
      <div style={{fontSize:13,fontWeight:600,color:isDark?"#fff":"#1C1917",marginBottom:20}}>Capital Deployed by Project</div>
      {projData.map((p,i)=>{const color=pColors[i];const pct=projMax>0?(p.total/projMax)*100:0;return(<div key={p.name} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:500,color:isDark?"rgba(255,255,255,0.8)":"#44403C"}}>{p.name}</span><span style={{fontFamily:t.mono,fontSize:12.5,fontWeight:700,color}}>${p.total.toLocaleString()}</span></div><div style={{height:8,borderRadius:8,background:t.barTrack,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,borderRadius:8,background:color,opacity:p.total===0?0.2:1}}/></div></div>);})}
    </div>)}
    {tab==="Investors"&&(<div style={{background:t.surface,borderRadius:16,border:`1px solid ${t.surfaceBorder}`,padding:"20px",backdropFilter:isDark?"blur(20px)":"none"}}>
      <div style={{fontSize:13,fontWeight:600,color:isDark?"#fff":"#1C1917",marginBottom:20}}>Capital by Party</div>
      {invData.map((inv,i)=>{const color=pColors[i];return(<div key={inv.name} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<invData.length-1?`1px solid ${t.rowDivider}`:"none"}}><div style={{width:36,height:36,borderRadius:9,background:`${color}22`,border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11.5,fontWeight:700,color,flexShrink:0}}>{initials(inv.name).slice(0,2)}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:isDark?"rgba(255,255,255,0.85)":"#1C1917",marginBottom:4}}>{inv.name}</div><div style={{height:5,borderRadius:5,background:t.barTrack,overflow:"hidden"}}><div style={{height:"100%",width:`${inv.pct}%`,borderRadius:5,background:color}}/></div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:t.mono,fontSize:13,fontWeight:700,color}}>${inv.amount.toLocaleString()}</div><div style={{fontSize:10.5,color:t.textMuted,marginTop:2}}>{inv.pct}%</div></div></div>);})}
    </div>)}
  </>);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const t = mkTheme(isDark);

  const pageMap = {
    "Dashboard":        <PageDashboard  t={t} isDark={isDark}/>,
    "Projects":         <PageProjects   t={t} isDark={isDark}/>,
    "Parties":          <PageParties    t={t} isDark={isDark}/>,
    "Contracts":        <PageContracts  t={t} isDark={isDark}/>,
    "Payment Schedule": <PageSchedule   t={t} isDark={isDark}/>,
    "Payments":         <PagePayments   t={t} isDark={isDark}/>,
    "Fees":             <PageFees       t={t} isDark={isDark}/>,
    "Dimensions":       <PageDimensions t={t} isDark={isDark}/>,
    "Reports":          <PageReports    t={t} isDark={isDark}/>,
  };

  return (
    <div style={{display:"flex",height:"100vh",background:t.body,fontFamily:t.font,color:t.text,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&family=Cormorant+Garamond:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${t.scrollTrack}; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 10px; }
        .nav-item   { transition: all 0.18s ease; cursor: pointer; border-radius: 10px; }
        .nav-item:hover { background: ${t.navHover} !important; }
        .data-row   { transition: all 0.18s ease; cursor: pointer; }
        .data-row:hover { background: ${t.rowHover} !important; ${isDark?"transform:translateX(3px);":""} }
        .activity-row { transition: all 0.15s ease; }
        .activity-row:hover { background: ${isDark?"rgba(255,255,255,0.03)":"#FAFAF9"} !important; }
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
        .search-input:focus { outline: none; border-color: ${t.searchFocus} !important; box-shadow: 0 0 0 3px ${t.searchShadow} !important; }
        .search-input::placeholder { color: ${t.searchPh}; }
        .theme-toggle { transition: all 0.2s ease; cursor: pointer; border: none; }
        .theme-toggle:hover { opacity: 0.85; transform: scale(1.05); }
      `}</style>

      {/* ── Sidebar ── */}
      <div style={{width:228,background:t.sidebar,backdropFilter:t.glass?"blur(20px)":"none",borderRight:`1px solid ${t.sidebarBorder}`,display:"flex",flexDirection:"column",flexShrink:0,boxShadow:t.sidebarShadow}}>
        {/* Logo */}
        <div style={{padding:"26px 22px 24px",borderBottom:`1px solid ${t.sidebarBorder}`}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:38,height:38,borderRadius:11,background:t.logoGrad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:800,color:"#fff",boxShadow:t.logoShadow,letterSpacing:"-1px"}}>A</div>
            <div>
              <div style={{fontFamily:isDark?"'Syne',sans-serif":"'Cormorant Garamond',serif",fontWeight:isDark?800:700,fontSize:isDark?14:17,color:isDark?"#fff":"#1C1917",lineHeight:1}}>AVG</div>
              <div style={{fontSize:9.5,color:t.textMuted,letterSpacing:"0.8px",textTransform:"uppercase",marginTop:2}}>Cashflow Mgmt</div>
            </div>
          </div>
        </div>

        {/* Nav label (light only) */}
        {!isDark&&<div style={{padding:"20px 22px 8px"}}><span style={{fontSize:9.5,fontWeight:600,letterSpacing:"1.2px",textTransform:"uppercase",color:t.textSubtle}}>Menu</span></div>}

        {/* Nav items */}
        <nav style={{padding:isDark?"16px 12px":"0 12px",flex:1,display:"flex",flexDirection:"column",gap:isDark?2:1,marginTop:isDark?0:12,overflowY:"auto"}}>
          {NAV.map(item=>{
            const isActive=activePage===item.label;
            return(
              <div key={item.label} className="nav-item" onClick={()=>setActivePage(item.label)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:isActive?t.navActive:"transparent",borderLeft:`2px solid ${isActive?t.navActivePill:"transparent"}`,color:isActive?t.navActiveText:t.navText,fontSize:13.5,fontWeight:isActive?600:400,position:"relative"}}>
                {!isDark&&isActive&&<div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,borderRadius:"0 3px 3px 0",background:t.navActivePill}}/>}
                <span style={{fontSize:13,opacity:isActive?1:(isDark?0.8:0.6)}}>{item.icon}</span>
                {item.label}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div style={{padding:"16px",borderTop:`1px solid ${t.sidebarBorder}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:isDark?32:34,height:isDark?32:34,borderRadius:isDark?8:9,background:isDark?"linear-gradient(135deg,#60A5FA,#3B82F6)":"linear-gradient(135deg,#F472B6,#EC4899)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>AD</div>
            <div>
              <div style={{fontSize:isDark?12:13,fontWeight:isDark?500:600,color:isDark?"rgba(255,255,255,0.8)":"#292524"}}>Admin</div>
              <div style={{fontSize:isDark?10:11,color:t.textMuted}}>Super User</div>
            </div>
            {!isDark&&<div style={{marginLeft:"auto",fontSize:16,color:t.textSubtle,cursor:"pointer"}}>⋯</div>}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{height:58,borderBottom:`1px solid ${t.topbarBorder}`,background:t.topbar,backdropFilter:t.glass?"blur(10px)":"none",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,color:t.breadcrumb}}>
            <span>AVG Cashflow</span>
            <span style={{color:isDark?"rgba(255,255,255,0.2)":"#D4D0CB"}}>›</span>
            <span style={{color:t.breadcrumbActive,fontWeight:500}}>{activePage}</span>
          </div>
          <div style={{display:"flex",gap:16,fontSize:12.5,alignItems:"center"}}>
            <span style={{color:t.textSecondary,cursor:"pointer"}}>Profile</span>
            <span style={{color:t.textSecondary,cursor:"pointer"}}>Settings</span>
            <button className="theme-toggle" onClick={()=>setIsDark(!isDark)}
              style={{background:isDark?"rgba(52,211,153,0.1)":"#EEF2FF",color:isDark?"#34D399":"#4F46E5",border:`1px solid ${isDark?"rgba(52,211,153,0.25)":"#C7D2FE"}`,padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:5}}>
              {isDark?"☀ Light":"☽ Dark"}
            </button>
            <span style={{color:t.logoutText,cursor:"pointer",fontWeight:500,background:t.logoutBg,padding:"4px 12px",borderRadius:6,border:`1px solid ${t.logoutBorder}`,fontSize:12}}>Logout</span>
          </div>
        </div>

        {/* Page content */}
        <div style={{flex:1,overflow:"auto",padding:"32px 36px"}}>
          {pageMap[activePage]}
        </div>
      </div>
    </div>
  );
}

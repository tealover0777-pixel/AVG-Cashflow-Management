import { badge } from "../utils";
import { StatCard } from "../components";

export default function PageDashboard({ t, isDark, PROJECTS = [], CONTRACTS = [], PARTIES = [], SCHEDULES = [], MONTHLY = [] }) {
  const cards = [
    { label: "Active Contracts", value: CONTRACTS.filter(c => c.status === "Active").length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" },
    { label: "Total Parties", value: PARTIES.length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" },
    { label: "Payments Due", value: SCHEDULES.filter(s => s.status === "Due").length, accent: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB", border: isDark ? "rgba(251,191,36,0.15)" : "#FDE68A" },
    { label: "Missed", value: SCHEDULES.filter(s => s.status === "Missed").length, accent: isDark ? "#F87171" : "#DC2626", bg: isDark ? "rgba(248,113,113,0.08)" : "#FEF2F2", border: isDark ? "rgba(248,113,113,0.15)" : "#FECACA" },
  ];
  const recent = [
    { id: "PS10052", desc: "Interest payment received — C10002", date: "2026-02-28", status: "Paid", amount: "+$8,333" },
    { id: "C10008", desc: "New contract added — Hsiu Ju Hsu Properties", date: "2026-02-20", status: "Active", amount: "$600,000" },
    { id: "PS10056", desc: "Missed payment — C10007", date: "2026-01-31", status: "Missed", amount: "$1,333" },
    { id: "PAY10004", desc: "Construction draw disbursed — Palm Springs", date: "2026-02-10", status: "Due", amount: "-$25,000" },
  ];
  return (
    <>
      <div style={{ marginBottom: 28 }}><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Dashboard</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Welcome to AVG Cashflow Management</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {cards.map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
      </div>
      <div style={{ background: t.accentGrad, borderRadius: 14, padding: "20px 28px", marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 4px 20px ${t.accentShadow}` }}>
        <div><div style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Total Capital Under Management</div><div style={{ fontFamily: t.titleFont, fontSize: 36, fontWeight: t.titleWeight, color: isDark ? "#050c15" : "#fff", letterSpacing: "-1.5px", lineHeight: 1 }}>$4,820,000</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)", marginBottom: 4 }}>{PROJECTS.filter(p => p.status === "Active").length} active projects</div><div style={{ fontFamily: t.mono, fontSize: 13, color: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.9)", fontWeight: 600 }}>Avg rate 9.85%</div></div>
      </div>
      <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", backdropFilter: isDark ? "blur(20px)" : "none" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>Recent Activity</span><span style={{ fontSize: 11, color: t.accent, cursor: "pointer", fontWeight: 500 }}>View all →</span></div>
        {recent.map((item, i) => {
          const [bg, color, border] = badge(item.status, isDark); return (
            <div key={item.id} className="activity-row" style={{ padding: "12px 20px", borderBottom: i < recent.length - 1 ? `1px solid ${t.surfaceBorder}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color, flexShrink: 0 }}>◇</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.desc}</div><div style={{ fontSize: 11, color: t.textMuted, marginTop: 2, fontFamily: t.mono }}>{item.id} · {item.date}</div></div>
              <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 12, fontWeight: 600, color }}>{item.amount}</div><span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: bg, color, border: `1px solid ${border}` }}>{item.status}</span></div>
            </div>
          );
        })}
      </div>
    </>
  );
}

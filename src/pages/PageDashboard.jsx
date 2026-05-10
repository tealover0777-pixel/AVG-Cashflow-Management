import React, { useState, useMemo } from "react";
import { badge, fmtCurr, getCurrentPeriod } from "../utils";
import { StatCard, Bdg, ActBtns } from "../components";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Wallet, TrendingUp, AlertCircle, FileText,
  ArrowUpRight, ArrowDownRight, Calendar, Users
} from 'lucide-react';

const CF_TYPES = [
  { key: "investorInterest", label: "Investor Interest", color: "#6366F1", match: t => /investor/i.test(t || "") },
  { key: "borrowerInterest", label: "Borrower Interest", color: "#10B981", match: t => /borrower/i.test(t || "") },
  { key: "principalDeposit", label: "Principal Deposit", color: "#8B5CF6", match: t => /principal/i.test(t || "") },
  { key: "disbursement",     label: "Disbursement",     color: "#F59E0B", match: t => /disburs/i.test(t || "") },
  { key: "fee",              label: "Fee",              color: "#EF4444", match: t => /fee/i.test(t || "") },
];

export default function PageDashboard(props) {
  const { t, isDark, setActivePage, DIMENSIONS = [],
    DEALS = [], INVESTMENTS = [], CONTACTS = [], SCHEDULES = [] } = props;
  const data = useDashboardData({ ...props, DIMENSIONS });
  const { metrics, recentActivity, investments, isMember, myContact } = data;

  const [cfDeal, setCfDeal] = useState("");
  const [cfContact, setCfContact] = useState("");
  const [cfActiveTypes, setCfActiveTypes] = useState(() => new Set(CF_TYPES.map(f => f.key)));

  const toggleType = (key) => setCfActiveTypes(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const cfDeals = useMemo(() => {
    let deals = DEALS;
    if (cfContact) {
      const dealIds = new Set(INVESTMENTS.filter(i => i.contact_id === cfContact).map(i => i.deal_id).filter(Boolean));
      deals = deals.filter(d => dealIds.has(d.id));
    }
    return [...new Map(deals.map(d => [d.id, d])).values()]
      .sort((a, b) => (a.deal_name || a.name || "").localeCompare(b.deal_name || b.name || ""));
  }, [DEALS, INVESTMENTS, cfContact]);

  const cfContacts = useMemo(() => {
    let contacts = CONTACTS;
    if (cfDeal) {
      const contactIds = new Set(INVESTMENTS.filter(i => i.deal_id === cfDeal).map(i => i.contact_id).filter(Boolean));
      contacts = contacts.filter(c => contactIds.has(c.id) || contactIds.has(c.docId));
    }
    return [...new Map(contacts.map(c => [c.id, c])).values()]
      .sort((a, b) => ((a.first_name || "") + (a.last_name || "")).localeCompare((b.first_name || "") + (b.last_name || "")));
  }, [CONTACTS, INVESTMENTS, cfDeal]);

  const cfChartData = useMemo(() => {
    const ZEROED = new Set(["Missed", "Cancelled", "VOID", "Waived", "Replaced"]);
    let base = SCHEDULES.filter(s => s.active_version !== false && !ZEROED.has(s.status));

    if (cfDeal) {
      const invIds = new Set(INVESTMENTS.filter(i => i.deal_id === cfDeal).map(i => i.id));
      base = base.filter(s => invIds.has(s.investment_id || s.investment));
    }
    if (cfContact) {
      const invIds = new Set(INVESTMENTS.filter(i => i.contact_id === cfContact).map(i => i.id));
      base = base.filter(s => invIds.has(s.investment_id || s.investment));
    }

    const dates = base.map(s => s.scheduled_payment_date || s.dueDate).filter(Boolean);
    if (!dates.length) return [];
    const first = new Date(Math.min(...dates.map(d => new Date(d))));
    const last  = new Date(Math.max(...dates.map(d => new Date(d))));
    const startQ = new Date(first.getFullYear(), Math.floor(first.getMonth() / 3) * 3, 1);
    const endQ   = new Date(last.getFullYear(),  (Math.floor(last.getMonth()  / 3) + 1) * 3, 0);

    const result = [];
    let cur = new Date(startQ);
    while ((cur <= endQ || result.length < 4) && result.length < 40) {
      const qStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
      const qEnd   = new Date(cur.getFullYear(), cur.getMonth() + 3, 0);
      const qs = qStart.toISOString().slice(0, 10);
      const qe = qEnd.toISOString().slice(0, 10);
      const qSchedules = base.filter(s => { const d = s.scheduled_payment_date || s.dueDate; return d && d >= qs && d <= qe; });
      const entry = { name: `Q${Math.floor(cur.getMonth() / 3) + 1} ${cur.getFullYear()}` };
      CF_TYPES.forEach(f => {
        entry[f.key] = qSchedules.filter(s => f.match(s.type)).reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, "")), 0);
      });
      result.push(entry);
      cur.setMonth(cur.getMonth() + 3);
    }
    return result;
  }, [SCHEDULES, INVESTMENTS, cfDeal, cfContact]);

  const topCards = [
    {
      label: "Total Income",
      value: fmtCurr(metrics.totalIncome),
      accent: "#10B981",
      bg: isDark ? "rgba(16,185,129,0.08)" : "#ECFDF5",
      border: isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5",
      icon: <TrendingUp size={16} />
    },
    {
      label: "Missed Payments",
      value: metrics.missedCount,
      sub: fmtCurr(metrics.missedValue),
      accent: "#EF4444",
      bg: isDark ? "rgba(239,68,68,0.08)" : "#FEF2F2",
      border: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
      icon: <AlertCircle size={16} />
    },
    {
      label: "Active Investments",
      value: metrics.activeInvestmentsCount,
      accent: t.accent,
      bg: isDark ? "rgba(99,102,241,0.08)" : "#EEF2FF",
      border: isDark ? "rgba(99,102,241,0.15)" : "#E0E7FF",
      icon: <FileText size={16} />
    },
    {
      label: "Average Yield",
      value: `${metrics.avgYield.toFixed(2)}%`,
      accent: "#F59E0B",
      bg: isDark ? "rgba(245,158,11,0.08)" : "#FFFBEB",
      border: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7",
      icon: <TrendingUp size={16} />
    },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{
            fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize,
            color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6
          }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13.5, color: t.textMuted }}>
            {isMember ? `Welcome back, ${myContact?.name || 'Member'}` : "AVG Cashflow System Overview"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Current Period</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fff' : '#1C1917' }}>
              {getCurrentPeriod()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Hero Card */}
        <div style={{
          background: t.accentGrad, borderRadius: 18, padding: "24px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          boxShadow: `0 10px 30px ${t.accentShadow}`, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
              Capital Under Management
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {fmtCurr(metrics.totalAUM)}
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600 }}>
            {metrics.aumTrend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {metrics.aumTrend >= 0 ? "+" : ""}{metrics.aumTrend.toFixed(1)}% from last month
          </div>
        </div>

        {topCards.map((s, i) => (
          <div key={i} style={{
            background: t.surface, borderRadius: 18, padding: 20, border: `1px solid ${t.surfaceBorder}`,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.accent, border: `1px solid ${s.border}` }}>
                {s.icon}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#fff' : '#1C1917' }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: t.surface, borderRadius: 20, padding: 24, border: `1px solid ${t.surfaceBorder}`, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#1C1917' }}>Cashflow Overview</h3>
          </div>

          {/* Filters row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            {/* Deal Name dropdown */}
            <select
              value={cfDeal}
              onChange={e => { setCfDeal(e.target.value); setCfContact(""); }}
              style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${cfDeal ? t.accent : t.border}`, background: cfDeal ? (isDark ? 'rgba(99,102,241,0.12)' : '#EEF2FF') : (isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'), color: cfDeal ? t.accent : t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Deals</option>
              {cfDeals.map(d => <option key={d.id} value={d.id}>{d.deal_name || d.name}</option>)}
            </select>

            {/* Contact Name dropdown */}
            <select
              value={cfContact}
              onChange={e => { setCfContact(e.target.value); setCfDeal(""); }}
              style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${cfContact ? t.accent : t.border}`, background: cfContact ? (isDark ? 'rgba(99,102,241,0.12)' : '#EEF2FF') : (isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'), color: cfContact ? t.accent : t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Contacts</option>
              {cfContacts.map(c => <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.name || c.email || c.id}</option>)}
            </select>

            <div style={{ width: 1, height: 20, background: t.border, margin: '0 2px' }} />

            {/* Payment type toggle chips */}
            {CF_TYPES.map(f => {
              const active = cfActiveTypes.has(f.key);
              return (
                <button
                  key={f.key}
                  onClick={() => toggleType(f.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20, border: `1px solid ${active ? f.color : (isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB')}`,
                    background: active ? `${f.color}18` : 'transparent',
                    color: active ? f.color : (isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF'),
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? f.color : (isDark ? 'rgba(255,255,255,0.2)' : '#D1D5DB'), flexShrink: 0 }} />
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div style={{ flex: 1, minHeight: 0, width: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: 8, scrollbarWidth: 'thin' }}>
            <div style={{ width: Math.max(cfChartData.length * 130, 600), height: '100%', minWidth: 600 }}>
              {cfChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cfChartData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: t.textMuted }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: t.textMuted }} tickFormatter={v => `$${v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'k'}`} />
                    <Tooltip
                      contentStyle={{ background: isDark ? '#1C1917' : '#fff', border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, fontSize: 12 }}
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                      formatter={(value, name) => {
                        const f = CF_TYPES.find(x => x.key === name);
                        return [fmtCurr(value), f?.label || name];
                      }}
                    />
                    {CF_TYPES.map(f => cfActiveTypes.has(f.key) && (
                      <Bar key={f.key} dataKey={f.key} fill={f.color} radius={[3, 3, 0, 0]} barSize={14} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: t.textMuted, fontSize: 13 }}>No cashflow data to display</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: t.surface, borderRadius: 20, padding: 24, border: `1px solid ${t.surfaceBorder}`, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#1C1917' }}>{isMember ? 'My Investments' : 'Investments'}</h3>
            {!isMember && <button onClick={() => setActivePage("Investments")} style={{ fontSize: 11, color: t.accent, background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>View All →</button>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {investments.length === 0 && <div style={{ fontSize: 12, color: t.textMuted, textAlign: 'center', padding: 20 }}>No investments found</div>}
            {investments.slice(0, 8).map(c => {
              const amt = Number(String(c.amount || 0).replace(/[^0-9.-]/g, ''));
              const rate = Number(String(c.rate || 0).replace(/[^0-9.-]/g, ''));
              const [bg, color, brd] = badge(c.status, isDark);
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: isDark ? '#fff' : '#1C1917' }}>{c.deal_name}</span>
                      <Bdg status={c.status} isDark={isDark} />
                    </div>
                    <div style={{ fontSize: 11, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.type || '—'} · {rate}% · {c.freq || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#fff' : '#1C1917' }}>{fmtCurr(amt)}</div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>{c.start_date || '—'} ~ {c.maturity_date || '—'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table & Activity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ background: t.surface, borderRadius: 20, border: `1px solid ${t.surfaceBorder}`, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column', maxHeight: 480 }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${t.surfaceBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#fff' : '#1C1917' }}>Payment Schedules</h3>
            {!isMember && <button onClick={() => setActivePage("Payment Schedule")} style={{ fontSize: 11, color: t.accent, background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>View Schedule →</button>}
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA', position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted, background: isDark ? t.surface : '#FAFAFA' }}>INVESTMENT</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted, background: isDark ? t.surface : '#FAFAFA' }}>DUE DATE</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted, background: isDark ? t.surface : '#FAFAFA' }}>TYPE</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted, background: isDark ? t.surface : '#FAFAFA' }}>DIR</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted, background: isDark ? t.surface : '#FAFAFA' }}>AMOUNT</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted, background: isDark ? t.surface : '#FAFAFA' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((s, i) => {
                  const [bg, color, brd] = badge(s.status, isDark);
                  return (
                    <tr key={s.schedule_id} style={{ borderBottom: i === recentActivity.length - 1 ? 'none' : `1px solid ${t.surfaceBorder}` }}>
                      <td style={{ padding: '14px 24px', fontSize: 12.5, fontWeight: 500 }}>{s.deal_name}</td>
                      <td style={{ padding: '14px 24px', fontSize: 12, fontFamily: t.mono, color: t.textMuted }}>{s.dueDate}</td>
                      <td style={{ padding: '14px 24px', fontSize: 12, color: t.textSecondary }}>{s.type}</td>
                      <td style={{ padding: '14px 24px', fontSize: 11, fontWeight: 600, color: s.direction === 'IN' ? '#10B981' : '#EF4444' }}>{s.direction}</td>
                      <td style={{ padding: '14px 24px', fontSize: 12.5, fontWeight: 600 }}>{fmtCurr(s.signed_payment_amount)}</td>
                      <td style={{ padding: '14px 24px' }}>
                        <Bdg status={s.status} isDark={isDark} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background: t.surface, borderRadius: 20, padding: '18px 24px', border: `1px solid ${t.surfaceBorder}`, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#fff' : '#1C1917', marginBottom: 20 }}>Quick Insights</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Payments Due This Month', value: metrics.dueThisMonthCount, icon: <Wallet size={14} />, color: t.accent },
              { label: 'Projected Monthly Income', value: fmtCurr(metrics.projectedMonthlyIncome), icon: <TrendingUp size={14} />, color: '#10B981' },
              { label: 'Projected Monthly Payout', value: fmtCurr(metrics.projectedMonthlyPayout), icon: <ArrowDownRight size={14} />, color: '#F87171' },
              { label: `Days until ${metrics.qLabel}`, value: metrics.daysUntilQuarterEnd, icon: <Calendar size={14} />, color: '#F59E0B' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

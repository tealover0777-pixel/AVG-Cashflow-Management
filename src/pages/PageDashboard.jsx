import React from "react";
import { badge, fmtCurr } from "../utils";
import { StatCard } from "../components";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Wallet, TrendingUp, AlertCircle, FileText,
  ArrowUpRight, ArrowDownRight, Calendar, Users
} from 'lucide-react';

export default function PageDashboard(props) {
  const { t, isDark } = props;
  const data = useDashboardData(props);
  const { metrics, charts, recentActivity, isMember, myParty } = data;

  const COLORS = [t.accent, '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

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
      label: "Active Contracts",
      value: metrics.activeContractsCount,
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
            {isMember ? `Welcome back, ${myParty?.name || 'Member'}` : "AVG Cashflow System Overview"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Current Period</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fff' : '#1C1917' }}>Q1 2026</div>
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
            <div style={{ fontFamily: t.titleFont, fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-1px", lineHeight: 1 }}>
              {fmtCurr(metrics.totalAUM)}
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600 }}>
            <ArrowUpRight size={14} /> +12.5% from last month
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
              <div style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 6 }}>+5%</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#fff' : '#1C1917' }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>{s.sub} Volume</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: t.surface, borderRadius: 20, padding: 24, border: `1px solid ${t.surfaceBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#1C1917' }}>Cashflow Overview</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: t.accent }} /> IN Proj</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: '#10B981' }} /> IN Act</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: '#F87171' }} /> OUT Proj</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: '#FBBF24' }} /> OUT Act</div>
            </div>
          </div>
          <div style={{ height: 320, width: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: 8, scrollbarWidth: 'thin' }}>
            <div style={{ width: Math.max(charts.cashflow.length * 120, 600), height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.cashflow} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: t.textMuted }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: t.textMuted }}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: isDark ? '#1C1917' : '#fff', border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, fontSize: 12 }}
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                    formatter={(value) => fmtCurr(value)}
                  />
                  <Bar dataKey="projectedIn" fill={t.accent} radius={[3, 3, 0, 0]} barSize={16} />
                  <Bar dataKey="actualIn" fill="#10B981" radius={[3, 3, 0, 0]} barSize={16} />
                  <Bar dataKey="projectedOut" fill="#F87171" radius={[3, 3, 0, 0]} barSize={16} />
                  <Bar dataKey="actualOut" fill="#FBBF24" radius={[3, 3, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={{ background: t.surface, borderRadius: 20, padding: 24, border: `1px solid ${t.surfaceBorder}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#1C1917', marginBottom: 20 }}>Portfolio Diversification</h3>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.diversification}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {charts.diversification.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table & Activity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ background: t.surface, borderRadius: 20, border: `1px solid ${t.surfaceBorder}`, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${t.surfaceBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#fff' : '#1C1917' }}>Upcoming Payments</h3>
            <button style={{ fontSize: 11, color: t.accent, background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>View Schedule →</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}>
                <tr>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted }}>CONTRACT</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted }}>DUE DATE</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted }}>TYPE</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted }}>DIR</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted }}>AMOUNT</th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: t.textMuted }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((s, i) => {
                  const [bg, color, brd] = badge(s.status, isDark);
                  return (
                    <tr key={s.id} style={{ borderBottom: i === recentActivity.length - 1 ? 'none' : `1px solid ${t.surfaceBorder}` }}>
                      <td style={{ padding: '14px 24px', fontSize: 12.5, fontWeight: 500 }}>{s.contract || s.id}</td>
                      <td style={{ padding: '14px 24px', fontSize: 12, fontFamily: t.mono, color: t.textMuted }}>{s.dueDate}</td>
                      <td style={{ padding: '14px 24px', fontSize: 12, color: t.textSecondary }}>{s.type}</td>
                      <td style={{ padding: '14px 24px', fontSize: 11, fontWeight: 600, color: s.direction === 'IN' ? '#10B981' : '#EF4444' }}>{s.direction}</td>
                      <td style={{ padding: '14px 24px', fontSize: 12.5, fontWeight: 600 }}>{s.payment}</td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: bg, color, border: `1px solid ${brd}` }}>{s.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background: t.surface, borderRadius: 20, padding: '18px 24px', border: `1px solid ${t.surfaceBorder}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#fff' : '#1C1917', marginBottom: 20 }}>Quick Insights</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Pending Invitations', value: '12', icon: <Users size={14} />, color: t.accent },
              { label: 'Projected Monthly Yield', value: '$84.2k', icon: <TrendingUp size={14} />, color: '#10B981' },
              { label: 'Days until Q1 Wrap', value: '28', icon: <Calendar size={14} />, color: '#F59E0B' }
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

import React from 'react';
import { fmtCurr, initials } from '../../utils';
import { Bdg } from '../../components';

export function getDistributionColumnDefs(isDark, t, CONTACTS, DEALS) {
  return [
    {
      field: 'batch_id',
      headerName: 'BATCH ID',
      width: 110,
      filter: "agTextColumnFilter",
      cellRenderer: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <span style={{ fontFamily: t.mono, fontSize: 10, fontWeight: 700, color: t.accent }}>{p.value}</span>
        </div>
      )
    },
    {
      field: 'investment_id',
      headerName: 'INVESTMENT',
      width: 120,
      filter: "agTextColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.idText }
    },
    {
      field: 'party_id',
      headerName: 'PARTY',
      flex: 1,
      minWidth: 150,
      filter: "agTextColumnFilter",
      valueGetter: (p) => {
        const c = (CONTACTS || []).find(x => x.id === p.data.party_id);
        return c ? c.name : p.data.party_id;
      },
      cellRenderer: (p) => {
        const name = p.value || "Unknown Party";
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%', fontWeight: 600, color: isDark ? '#fff' : '#1C1917' }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
              {initials(name)}
            </div>
            {name}
          </div>
        );
      }
    },
    {
      field: 'deal_id',
      headerName: 'DEAL',
      width: 150,
      filter: "agTextColumnFilter",
      valueGetter: (p) => {
        const d = (DEALS || []).find(x => x.id === p.data.deal_id);
        return d ? d.deal_name || d.name : p.data.deal_id;
      },
      cellStyle: { fontWeight: 500 }
    },
    {
      field: 'due_date',
      headerName: 'DUE DATE',
      width: 110,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px' }
    },
    {
      field: 'payment_type',
      headerName: 'TYPE',
      width: 130,
      filter: "agTextColumnFilter",
      cellRenderer: (p) => {
        const label = (p.value || "").replace(/_/g, " ");
        return <span style={{ fontSize: 12, color: t.textSecondary }}>{label}</span>;
      }
    },
    {
      field: 'payment_amount',
      headerName: 'AMOUNT',
      width: 130,
      filter: "agNumberColumnFilter",
      cellRenderer: (p) => (
        <div style={{ fontFamily: t.mono, fontWeight: 700, color: t.accent, textAlign: 'right', width: '100%' }}>
          {fmtCurr(p.value)}
        </div>
      )
    },
    {
      field: 'status',
      headerName: 'STATUS',
      width: 110,
      filter: "agTextColumnFilter",
      cellRenderer: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Bdg label={p.value} {...(p.value === "Paid" ? { bg: "rgba(52,211,153,0.1)", text: "#34D399" } : p.value === "Due" ? { bg: "rgba(96,165,250,0.1)", text: "#60A5FA" } : { bg: "rgba(156,163,175,0.1)", text: "#9CA3AF" })} t={t} />
        </div>
      )
    }
  ];
}

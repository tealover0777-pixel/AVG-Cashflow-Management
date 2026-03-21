import React from 'react';
import { fmtCurr, initials } from '../utils';
import Bdg from './Bdg';
import Tooltip from './Tooltip';

export const getDistributionColumns = (isDark, t, CONTACTS, DEALS) => [
  {
    id: 'select',
    header: ({ table }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          style={{ cursor: 'pointer', width: '14px', height: '14px' }}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          style={{ cursor: 'pointer', width: '14px', height: '14px' }}
        />
      </div>
    ),
    size: 40,
    enableSorting: false,
  },
  {
    accessorKey: 'batch_id',
    header: 'BATCH ID',
    size: 110,
    cell: ({ getValue }) => (
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <span style={{ fontFamily: t.mono, fontSize: 10, fontWeight: 700, color: t.accent }}>{getValue()}</span>
      </div>
    ),
  },
  {
    accessorKey: 'investment_id',
    header: 'INVESTMENT',
    size: 120,
    cell: ({ getValue }) => (
      <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.idText }}>{getValue()}</span>
    ),
  },
  {
    id: 'party',
    header: 'PARTY',
    accessorFn: (row) => {
      const c = (CONTACTS || []).find(x => x.id === row.party_id);
      return c ? c.name : row.party_id;
    },
    size: 180,
    cell: ({ getValue }) => {
      const name = getValue() || "Unknown Party";
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%', fontWeight: 600, color: isDark ? '#fff' : '#1C1917' }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
            {initials(name)}
          </div>
          {name}
        </div>
      );
    },
  },
  {
    id: 'deal',
    header: 'DEAL',
    accessorFn: (row) => {
      const d = (DEALS || []).find(x => x.id === row.deal_id);
      return d ? d.deal_name || d.name : row.deal_id;
    },
    size: 180,
    cell: ({ getValue }) => <span style={{ fontWeight: 500 }}>{getValue()}</span>,
  },
  {
    accessorKey: 'due_date',
    header: 'DUE DATE',
    size: 110,
    cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px' }}>{getValue()}</span>,
  },
  {
    accessorKey: 'payment_type',
    header: 'TYPE',
    size: 130,
    cell: ({ getValue }) => {
      const label = (getValue() || "").replace(/_/g, " ");
      return <span style={{ fontSize: 12, color: t.textSecondary }}>{label}</span>;
    },
  },
  {
    accessorKey: 'payment_amount',
    header: 'AMOUNT',
    size: 130,
    cell: ({ getValue }) => (
      <div style={{ fontFamily: t.mono, fontWeight: 700, color: t.accent, textAlign: 'right', width: '100%' }}>
        {fmtCurr(getValue())}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'STATUS',
    size: 110,
    cell: ({ getValue }) => {
      const val = getValue();
      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Bdg 
            label={val} 
            {...(val === "Paid" ? { bg: "rgba(52,211,153,0.1)", text: "#34D399" } : val === "Due" ? { bg: "rgba(96,165,250,0.1)", text: "#60A5FA" } : { bg: "rgba(156,163,175,0.1)", text: "#9CA3AF" })} 
            t={t} 
          />
        </div>
      );
    },
  },
];

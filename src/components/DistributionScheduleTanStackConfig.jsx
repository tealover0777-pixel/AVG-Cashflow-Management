import React from 'react';
import { fmtCurr, initials } from '../utils';
import { Bdg, Tooltip } from '../components';

export const getDistributionColumns = (isDark, t, CONTACTS, DEALS, INVESTMENTS = [], callbacks = {}) => [
  {
    id: 'select',
    header: ({ table }) => {
      const isAllSelected = table.getIsAllRowsSelected();
      const isSomeSelected = table.getIsSomeRowsSelected();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={el => { if (el) el.indeterminate = isSomeSelected && !isAllSelected; }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
          />
        </div>
      );
    },
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
    id: 'party',
    header: 'Investor Name',
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
    header: 'Deal Name',
    accessorFn: (row) => {
      const d = (DEALS || []).find(x => x.id === row.deal_id);
      return d ? d.deal_name || d.name : row.deal_id;
    },
    size: 180,
    cell: ({ getValue }) => <span style={{ fontWeight: 500 }}>{getValue()}</span>,
  },
  {
    accessorKey: 'term_start',
    header: 'START DATE',
    size: 110,
    cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px' }}>{getValue() || <span style={{ color: t.textMuted }}>—</span>}</span>,
    sortingFn: 'datetime'
  },
  {
    accessorKey: 'dueDate',
    header: 'DUE DATE',
    size: 110,
    cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px' }}>{getValue()}</span>,
    sortingFn: 'datetime'
  },
  {
    accessorKey: 'type',
    header: 'TYPE',
    size: 140,
    cell: ({ getValue }) => {
      const label = (getValue() || "").replace(/_/g, " ");
      return <span style={{ fontSize: 12, color: t.textSecondary }}>{label}</span>;
    },
  },
  {
    header: 'FREQ',
    accessorFn: (row) => {
      if (row.frequency) return row.frequency;
      const inv = (INVESTMENTS || []).find(x => x.id === row.investment_id || x.id === row.investment);
      return inv ? inv.freq || inv.payment_frequency : "—";
    },
    size: 100,
    cell: ({ getValue }) => <span style={{ fontSize: 11, color: t.textSecondary }}>{getValue()}</span>,
  },
  {
    accessorKey: 'signed_payment_amount',
    header: 'AMOUNT',
    size: 130,
    cell: ({ getValue, row }) => {
      const isOut = row.original.direction === "OUT";
      return (
        <div style={{ 
          fontFamily: t.mono, 
          fontWeight: 700, 
          color: isOut ? (isDark ? "#F87171" : "#DC2626") : (isDark ? "#34D399" : "#059669"), 
          textAlign: 'right', 
          width: '100%' 
        }}>
          {fmtCurr(getValue())}
        </div>
      );
    }
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

  {
    accessorKey: 'notes',
    header: 'NOTES',
    size: 250,
    cell: ({ getValue }) => <div style={{ fontSize: 11, color: t.textSecondary, whiteSpace: 'normal', lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={getValue()}>{getValue()}</div>,
  },
  {
    header: "Actions",
    id: "actions",
    size: 120,
    enableSorting: false,
    cell: ({ row }) => {
      const data = row.original;
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={(e) => { e.stopPropagation(); callbacks.onEdit?.(data); }} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Edit</button>
          <button onClick={(e) => { e.stopPropagation(); callbacks.onDelete?.(data); }} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Del</button>
          {data.version_num > 1 && (
            <button onClick={(e) => { e.stopPropagation(); callbacks.onUndo?.(data); }} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Undo</button>
          )}
        </div>
      );
    }
  }
];

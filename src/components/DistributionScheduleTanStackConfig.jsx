import React from 'react';
import { fmtCurr, initials, formatPaymentLag } from '../utils';
import { Bdg, Tooltip, ActBtns } from '../components';

export const getDistributionColumns = (isDark, t, CONTACTS, DEALS, INVESTMENTS = [], callbacks = {}) => [
  {
    id: 'select',
    header: ({ table }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <input
          className="ts-checkbox"
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          ref={el => { if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected(); }}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <input
          className="ts-checkbox"
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      </div>
    ),
    size: 40,
    enableSorting: false,
  },
  {
    header: "Investment ID",
    accessorKey: "investment_id",
    id: "investment_id",
    size: 110,
    cell: ({ row, getValue }) => {
      const val = getValue() || row.original.investment || "—";
      return (
        <span 
          onClick={() => callbacks.onInvestmentClick?.(row.original)}
          style={{ 
            fontFamily: t.mono, 
            fontSize: '11px', 
            color: isDark ? "#60A5FA" : "#4F46E5",
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {val}
        </span>
      );
    }
  },
  {
    id: 'firstName',
    header: 'First Name',
    accessorFn: (row) => {
      const cid = row.contact_id || row.party_id || "";
      const c = (CONTACTS || []).find(x => x.id === cid || x.docId === cid || x.contact_id === cid);
      return (c && c.first_name) ? c.first_name : (row.first_name || "");
    },
    size: 110,
    cell: ({ getValue, row }) => {
      const val = getValue() || "—";
      return (
        <div 
          onClick={() => callbacks.onContactClick?.(row.original)}
          style={{ display: 'flex', alignItems: 'center', height: '100%', fontWeight: 600, color: isDark ? "#60A5FA" : "#4F46E5", cursor: 'pointer' }}
        >
          {val}
        </div>
      );
    },
  },
  {
    id: 'lastName',
    header: 'Last Name',
    accessorFn: (row) => {
      const cid = row.contact_id || row.party_id || "";
      const c = (CONTACTS || []).find(x => x.id === cid || x.docId === cid || x.contact_id === cid);
      return (c && c.last_name) ? c.last_name : (row.last_name || "");
    },
    size: 110,
    cell: ({ getValue, row }) => {
      const val = getValue() || "—";
      return (
        <div 
          onClick={() => callbacks.onContactClick?.(row.original)}
          style={{ display: 'flex', alignItems: 'center', height: '100%', fontWeight: 600, color: isDark ? "#60A5FA" : "#4F46E5", cursor: 'pointer' }}
        >
          {val}
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
    cell: ({ getValue, row }) => (
      <span 
        onClick={() => callbacks.onDealClick?.(row.original.deal_id)}
        style={{ fontWeight: 600, color: isDark ? t.text : "#000", cursor: 'pointer' }}
      >
        {getValue()}
      </span>
    ),
  },
  {
    id: 'paymentMethod',
    header: 'Payment Method',
    accessorFn: (row) => {
      const cid = row.contact_id || row.party_id || "";
      const c = (CONTACTS || []).find(x => x.id === cid || x.docId === cid || x.contact_id === cid);
      const inv = (INVESTMENTS || []).find(x => x.id === row.investment_id || x.id === row.investment);
      return row.payment_method || inv?.payment_method || c?.payment_method || "";
    },
    size: 140,
    cell: ({ getValue }) => {
      const val = getValue();
      if (!val) return <span style={{ color: t.textMuted }}>—</span>;
      return (
        <span style={{ fontSize: '11px', fontWeight: 500, color: t.textSecondary }}>
          {val}
        </span>
      );
    }
  },
  {
    accessorKey: 'term_start',
    header: 'START DATE',
    size: 110,
    cell: ({ getValue, row }) => {
      const type = row.original.type || row.original.payment_type || "";
      if (type.toLowerCase().replace(/_/g, " ") === "investor principal payment") {
        return <span style={{ fontFamily: t.mono, fontSize: '11px' }}>{row.original.dueDate || row.original.due_date || "—"}</span>;
      }
      const inv = (INVESTMENTS || []).find(x => x.id === row.original.investment_id || x.id === row.original.investment);
      const val = getValue();
      const start = inv?.start_date;
      const displayVal = (start && val && val < start) ? start : (val || "—");
      return <span style={{ fontFamily: t.mono, fontSize: '11px' }}>{displayVal}</span>;
    },
    sortingFn: 'datetime'
  },
  {
    id: 'accrualDate',
    header: 'End Date',
    accessorFn: row => row.due_date || row.dueDate || "—",
    size: 110,
    cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px' }}>{getValue()}</span>,
    sortingFn: 'datetime'
  },
  {
    id: 'scheduledDate',
    header: 'Payment Date',
    accessorFn: row => row.scheduled_payment_date || row.due_date || row.dueDate || "—",
    size: 110,
    cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: isDark ? "#34D399" : "#059669", fontWeight: 600 }}>{getValue()}</span>,
    sortingFn: 'datetime'
  },
  {
    id: 'type',
    accessorFn: (row) => (row.type || "").toString().replace(/_/g, " "),
    header: 'TYPE',
    size: 140,
    cell: ({ row, getValue }) => {
      const isRollover = !!row.original.rollover;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isRollover && (
            <span style={{ 
              fontSize: '9px', 
              fontWeight: 800, 
              color: '#fff', 
              background: '#9333EA', 
              padding: '1px 5px', 
              borderRadius: '4px', 
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              lineHeight: 1
            }}>
              Rollover
            </span>
          )}
          <span style={{ 
            fontSize: 12, 
            fontWeight: 500,
            color: isRollover ? (isDark ? '#E9D5FF' : '#7E22CE') : t.textSecondary 
          }}>
            {getValue()}
          </span>
        </div>
      );
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
    header: "Payment Lag",
    id: "lag",
    size: 110,
    accessorFn: (row) => {
      const inv = (INVESTMENTS || []).find(x => x.id === row.investment_id || x.id === row.investment);
      const deal = (DEALS || []).find(x => x.id === row.deal_id);
      const config = (inv?.payment_lag_config?.enabled) ? inv.payment_lag_config : (deal?.payment_lag_config || null);
      return formatPaymentLag(config);
    },
    cell: ({ getValue }) => {
      const label = getValue();
      if (label === "None") return <span style={{ color: t.textMuted }}>—</span>;
      return (
        <span style={{ fontSize: '10.5px', fontWeight: 600, color: isDark ? "#A78BFA" : "#7C3AED" }}>
          {label}
        </span>
      );
    }
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
          <ActBtns
            show={true}
            t={t}
            onEdit={() => callbacks.onEdit?.(data)}
            onClone={() => callbacks.onClone?.(data)}
            onDelete={() => callbacks.onDelete?.(data)}
            onUndo={data.version_num > 1 ? () => callbacks.onUndo?.(data) : null}
          />
        </div>
      );
    }
  }
];

export const getDistributionScheduleColumns = (t, isDark, INVESTMENTS, CONTACTS, onStatusChange, onInvestmentClick, onContactClick, DEALS = [], statusOpts = ["Paid", "Due", "Partial", "Hold", "Not Paid", "Reinvested"]) => {
  const callbacks = { onInvestmentClick, onContactClick };
  const base = getDistributionColumns(isDark, t, CONTACTS, DEALS, INVESTMENTS, callbacks);
  return base.map(col => {
    if (col.accessorKey === 'status' || col.id === 'status') {
      return {
        ...col,
        cell: ({ row }) => {
          const val = row.original.status || row.original.payment_status;
          return (
            <select
              value={val || ""}
              style={{
                width: '100%',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                color: isDark ? '#F3F4F6' : '#111827',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                textAlign: 'center'
              }}
              onChange={(e) => onStatusChange && onStatusChange(row.original.id || row.original.docId, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              {statusOpts.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          );
        }
      };
    }
    return col;
  });
};


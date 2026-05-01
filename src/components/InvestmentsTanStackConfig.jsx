import React from 'react';
import { ExternalLink, Edit2, Trash2, Info, RotateCcw } from 'lucide-react';
import { Bdg, Tooltip, ActBtns } from '../components';
import { formatPaymentLag } from '../utils';

export const getInvestmentColumns = (permissions, isDark, t, context) => {
  const { callbacks } = context;

  const cols = [
    {
      id: 'select',
      header: ({ table }) => (
        <label 
          onClick={e => e.stopPropagation()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '32px' }}
        >
          <input
            className="ts-checkbox"
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={el => { if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected(); }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            style={{ accentColor: t.accent, cursor: 'pointer' }}
          />
        </label>
      ),
      cell: ({ row }) => (
        <label 
          onClick={e => e.stopPropagation()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '40px' }}
        >
          <input
            className="ts-checkbox"
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            style={{ accentColor: t.accent, cursor: 'pointer' }}
          />
        </label>
      ),
      size: 45,
      enableSorting: false,
      enableColumnFilter: false,
      meta: {
        style: { textAlign: 'center', padding: 0 }
      }
    },
    {
      header: "Investment ID",
      accessorFn: (row) => row.investment_id || row.id,
      id: "id",
      size: 110,
      cell: ({ row, getValue }) => {
        const val = getValue();
        return (
          <span 
            onClick={() => callbacks.onDrillDown?.(row.original, { view: "simple", tab: "Edit Investment" })}
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
      header: "Deal ID",
      accessorKey: "deal_id",
      size: 90,
      cell: ({ getValue }) => (
        <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.idText }}>
          {getValue() || "—"}
        </span>
      )
    },
    {
      header: "Deal Name",
      accessorKey: "deal",
      size: 180,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '11.5px', color: isDark ? 'rgba(255,255,255,0.7)' : '#44403C' }}>
          {getValue()}
        </span>
      )
    },
    {
      header: "First Name",
      accessorKey: "first_name",
      size: 150,
      cell: ({ getValue, row }) => {
        const val = getValue();
        const displayVal = val || "—";
        return (
          <span 
            onClick={() => callbacks.onDrillDown?.(row.original, { view: "detail" })}
            style={{ 
              fontSize: '11.5px', 
              fontWeight: 600, 
              color: isDark ? "#60A5FA" : "#4F46E5",
              cursor: 'pointer'
            }}
          >
            {displayVal}
          </span>
        );
      }
    },
    {
      header: "Last Name",
      accessorKey: "last_name",
      size: 150,
      cell: ({ getValue, row }) => {
        const val = getValue();
        const displayVal = val || "—";
        return (
          <span 
            onClick={() => callbacks.onDrillDown?.(row.original, { view: "detail" })}
            style={{ 
              fontSize: '11.5px', 
              fontWeight: 500, 
              color: isDark ? 'rgba(255,255,255,0.85)' : '#1C1917',
              cursor: 'pointer'
            }}
          >
            {displayVal}
          </span>
        );
      }
    },
    {
      header: "Type",
      accessorKey: "type",
      size: 130,
      cell: ({ row, getValue }) => {
        const val = getValue();
        const isB = val?.includes("BORROWER");
        const rollover = !!row.original.rollover;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 700,
              background: isB ? (isDark ? 'rgba(251,191,36,0.1)' : '#FFFBEB') : (isDark ? 'rgba(96,165,250,0.1)' : '#EFF6FF'),
              color: isB ? (isDark ? '#FBBF24' : '#D97706') : (isDark ? '#60A5FA' : '#2563EB'),
              border: `1px solid ${isB ? (isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A') : (isDark ? 'rgba(96,165,250,0.2)' : '#BFDBFE')}`,
            }}>
              {val}
            </div>
            {rollover && (
              <Tooltip text="Marked for Rollover" t={t}>
                <div style={{ color: isDark ? '#818CF8' : '#4F46E5', display: 'flex', alignItems: 'center' }}>
                  <RotateCcw size={12} strokeWidth={2.5} />
                </div>
              </Tooltip>
            )}
          </div>
        );
      }
    },
    {
      header: "Amount",
      accessorKey: "amount",
      size: 120,
      cell: ({ row, getValue }) => {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: t.mono, fontSize: '11.5px', fontWeight: 700, color: isDark ? '#60A5FA' : '#4F46E5' }}>
              {getValue()}
            </span>
          </div>
        );
      }
    },
    {
      header: "Rollover Principal",
      id: "rolloverPrincipal",
      size: 150,
      accessorFn: (row) => row.rollover ? "Rollover" : null,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 800, 
            color: isDark ? '#E9D5FF' : '#7E22CE',
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}>
            Rollover
          </span>
        );
      }
    },
    {
      header: "Rate",
      accessorKey: "rate",
      size: 80,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11.5px', color: t.textMuted }}>{getValue()}</span>
    },
    {
      header: "Freq",
      accessorKey: "freq",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontSize: '11px', color: t.textMuted }}>{getValue()}</span>
    },

    {
      header: "Payment Lag",
      id: "payment_lag",
      accessorFn: (row) => formatPaymentLag(row.payment_lag_config),
      size: 110,
      cell: ({ getValue }) => {
        const label = getValue();
        if (!label || label === "None") return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <span style={{ fontSize: '10.5px', fontWeight: 600, color: isDark ? "#A78BFA" : "#7C3AED" }}>
            {label}
          </span>
        );
      }
    },
    {
      header: "Fees",
      accessorKey: "feeIds",
      size: 200,
      enableSorting: false,
      cell: ({ row, getValue }) => {
        const feeIds = getValue() || [];
        const feesData = context.feesData || [];
        const appliedFees = feeIds.map(fid => feesData.find(f => f.id === fid)).filter(Boolean);
        if (appliedFees.length === 0) return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {appliedFees.map(f => (
              <span key={f.id} style={{ fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: isDark ? 'rgba(52,211,153,0.12)' : '#ECFDF5', color: isDark ? '#34D399' : '#059669', border: `1px solid ${isDark ? 'rgba(52,211,153,0.25)' : '#A7F3D0'}`, whiteSpace: 'nowrap' }}>
                {f.name}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      size: 90,
      cell: ({ getValue }) => <Bdg status={getValue()} isDark={isDark} />
    },
    {
      header: "Maturity",
      accessorKey: "maturity_date",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '10.5px', color: t.idText }}>{getValue() || "—"}</span>
    },
    {
      header: "Created",
      accessorKey: "created_at",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '10.5px', color: t.idText }}>{getValue() || "—"}</span>
    },
    {
      header: "Updated",
      accessorKey: "updated_at",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '10.5px', color: t.idText }}>{getValue() || "—"}</span>
    },
    {
      header: "Actions",
      id: "actions",
      size: 100,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const data = row.original;
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ActBtns
              show={true}
              t={t}
              onEdit={callbacks.onEdit ? () => callbacks.onEdit(data) : null}
              onDel={callbacks.onDelete ? () => callbacks.onDelete(data) : null}
              onClone={callbacks.onClone ? () => callbacks.onClone(data) : null}
            />
          </div>
        );
      }
    }
  ];

  return cols;
};

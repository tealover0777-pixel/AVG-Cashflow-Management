import React from 'react';
import { ExternalLink, Edit2, Trash2, Info } from 'lucide-react';
import { Bdg } from '../components';

export const getInvestmentColumns = (permissions, isDark, t, context) => {
  const { callbacks } = context;

  const cols = [
    {
      id: 'select',
      header: ({ table }) => {
        const rows = table.getFilteredRowModel().rows;
        const isAllSelected = rows.length > 0 && rows.every(r => r.getIsSelected());
        const isSomeSelected = rows.some(r => r.getIsSelected());

        return (
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={el => { if (el) el.indeterminate = isSomeSelected && !isAllSelected; }}
            onChange={(e) => {
              e.stopPropagation();
              const nextValue = !isAllSelected;
              rows.forEach(row => row.toggleSelected(nextValue));
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer', accentColor: t.accent }}
          />
        );
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => {
            e.stopPropagation();
            row.getToggleSelectedHandler()(e);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', accentColor: t.accent }}
        />
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
      accessorKey: "id",
      size: 110,
      cell: ({ row, getValue }) => {
        const val = getValue();
        return (
          <span 
            onClick={() => callbacks.onDrillDown?.(row.original)}
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
      header: "Contact",
      accessorKey: "party",
      size: 180,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '11.5px', fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.85)' : '#1C1917' }}>
          {getValue()}
        </span>
      )
    },
    {
      header: "Type",
      accessorKey: "type",
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue();
        const isB = val?.includes("BORROWER");
        return (
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
        );
      }
    },
    {
      header: "Amount",
      accessorKey: "amount",
      size: 120,
      cell: ({ getValue }) => (
        <span style={{ fontFamily: t.mono, fontSize: '11.5px', fontWeight: 700, color: isDark ? '#60A5FA' : '#4F46E5' }}>
          {getValue()}
        </span>
      )
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
      header: "Term",
      accessorKey: "term_months",
      size: 80,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px' }}>{getValue() ? `${getValue()}mo` : "—"}</span>
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
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => callbacks.onEdit?.(data)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: 'none', cursor: 'pointer' }}><Edit2 size={13}/></button>
            <button onClick={() => callbacks.onDelete?.(data)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'none', cursor: 'pointer' }}><Trash2 size={13}/></button>
          </div>
        );
      }
    }
  ];

  return cols;
};

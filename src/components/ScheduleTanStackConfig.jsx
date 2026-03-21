import React from 'react';
import { CornerDownRight, ExternalLink } from 'lucide-react';
import { Bdg } from '../components';

export const getScheduleColumns = (permissions, isDark, t, context) => {
  const { callbacks } = context;

  const cols = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          style={{ cursor: 'pointer', accentColor: t.accent }}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
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
      header: "Sched ID",
      accessorKey: "schedule_id",
      size: 90,
      cell: ({ row, getValue }) => {
        const val = getValue();
        const data = row.original;
        const isArchived = data.active_version === false;
        
        return (
          <div style={{ paddingLeft: isArchived ? 20 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isArchived && <CornerDownRight size={14} style={{ opacity: 0.5 }} />}
            <span 
              onClick={() => callbacks.onScheduleClick?.(data)}
              style={{ 
                fontFamily: t.mono, 
                fontSize: '11px', 
                color: isDark ? "#60A5FA" : "#2563EB",
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {val}
            </span>
          </div>
        );
      }
    },
    {
      header: "Linked",
      accessorKey: "linked",
      size: 80,
      cell: ({ getValue, row }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <span 
            onClick={() => callbacks.onLinkedClick?.(val)}
            style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {val} <ExternalLink size={10} />
          </span>
        );
      }
    },
    {
      header: "V",
      accessorKey: "version_num",
      size: 60,
      cell: ({ row, getValue }) => {
        const val = getValue() || 1;
        const isActive = row.original.active_version !== false;
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 700,
            fontFamily: t.mono,
            background: isActive ? (isDark ? 'rgba(52,211,153,0.1)' : '#ECFDF5') : (isDark ? 'rgba(255,255,255,0.05)' : '#F5F4F1'),
            color: isActive ? (isDark ? '#34D399' : '#059669') : (isDark ? 'rgba(255,255,255,0.5)' : '#78716C'),
            border: `1px solid ${isActive ? (isDark ? 'rgba(52,211,153,0.2)' : '#A7F3D0') : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB')}`,
          }}>
            V{val}
          </div>
        );
      }
    },
    {
      header: "Investment ID",
      accessorKey: "investment",
      size: 110,
      cell: ({ getValue, row }) => (
        <span 
          onClick={() => callbacks.onInvestmentClick?.(getValue())}
          style={{ fontFamily: t.mono, fontSize: '11.5px', color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 600, cursor: 'pointer' }}
        >
          {getValue()}
        </span>
      )
    },
    {
      header: "Contact",
      accessorKey: "party_id",
      size: 90,
      cell: ({ getValue, row }) => (
        <span 
          onClick={() => callbacks.onContactClick?.(getValue())}
          style={{ fontFamily: t.mono, fontSize: '11px', color: t.idText, cursor: 'pointer' }}
        >
          {getValue()}
        </span>
      )
    },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '12px' }}>{getValue()}</span>
    },
    {
      header: "Type",
      accessorKey: "type",
      size: 140,
      cell: ({ getValue }) => <span style={{ fontSize: '12px', fontWeight: 500 }}>{getValue()}</span>
    },
    {
      header: "Amount",
      accessorKey: "signed_payment_amount",
      size: 110,
      cell: ({ getValue, row }) => {
        const val = getValue();
        const isOut = row.original.direction === "OUT";
        return (
          <span style={{ 
            fontFamily: t.mono, 
            fontSize: '13px', 
            fontWeight: 700, 
            color: isOut ? (isDark ? "#F87171" : "#DC2626") : (isDark ? "#34D399" : "#059669")
          }}>
            {val}
          </span>
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
      header: "Actions",
      id: "actions",
      size: 120,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const data = row.original;
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => callbacks.onEdit?.(data)} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Edit</button>
            <button onClick={() => callbacks.onDelete?.(data)} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Del</button>
            {data.version_num > 1 && (
              <button onClick={() => callbacks.onUndo?.(data)} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Undo</button>
            )}
          </div>
        );
      }
    }
  ];

  return cols;
};

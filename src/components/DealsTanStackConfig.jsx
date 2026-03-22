import React from 'react';
import { Edit2, Trash2, PieChart } from 'lucide-react';
import { Bdg, ActBtns, Tooltip } from '../components';
import { fmtCurr } from '../utils';

export const getDealColumns = (permissions, isDark, t, context) => {
  const { callbacks, feesData } = context;
  const { canUpdate, canDelete } = permissions;

  const cols = [
    {
      id: 'select',
      header: ({ table }) => {
        const rows = table.getFilteredRowModel().rows;
        const allSelected = rows.length > 0 && rows.every(r => r.getIsSelected());
        const someSelected = rows.some(r => r.getIsSelected());
        return (
          <label 
            onClick={e => e.stopPropagation()} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '32px' }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={() => {
                const next = !allSelected;
                rows.forEach(r => r.toggleSelected(next));
              }}
              style={{ accentColor: t.accent, cursor: 'pointer' }}
            />
          </label>
        );
      },
      cell: ({ row }) => (
        <label 
          onClick={e => e.stopPropagation()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '40px' }}
        >
          <input
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
      header: "Deal Name",
      accessorKey: "name",
      size: 180,
      cell: ({ row, getValue }) => (
        <span 
          onClick={() => callbacks.onSelectDeal?.(row.original)}
          style={{ 
            fontSize: '11.5px', fontWeight: 600, 
            color: isDark ? "#fff" : "#1C1917",
            cursor: 'pointer',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}
        >
          {getValue() || "—"}
        </span>
      )
    },
    {
      header: "Deal type",
      accessorKey: "type",
      size: 160,
      cell: ({ getValue }) => {
        const val = getValue();
        return (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <span style={{ 
              fontSize: '11.5px', fontWeight: 500, 
              color: isDark ? "#A78BFA" : "#7C3AED", 
              background: isDark ? "rgba(167,139,250,0.1)" : "#F5F3FF", 
              padding: "2px 10px", borderRadius: 20, 
              border: `1px solid ${isDark ? "rgba(167,139,250,0.2)" : "#DDD6FE"}` 
            }}>
              {val || "—"}
            </span>
          </div>
        );
      }
    },
    {
      header: "Deal Stage",
      accessorKey: "status",
      size: 110,
      cell: ({ getValue }) => <Bdg status={getValue()} isDark={isDark} />
    },
    {
      header: "Progress",
      accessorKey: "fundraisingProgress",
      size: 180,
      cell: ({ row, getValue }) => {
        const val = getValue() || 0;
        const amount = row.original.fundraisingAmount || 0;
        const color = val >= 100 ? (isDark ? "#34D399" : "#059669") : (isDark ? "#60A5FA" : "#3B82F6");
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 2, padding: '4px 0', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>
                ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.8, color: color }}>({val.toFixed(1)}%)</span>
            </div>
            <div style={{ width: '100%', height: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6", borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, val)}%`, height: '100%', background: color }} />
            </div>
          </div>
        );
      }
    },
    {
      header: "Fund Bal",
      accessorKey: "fundBalance",
      size: 130,
      cell: ({ getValue }) => (
        <span style={{ fontFamily: t.mono, fontSize: '11.5px', fontWeight: 600, color: isDark ? "#10B981" : "#059669" }}>
          {getValue() || "—"}
        </span>
      )
    },
    {
      header: "Target",
      accessorKey: "valuation",
      size: 140,
      cell: ({ getValue }) => {
        const v = getValue();
        if (!v) return <span style={{ color: t.textMuted }}>—</span>;
        const val = Number(String(v).replace(/[^0-9.]/g, ""));
        return (
          <span style={{ fontFamily: t.mono, fontSize: '11.5px', fontWeight: 600, color: isDark ? "#60A5FA" : "#4F46E5" }}>
            ${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        );
      }
    },
    {
      header: "Start",
      accessorKey: "startDate",
      size: 95,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.idText }}>{getValue() || "—"}</span>
    },
    {
      header: "End",
      accessorKey: "endDate",
      size: 95,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.idText }}>{getValue() || "—"}</span>
    },
    {
      header: "Fees",
      accessorKey: "feeIds",
      size: 200,
      enableSorting: false,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val || !Array.isArray(val) || val.length === 0) {
          return <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB", fontSize: 12 }}>—</span>;
        }
        const appliedFees = val.map(fid => feesData?.find(f => f.id === fid)).filter(Boolean);
        if (!appliedFees || appliedFees.length === 0) {
          return <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB", fontSize: 12 }}>—</span>;
        }
        return (
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 6, alignItems: 'center', height: '100%', overflow: 'hidden' }}>
            {appliedFees.map(f => (
              <span key={f.id} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: isDark ? "rgba(52,211,153,0.12)" : "#ECFDF5", color: isDark ? "#34D399" : "#059669", border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#A7F3D0"}`, whiteSpace: "nowrap" }}>
                {f.name}
              </span>
            ))}
          </div>
        );
      }
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
           <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
             <ActBtns
               show={canUpdate || canDelete}
               t={t}
               onEdit={canUpdate ? () => callbacks.onEdit(data) : null}
               onDel={canDelete ? () => callbacks.onDelete(data) : null}
             />
           </div>
         );
       }
    }
  ];

  return cols;
};

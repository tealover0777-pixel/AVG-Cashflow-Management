import React from 'react';
import { Bdg, ActBtns } from '../components';

export const getDealInvestmentColumns = (permissions, isDark, t, context) => {
  const { CONTACTS, FEES_DATA, callbacks } = context;

  const fmtCurrency = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]/g, ""));
    if (isNaN(num)) return "—";
    return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

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
      header: "Investor Name",
      accessorKey: "party",
      size: 150,
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600, color: isDark ? "#60A5FA" : "#2563EB", fontSize: '11.5px' }}>
          {getValue()}
        </span>
      )
    },
    {
      header: "Email address",
      id: "email",
      size: 180,
      cell: ({ row }) => {
        const p = CONTACTS.find(x => x.name === row.original.party || x.id === row.original.party_id);
        return <span style={{ fontSize: '11.5px', color: t.textSecondary }}>{p?.email || "—"}</span>;
      }
    },
    {
      header: "Start Date",
      accessorKey: "start_date",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontSize: '11.5px' }}>{getValue() || "—"}</span>
    },
    {
      header: "Maturity Date",
      accessorKey: "maturity_date",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontSize: '11.5px' }}>{getValue() || "—"}</span>
    },
    {
      header: "Term",
      accessorKey: "term_months",
      size: 80,
      cell: ({ getValue }) => (
        <span style={{ fontFamily: t.mono, fontSize: '11px', color: isDark ? '#FFFFFF' : '#292524' }}>
          {getValue() ? `${getValue()}mo` : "—"}
        </span>
      )
    },
    {
      header: "Type",
      accessorKey: "type",
      size: 100,
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
      header: "Capital Amount",
      accessorKey: "amount",
      size: 130,
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600, fontFamily: t.mono, fontSize: '11.5px', color: isDark ? '#60A5FA' : '#4F46E5' }}>
          {fmtCurrency(getValue())}
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
      header: "Fees",
      accessorKey: "feeIds",
      size: 200,
      cell: ({ getValue }) => {
        const feeIds = getValue() || [];
        const appliedFees = feeIds.map(fid => FEES_DATA.find(f => f.id === fid)).filter(Boolean);
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
      header: "Notes",
      accessorKey: "notes",
      size: 180,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <div title={val} style={{ fontSize: '11.5px', color: t.textSecondary, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {val}
          </div>
        );
      }
    },
    {
      header: "Actions",
      id: "actions",
      size: 100,
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ActBtns 
            show={true} 
            t={t} 
            onEdit={permissions.canUpdate ? () => callbacks.onEdit?.(row.original) : null} 
            onDel={permissions.canDelete ? () => callbacks.onDelete?.(row.original) : null} 
          />
        </div>
      )
    }
  ];

  return cols;
};

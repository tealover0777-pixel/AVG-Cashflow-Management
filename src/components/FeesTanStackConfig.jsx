import React from 'react';
import ActBtns from './ActBtns';
import Bdg from './Bdg';
import { fmtCurr } from '../utils';

export const getFeeColumns = (permissions, isDark, t, onEdit, onDel) => {
  const cols = [
    {
      accessorKey: 'id',
      header: 'Fee ID',
      size: 110,
      cell: ({ getValue }) => (
        <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.idText }}>{getValue()}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 180,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '13.5px', fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.85)' : '#44403C' }}>
          {getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'fee_type',
      header: 'Fee Type',
      size: 150,
      cell: ({ getValue }) => <span style={{ fontSize: '12.5px', color: t.textMuted }}>{getValue()}</span>,
    },
    {
      accessorKey: 'method',
      header: 'Method',
      size: 150,
      cell: ({ getValue }) => {
        const val = getValue();
        let bg = "rgba(107, 114, 128, 0.1)";
        let text = "#6B7280";
        if (val === "Fixed") { bg = "rgba(96, 165, 250, 0.1)"; text = "#60A5FA"; }
        else if (val === "Percentage") { bg = "rgba(139, 92, 246, 0.1)"; text = "#8B5CF6"; }
        else if (val === "Hybrid") { bg = "rgba(245, 158, 11, 0.1)"; text = "#F59E0B"; }
        return <Bdg label={val} bg={bg} text={text} t={t} />;
      },
    },
    {
      accessorKey: 'applied_to',
      header: 'Applied To',
      size: 160,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.7)' : '#57534E', fontWeight: 500 }}>
          {getValue() || "—"}
        </span>
      ),
    },
    {
      accessorKey: 'direction',
      header: 'Direction',
      size: 100,
      cell: ({ getValue }) => {
        const val = getValue();
        const isIn = val === "In";
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600, color: isIn ? '#10B981' : '#F43F5E' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isIn ? '#10B981' : '#F43F5E' }} />
            {val}
          </div>
        );
      },
    },
    {
      accessorKey: 'rate',
      header: 'Rate',
      size: 130,
      cell: ({ getValue, row }) => {
        const val = getValue();
        const method = row.original.method;
        if (method === "Fixed") return <span style={{ fontFamily: t.mono }}>{fmtCurr(val)}</span>;
        return <span style={{ fontFamily: t.mono }}>{val}%</span>;
      },
    },
    {
      accessorKey: 'fee_charge_at',
      header: 'Charge At',
      size: 140,
      cell: ({ getValue }) => <span style={{ fontSize: '12.5px', color: t.textMuted }}>{getValue()}</span>,
    },
    {
      accessorKey: 'fee_frequency',
      header: 'Frequency',
      size: 140,
      cell: ({ getValue }) => <span style={{ fontSize: '12.5px', color: t.textMuted }}>{getValue()}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 200,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12.5px', color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getValue()}
        </span>
      ),
    },
  ];

  if (permissions.canUpdate || permissions.canDelete) {
    cols.push({
      id: 'actions',
      header: 'Actions',
      size: 100,
      cell: ({ row }) => (
        <ActBtns 
          show={true} 
          t={t} 
          onEdit={permissions.canUpdate ? () => onEdit(row.original) : null} 
          onDel={permissions.canDelete ? () => onDel(row.original) : null} 
        />
      ),
    });
  }

  return cols;
};

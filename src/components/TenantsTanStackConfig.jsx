import React, { useState, useMemo, useRef, useEffect } from "react";
import { ActBtns } from '../components';

export const getTenantColumns = (permissions, isDark, t, onEdit, onDel) => {
  const cols = [
    {
      accessorKey: 'id',
      header: 'Tenant ID',
      size: 120,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.idText }}>{getValue()}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 180,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '13.5px', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.95)' : '#1C1917' }}>
          {getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'logo',
      header: 'Logo',
      size: 110,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return <img src={val} alt="Logo" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "contain", background: isDark ? "rgba(255,255,255,0.05)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}` }} />;
      },
    },
    {
      accessorKey: 'owner_id',
      header: 'Owner ID',
      size: 110,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      size: 180,
      cell: ({ getValue }) => <span style={{ fontSize: '12px', color: t.textSecondary }}>{getValue()}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      size: 130,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      size: 180,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px', color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getValue() || "—"}
        </span>
      ),
    },
    {
        accessorKey: 'created_at',
        header: 'Created',
        size: 105,
        cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '10.5px', color: t.idText }}>{getValue() || "—"}</span>,
    },
    {
        accessorKey: 'updated_at',
        header: 'Updated',
        size: 105,
        cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '10.5px', color: t.idText }}>{getValue() || "—"}</span>,
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

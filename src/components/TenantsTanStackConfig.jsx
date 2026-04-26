import React, { useState, useMemo, useRef, useEffect } from "react";
import { ActBtns } from '../components';

export const getTenantColumns = (permissions, isDark, t, onEdit, onDel, onInvite, invitingId) => {
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
      accessorKey: 'owner_first_name',
      header: 'First Name',
      size: 140,
      cell: ({ getValue }) => <span style={{ fontSize: '13px', fontWeight: 500, color: t.textSecondary }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'owner_last_name',
      header: 'Last Name',
      size: 140,
      cell: ({ getValue }) => <span style={{ fontSize: '13px', fontWeight: 500, color: t.textSecondary }}>{getValue() || "—"}</span>,
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
      cell: ({ getValue }) => <span style={{ fontSize: '12px', color: t.textSecondary }}>{getValue() || "—"}</span>,
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
          onInvite={onInvite ? () => onInvite(row.original) : null}
          isInviting={invitingId === row.original.docId}
        />
      ),
    });
  }

  return cols;
};

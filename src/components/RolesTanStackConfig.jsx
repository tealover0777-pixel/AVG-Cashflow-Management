import React from "react";
import { ActBtns } from '../components';

export const getRoleColumns = (permissions, isDark, t, onEdit, onDel) => {
  const cols = [
    {
      accessorKey: 'role_id',
      header: 'ROLE ID',
      size: 120,
      cell: ({ getValue }) => <span style={{ fontSize: 13, color: t.textSecondary, fontFamily: t.mono }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'role_name',
      header: 'ROLE NAME',
      size: 200,
      cell: ({ getValue }) => (
        <span style={{ fontSize: 13.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917" }}>
          {getValue() || "—"}
        </span>
      ),
    },
    {
      accessorKey: 'Permissions',
      header: 'PERMISSIONS',
      size: 400,
      cell: ({ getValue }) => (
        <div style={{ 
          fontSize: 12, 
          color: t.textMuted, 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis' 
        }} title={getValue()}>
          {getValue() || "—"}
        </div>
      ),
      flex: 1,
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      size: 80,
      cell: ({ row }) => (
        <ActBtns
          show={true}
          t={t}
          onEdit={() => onEdit(row.original)}
          onDel={() => onDel(row.original)}
        />
      ),
    },
  ];

  return cols;
};

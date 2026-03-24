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
      size: 450,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        const perms = typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(val) ? val : []);
        
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 0' }}>
            {perms.map((p, i) => (
              <span 
                key={i} 
                style={{ 
                  fontSize: '10.5px', 
                  fontWeight: 600, 
                  padding: '2px 10px', 
                  borderRadius: '20px', 
                  background: t.tagBg, 
                  color: t.tagColor, 
                  border: `1px solid ${t.tagBorder}`,
                  whiteSpace: 'nowrap'
                }}
              >
                {p}
              </span>
            ))}
          </div>
        );
      },
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

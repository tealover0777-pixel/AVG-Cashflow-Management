import React from "react";
import { ActBtns } from '../components';

const StatusBadge = ({ status, t, isDark }) => {
    const isPending = !status || status === "Pending";
    const bg = isPending ? (isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB") : (isDark ? "rgba(34,197,94,0.15)" : "#F0FDF4");
    const color = isPending ? "#F59E0B" : "#22C55E";
    const border = isPending ? "1px solid rgba(245,158,11,0.35)" : "1px solid rgba(34,197,94,0.35)";
    return (
        <span style={{ 
            display: "inline-block", 
            padding: "2px 10px", 
            borderRadius: 20, 
            fontSize: 11.5, 
            fontWeight: 500, 
            background: bg, 
            color, 
            border, 
            letterSpacing: "0.02em", 
            whiteSpace: "nowrap" 
        }}>
            {isPending ? "⏳ Pending" : "✓ Active"}
        </span>
    );
};

export const getSuperAdminColumns = (permissions, isDark, t, onEdit, onDel, getRoleName, getTenantName) => {
  const cols = [
    {
      accessorKey: 'email',
      header: 'EMAIL ADDRESS',
      size: 200,
      cell: ({ getValue }) => <span style={{ fontSize: 13.5, fontWeight: 500, color: t.accent }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'role',
      header: 'PLATFORM ROLE',
      size: 150,
      cell: ({ getValue }) => {
        const role_id = getValue();
        const roleName = getRoleName(role_id);
        return (
          <div style={{ fontSize: 12.5 }}>
            {roleName ? (
              <>
                <span style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{role_id}</span>{" "}
                {roleName}
              </>
            ) : (role_id || "—")}
          </div>
        );
      },
    },
    {
      accessorKey: 'tenantId',
      header: 'TENANT ASSIGNMENT',
      size: 150,
      cell: ({ getValue }) => {
        const tid = getValue();
        const tName = getTenantName(tid);
        return (
          <div style={{ fontSize: 12.5 }}>
            {tName ? (
              <>
                <span style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{tid}</span>{" "}
                {tName}
              </>
            ) : (tid || "—")}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      size: 110,
      cell: ({ getValue }) => <StatusBadge status={getValue()} t={t} isDark={isDark} />,
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

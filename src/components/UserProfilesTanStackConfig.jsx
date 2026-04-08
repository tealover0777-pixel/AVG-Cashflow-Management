import React, { useState, useMemo, useRef, useEffect } from "react";
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

const getRoleName = (role_id, ROLES) => {
    const found = ROLES.find(r => r.id === role_id || r.role_id === role_id);
    return found ? (found.role_name || found.name || role_id) : (role_id || "—");
};

export const getUserProfileColumns = (permissions, isDark, t, onEdit, onDel, onResend, ROLES) => {
  const cols = [
    {
      accessorKey: 'user_id',
      header: 'USER ID',
      size: 100,
      cell: ({ getValue }) => <span style={{ fontSize: 13, color: t.textSecondary, fontFamily: t.mono }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'first_name',
      header: 'FIRST NAME',
      size: 140,
      cell: ({ getValue }) => <span style={{ fontSize: 13.5, fontWeight: 500, color: t.text }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'last_name',
      header: 'LAST NAME',
      size: 140,
      cell: ({ getValue }) => <span style={{ fontSize: 13.5, fontWeight: 500, color: t.text }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'email',
      header: 'EMAIL',
      size: 180,
      cell: ({ getValue }) => <span style={{ fontSize: 12.5, color: t.accent }}>{getValue()}</span>,
    },
    {
      accessorKey: 'role_id',
      header: 'ROLE',
      size: 192,
      cell: ({ getValue }) => {
        const role_id = getValue();
        const roleName = getRoleName(role_id, ROLES);
        return (
          <div style={{ fontSize: 12 }}>
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{role_id || "—"}</span>{" "}
            {roleName}
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
      accessorKey: 'auth_uid',
      header: 'AUTH UID',
      size: 240,
      cell: ({ row }) => {
        const val = row.original.auth_uid || row.original.id;
        return (
          <span style={{ fontFamily: t.mono, fontSize: 10, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>
            {val || "—"}
          </span>
        );
      },
    },
  ];

  cols.push(
    {
      accessorKey: 'phone',
      header: 'PHONE',
      size: 120,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'notes',
      header: 'NOTES',
      size: 180,
      cell: ({ getValue }) => (
        <span style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getValue() || ""}>
          {getValue() || "—"}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      size: 100,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <ActBtns 
              show={true} 
              t={t} 
              onEdit={permissions.canUpdate ? () => onEdit(p) : null} 
              onDel={permissions.canDelete ? () => onDel(p) : null} 
            />
            {permissions.canInvite && (!p.status || p.status === "Pending") && (
              <button 
                onClick={() => onResend(p)} 
                title="Re-send invite link" 
                style={{ background: "rgba(96,165,250,0.1)", border: `none`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: t.accent }}
              >
                Resend
              </button>
            )}
          </div>
        );
      },
    }
  );

  return cols;
};

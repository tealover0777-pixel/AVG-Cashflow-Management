import React from "react";
import { ActBtns } from '../components.jsx';

const StatusBadge = ({ status, t, isDark }) => {
    const isPending = !status || status === "Pending";
    const isInactive = status === "Inactive";

    let bg = isPending ? (isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB") : (isDark ? "rgba(34,197,94,0.15)" : "#F0FDF4");
    let color = isPending ? "#F59E0B" : "#22C55E";
    let border = isPending ? "1px solid rgba(245,158,11,0.35)" : "1px solid rgba(34,197,94,0.35)";

    if (isInactive) {
        bg = isDark ? "rgba(156,163,175,0.15)" : "#F3F4F6";
        color = "#9CA3AF";
        border = "1px solid rgba(156,163,175,0.35)";
    }

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
            {isInactive ? "🚫 Inactive" : isPending ? "⏳ Pending" : "✓ Active"}
        </span>
    );
};

const UserTypeBadge = ({ isGlobal, t, isDark }) => {
    const bg = isGlobal ? (isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF") : (isDark ? "rgba(168,85,247,0.15)" : "#FAF5FF");
    const color = isGlobal ? "#60A5FA" : "#A855F7";
    const border = isGlobal ? "1px solid rgba(96,165,250,0.35)" : "1px solid rgba(168,85,247,0.35)";
    return (
        <span style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 20,
            fontSize: 11.5,
            fontWeight: 600,
            background: bg,
            color,
            border,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap"
        }}>
            {isGlobal ? "🌐 Global" : "🏢 Tenant"}
        </span>
    );
};

export const getSuperAdminColumns = (permissions, isDark, t, onEdit, onDel, getRoleName, getTenantName, onInvite, invitingId, ROLES = []) => {
  const isRoleGlobal = (roleId) => {
    const found = ROLES.find(r => (r.id || r.role_id) === roleId);
    if (found) return found.IsGlobal === true;
    
    // Fallback for well-known platform role IDs
    const m = String(roleId || "").match(/^R(\d+)$/);
    const rNum = m ? Number(m[1]) : 0;
    if (rNum >= 10006 && rNum <= 10010) return true;

    return false;
  };

  const cols = [
    {
      accessorKey: 'user_id',
      header: 'USER ID',
      size: 100,
      cell: ({ getValue, row }) => {
        const val = getValue() || row.original.id || "—";
        return <span style={{ fontSize: 13, color: t.textSecondary, fontFamily: t.mono }}>{val}</span>;
      },
    },
    {
      accessorKey: 'email',
      header: 'EMAIL ADDRESS',
      size: 200,
      cell: ({ getValue }) => <span style={{ fontSize: 13.5, fontWeight: 500, color: t.accent }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'first_name',
      header: 'FIRST NAME',
      size: 120,
      cell: ({ getValue }) => <span style={{ fontSize: 13, color: t.text }}>{getValue() || "—"}</span>,
    },
    {
      accessorKey: 'last_name',
      header: 'LAST NAME',
      size: 120,
      cell: ({ getValue }) => <span style={{ fontSize: 13, color: t.text }}>{getValue() || "—"}</span>,
    },
    {
      id: 'role',
      header: 'PLATFORM ROLE',
      size: 150,
      accessorFn: (row) => getRoleName(row.role),
      cell: ({ getValue, row }) => {
        const roleName = getValue();
        const role_id = row.original.role;
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
      id: 'userType',
      header: 'USER TYPE',
      size: 120,
      accessorFn: (row) => {
        const isGlobal = isRoleGlobal(row.role);
        return isGlobal ? 'Global' : 'Tenant';
      },
      cell: ({ row }) => {
        const isGlobal = isRoleGlobal(row.original.role);
        return <UserTypeBadge isGlobal={isGlobal} t={t} isDark={isDark} />;
      },
      enableColumnFilter: true,
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
      accessorKey: 'id',
      header: 'AUTH UID',
      size: 240,
      cell: ({ row }) => {
        const val = row.original.id;
        return (
          <span style={{ fontFamily: t.mono, fontSize: 10, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>
            {val || "—"}
          </span>
        );
      },
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
      size: 150,
      cell: ({ row }) => {
        const hasActions = permissions.canUpdate || permissions.canDelete || permissions.canCreate;
        if (!hasActions) return null;

        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <ActBtns
              show={true}
              t={t}
              onEdit={permissions.canUpdate ? () => onEdit(row.original) : null}
              onDel={permissions.canDelete ? () => onDel(row.original) : null}
              onInvite={permissions.canCreate ? () => onInvite(row.original) : null}
              isInviting={invitingId === row.original.id}
            />
          </div>
        );
      },
    },
  ];

  return cols;
};

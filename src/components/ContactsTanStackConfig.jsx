import React from 'react';
import { Edit2, Trash2, Mail, User, Shield, Info } from 'lucide-react';
import { Bdg, ActBtns, Tooltip } from '../components';
import { initials, av } from '../utils';

export const getContactColumns = (permissions, isDark, t, context) => {
  const { callbacks, invitingId } = context;
  const { canUpdate, canDelete, canInvite } = permissions;

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
      header: "Name",
      accessorKey: "name",
      size: 200,
      cell: ({ row, getValue }) => {
        const val = getValue();
        const avatarStyle = av(val, isDark);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: avatarStyle.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: avatarStyle.c, flexShrink: 0,
              border: `1px solid ${avatarStyle.c}${isDark ? '44' : '22'}`
            }}>
              {initials(val)}
            </div>
            <a
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); callbacks.onNameClick(row.original); }}
              href="#"
              style={{
                fontSize: 11.5, fontWeight: 500, color: isDark ? '#f8fafc' : '#2563EB',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                cursor: 'pointer', textDecoration: 'none'
              }}
            >
              {val}
            </a>
          </div>
        );
      }
    },
    {
      header: "Type",
      accessorKey: "type",
      size: 100,
      cell: ({ getValue }) => {
        const val = getValue();
        const isC = val === "Company";
        return (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <span style={{ 
              fontSize: '10.5px', fontWeight: 600, 
              color: isC ? (isDark ? "#FB923C" : "#C2410C") : (isDark ? "#60A5FA" : "#2563EB"),
              background: isC ? (isDark ? "rgba(251,146,60,0.1)" : "#FFF7ED") : (isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF"),
              padding: "2px 10px", borderRadius: 20, 
              border: `1px solid ${isC ? (isDark ? "rgba(251,146,60,0.2)" : "#FED7AA") : (isDark ? "rgba(96,165,250,0.2)" : "#BFDBFE")}`
            }}>
              {val || "—"}
            </span>
          </div>
        );
      }
    },
    {
      header: "Role",
      accessorKey: "role",
      size: 100,
      cell: ({ getValue }) => <Bdg status={getValue()} isDark={isDark} />
    },
    {
      header: "Inv Type",
      accessorKey: "investor_type",
      size: 80,
      cell: ({ getValue }) => <span style={{ fontSize: '11px', color: t.textMuted }}>{getValue() || "—"}</span>
    },
    {
      header: "Email",
      accessorKey: "email",
      size: 200,
      cell: ({ getValue }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Mail size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>{getValue() || "—"}</span>
        </div>
      )
    },
    {
      header: "Phone",
      accessorKey: "phone",
      size: 120,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted }}>{getValue() || "—"}</span>
    },
    {
      header: "Address",
      accessorKey: "address",
      size: 200,
      cell: ({ getValue }) => <span style={{ fontSize: '11px', color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis' }}>{getValue() || "—"}</span>
    },
    {
      header: "Tax ID",
      accessorKey: "tax_id",
      size: 110,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted }}>{getValue() || "—"}</span>
    },
    {
      header: "Actions",
      id: "actions",
      size: 120,
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
              onDel={canDelete ? () => callbacks.onDelete({ id: data.id, name: data.name, docId: data.docId }) : null}
            />
            {canInvite && data.email && (
              <Tooltip text="Invite as Member (R10001)" t={t}>
                <button
                  onClick={(e) => { e.stopPropagation(); callbacks.onInvite(data); }}
                  disabled={invitingId === data.id}
                  style={{
                    background: "none", border: `1px solid ${t.surfaceBorder}`,
                    borderRadius: 7, padding: "5px 8px", cursor: invitingId === data.id ? "default" : "pointer",
                    fontSize: 13, color: t.textMuted, opacity: invitingId === data.id ? 0.5 : 1
                  }}
                >
                  {invitingId === data.id ? "..." : "✉️"}
                </button>
              </Tooltip>
            )}
          </div>
        );
      }
    }
  ];

  return cols;
};

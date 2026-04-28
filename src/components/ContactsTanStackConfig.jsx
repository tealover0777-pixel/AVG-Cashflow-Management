import React from 'react';
import { Edit2, Trash2, Mail, User, Shield, Info } from 'lucide-react';
import { Bdg, Tooltip, ActBtns } from '../components.jsx';
import { fmtCurr } from '../utils';

export const getContactColumns = (permissions, isDark, t, context) => {
  const { callbacks, invitingId, INVESTMENTS } = context;
  const { canUpdate, canDelete, canInvite } = permissions;

  const cols = [
    {
      id: 'select',
      header: ({ table }) => (
        <label 
          onClick={e => e.stopPropagation()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '32px' }}
        >
          <input
            className="ts-checkbox"
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={el => { if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected(); }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            style={{ accentColor: t.accent, cursor: 'pointer' }}
          />
        </label>
      ),
      cell: ({ row }) => (
        <label 
          onClick={e => e.stopPropagation()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '40px' }}
        >
          <input
            className="ts-checkbox"
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
      header: "Contact ID",
      accessorKey: "id",
      size: 100,
      cell: ({ getValue }) => (
        <span style={{ fontFamily: t.mono, fontSize: '11px', fontWeight: 600, color: t.idText }}>
          {getValue() || "—"}
        </span>
      )
    },
    {
      header: "First Name",
      accessorKey: "first_name",
      size: 150,
      cell: ({ row, getValue }) => {
        const val = getValue() || "";
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <a
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); callbacks.onNameClick(row.original); }}
              href="#"
              style={{
                fontSize: 11.5, fontWeight: 600, color: isDark ? '#60A5FA' : '#4F46E5',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                cursor: 'pointer', textDecoration: 'none'
              }}
            >
              {val || "—"}
            </a>
          </div>
        );
      }
    },
    {
      header: "Last Name",
      accessorKey: "last_name",
      size: 150,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '11.5px', fontWeight: 500, color: t.text }}>
          {getValue() || "—"}
        </span>
      )
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
      header: "Deals invested in",
      id: "deals_invested",
      size: 130,
      cell: ({ row }) => {
        const contact = row.original;
        const dpId = String(contact.id || "").trim();
        const dpDocId = String(contact.docId || "").trim();
        const partyInvestments = (INVESTMENTS || []).filter(c => {
          const cPId = String(c.contact_id || "").trim();
          return (cPId && (cPId === dpId || (dpDocId && cPId === dpDocId)));
        });
        
        const dealIds = new Set();
        partyInvestments.forEach(inv => {
          if (inv.deal_id) dealIds.add(inv.deal_id);
          else if (inv.deal) dealIds.add(inv.deal);
        });
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <span style={{ 
              fontSize: '11px', fontWeight: 600, color: t.textSecondary,
              background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
              padding: "2px 8px", borderRadius: 12
            }}>
              {dealIds.size} {dealIds.size === 1 ? 'deal' : 'deals'}
            </span>
          </div>
        );
      }
    },
    {
      header: "Invested Amount",
      id: "invested_amount",
      size: 130,
      cell: ({ row }) => {
        const contact = row.original;
        const dpId = String(contact.id || "").trim();
        const dpDocId = String(contact.docId || "").trim();
        const partyInvestments = (INVESTMENTS || []).filter(c => {
          const cPId = String(c.contact_id || "").trim();
          return (cPId && (cPId === dpId || (dpDocId && cPId === dpDocId)));
        });
        
        const totalInvested = partyInvestments.reduce((sum, c) => {
          const amtStr = String(c.amount || 0).replace(/[^0-9.-]/g, '');
          return sum + (Number(amtStr) || 0);
        }, 0);
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? "#34D399" : "#059669" }}>
              {fmtCurr(totalInvested)}
            </span>
          </div>
        );
      }
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
      header: "Marketing Emails?",
      accessorKey: "marketing_emails",
      size: 130,
      cell: ({ getValue }) => <span style={{ fontSize: '11px', color: t.textSecondary }}>{getValue() || "Subscribed"}</span>
    },
    {
      header: "Payment Method",
      accessorKey: "payment_method",
      size: 130,
      cell: ({ getValue }) => <span style={{ fontSize: '11px', color: t.textSecondary }}>{getValue() || "—"}</span>
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
              show={canUpdate || canDelete || (canInvite && data.email)}
              t={t}
              onEdit={canUpdate ? () => callbacks.onEdit(data) : null}
              onDel={canDelete ? () => callbacks.onDelete({ id: data.id, name: data.name, docId: data.docId }) : null}
              onClone={canUpdate ? () => callbacks.onClone(data) : null}
              onInvite={canInvite && data.email ? () => callbacks.onInvite(data) : null}
              isInviting={invitingId === data.id}
            />
          </div>
        );
      }
    }
  ];

  return cols;
};

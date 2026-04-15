import React from 'react';
import { CornerDownRight, ExternalLink } from 'lucide-react';
import { Bdg } from '../components';
import { fmtCurr } from '../utils';

export const getScheduleColumns = (permissions, isDark, t, context) => {
  const { callbacks, CONTACTS = [], DEALS = [] } = context;

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
      header: "Sched ID",
      accessorKey: "schedule_id",
      size: 90,
      cell: ({ row, getValue }) => {
        const val = getValue();
        const data = row.original;
        const isArchived = data.active_version === false;
        
        return (
          <div style={{ paddingLeft: isArchived ? 20 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isArchived && <CornerDownRight size={14} style={{ opacity: 0.5 }} />}
            <span 
              onClick={() => callbacks.onScheduleClick?.(data)}
              style={{ 
                fontFamily: t.mono, 
                fontSize: '11px', 
                color: isDark ? "#60A5FA" : "#4F46E5",
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {val}
            </span>
          </div>
        );
      }
    },
    {
      header: "Linked",
      accessorKey: "linked",
      size: 80,
      cell: ({ getValue, row }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <span 
            onClick={() => callbacks.onLinkedClick?.(val)}
            style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {val} <ExternalLink size={10} />
          </span>
        );
      }
    },
    {
      header: "Version",
      accessorKey: "version_num",
      size: 60,
      cell: ({ row, getValue }) => {
        const val = getValue() || 1;
        const isActive = row.original.active_version !== false;
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 700,
            fontFamily: t.mono,
            background: isActive ? (isDark ? 'rgba(52,211,153,0.1)' : '#ECFDF5') : (isDark ? 'rgba(255,255,255,0.05)' : '#F5F4F1'),
            color: isActive ? (isDark ? '#34D399' : '#059669') : (isDark ? 'rgba(255,255,255,0.5)' : '#78716C'),
            border: `1px solid ${isActive ? (isDark ? 'rgba(52,211,153,0.2)' : '#A7F3D0') : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB')}`,
          }}>
            V{val}
          </div>
        );
      }
    },
    {
      header: "Investment ID",
      accessorKey: "investment",
      size: 110,
      cell: ({ getValue, row }) => (
        <span 
          onClick={() => callbacks.onInvestmentClick?.(getValue())}
          style={{ fontFamily: t.mono, fontSize: '11.5px', color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 600, cursor: 'pointer' }}
        >
          {getValue()}
        </span>
      )
    },
    {
      header: "Contact ID",
      accessorKey: "contact_id",
      size: 200,
      cell: ({ getValue, row }) => {
        const contactId = getValue();
        const contact = CONTACTS.find(c => c.id === contactId);
        const contactName = contact?.name || "";
        return (
          <span
            onClick={() => callbacks.onContactClick?.(row.original.contact_id)}
            style={{ fontSize: '11px', color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 600, cursor: 'pointer' }}
          >
            <span style={{ fontFamily: t.mono }}>{contactId}</span>
            {contactName && <span style={{ fontFamily: t.font, marginLeft: 6 }}>- {contactName}</span>}
          </span>
        );
      }
    },
    {
      header: "Deal ID",
      accessorKey: "deal_id",
      size: 200,
      cell: ({ getValue }) => {
        const dealId = getValue();
        if (!dealId) return <span style={{ color: t.textMuted }}>—</span>;
        const deal = DEALS.find(d => d.id === dealId);
        const dealName = deal?.name || "";
        return (
          <span style={{ fontSize: '11px', fontWeight: 600 }}>
            <span style={{ fontFamily: t.mono }}>{dealId}</span>
            {dealName && <span style={{ fontFamily: t.font, marginLeft: 6 }}>- {dealName}</span>}
          </span>
        );
      }
    },
    {
      header: "Start Date",
      accessorKey: "term_start",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '12px' }}>{getValue() || <span style={{ color: t.textMuted }}>—</span>}</span>,
      sortingFn: 'datetime'
    },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '12px' }}>{getValue()}</span>,
      sortingFn: 'datetime'
    },
    {
      header: "Type",
      accessorKey: "type",
      size: 140,
      cell: ({ getValue }) => <span style={{ fontSize: '12px', fontWeight: 500 }}>{getValue()}</span>
    },
    {
      header: "Freq",
      accessorFn: (row) => {
        if (row.frequency) return row.frequency;
        const inv = (context.INVESTMENTS || []).find(x => x.id === row.investment_id || x.investment_id === row.investment || x.id === row.investment);
        return inv ? inv.freq || inv.payment_frequency : "—";
      },
      size: 100,
      cell: ({ getValue }) => <span style={{ fontSize: '11px', color: t.textSecondary }}>{getValue()}</span>
    },
    {
      header: "Period",
      accessorKey: "period_number",
      size: 70,
      cell: ({ getValue }) => <span style={{ fontSize: '11px', color: t.textSecondary, fontFamily: t.mono }}>{getValue() || "—"}</span>
    },
    {
      header: "Amount",
      accessorKey: "signed_payment_amount",
      size: 110,
      cell: ({ getValue, row }) => {
        const val = getValue();
        const isOut = row.original.direction === "OUT";
        return (
          <span style={{ 
            fontFamily: t.mono, 
            fontSize: '13px', 
            fontWeight: 700, 
            color: isOut ? (isDark ? "#F87171" : "#DC2626") : (isDark ? "#34D399" : "#059669")
          }}>
            {fmtCurr(val)}
          </span>
        );
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      size: 90,
      cell: ({ getValue }) => <Bdg status={getValue()} isDark={isDark} />
    },
    {
      header: "Notes",
      accessorKey: "notes",
      size: 180,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <div title={val} style={{ fontSize: '11.5px', color: t.textSecondary, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {val}
          </div>
        );
      }
    },
    {
      header: "Updated At",
      accessorKey: "updated_at",
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        
        // Handle Firestore timestamp
        let d = val;
        if (val.seconds) d = new Date(val.seconds * 1000);
        else if (val.toDate) d = val.toDate();
        else d = new Date(val);

        if (isNaN(d.getTime())) return <span style={{ color: t.textMuted }}>—</span>;
        
        return (
          <span style={{ fontSize: '11px', color: t.textMuted, fontFamily: t.mono }}>
            {d.toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric',
              hour: '2-digit', 
              minute: '2-digit'
            })}
          </span>
        );
      }
    },
    {
      header: "Updated By",
      accessorKey: "updated_by",
      size: 130,
      cell: ({ getValue }) => {
        const uid = getValue();
        if (!uid) return <span style={{ color: t.textMuted }}>—</span>;
        if (uid === 'system') return <span style={{ fontSize: '11px', fontWeight: 600, color: t.textMuted }}>System</span>;
        
        // Improved lookup across all potential ID fields used in user documents
        const foundUser = context.USERS?.find(u => 
          u.auth_uid === uid || 
          u.uid === uid || 
          u.id === uid || 
          u.doc_id === uid || 
          u.user_id === uid
        );

        // Combine first_name and last_name, then fallback to email or uid
        const displayName = foundUser
          ? ([foundUser.first_name, foundUser.last_name].filter(Boolean).join(" ") || foundUser.email || uid)
          : uid;

        return (
          <span title={uid} style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 500 }}>
            {displayName}
          </span>
        );
      }
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={(e) => { e.stopPropagation(); callbacks.onEdit?.(data); }} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Edit</button>
            <button onClick={(e) => { e.stopPropagation(); callbacks.onDelete?.(data); }} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Del</button>
            {data.version_num > 1 && (
              <button onClick={(e) => { e.stopPropagation(); callbacks.onUndo?.(data); }} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Undo</button>
            )}
          </div>
        );
      }
    }
  ];

  return cols;
};

import { CornerDownRight, ExternalLink, RotateCcw, Info } from 'lucide-react';
import { Bdg, Tooltip, ActBtns } from '../components';
import { fmtCurr, formatPaymentLag } from '../utils';

export const getScheduleColumns = (permissions, isDark, t, context) => {
  const { callbacks, CONTACTS = [], DEALS = [], INVESTMENTS = [] } = context;

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
      header: "Sched ID",
      accessorKey: "schedule_id",
      size: 90,
      cell: ({ row, getValue }) => {
        const val = getValue();
        const data = row.original;
        // Only indent if this is a genuine older version of the same schedule (has active sibling with same schedule_id)
        const isArchived = data.active_version === false && !!data._is_replaced_version;

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
      accessorFn: (row) => row.investment_id || row.investment || "",
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
      filterFn: (row, columnId, filterValue) => {
        const contactId = row.getValue(columnId) || "";
        const contact = CONTACTS.find(c => c.id === contactId);
        const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ");
        const search = filterValue.toLowerCase();
        return contactId.toLowerCase().includes(search) || contactName.toLowerCase().includes(search);
      },
      cell: ({ getValue, row }) => {
        const contactId = getValue();
        const contact = CONTACTS.find(c => c.id === contactId);
        const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ");
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
      filterFn: (row, columnId, filterValue) => {
        const dealId = row.getValue(columnId) || "";
        const deal = DEALS.find(d => d.id === dealId);
        const dealName = deal?.name || "";
        const search = filterValue.toLowerCase();
        return dealId.toLowerCase().includes(search) || dealName.toLowerCase().includes(search);
      },
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
      header: "Accrual Date",
      accessorFn: (row) => row.due_date || row.dueDate || "",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '12px' }}>{getValue()}</span>,
      sortingFn: 'datetime'
    },
    {
      header: "Payment Day",
      accessorFn: (row) => row.scheduled_payment_date || row.due_date || row.dueDate || "",
      size: 100,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '12px', color: isDark ? "#34D399" : "#059669", fontWeight: 600 }}>{getValue()}</span>,
      sortingFn: 'datetime'
    },
    {
      header: "Type",
      id: "type",
      accessorFn: (row) => row.type || row.payment_type || "",
      size: 140,
      cell: ({ row, getValue }) => {
        const val = getValue();
        const isRollover = !!row.original.rollover;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isRollover && (
              <span style={{ 
                fontSize: '9px', 
                fontWeight: 800, 
                color: '#fff', 
                background: '#9333EA', 
                padding: '1px 5px', 
                borderRadius: '4px', 
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                lineHeight: 1
              }}>
                Rollover
              </span>
            )}
            <span style={{ fontSize: '12px', fontWeight: 500, color: isRollover ? (isDark ? '#E9D5FF' : '#7E22CE') : 'inherit' }}>{val}</span>
            {isRollover && (
              <div style={{ color: isDark ? '#A855F7' : '#9333EA', display: 'flex', alignItems: 'center' }}>
                <RotateCcw size={12} strokeWidth={2.5} />
              </div>
            )}
          </div>
        );
      }
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
      header: "Payment Lag",
      id: "lag",
      size: 110,
      accessorFn: (row) => {
        const inv = (INVESTMENTS || []).find(x => x.id === row.investment_id || x.id === row.investment);
        const deal = (DEALS || []).find(x => x.id === row.deal_id);
        const config = (inv?.payment_lag_config?.enabled) ? inv.payment_lag_config : (deal?.payment_lag_config || null);
        return formatPaymentLag(config);
      },
      cell: ({ getValue }) => {
        const label = getValue();
        if (label === "None") return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <span style={{ fontSize: '10.5px', fontWeight: 600, color: isDark ? "#A78BFA" : "#7C3AED" }}>
            {label}
          </span>
        );
      }
    },
    {
      header: "Payment Method",
      id: "resolved_payment_method",
      size: 140,
      cell: ({ row }) => {
        const s = row.original;
        const inv = INVESTMENTS.find(iv => iv.id === s.investment_id || iv.docId === s.investment_id);
        const contact = CONTACTS.find(c => c.id === s.contact_id || c.docId === s.contact_id);
        const method = s.payment_method || inv?.payment_method || contact?.payment_method || "";
        
        if (!method) return <span style={{ color: t.textMuted }}>—</span>;
        
        const isDerived = !s.payment_method && (inv?.payment_method || contact?.payment_method);
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '11px', fontWeight: 500, color: t.textSecondary }}>{method}</span>
            {isDerived && (
              <Tooltip text={`Derived from ${inv?.payment_method ? "Investment" : "Contact"}`} t={t}>
                <Info size={12} style={{ color: t.textMuted, opacity: 0.7 }} />
              </Tooltip>
            )}
          </div>
        );
      }
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
      accessorFn: (row) => row.rollover ? "ROLLOVER" : row.status,
      id: "status",
      size: 90,
      cell: ({ getValue }) => {
        return <Bdg status={getValue()} isDark={isDark} />;
      }
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
      size: 100,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const data = row.original;
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ActBtns
              show={true}
              t={t}
              onEdit={callbacks.onEdit ? () => callbacks.onEdit(data) : null}
              onDel={callbacks.onDelete ? () => callbacks.onDelete(data) : null}
              onUndo={data.version_num > 1 && callbacks.onUndo ? () => callbacks.onUndo(data) : null}
            />
          </div>
        );
      }
    }
  ];

  return cols;
};

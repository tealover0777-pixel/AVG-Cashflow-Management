import React from 'react';
import { Bdg, ActBtns } from '../components';
import { fmtCurr } from '../utils';

const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);

export const getDistributionMemoColumns = (isDark, t, context) => {
  const { SCHEDULES = [], dealId, callbacks } = context;

  const getLinkedSchedules = (memo) => {
    const types = toArr(memo.payment_type).map(x => x.toLowerCase());
    const statuses = toArr(memo.status).map(x => x.toLowerCase());
    return SCHEDULES.filter(s => {
      const targetDealId = dealId || memo.deal_id;
      if (targetDealId && s.deal_id !== targetDealId) return false;
      const sType = (s.type || s.payment_type || "").toLowerCase();
      if (types.length > 0 && !types.includes(sType)) return false;
      const due = s.dueDate || s.due_date || "";
      if (!due) return false;
      if (memo.period_start && due < memo.period_start) return false;
      if (memo.period_end && due > memo.period_end) return false;
      if (statuses.length > 0) {
        const sSt = (s.status || "").toLowerCase();
        if (!statuses.includes(sSt)) return false;
      }
      return true;
    });
  };

  return [
    {
      header: "Distribution Memo",
      accessorKey: "memo",
      size: 220,
      cell: ({ getValue, row }) => {
        const val = getValue();
        const linked = getLinkedSchedules(row.original);
        return (
          <div>
            <div
              onClick={() => callbacks.onMemoClick?.(row.original, linked)}
              style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#60A5FA" : "#4F46E5", cursor: "pointer" }}
            >
              {val || "—"}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
              {linked.length} schedule{linked.length !== 1 ? "s" : ""} linked
            </div>
          </div>
        );
      }
    },
    {
      header: "Payment Status",
      accessorKey: "status",
      size: 150,
      cell: ({ getValue }) => {
        const val = toArr(getValue());
        if (val.length === 0) return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {val.map(s => <Bdg key={s} status={s} isDark={isDark} />)}
          </div>
        );
      }
    },
    {
      header: "Distribution Payments",
      id: "dist_payments",
      size: 180,
      cell: ({ row }) => {
        const linked = getLinkedSchedules(row.original);
        const total = linked.reduce((sum, s) => sum + (Number(s.signed_payment_amount || s.payment_amount || 0) || 0), 0);
        const isNeg = total < 0;
        return (
          <div>
            <div style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: isNeg ? (isDark ? "#F87171" : "#DC2626") : (isDark ? "#34D399" : "#059669") }}>
              {fmtCurr(total)}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>{linked.length} records</div>
          </div>
        );
      }
    },
    {
      header: "Payment Type",
      accessorKey: "payment_type",
      size: 200,
      cell: ({ getValue }) => {
        const val = toArr(getValue());
        if (val.length === 0) return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {val.map((v, i) => (
              <span key={i} style={{ fontSize: 11, color: t.textSecondary, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: "1px 6px", borderRadius: 4, display: "inline-block" }}>
                {v}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      header: "Period Start",
      accessorKey: "period_start",
      size: 120,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return <span style={{ fontFamily: t.mono, fontSize: 12, color: t.textSecondary }}>{val}</span>;
      },
      sortingFn: 'datetime'
    },
    {
      header: "Period End",
      accessorKey: "period_end",
      size: 120,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return <span style={{ fontFamily: t.mono, fontSize: 12, color: t.textSecondary }}>{val}</span>;
      },
      sortingFn: 'datetime'
    },
    {
      header: "Batch ID",
      accessorKey: "batch_id",
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return <span style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 600, color: t.accent }}>{val}</span>;
      }
    },
    {
      header: "Actions",
      id: "actions",
      size: 90,
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
              onClone={callbacks.onClone ? () => callbacks.onClone(data) : null}
            />
          </div>
        );
      }
    }
  ];
};

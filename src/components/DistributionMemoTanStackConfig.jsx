import React from 'react';
import { Bdg, ActBtns } from '../components';
import { fmtCurr } from '../utils';

export const getDistributionMemoColumns = (isDark, t, context) => {
  const { SCHEDULES = [], dealId, callbacks } = context;

  const getLinkedSchedules = (memo) =>
    SCHEDULES.filter(s => {
      if (s.deal_id !== dealId) return false;
      const sType = (s.type || s.payment_type || "").toLowerCase();
      const mType = (memo.payment_type || "").toLowerCase();
      if (mType && sType !== mType) return false;
      const due = s.dueDate || s.due_date || "";
      if (!due) return false;
      if (memo.period_start && due < memo.period_start) return false;
      if (memo.period_end && due > memo.period_end) return false;
      return true;
    });

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
      size: 120,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return <Bdg status={val} isDark={isDark} />;
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
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return <span style={{ fontSize: 12, color: t.textSecondary }}>{val}</span>;
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

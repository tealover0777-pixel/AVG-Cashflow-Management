import React from 'react';
import { Bdg, Tooltip } from '../components';
import { fmtCurr } from '../utils';
import { RotateCcw } from 'lucide-react';

export const getContactTransactionColumns = (isDark, t, context) => {
  const { DEALS = [] } = context;

  return [
    {
      header: "Deal",
      id: "deal",
      accessorFn: (row) => {
        const d = DEALS.find(dd => dd.id === row.deal_id);
        return d?.name || row.deal_id || row.project || "—";
      },
      size: 180,
      cell: ({ getValue }) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>
          {getValue()}
        </span>
      )
    },
    {
      header: "Type",
      id: "type",
      accessorFn: (row) => row.type || row.payment_type || "—",
      size: 200,
      cell: ({ row, getValue }) => {
        const val = getValue();
        const isRollover = row.original.status === "ROLLOVER";
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: 12, color: t.textSecondary }}>{val}</span>
            {isRollover && (
              <Tooltip text="Rollover Principal" t={t}>
                <div style={{ color: isDark ? '#818CF8' : '#4F46E5', display: 'flex', alignItems: 'center' }}>
                  <RotateCcw size={12} strokeWidth={2.5} />
                </div>
              </Tooltip>
            )}
          </div>
        );
      }
    },
    {
      header: "Memo",
      id: "memo",
      accessorFn: (row) => row.memo || row.notes || "",
      size: 200,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return (
          <div title={val} style={{ fontSize: 12, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {val}
          </div>
        );
      }
    },
    {
      header: "Amount",
      id: "amount",
      accessorFn: (row) => Number(String(row.signed_payment_amount || row.payment_amount || row.amount || 0).replace(/[^0-9.-]/g, '')) || 0,
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue();
        const color = val > 0 ? (isDark ? "#34D399" : "#10B981") : val < 0 ? (isDark ? "#F87171" : "#EF4444") : (isDark ? "#fff" : "#1C1917");
        return (
          <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color }}>
            {fmtCurr(val)}
          </span>
        );
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      size: 110,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return <Bdg status={val} isDark={isDark} />;
      }
    },
    {
      header: "Date",
      id: "date",
      accessorFn: (row) => row.receivedDate || row.dueDate || row.date || "",
      size: 120,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span style={{ color: t.textMuted }}>—</span>;
        return <span style={{ fontFamily: t.mono, fontSize: 12, color: t.textSecondary }}>{val}</span>;
      },
      sortingFn: 'datetime'
    }
  ];
};

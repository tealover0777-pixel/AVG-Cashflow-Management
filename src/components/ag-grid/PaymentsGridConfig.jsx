import PaymentStatusCellRenderer from './PaymentStatusCellRenderer';
import PaymentAmountCellRenderer from './PaymentAmountCellRenderer';
import PaymentActionsCellRenderer from './PaymentActionsCellRenderer';
import BatchStatusCellRenderer from './BatchStatusCellRenderer';
import BatchActionsCellRenderer from './BatchActionsCellRenderer';
import { fmtCurr } from '../../utils';

export const getPaymentColumnDefs = (permissions, isDark, t) => {
  const cols = [
    {
      headerName: "PAY ID",
      field: "id",
      width: 90,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '10.5px', color: t.idText }
    },
    {
      headerName: "INVESTMENT",
      field: "investment",
      width: 100,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: (params) => ({
        fontFamily: t.mono,
        fontSize: '11.5px',
        color: isDark ? "#60A5FA" : "#4F46E5",
        fontWeight: 500
      })
    },
    {
      headerName: "PARTY",
      field: "party",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontSize: '13px', fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917" }
    },
    {
      headerName: "TYPE",
      field: "type",
      width: 110,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontSize: '12px', color: t.textMuted }
    },
    {
      headerName: "AMOUNT",
      field: "amount",
      width: 120,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellRenderer: PaymentAmountCellRenderer
    },
    {
      headerName: "DATE",
      field: "date",
      width: 110,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted }
    },
    {
      headerName: "STATUS",
      field: "status",
      width: 100,
      sortable: true,
      filter: "agTextColumnFilter",
      cellRenderer: PaymentStatusCellRenderer
    }
  ];

  if (permissions.canUpdate || permissions.canDelete) {
    cols.push({
      headerName: "ACTIONS",
      field: "actions",
      width: 80,
      pinned: "right",
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: PaymentActionsCellRenderer
    });
  }

  return cols;
};

export const getBatchColumnDefs = (permissions, isDark, t) => {
  const cols = [
    {
      headerName: "BATCH ID",
      field: "batch_id",
      width: 130,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.idText, fontWeight: 600 }
    },
    {
      headerName: "STATUS",
      field: "status",
      width: 160,
      sortable: true,
      filter: "agTextColumnFilter",
      cellRenderer: BatchStatusCellRenderer
    },
    {
      headerName: "CREATED",
      field: "created_at",
      width: 120,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted }
    },
    {
      headerName: "UPDATED",
      field: "updated_at",
      width: 120,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "NOTES",
      field: "notes",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontSize: '12px', color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      valueFormatter: (params) => params.value || "—"
    }
  ];

  if (permissions.canUpdate || permissions.canDelete) {
    cols.push({
      headerName: "ACTIONS",
      field: "actions",
      width: 80,
      pinned: "right",
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: BatchActionsCellRenderer
    });
  }

  return cols;
};

export const getLedgerColumnDefs = (permissions, isDark, t) => {
  return [
    {
      headerName: "DATE",
      field: "created_at",
      width: 110,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted }
    },
    {
      headerName: "ENTITY TYPE",
      field: "entity_type",
      width: 120,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontSize: '12px', fontWeight: 500, color: t.textSecondary }
    },
    {
      headerName: "ENTITY ID",
      field: "entity_id",
      width: 130,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.idText }
    },
    {
      headerName: "AMOUNT",
      field: "amount",
      width: 120,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellStyle: (params) => ({
        fontFamily: t.mono,
        fontSize: '12px',
        fontWeight: 600,
        color: params.value < 0 ? "#DC2626" : "#059669"
      }),
      valueFormatter: (params) => fmtCurr(params.value)
    },
    {
      headerName: "NOTE",
      field: "note",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontSize: '12px', color: t.textMuted }
    }
  ];
};

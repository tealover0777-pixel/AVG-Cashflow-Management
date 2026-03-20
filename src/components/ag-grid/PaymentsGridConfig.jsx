import PaymentStatusCellRenderer from './PaymentStatusCellRenderer';
import PaymentAmountCellRenderer from './PaymentAmountCellRenderer';
import PaymentActionsCellRenderer from './PaymentActionsCellRenderer';
import BatchStatusCellRenderer from './BatchStatusCellRenderer';
import BatchActionsCellRenderer from './BatchActionsCellRenderer';
import { fmtCurr } from '../../utils';

export const getPaymentColumnDefs = (permissions, isDark, t) => {
  const cols = [
    {
      headerName: "Pay ID",
      field: "id",
      width: 90,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: { fontFamily: t.mono, fontSize: '10.5px', color: t.idText }
    },
    {
      headerName: "Investment",
      field: "investment",
      width: 100,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: (params) => ({
        fontFamily: t.mono,
        fontSize: '11.5px',
        color: isDark ? "#60A5FA" : "#4F46E5",
        fontWeight: 500
      })
    },
    {
      headerName: "Party",
      field: "party",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: { fontSize: '13px', fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917" }
    },
    {
      headerName: "Type",
      field: "type",
      width: 110,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: { fontSize: '12px', color: t.textMuted }
    },
    {
      headerName: "Amount",
      field: "amount",
      width: 120,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellRenderer: PaymentAmountCellRenderer
    },
    {
      headerName: "Date",
      field: "date",
      width: 110,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted }
    },
    {
      headerName: "Status",
      field: "status",
      width: 100,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: PaymentStatusCellRenderer
    }
  ];

  if (permissions.canUpdate || permissions.canDelete) {
    cols.push({
      headerName: "Actions",
      field: "actions",
      width: 80,
      pinned: "right",
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: PaymentActionsCellRenderer,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }
    });
  }

  return cols;
};

export const getBatchColumnDefs = (permissions, isDark, t) => {
  const cols = [
    {
      headerName: "Batch ID",
      field: "batch_id",
      width: 130,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.idText, fontWeight: 600 }
    },
    {
      headerName: "Status",
      field: "status",
      width: 160,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: BatchStatusCellRenderer
    },
    {
      headerName: "Created",
      field: "created_at",
      width: 120,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted }
    },
    {
      headerName: "Updated",
      field: "updated_at",
      width: 120,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Notes",
      field: "notes",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: { fontSize: '12px', color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      valueFormatter: (params) => params.value || "—"
    }
  ];

  if (permissions.canUpdate || permissions.canDelete) {
    cols.push({
      headerName: "Actions",
      field: "actions",
      width: 80,
      pinned: "right",
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: BatchActionsCellRenderer,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }
    });
  }

  return cols;
};

export const getLedgerColumnDefs = (permissions, isDark, t) => {
  return [
    {
      headerName: "Date",
      field: "created_at",
      width: 110,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted }
    },
    {
      headerName: "Entity Type",
      field: "entity_type",
      width: 120,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: { fontSize: '12px', fontWeight: 500, color: t.textSecondary }
    },
    {
      headerName: "Entity ID",
      field: "entity_id",
      width: 130,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.idText }
    },
    {
      headerName: "Amount",
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
      headerName: "Note",
      field: "note",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: { fontSize: '12px', color: t.textMuted }
    }
  ];
};

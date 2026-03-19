import FeeMethodCellRenderer from './FeeMethodCellRenderer';
import FeeDirectionCellRenderer from './FeeDirectionCellRenderer';
import FeeRateCellRenderer from './FeeRateCellRenderer';
import FeeSignedRateCellRenderer from './FeeSignedRateCellRenderer';
import FeeActionsCellRenderer from './FeeActionsCellRenderer';

export const getColumnDefs = (permissions, isDark, t) => {
  const baseCols = [
    {
      headerName: "Fee ID",
      field: "id",
      width: 110,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '11px',
        color: t.idText
      },
      pinned: "left"
    },
    {
      headerName: "Name",
      field: "name",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '13.5px',
        fontWeight: 500,
        color: isDark ? 'rgba(255,255,255,0.85)' : '#44403C'
      }
    },
    {
      headerName: "Fee Type",
      field: "fee_type",
      width: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '12.5px',
        color: t.textMuted
      }
    },
    {
      headerName: "Method",
      field: "method",
      width: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: FeeMethodCellRenderer
    },
    {
      headerName: "Applied To",
      field: "applied_to",
      width: 160,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '12px',
        color: isDark ? 'rgba(255,255,255,0.7)' : '#57534E',
        fontWeight: 500
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Direction",
      field: "direction",
      width: 100,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: FeeDirectionCellRenderer
    },
    {
      headerName: "Rate",
      field: "rate",
      width: 130,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: FeeRateCellRenderer
    },
    {
      headerName: "Signed Rate/Amt",
      field: "signed_rate",
      width: 160,
      sortable: false,
      filter: false,
      cellRenderer: FeeSignedRateCellRenderer
    },
    {
      headerName: "Charge At",
      field: "fee_charge_at",
      width: 140,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '12.5px',
        color: t.textMuted
      }
    },
    {
      headerName: "Frequency",
      field: "fee_frequency",
      width: 140,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '12.5px',
        color: t.textMuted
      }
    },
    {
      headerName: "Description",
      field: "description",
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '12.5px',
        color: t.textMuted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }
  ];

  // Actions column (if canUpdate or canDelete)
  if (permissions.canUpdate || permissions.canDelete) {
    baseCols.push({
      headerName: "Actions",
      field: "actions",
      width: 100,
      pinned: "right",
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: FeeActionsCellRenderer,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }
    });
  }

  return baseCols;
};

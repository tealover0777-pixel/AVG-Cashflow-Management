import DealNameCellRenderer from './DealNameCellRenderer';
import DealStatusCellRenderer from './DealStatusCellRenderer';
import DealFeesCellRenderer from './DealFeesCellRenderer';
import DealActionsCellRenderer from './DealActionsCellRenderer';

export const getColumnDefs = (permissions, isDark, t) => {
  const baseCols = [
    {
      headerName: "Deal ID",
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
      }
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
      cellRenderer: DealNameCellRenderer
    },
    {
      headerName: "Status",
      field: "status",
      width: 100,
      sortable: true,
      filter: "agSetColumnFilter",
      filterParams: {
        values: ["Active", "Closed"]
      },
      cellRenderer: DealStatusCellRenderer
    },
    {
      headerName: "Start Date",
      field: "startDate",
      width: 104,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '11px',
        color: t.idText
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "End Date",
      field: "endDate",
      width: 104,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '11px',
        color: t.idText
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Valuation",
      field: "valuation",
      width: 120,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '12px',
        fontWeight: 600,
        color: isDark ? "#60A5FA" : "#4F46E5"
      },
      valueFormatter: (params) => {
        if (!params.value) return "—";
        const val = Number(String(params.value).replace(/[^0-9.]/g, ""));
        return `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      }
    },
    {
      headerName: "Description",
      field: "description",
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
        fontSize: '12px',
        color: t.textMuted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Fees",
      field: "feeIds",
      width: 180,
      sortable: false,
      filter: false,
      cellRenderer: DealFeesCellRenderer
    }
  ];

  // Conditionally add Actions column if user has any action permission
  if (permissions.canUpdate || permissions.canDelete) {
    baseCols.push({
      headerName: "Actions",
      field: "actions",
      width: 100,
      pinned: "right",
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: DealActionsCellRenderer,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    });
  }

  return baseCols;
};

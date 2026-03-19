import ContractIdCellRenderer from './ContractIdCellRenderer';
import ContractTypeCellRenderer from './ContractTypeCellRenderer';
import ContractStatusCellRenderer from './ContractStatusCellRenderer';
import ContractFeesCellRenderer from './ContractFeesCellRenderer';
import ContractActionsCellRenderer from './ContractActionsCellRenderer';
import ContractCheckboxCellRenderer from './ContractCheckboxCellRenderer';
import ContractCheckboxHeaderRenderer from './ContractCheckboxHeaderRenderer';

export const getColumnDefs = (permissions, isDark, t, selection, onToggleRow, onToggleAll, totalCount) => {
  const baseCols = [];

  // Checkbox column (if canUpdate)
  if (permissions.canUpdate) {
    baseCols.push({
      headerName: "",
      field: "checkbox",
      width: 50,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: "left",
      headerComponent: ContractCheckboxHeaderRenderer,
      headerComponentParams: {
        selection,
        totalCount,
        onToggleAll
      },
      cellRenderer: ContractCheckboxCellRenderer,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    });
  }

  baseCols.push(
    {
      headerName: "Contract ID",
      field: "id",
      width: 110,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ContractIdCellRenderer,
      pinned: "left"
    },
    {
      headerName: "Deal ID",
      field: "deal_id",
      width: 90,
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
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Deal",
      field: "deal",
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
        fontSize: '12.5px',
        color: isDark ? 'rgba(255,255,255,0.7)' : '#44403C',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
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
      cellStyle: {
        fontSize: '12.5px',
        fontWeight: 500,
        color: isDark ? 'rgba(255,255,255,0.85)' : '#1C1917',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    },
    {
      headerName: "Type",
      field: "type",
      width: 130,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ContractTypeCellRenderer
    },
    {
      headerName: "Amount",
      field: "amount",
      width: 120,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '12px',
        fontWeight: 600,
        color: isDark ? '#60A5FA' : '#4F46E5'
      }
    },
    {
      headerName: "Rate",
      field: "rate",
      width: 80,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '12px',
        color: t.textMuted
      }
    },
    {
      headerName: "Freq",
      field: "freq",
      width: 100,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '11.5px',
        color: t.textMuted
      }
    },
    {
      headerName: "Term",
      field: "term_months",
      width: 80,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '11.5px',
        color: isDark ? '#FFFFFF' : '#292524'
      },
      valueFormatter: (params) => params.value ? `${params.value}mo` : "—"
    },
    {
      headerName: "Fees",
      field: "feeIds",
      flex: 1,
      minWidth: 180,
      sortable: false,
      filter: false,
      cellRenderer: ContractFeesCellRenderer
    },
    {
      headerName: "Start",
      field: "start_date",
      width: 100,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '10.5px',
        color: t.idText
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Maturity",
      field: "maturity_date",
      width: 100,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '10.5px',
        color: t.idText
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Status",
      field: "status",
      width: 90,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ContractStatusCellRenderer
    },
    {
      headerName: "Created",
      field: "created_at",
      width: 100,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '10.5px',
        color: t.idText
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Updated",
      field: "updated_at",
      width: 100,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '10.5px',
        color: t.idText
      },
      valueFormatter: (params) => params.value || "—"
    }
  );

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
      cellRenderer: ContractActionsCellRenderer,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }
    });
  }

  return baseCols;
};

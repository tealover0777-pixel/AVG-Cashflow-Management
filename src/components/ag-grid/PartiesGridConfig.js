import PartyNameCellRenderer from './PartyNameCellRenderer';
import PartyTypeCellRenderer from './PartyTypeCellRenderer';
import PartyRoleCellRenderer from './PartyRoleCellRenderer';
import PartyEmailCellRenderer from './PartyEmailCellRenderer';
import PartyActionsCellRenderer from './PartyActionsCellRenderer';

export const getColumnDefs = (permissions, isDark, t) => {
  const baseCols = [
    {
      headerName: "Party ID",
      field: "id",
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
      }
    },
    {
      headerName: "Name",
      field: "name",
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: PartyNameCellRenderer
    },
    {
      headerName: "Type",
      field: "type",
      width: 100,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: PartyTypeCellRenderer
    },
    {
      headerName: "Role",
      field: "role",
      width: 90,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: PartyRoleCellRenderer
    },
    {
      headerName: "Inv Type",
      field: "investor_type",
      width: 80,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '11px',
        color: t.textMuted
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Email",
      field: "email",
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: PartyEmailCellRenderer
    },
    {
      headerName: "Phone",
      field: "phone",
      width: 120,
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
        color: t.textMuted
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Address",
      field: "address",
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '11px',
        color: t.textMuted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Tax ID",
      field: "tax_id",
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
        color: t.textMuted
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Bank Info",
      field: "bank_information",
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellStyle: {
        fontSize: '11px',
        color: t.textMuted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Created",
      field: "created_at",
      width: 95,
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
      width: 95,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '10.5px',
        color: t.idText
      },
      valueFormatter: (params) => params.value || "—"
    }
  ];

  // Conditionally add Actions column if user has any action permission
  if (permissions.canUpdate || permissions.canDelete || permissions.canInvite) {
    baseCols.push({
      headerName: "Actions",
      field: "actions",
      width: 120,
      pinned: "right",
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: PartyActionsCellRenderer,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }
    });
  }

  return baseCols;
};

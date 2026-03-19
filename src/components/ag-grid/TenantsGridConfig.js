import TenantLogoCellRenderer from './TenantLogoCellRenderer';
import TenantActionsCellRenderer from './TenantActionsCellRenderer';

export const getColumnDefs = (permissions, isDark, t) => {
  const baseCols = [
    {
      headerName: "Tenant ID",
      field: "id",
      width: 120,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.idText },
      pinned: "left"
    },
    {
      headerName: "Name",
      field: "name",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontSize: '13.5px', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.95)' : '#1C1917' }
    },
    {
      headerName: "Logo",
      field: "logo",
      width: 110,
      sortable: false,
      filter: false,
      cellRenderer: TenantLogoCellRenderer
    },
    {
      headerName: "Owner ID",
      field: "owner_id",
      width: 110,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Email",
      field: "email",
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontSize: '12px', color: t.textSecondary }
    },
    {
      headerName: "Phone",
      field: "phone",
      width: 130,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Notes",
      field: "notes",
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { fontSize: '12px', color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
    },
    {
      headerName: "Created",
      field: "created_at",
      width: 105,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '10.5px', color: t.idText },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Updated",
      field: "updated_at",
      width: 105,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '10.5px', color: t.idText },
      valueFormatter: (params) => params.value || "—"
    }
  ];

  if (permissions.canUpdate || permissions.canDelete) {
    baseCols.push({
      headerName: "Actions",
      field: "actions",
      width: 100,
      pinned: "right",
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: TenantActionsCellRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    });
  }

  return baseCols;
};

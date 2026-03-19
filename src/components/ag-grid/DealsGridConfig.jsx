import DealNameCellRenderer from './DealNameCellRenderer';
import DealStatusCellRenderer from './DealStatusCellRenderer';
import DealFeesCellRenderer from './DealFeesCellRenderer';
import DealActionsCellRenderer from './DealActionsCellRenderer';

export const getColumnDefs = (permissions, isDark, t) => {
  const baseCols = [
    {
      headerName: "Deal ID",
      field: "id",
      width: 100,
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
      width: 220,
      flex: 1,
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
      headerName: "Deal type",
      field: "type",
      width: 180,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: (params) => (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 500, color: params.context.isDark ? "#A78BFA" : "#7C3AED", background: params.context.isDark ? "rgba(167,139,250,0.1)" : "#F5F3FF", padding: "2px 10px", borderRadius: 20, border: `1px solid ${params.context.isDark ? "rgba(167,139,250,0.2)" : "#DDD6FE"}` }}>{params.value || "—"}</span>
        </div>
      )
    },
    {
      headerName: "Deal Stage",
      field: "status",
      width: 120,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: DealStatusCellRenderer
    },
    {
      headerName: "Start Date",
      field: "startDate",
      width: 110,
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
      width: 110,
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
      headerName: "Fundraising progress",
      field: "fundraisingProgress",
      width: 160,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellRenderer: (params) => {
        if (params.value === undefined || params.value === null) return "—";
        const val = params.value;
        const color = val >= 100 ? (isDark ? "#34D399" : "#059669") : (isDark ? "#60A5FA" : "#3B82F6");
        const bg = val >= 100 ? (isDark ? "rgba(52,211,153,0.1)" : "#ECFDF5") : (isDark ? "rgba(96,165,250,0.1)" : "#EFF6FF");
        return (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6", borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, val)}%`, height: '100%', background: color }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, minWidth: 36, color: color, background: bg, padding: '1px 6px', borderRadius: 4 }}>{val.toFixed(1)}%</span>
          </div>
        );
      }
    },
    {
      headerName: "Fund balance",
      field: "fundBalance",
      width: 120,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '11.5px',
        fontWeight: 600,
        color: isDark ? "#10B981" : "#059669"
      },
      valueFormatter: (params) => params.value || "—"
    },
    {
      headerName: "Fundraising Target",
      field: "valuation",
      width: 150,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellStyle: {
        fontFamily: t.mono,
        fontSize: '11.5px',
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
      width: 250,
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
        fontSize: '11.5px',
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
      width: 220,
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
        justifyContent: 'flex-start'
      }
    });
  }

  return baseCols;
};

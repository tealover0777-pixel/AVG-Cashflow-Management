import ScheduleIdCellRenderer from './ScheduleIdCellRenderer';
import LinkedIdCellRenderer from './LinkedIdCellRenderer';
import InvestmentIdCellRenderer from './InvestmentIdCellRenderer';
import ScheduleDealIdCellRenderer from './ScheduleDealIdCellRenderer';
import ScheduleContactIdCellRenderer from './ScheduleContactIdCellRenderer';
import SchedulePeriodCellRenderer from './SchedulePeriodCellRenderer';
import ScheduleTypeCellRenderer from './ScheduleTypeCellRenderer';
import ScheduleFeeIdCellRenderer from './ScheduleFeeIdCellRenderer';
import ScheduleAppliedToCellRenderer from './ScheduleAppliedToCellRenderer';
import ScheduleDirectionCellRenderer from './ScheduleDirectionCellRenderer';
import ScheduleSignedAmountCellRenderer from './ScheduleSignedAmountCellRenderer';
import SchedulePrincipalAmountCellRenderer from './SchedulePrincipalAmountCellRenderer';
import ScheduleStatusCellRenderer from './ScheduleStatusCellRenderer';
import ScheduleNotesCellRenderer from './ScheduleNotesCellRenderer';
import ScheduleActionsCellRenderer from './ScheduleActionsCellRenderer';

export const getScheduleColumnDefs = (permissions, isDark, t, showCheckbox = true) => {
  const cols = [];

  // Checkbox column for selection
  if (showCheckbox && permissions.canUpdate) {
    cols.push({
      headerName: "",
      field: "selected",
      width: 40,
      pinned: "left",
      sortable: false,
      filter: false,
      resizable: false,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    });
  }

  cols.push(
    {
      headerName: "Schedule ID",
      field: "schedule_id",
      width: 90,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ScheduleIdCellRenderer,
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.idText }
    },
    {
      headerName: "Linked",
      field: "linked",
      width: 80,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: LinkedIdCellRenderer,
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.textMuted }
    },
    {
      headerName: "Investment",
      field: "investment",
      width: 90,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: InvestmentIdCellRenderer,
      cellStyle: { fontFamily: t.mono, fontSize: '11.5px', color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 500 }
    },
    {
      headerName: "Deal ID",
      field: "deal_id",
      width: 85,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ScheduleDealIdCellRenderer,
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.idText }
    },
    {
      headerName: "Contact ID",
      field: "party_id",
      width: 90,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ScheduleContactIdCellRenderer,
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: t.idText }
    },
    {
      headerName: "Period",
      field: "period_number",
      width: 60,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellRenderer: SchedulePeriodCellRenderer,
      cellStyle: { fontFamily: t.mono, fontSize: '11.5px', color: t.textMuted, textAlign: "center" }
    },
    {
      headerName: "Due Date",
      field: "dueDate",
      width: 105,
      sortable: true,
      filter: "agDateColumnFilter",
      cellStyle: { fontFamily: t.mono, fontSize: '11px', color: isDark ? "rgba(255,255,255,0.7)" : "#44403C" }
    },
    {
      headerName: "Type",
      field: "type",
      width: 160,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ScheduleTypeCellRenderer
    },
    {
      headerName: "Fee",
      field: "fee_id",
      width: 240,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ScheduleFeeIdCellRenderer
    },
    {
      headerName: "Applied To",
      field: "applied_to",
      width: 120,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ScheduleAppliedToCellRenderer
    },
    {
      headerName: "Dir",
      field: "direction",
      width: 50,
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"],
        trimInput: true,
        debounceMs: 300
      },
      cellRenderer: ScheduleDirectionCellRenderer
    },
    {
      headerName: "Signed Amt",
      field: "signed_payment_amount",
      width: 110,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellRenderer: ScheduleSignedAmountCellRenderer
    },
    {
      headerName: "Principal",
      field: "principal_amount",
      width: 110,
      sortable: true,
      filter: "agNumberColumnFilter",
      cellRenderer: SchedulePrincipalAmountCellRenderer
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
      cellRenderer: ScheduleStatusCellRenderer
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
      cellRenderer: ScheduleNotesCellRenderer
    }
  );

  // Actions column
  if (permissions.canUpdate || permissions.canDelete) {
    cols.push({
      headerName: "Actions",
      field: "actions",
      colId: "actions",
      width: 150,
      minWidth: 150,
      pinned: "right",
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: ScheduleActionsCellRenderer,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'visible'
      }
    });
  }

  return cols;
};

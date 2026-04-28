import React from "react";
import { ActBtns, Bdg } from '../components';
import { ThumbsUp, ThumbsDown } from "lucide-react";

export const getAdminHelpColumns = (permissions, isDark, t, onEdit, onDel) => {
  const cols = [
    {
      id: "select",
      header: ({ table }) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
          <input
            className="ts-checkbox"
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={el => { if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected(); }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
          <input
            className="ts-checkbox"
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        </div>
      ),
      size: 40,
      enableSorting: false,
    },
    {
      accessorKey: 'date',
      header: 'DATE',
      size: 130,
      cell: ({ getValue }) => <span style={{ fontSize: 12, color: t.textMuted }}>{getValue()?.split(',')[0] || "—"}</span>,
    },
    {
      accessorKey: 'user_email',
      header: 'USER',
      size: 170,
      cell: ({ getValue }) => (
        <span style={{ fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {getValue() || "—"}
        </span>
      ),
    },
    {
      accessorKey: 'question',
      header: 'QUESTION',
      size: 300,
      cell: ({ getValue }) => (
        <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>
          &quot;{getValue() || "—"}&quot;
        </span>
      ),
      flex: 1,
    },
    {
      accessorKey: 'feedback',
      header: 'FEEDBACK',
      size: 90,
      cell: ({ getValue }) => {
        const val = getValue();
        if (val === "up") return <div style={{ color: "#10B981" }}><ThumbsUp size={16} /></div>;
        if (val === "down") return <div style={{ color: "#EF4444" }}><ThumbsDown size={16} /></div>;
        return <span style={{ color: t.textMuted, fontSize: 12 }}>None</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      size: 100,
      cell: ({ getValue }) => <Bdg status={getValue() === "resolved" ? "Resolved" : "Pending"} isDark={isDark} />,
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      size: 80,
      cell: ({ row }) => (
        <ActBtns
          show={true}
          t={t}
          onEdit={() => onEdit(row.original)}
          onDel={() => onDel(row.original)}
        />
      ),
    },
  ];

  return cols;
};

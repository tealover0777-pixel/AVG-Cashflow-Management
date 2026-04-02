import React, { useState, useMemo, useRef, useEffect } from "react";
import { ActBtns, Bdg } from '../components';
import { fmtCurr, fmtDate } from '../utils';

export const getPaymentColumns = (permissions, isDark, t, onEdit, onDel, onBatchClick) => {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
          />
        </div>
      ),
      size: 40,
      enableSorting: false,
    },
    {
      accessorKey: 'id',
      header: 'Pay ID',
      size: 90,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '10.5px', color: t.idText }}>{getValue()}</span>,
    },
    {
      accessorKey: 'investment',
      header: 'Investment',
      size: 100,
      cell: ({ getValue }) => (
        <span style={{ fontFamily: t.mono, fontSize: '11.5px', color: isDark ? "#60A5FA" : "#4F46E5", fontWeight: 500 }}>
          {getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'party',
      header: 'Party',
      size: 180,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '13px', fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : "#1C1917" }}>
          {getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 110,
      cell: ({ getValue }) => <span style={{ fontSize: '12px', color: t.textMuted }}>{getValue()}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      size: 120,
      cell: ({ getValue }) => {
        const val = getValue();
        return (
          <span style={{ fontFamily: t.mono, fontSize: '12.5px', fontWeight: 700, color: val < 0 ? "#F87171" : "#34D399" }}>
            {fmtCurr(val)}
          </span>
        );
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      size: 110,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted }}>{fmtDate(getValue())}</span>,
    },
    {
      accessorKey: 'batch_id',
      header: 'Batch',
      size: 110,
      cell: ({ getValue }) => (
        <span 
          onClick={getValue() ? () => onBatchClick && onBatchClick(getValue()) : null}
          style={{ 
            fontFamily: t.mono, 
            fontSize: '10.5px', 
            color: (getValue() && onBatchClick) ? (isDark ? "#60A5FA" : "#4F46E5") : t.idText,
            cursor: (getValue() && onBatchClick) ? 'pointer' : 'default',
            textDecoration: (getValue() && onBatchClick) ? 'underline' : 'none',
            textUnderlineOffset: '2px'
          }}
        >
          {getValue() || "—"}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      cell: ({ getValue }) => {
        const val = getValue();
        let bg = "rgba(107, 114, 128, 0.1)";
        let text = "#6B7280";
        if (val === "Cleared" || val === "Sent") { bg = "rgba(16, 185, 129, 0.1)"; text = "#10B981"; }
        else if (val === "Pending") { bg = "rgba(245, 158, 11, 0.1)"; text = "#F59E0B"; }
        else if (val === "Failed") { bg = "rgba(244, 63, 128, 0.1)"; text = "#F43F5E"; }
        return <Bdg label={val} bg={bg} text={text} t={t} />;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 100,
      cell: ({ row }) => (
        <ActBtns 
          show={true} 
          t={t} 
          onEdit={permissions.canUpdate ? () => onEdit(row.original) : null} 
          onDel={permissions.canDelete ? () => onDel(row.original) : null} 
        />
      ),
    },
  ];
};

export const getBatchColumns = (permissions, isDark, t, onEdit, onDel, onBatchClick) => {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
          />
        </div>
      ),
      size: 40,
      enableSorting: false,
    },
    {
      accessorKey: 'batch_id',
      header: 'Batch ID',
      size: 130,
      cell: ({ getValue, row }) => (
        <span 
          onClick={() => onBatchClick && onBatchClick(row.original.batch_id)}
          style={{ 
            fontFamily: t.mono, 
            fontSize: '11px', 
            color: onBatchClick ? (isDark ? "#60A5FA" : "#4F46E5") : t.idText, 
            fontWeight: 600,
            cursor: onBatchClick ? 'pointer' : 'default',
            textDecoration: onBatchClick ? 'underline' : 'none',
            textUnderlineOffset: '2px'
          }}
        >
          {getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 160,
      cell: ({ getValue }) => {
        const val = getValue();
        let bg = "rgba(107, 114, 128, 0.1)";
        let text = "#6B7280";
        if (val === "Completed" || val === "Processed") { bg = "rgba(16, 185, 129, 0.1)"; text = "#10B981"; }
        else if (val === "Processing" || val === "Active") { bg = "rgba(59, 130, 246, 0.1)"; text = "#3B82F6"; }
        else if (val === "Pending" || val === "Scheduled") { bg = "rgba(245, 158, 11, 0.1)"; text = "#F59E0B"; }
        return <Bdg label={val} bg={bg} text={text} t={t} />;
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      size: 120,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted }}>{fmtDate(getValue())}</span>,
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      size: 120,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted }}>{fmtDate(getValue()) || "—"}</span>,
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      size: 200,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px', color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getValue() || "—"}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 100,
      cell: ({ row }) => (
        <ActBtns 
          show={true} 
          t={t} 
          onEdit={permissions.canUpdate ? () => onEdit(row.original) : null} 
          onDel={permissions.canDelete ? () => onDel(row.original) : null} 
        />
      ),
    },
  ];
};

export const getLedgerColumns = (permissions, isDark, t) => {
  return [
    {
      accessorKey: 'created_at',
      header: 'Date',
      size: 110,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.textMuted }}>{fmtDate(getValue())}</span>,
    },
    {
      accessorKey: 'entity_type',
      header: 'Entity Type',
      size: 120,
      cell: ({ getValue }) => <span style={{ fontSize: '12px', fontWeight: 500, color: t.textSecondary }}>{getValue()}</span>,
    },
    {
      accessorKey: 'entity_id',
      header: 'Entity ID',
      size: 130,
      cell: ({ getValue }) => <span style={{ fontFamily: t.mono, fontSize: '11px', color: t.idText }}>{getValue()}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      size: 120,
      cell: ({ getValue }) => {
        const val = getValue();
        return (
          <span style={{ fontFamily: t.mono, fontSize: '12px', fontWeight: 600, color: val < 0 ? "#DC2626" : "#059669" }}>
            {fmtCurr(val)}
          </span>
        );
      },
    },
    {
      accessorKey: 'note',
      header: 'Note',
      size: 200,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px', color: t.textMuted }}>
          {getValue()}
        </span>
      ),
    },
  ];
};

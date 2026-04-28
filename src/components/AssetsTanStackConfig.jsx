import React from 'react';
import { Edit2, Trash2, Image } from 'lucide-react';
import { ActBtns } from '../components';

export const getAssetColumns = (permissions, isDark, t, context) => {
  const { callbacks } = context;
  const { canUpdate, canDelete } = permissions;

  const cols = [
    {
      id: 'select',
      header: ({ table }) => (
        <label 
          onClick={e => e.stopPropagation()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '32px' }}
        >
          <input
            className="ts-checkbox"
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={el => { if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected(); }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            style={{ accentColor: t.accent, cursor: 'pointer' }}
          />
        </label>
      ),
      cell: ({ row }) => (
        <label
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '40px' }}
        >
          <input
            className="ts-checkbox"
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            style={{ accentColor: t.accent, cursor: 'pointer' }}
          />
        </label>
      ),
      size: 45,
      enableSorting: false,
      enableColumnFilter: false,
      meta: {
        style: { textAlign: 'center', padding: 0 }
      }
    },
    {
      header: "Name",
      accessorKey: "name",
      size: 200,
      cell: ({ row, getValue }) => {
        const val = getValue();
        return (
          <a
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); callbacks.onNameClick(row.original); }}
            href="#"
            style={{
              fontSize: 11.5, fontWeight: 500, color: isDark ? '#60A5FA' : '#2563EB',
              cursor: 'pointer', textDecoration: 'none'
            }}
          >
            {val || "—"}
          </a>
        );
      }
    },
    {
      header: "Address",
      accessorKey: "address",
      size: 300,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '11px', color: t.textSecondary }}>
          {getValue() || "—"}
        </span>
      )
    },
    {
      header: "Asset type",
      accessorKey: "asset_type",
      size: 120,
      cell: ({ getValue }) => (
        <span style={{ fontSize: '11px', color: t.textMuted }}>
          {getValue() || "—"}
        </span>
      )
    },
    {
      header: "Images",
      accessorKey: "images",
      size: 100,
      cell: ({ getValue }) => {
        const count = getValue() || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Image size={14} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: '11px', color: t.textMuted }}>
              {count > 0 ? `${count} image${count !== 1 ? 's' : ''}` : "—"}
            </span>
          </div>
        );
      }
    },
    {
      header: "Actions",
      id: "actions",
      size: 120,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const data = row.original;
        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <ActBtns
              show={canUpdate || canDelete}
              t={t}
              onEdit={canUpdate ? () => callbacks.onEdit(data) : null}
              onDel={canDelete ? () => callbacks.onDelete({ id: data.id, name: data.name, docId: data.docId }) : null}
            />
          </div>
        );
      }
    }
  ];

  return cols;
};

import React, { useMemo, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  FilterX
} from 'lucide-react';

/**
 * Modern & Reliable TanStack Table (Stable Version)
 */
const TanStackTable = React.forwardRef(({
  data,
  columns,
  isDark,
  t,
  onSelectionChange,
  pageSize = 30,
  rowStyle,
  onRowClick,
  globalFilter,
  setGlobalFilter,
  getRowId,
  initialSorting = [],
  // Controlled Selection props
  rowSelection: controlledRowSelection,
  onRowSelectionChange: controlledOnRowSelectionChange,
}, ref) => {
  const [sorting, setSorting] = useState(initialSorting);
  const [columnFilters, setColumnFilters] = useState([]);
  const [internalRowSelection, setInternalRowSelection] = useState({});

  const rowSelection = controlledRowSelection !== undefined ? controlledRowSelection : internalRowSelection;
  const setRowSelection = controlledOnRowSelectionChange !== undefined ? controlledOnRowSelectionChange : setInternalRowSelection;

  // Reset method for parents
  React.useImperativeHandle(ref, () => ({
    resetRowSelection: () => setRowSelection({})
  }));

  // STABILITY FIX: Use docId primarily, then id/schedule_id, then index. 
  // NEVER use Math.random() in a getRowId function as it triggers endless render cycles (Error #185).
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
    getRowId: (row, i) => getRowId ? getRowId(row, i) : (row.docId || row._docId || row.id || row.schedule_id || `idx-${i}`),
    autoResetRowSelection: false,
    autoResetPageIndex: false,
    columnResizeMode: 'onChange',
  });

  // Synchronization with loop protection
  useEffect(() => {
    if (onSelectionChange) {
      const selectedModel = table.getSelectedRowModel();
      const selectedData = selectedModel.flatRows.map(row => row.original);
      const selKeys = Object.keys(rowSelection).sort().join(',');
      
      // Only fire if the selection set has actually changed to avoid infinite parent-child trigger loops
      if (table.__lastSelKeys !== selKeys) {
        table.__lastSelKeys = selKeys;
        onSelectionChange(selectedData);
      }
    }
  }, [rowSelection, onSelectionChange, table]);

  const { rows } = table.getRowModel();

  return (
    <div className="ts-root" style={{ 
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: isDark ? '#1C1917' : '#fff', borderRadius: '12px', overflow: 'hidden',
      border: `1px solid ${t.surfaceBorder}`,
      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.05)',
      position: 'relative'
    }}>
      <div style={{ flex: 1, overflow: 'auto', position: 'relative', pointerEvents: 'auto' }} className="ts-scroller">
        <table style={{ width: table.getCenterTotalSize(), minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', tableLayout: 'fixed' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: isDark ? '#262626' : '#F9FAF9' }}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      position: 'relative',
                      padding: header.column.id === 'select' ? '12px 0' : '12px 14px', 
                      textAlign: 'left', fontWeight: 600,
                      color: t.textSubtle, borderBottom: `2px solid ${t.surfaceBorder}`,
                      borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                      verticalAlign: 'top'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: header.column.id === 'select' ? 'center' : 'flex-start' }}>
                      <div 
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: header.column.getCanSort() ? 'pointer' : 'default', marginBottom: header.column.getCanFilter() ? '8px' : 0 }}
                      >
                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                         </div>
                         {header.column.getIsSorted() && (
                            <span style={{ color: t.accent }}>
                              {header.column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                            </span>
                         )}
                      </div>
                      {header.column.getCanFilter() && (
                        <input 
                          value={(header.column.getFilterValue() ?? '')}
                          onChange={e => header.column.setFilterValue(e.target.value)}
                          placeholder="..."
                          style={{
                            width: '80%', padding: '3px 6px', fontSize: '10px', borderRadius: '4px',
                            border: `1px solid ${t.surfaceBorder}`, background: isDark ? 'rgba(0,0,0,0.2)' : '#fff',
                            color: t.text, outline: 'none'
                          }}
                        />
                      )}
                    </div>
                    {/* Resizer Handle */}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
                        style={{
                          position: 'absolute', right: 0, top: 0, height: '100%', width: '5px',
                          background: header.column.getIsResizing() ? t.accent : 'transparent',
                          cursor: 'col-resize', userSelect: 'none', touchAction: 'none'
                        }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr 
                key={row.id}
                onClick={() => onRowClick && onRowClick(row.original)}
                style={{ 
                  background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.005)'),
                  cursor: onRowClick ? 'pointer' : 'default',
                  ...(rowStyle ? rowStyle(row.original) : {})
                }}
                className="ts-row"
              >
                {row.getVisibleCells().map(cell => (
                  <td 
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      padding: cell.column.id === 'select' ? 0 : '10px 14px',
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                      borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      ...(cell.column.columnDef.meta?.style || {})
                    }}
                  >
                     <div style={{ 
                        height: '100%', display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: cell.column.id === 'select' ? 'center' : 'flex-start' 
                     }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                     </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', opacity: 0.5 }}>
            <FilterX size={32} style={{ marginBottom: '12px' }} />
            <div>No results found</div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 20px', borderTop: `1px solid ${t.surfaceBorder}`, background: isDark ? '#1C1917' : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 11 }}>
        <div style={{ fontSize: '11px', color: t.textMuted }}>
           {Object.keys(rowSelection).length > 0 && <span style={{ marginRight: '16px', color: t.accent, fontWeight: 700 }}>{Object.keys(rowSelection).length} selected</span>}
           Showing {table.getRowModel().rows.length} of {data.length} total
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-btn"><ChevronLeft size={16} /></button>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>{table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}</span>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-btn"><ChevronRight size={16} /></button>
        </div>
      </div>
      <style>{`
        .ts-row:hover { background: ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} !important; }
        .ts-scroller::-webkit-scrollbar { width: 8px; height: 8px; }
        .ts-scroller::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; border-radius: 10px; }
        .p-btn { padding: 4px 8px; border-radius: 6px; border: 1px solid ${t.surfaceBorder}; background: transparent; cursor: pointer; display: flex; align-items: center; color: ${t.text}; }
        .p-btn:disabled { opacity: 0.3; cursor: default; }
        .ts-checkbox {
          width: 16px;
          height: 16px;
          accent-color: ${t.accent};
          cursor: pointer;
          border-radius: 4px;
        }
        .resizer:hover {
          background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} !important;
        }
        .resizer.isResizing {
          background: ${t.accent} !important;
          opacity: 1;
        }
      `}</style>
    </div>
  );
});

export default TanStackTable;

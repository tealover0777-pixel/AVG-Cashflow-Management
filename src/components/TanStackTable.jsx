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
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  FilterX
} from 'lucide-react';

/**
 * Premium TanStack Table Component
 * Features: Sorting, Filtering, Selection, dividers, responsive styling, and custom footer.
 */
export default function TanStackTable({
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
}) {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

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
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectionChange) {
        // Find actual data objects for selected indexes
        const selectedRows = Object.keys(next).map(idx => data[idx]).filter(Boolean);
        onSelectionChange(selectedRows);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
    autoResetRowSelection: false,
  });

  const { rows } = table.getRowModel();

  return (
    <div className="tanstack-table-root" style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: isDark ? 'rgba(0,0,0,0.1)' : '#fff',
      borderRadius: '16px',
      overflow: 'hidden',
      border: `1px solid ${t.surfaceBorder}`,
      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.05)'
    }}>
      {/* Table Body */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} className="custom-scrollbar">
        <table style={{ 
          width: '100%', 
          borderCollapse: 'separate', 
          borderSpacing: 0,
          fontSize: '13px',
          color: t.textSecondary,
          tableLayout: 'fixed'
        }}>
          <thead style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 10,
            background: isDark ? '#1C1917' : '#F9FAF9',
            backdropFilter: 'blur(10px)'
          }}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const isSorted = header.column.getIsSorted();
                  const width = header.column.columnDef.size || 'auto';
                  return (
                    <th 
                      key={header.id}
                      style={{
                        width: width,
                        minWidth: width,
                        padding: '12px 14px',
                        textAlign: 'left',
                        fontWeight: 700,
                        fontSize: '10.5px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        color: t.textSubtle,
                        borderBottom: `2px solid ${t.surfaceBorder}`,
                        borderRight: `1px solid ${t.columnDivider || (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,113,108,0.1)')}`,
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        userSelect: 'none',
                        transition: 'background 0.2s',
                        position: 'relative',
                        verticalAlign: 'top'
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: header.column.getCanFilter() ? '8px' : 0 }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <div style={{ display: 'flex', flexDirection: 'column', opacity: isSorted ? 1 : 0.3 }}>
                            {isSorted === 'asc' ? <ArrowUp size={12} color={t.accent} /> : 
                             isSorted === 'desc' ? <ArrowDown size={12} color={t.accent} /> : 
                             <ArrowUp size={12} style={{ opacity: 0.1 }} />}
                          </div>
                        )}
                      </div>
                      
                      {/* Column Filter Input */}
                      {header.column.getCanFilter() && (
                        <div onClick={e => e.stopPropagation()}>
                           <input 
                            value={(header.column.getFilterValue() ?? '')}
                            onChange={e => header.column.setFilterValue(e.target.value)}
                            placeholder="Filter..."
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              fontSize: '10.5px',
                              borderRadius: '7px',
                              border: `1px solid ${t.surfaceBorder}`,
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                              color: t.text,
                              outline: 'none',
                              boxSizing: 'border-box',
                              fontWeight: 400,
                              fontFamily: 'inherit'
                            }}
                           />
                        </div>
                      )}
                    </th>
                  );
                })}
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
                  transition: 'background 0.1s',
                  cursor: onRowClick ? 'pointer' : 'default',
                  ...(rowStyle ? rowStyle(row.original) : {})
                }}
                className="table-row-hover"
              >
                {row.getVisibleCells().map(cell => (
                  <td 
                    key={cell.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: `1px solid ${t.rowDivider || (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(120,113,108,0.08)')}`,
                      borderRight: `1px solid ${t.columnDivider || (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(120,113,108,0.08)')}`,
                      color: t.textSecondary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      ...(cell.column.columnDef.meta?.style || {})
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {rows.length === 0 && (
          <div style={{ padding: '80px 0', textAlign: 'center', color: t.textMuted }}>
            <FilterX size={40} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.4 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: t.textSecondary }}>No matching schedules</div>
            <div style={{ fontSize: '12.5px', marginTop: '6px', opacity: 0.7 }}>Try adjusting your search or filters.</div>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div style={{ 
        padding: '12px 20px', 
        borderTop: `1px solid ${t.surfaceBorder}`,
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '12.5px', color: t.textMuted, fontWeight: 500 }}>
            Showing <strong>{table.getState().pagination.pageIndex * pageSize + 1}</strong> to <strong>{Math.min((table.getState().pagination.pageIndex + 1) * pageSize, data.length)}</strong> of <strong>{data.length}</strong> items
          </span>
          {Object.keys(rowSelection).length > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: t.accent }}>
              {Object.keys(rowSelection).length} selected
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="pag-btn"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="pag-btn"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div style={{ display: 'flex', gap: '4px', margin: '0 8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>{table.getState().pagination.pageIndex + 1}</span>
            <span style={{ fontSize: '13px', color: t.textMuted }}>/</span>
            <span style={{ fontSize: '13px', color: t.textMuted }}>{table.getPageCount()}</span>
          </div>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="pag-btn"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="pag-btn"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .table-row-hover:hover {
          background: ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'} !important;
        }
        .tanstack-table-root th:last-child,
        .tanstack-table-root td:last-child {
          border-right: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
          borderRadius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
        }
        .pag-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid ${t.surfaceBorder};
          background: ${isDark ? 'rgba(255,255,255,0.03)' : '#fff'};
          color: ${t.textSecondary};
          cursor: pointer;
          transition: all 0.2s;
        }
        .pag-btn:hover:not(:disabled) {
          border-color: ${t.accent};
          color: ${t.accent};
          background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.02)'};
        }
        .pag-btn:disabled {
          opacity: 0.3;
          cursor: default;
        }
      `}</style>
    </div>
  );
}

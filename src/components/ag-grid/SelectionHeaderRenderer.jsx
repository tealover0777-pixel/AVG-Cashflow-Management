import React, { useState, useEffect } from 'react';

/**
 * SelectionHeaderRenderer - A custom header component for the selection column
 * that acts as a 'Select All' toggle but doesn't necessarily show a checkbox icon.
 */
export default function SelectionHeaderRenderer(params) {
  const [allSelected, setAllSelected] = useState(false);

  useEffect(() => {
    // Listen for selection changes elsewhere to update our state
    const onSelectionChanged = () => {
      const selectedNodes = params.api.getSelectedNodes();
      const totalNodes = params.api.getRenderedNodes().length;
      setAllSelected(selectedNodes.length === totalNodes && totalNodes > 0);
    };

    params.api.addEventListener('selectionChanged', onSelectionChanged);
    return () => params.api.removeEventListener('selectionChanged', onSelectionChanged);
  }, [params.api]);

  const toggleSelectAll = (e) => {
    e.stopPropagation();
    if (allSelected) {
      params.api.deselectAll();
    } else {
      params.api.selectAll();
    }
    setAllSelected(!allSelected);
  };

  return (
    <div 
      onClick={toggleSelectAll}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '0 4px',
        color: allSelected ? 'var(--ag-checkbox-checked-color, #34D399)' : 'inherit',
        opacity: allSelected ? 1 : 0.6,
        transition: 'all 0.2s ease',
        fontSize: '10px',
        fontWeight: 'bold'
      }}
      title={allSelected ? "Deselect All" : "Select All"}
    >
      {/* 
        The USER requested to 'remove checkbox on table header row' but 'click... should select all'.
        We'll use a subtle indicator or just make the whole cell clickable.
        I'll use a small dot or simply keep it empty but clickable.
      */}
      <div style={{
         width: 8, 
         height: 8, 
         borderRadius: '50%', 
         border: `1px solid ${allSelected ? 'transparent' : 'currentColor'}`,
         background: allSelected ? 'currentColor' : 'transparent',
         transition: 'all 0.2s ease'
      }} />
    </div>
  );
}

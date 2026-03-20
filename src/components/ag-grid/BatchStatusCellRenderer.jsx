import React from 'react';

export default function BatchStatusCellRenderer(props) {
  const { value, context } = props;
  const { isDark, dimensions } = context;

  const batchStatusDim = dimensions?.find(d => d.name === "ACHBatchStatus" || d.name === "ACH Batch Status");
  const style = batchStatusDim?.style?.[value] || { 
    bg: isDark ? "rgba(156,163,175,0.1)" : "#F3F4F6", 
    text: isDark ? "#9CA3AF" : "#4B5563" 
  };

  return (
    <span style={{
      fontSize: '10.5px',
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: '20px',
      whiteSpace: 'nowrap',
      background: style.bg,
      color: style.text,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
    }}>
      {value || 'UNKNOWN'}
    </span>
  );
}

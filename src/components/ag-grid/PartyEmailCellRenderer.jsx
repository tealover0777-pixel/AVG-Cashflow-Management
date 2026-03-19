import React from 'react';

const PartyEmailCellRenderer = (props) => {
  const { value, context } = props;
  const { isDark } = context;

  return (
    <div style={{
      fontSize: 11,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      height: '100%'
    }}>
      {value ? (
        <span style={{ color: isDark ? "#cbd5e1" : "#334155" }}>{value}</span>
      ) : (
        <span style={{ color: isDark ? "#FFFFFF" : "#D4D0CB" }}>—</span>
      )}
    </div>
  );
};

export default PartyEmailCellRenderer;

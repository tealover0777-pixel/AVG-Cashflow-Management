import React from 'react';

const DealIDCellRenderer = (props) => {
  const { value, data, context } = props;
  const { isDark, t, callbacks } = context;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (callbacks.onSelectDeal) callbacks.onSelectDeal(data);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '100%'
    }}>
      <a
        onClick={handleClick}
        href="#"
        style={{
          fontFamily: t.mono,
          fontSize: 11,
          fontWeight: 500,
          color: isDark ? '#f8fafc' : '#2563EB',
          cursor: 'pointer',
          textDecoration: 'none'
        }}
      >
        {value}
      </a>
    </div>
  );
};

export default DealIDCellRenderer;

import React from 'react';

const DealNameCellRenderer = (props) => {
  const { value, data, context } = props;
  const { isDark, t, callbacks } = context;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    callbacks.onEdit(data);
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
          fontSize: 11.5,
          fontWeight: 500,
          color: isDark ? '#f8fafc' : '#2563EB',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          textDecoration: 'none'
        }}
      >
        {value}
      </a>
    </div>
  );
};

export default DealNameCellRenderer;

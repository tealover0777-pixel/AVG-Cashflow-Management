import React from 'react';
import { initials, av } from '../../utils';

const PartyNameCellRenderer = (props) => {
  const { value, data, context } = props;
  const { isDark, t, callbacks } = context;

  const avatarStyle = av(value, isDark);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    callbacks.onNameClick(data);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
      width: '100%',
      height: '100%'
    }}>
      {/* Avatar */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: avatarStyle.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: avatarStyle.c,
        flexShrink: 0,
        border: `1px solid ${avatarStyle.c}${isDark ? '44' : '22'}`
      }}>
        {initials(value)}
      </div>

      {/* Name Link */}
      <a
        onClick={handleClick}
        href="#"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: isDark ? '#f8fafc' : '#0f172a',
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

export default PartyNameCellRenderer;

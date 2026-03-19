import React from 'react';
import { badge } from '../../utils';

const PartyRoleCellRenderer = (props) => {
  const { value, context } = props;
  const { isDark } = context;

  const [bg, color, border] = badge(value, isDark);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '100%'
    }}>
      <span style={{
        fontSize: 11.5,
        fontWeight: 500,
        padding: "2px 10px",
        borderRadius: 20,
        background: bg,
        color: color,
        border: `1px solid ${border}`
      }}>
        {value}
      </span>
    </div>
  );
};

export default PartyRoleCellRenderer;

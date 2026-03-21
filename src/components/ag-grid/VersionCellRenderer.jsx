import React from 'react';

export default function VersionCellRenderer(props) {
  const { value, data, context } = props;
  const { isDark, t } = context;

  if (value === undefined || value === null) return <span style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#D4D0CB" }}>V1</span>;

  const isActive = data.active_version !== false;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '10.5px',
      fontWeight: 600,
      fontFamily: t.mono,
      background: isActive ? (isDark ? 'rgba(52,211,153,0.1)' : '#ECFDF5') : (isDark ? 'rgba(255,255,255,0.05)' : '#F5F4F1'),
      color: isActive ? (isDark ? '#34D399' : '#059669') : (isDark ? 'rgba(255,255,255,0.5)' : '#78716C'),
      border: `1px solid ${isActive ? (isDark ? 'rgba(52,211,153,0.2)' : '#A7F3D0') : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB')}`,
      lineHeight: 1
    }}>
      V{value}
    </div>
  );
}

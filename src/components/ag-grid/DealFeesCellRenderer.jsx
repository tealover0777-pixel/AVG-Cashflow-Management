import React from 'react';

const DealFeesCellRenderer = (props) => {
  const { value, context } = props;
  const { isDark, feesData, t } = context;

  if (!value || !Array.isArray(value) || value.length === 0) {
    return <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB", fontSize: 12 }}>—</span>;
  }

  const appliedFees = value.map(fid => feesData.find(f => f.id === fid)).filter(Boolean);

  if (appliedFees.length === 0) {
    return <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB", fontSize: 12 }}>—</span>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: 'center', height: '100%' }}>
      {appliedFees.map(f => (
        <span 
          key={f.id} 
          style={{ 
            fontSize: 10.5, 
            fontWeight: 600, 
            padding: "2px 8px", 
            borderRadius: 20, 
            background: isDark ? "rgba(52,211,153,0.12)" : "#ECFDF5", 
            color: isDark ? "#34D399" : "#059669", 
            border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#A7F3D0"}`, 
            whiteSpace: "nowrap" 
          }}
        >
          {f.name}
        </span>
      ))}
    </div>
  );
};

export default DealFeesCellRenderer;

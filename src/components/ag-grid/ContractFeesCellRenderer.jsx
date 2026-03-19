export default function ContractFeesCellRenderer(props) {
  const { value, context, data } = props;
  const { isDark, feesData } = context;

  const feeIds = value || data.feeIds || [];
  const appliedFees = feeIds
    .map(fid => feesData?.find(f => f.id === fid))
    .filter(Boolean);

  if (appliedFees.length === 0) {
    return (
      <span style={{
        color: isDark ? 'rgba(255,255,255,0.15)' : '#D4D0CB',
        fontSize: '12px'
      }}>
        —
      </span>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px'
    }}>
      {appliedFees.map(f => (
        <span
          key={f.id}
          style={{
            fontSize: '10.5px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '20px',
            background: isDark ? 'rgba(52,211,153,0.12)' : '#ECFDF5',
            color: isDark ? '#34D399' : '#059669',
            border: `1px solid ${isDark ? 'rgba(52,211,153,0.25)' : '#A7F3D0'}`,
            whiteSpace: 'nowrap'
          }}
        >
          {f.name}
        </span>
      ))}
    </div>
  );
}

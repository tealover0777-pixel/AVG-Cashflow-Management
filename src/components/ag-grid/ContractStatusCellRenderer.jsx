export default function ContractStatusCellRenderer(props) {
  const { value, context } = props;
  const { isDark } = context;

  const getBadgeStyle = (status) => {
    if (status === 'Active') {
      return {
        background: isDark ? 'rgba(52,211,153,0.12)' : '#ECFDF5',
        color: isDark ? '#34D399' : '#059669',
        border: `1px solid ${isDark ? 'rgba(52,211,153,0.25)' : '#A7F3D0'}`
      };
    }
    if (status === 'Closed') {
      return {
        background: isDark ? 'rgba(240,240,240,0.06)' : '#F5F5F4',
        color: isDark ? 'rgba(255,255,255,0.4)' : '#78716C',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E7E5E4'}`
      };
    }
    // Open
    return {
      background: isDark ? 'rgba(96,165,250,0.12)' : '#EFF6FF',
      color: isDark ? '#60A5FA' : '#2563EB',
      border: `1px solid ${isDark ? 'rgba(96,165,250,0.25)' : '#BFDBFE'}`
    };
  };

  const badgeStyle = getBadgeStyle(value);

  return (
    <span style={{
      fontSize: '10.5px',
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: '20px',
      whiteSpace: 'nowrap',
      ...badgeStyle
    }}>
      {value || '—'}
    </span>
  );
}

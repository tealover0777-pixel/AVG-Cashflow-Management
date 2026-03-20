export default function InvestmentTypeCellRenderer(props) {
  const { value, context } = props;
  const { isDark, t } = context;

  const typeColors = {
    Loan: isDark ? '#60A5FA' : '#2563EB',
    Mortgage: isDark ? '#A78BFA' : '#7C3AED',
    Equity: isDark ? '#FBBF24' : '#D97706'
  };

  const color = typeColors[value] || t.textMuted;

  return (
    <div style={{
      fontSize: '12.5px',
      fontWeight: 500,
      color
    }}>
      {value || '—'}
    </div>
  );
}

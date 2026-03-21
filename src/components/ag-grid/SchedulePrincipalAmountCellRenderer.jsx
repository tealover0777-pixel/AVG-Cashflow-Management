export default function SchedulePrincipalAmountCellRenderer(props) {
  const { value, context } = props;
  const { isDark, t } = context;

  if (!value) return <span style={{ color: isDark ? "#fff" : "#D4D0CB" }}>—</span>;

  return (
    <span style={{
      fontFamily: t.mono,
      fontSize: '11.5px',
      color: t.textMuted
    }}>
      {value}
    </span>
  );
}

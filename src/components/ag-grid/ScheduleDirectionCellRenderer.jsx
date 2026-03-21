export default function ScheduleDirectionCellRenderer(props) {
  const { value, context } = props;
  const { isDark, t } = context;

  if (!value) return <span style={{ color: isDark ? "#fff" : "#D4D0CB" }}>—</span>;

  const color = value === "IN"
    ? (isDark ? "#34D399" : "#059669")
    : value === "OUT"
    ? (isDark ? "#F87171" : "#DC2626")
    : t.textMuted;

  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color }}>
      {value}
    </span>
  );
}

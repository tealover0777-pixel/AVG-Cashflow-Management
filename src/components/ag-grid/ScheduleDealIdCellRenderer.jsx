export default function ScheduleDealIdCellRenderer(props) {
  const { value, context } = props;
  const { isDark } = context;

  if (!value) return <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>;

  return <span>{value}</span>;
}

export default function ScheduleDealIdCellRenderer(props) {
  const { value, context } = props;
  const { isDark } = context;

  if (!value) return <span style={{ color: isDark ? "#fff" : "#D4D0CB" }}>—</span>;

  return <span>{value}</span>;
}

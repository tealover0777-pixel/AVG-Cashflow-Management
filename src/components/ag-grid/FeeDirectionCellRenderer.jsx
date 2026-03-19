export default function FeeDirectionCellRenderer(props) {
  const { value, context } = props;
  const { isDark, t } = context;

  const color = value === "IN"
    ? (isDark ? "#34D399" : "#059669")
    : value === "OUT"
    ? (isDark ? "#F87171" : "#DC2626")
    : t.textMuted;

  return (
    <div style={{
      fontSize: '11px',
      fontWeight: 700,
      color
    }}>
      {value || "—"}
    </div>
  );
}

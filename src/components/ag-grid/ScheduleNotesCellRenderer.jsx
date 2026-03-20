export default function ScheduleNotesCellRenderer(props) {
  const { value, context } = props;
  const { isDark, t } = context;

  if (!value) return <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>;

  return (
    <span style={{
      fontSize: '11.5px',
      color: t.textMuted,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      minWidth: 0
    }}>
      {value}
    </span>
  );
}

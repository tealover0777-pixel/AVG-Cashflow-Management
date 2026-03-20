export default function ScheduleIdCellRenderer(props) {
  const { value, data, context } = props;
  const { isDark, callbacks } = context;

  if (!value) return <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>;

  const hasLink = data.linked || (callbacks.hasLink && callbacks.hasLink(data));

  if (hasLink && callbacks.onScheduleClick) {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          callbacks.onScheduleClick(data);
        }}
        style={{
          color: isDark ? "#60A5FA" : "#4F46E5",
          textDecoration: "none",
          fontWeight: 600
        }}
      >
        {value}
      </a>
    );
  }

  return <span>{value}</span>;
}

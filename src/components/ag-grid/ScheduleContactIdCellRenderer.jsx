export default function ScheduleContactIdCellRenderer(props) {
  const { value, context } = props;
  const { isDark, callbacks } = context;

  if (!value) return <span style={{ color: isDark ? "#fff" : "#D4D0CB" }}>—</span>;

  if (callbacks?.onContactClick) {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          callbacks.onContactClick(value);
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

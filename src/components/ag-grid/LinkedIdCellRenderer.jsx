export default function LinkedIdCellRenderer(props) {
  const { value, context } = props;
  const { isDark, callbacks } = context;

  if (!value) return <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>;

  if (callbacks.onLinkedClick) {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          callbacks.onLinkedClick(value);
        }}
        style={{
          color: isDark ? "#60A5FA" : "#4F46E5",
          textDecoration: "none"
        }}
      >
        {value}
      </a>
    );
  }

  return <span>{value}</span>;
}

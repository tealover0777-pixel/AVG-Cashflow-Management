export default function FeeMethodCellRenderer(props) {
  const { value, context } = props;
  const { isDark } = context;

  const methodConfig = {
    "% of Amount": [
      isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF",
      isDark ? "#60A5FA" : "#2563EB",
      isDark ? "rgba(96,165,250,0.3)" : "#BFDBFE"
    ],
    "Fixed Amount": [
      isDark ? "rgba(167,139,250,0.15)" : "#F5F3FF",
      isDark ? "#A78BFA" : "#7C3AED",
      isDark ? "rgba(167,139,250,0.3)" : "#DDD6FE"
    ]
  };

  const [bg, color, border] = methodConfig[value] || ["transparent", "#888", "#ccc"];

  return (
    <span style={{
      fontSize: '11.5px',
      fontWeight: 600,
      padding: '4px 11px',
      borderRadius: '20px',
      background: bg,
      color,
      border: `1px solid ${border}`,
      whiteSpace: 'nowrap'
    }}>
      {value}
    </span>
  );
}

export default function FeeRateCellRenderer(props) {
  const { value, data, context } = props;
  const { isDark, t } = context;

  const formattedRate = (() => {
    if (!value) return "";
    const method = data.method;
    if (method === "Fixed Amount" || method === "Flat") {
      return String(value).startsWith("$") ? value : `$${value}`;
    }
    return String(value).endsWith("%") ? value : `${value}%`;
  })();

  return (
    <div style={{
      fontFamily: t.mono,
      fontSize: '12.5px',
      fontWeight: 700,
      color: isDark ? '#60A5FA' : '#4F46E5'
    }}>
      {formattedRate || "—"}
    </div>
  );
}

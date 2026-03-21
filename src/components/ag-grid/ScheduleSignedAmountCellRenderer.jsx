const ZEROING_STATUSES = ["Missed", "Cancelled", "VOID", "WAIVED", "REPLACED"];

export default function ScheduleSignedAmountCellRenderer(props) {
  const { value, data, context } = props;
  const { isDark } = context;

  const dash = <span style={{ color: isDark ? "#fff" : "#D4D0CB" }}>—</span>;

  let displayValue = value;

  // If status is zeroing and no value, show $0.00
  if (ZEROING_STATUSES.includes(data.status) && (!displayValue || displayValue === dash)) {
    displayValue = "$0.00";
  }

  if (!displayValue || displayValue === dash) return dash;

  // Format OUT direction amounts with parentheses if negative sign exists
  if (data.direction === "OUT" && String(displayValue).includes("-")) {
    displayValue = String(displayValue).replace("-", "(") + ")";
  }

  return (
    <span style={{
      fontFamily: 'ui-monospace, "SF Mono", Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", Consolas, monospace',
      fontSize: '12px',
      fontWeight: 700,
      color: isDark ? "#60A5FA" : "#4F46E5"
    }}>
      {displayValue}
    </span>
  );
}

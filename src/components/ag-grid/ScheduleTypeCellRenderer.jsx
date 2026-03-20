export default function ScheduleTypeCellRenderer(props) {
  const { value, data, context } = props;
  const { isDark, t, callbacks } = context;

  if (!value) return <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>;

  const isFeeType = String(value).toLowerCase() === "fee";
  const hasFeeId = data.fee_id && String(data.fee_id).split(",").filter(Boolean).length > 0;

  if (isFeeType && hasFeeId && callbacks?.onFeeClick) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          callbacks.onFeeClick(data.fee_id);
        }}
        style={{
          fontSize: '11.5px',
          color: isDark ? "#60A5FA" : "#4F46E5",
          cursor: "pointer",
          fontWeight: 600,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {value}
      </span>
    );
  }

  return (
    <span
      style={{
        fontSize: '11.5px',
        color: t.textMuted,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }}
    >
      {value}
    </span>
  );
}

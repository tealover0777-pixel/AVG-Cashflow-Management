export default function ScheduleAppliedToCellRenderer(props) {
  const { value, data, context } = props;
  const { isDark, feesData } = context;

  const dash = <span style={{ color: isDark ? "#fff" : "#D4D0CB" }}>—</span>;

  if (value) return <span style={{ fontSize: '11px' }}>{value}</span>;

  // If no applied_to but has fee_id, get it from the first fee
  if (data.fee_id) {
    const fid = String(data.fee_id).split(",")[0];
    const fee = feesData?.find(f => f.id === fid);
    if (fee?.applied_to) return <span style={{ fontSize: '11px' }}>{fee.applied_to}</span>;
  }

  return dash;
}

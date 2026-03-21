export default function ScheduleFeeIdCellRenderer(props) {
  const { value, context } = props;
  const { isDark, t, feesData } = context;

  if (!value) return <span style={{ color: isDark ? "#fff" : "#D4D0CB" }}>—</span>;

  const feeIds = String(value).split(",").filter(Boolean);

  return (
    <div style={{ fontSize: '10.5px', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {feeIds.map((fid, idx, arr) => {
        const fee = feesData?.find(f => f.id === fid);
        return (
          <span key={fid}>
            <span style={{ fontFamily: t.mono, color: t.idText }}>{fid}</span>
            <span style={{ color: t.textMuted }}> - {fee?.name || ""}</span>
            {idx < arr.length - 1 ? "; " : ""}
          </span>
        );
      })}
    </div>
  );
}

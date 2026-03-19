export default function FeeSignedRateCellRenderer(props) {
  const { data, context } = props;
  const { isDark, t } = context;

  const rateValue = data.rate ? String(data.rate).replace(/[^0-9.-]/g, "") : "0";
  const rateNum = Number(rateValue) || 0;
  const signedRate = (data.direction === "OUT") ? -rateNum : rateNum;

  const isFixedAmount = data.method === "Fixed Amount" || data.method === "Flat";
  const formattedSignedRate = isFixedAmount
    ? (signedRate >= 0 ? `$${Math.abs(signedRate).toFixed(2)}` : `($${Math.abs(signedRate).toFixed(2)})`)
    : (signedRate >= 0 ? `${signedRate}%` : `(${Math.abs(signedRate)}%)`);

  const color = signedRate >= 0
    ? (isDark ? "#34D399" : "#059669")
    : (isDark ? "#F87171" : "#DC2626");

  return (
    <div style={{
      fontFamily: t.mono,
      fontSize: '12.5px',
      fontWeight: 700,
      color
    }}>
      {formattedSignedRate}
    </div>
  );
}

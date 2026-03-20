import React from 'react';
import { fmtCurr } from '../../utils';

export default function PaymentAmountCellRenderer(props) {
  const { value, data, context } = props;
  const { isDark } = context;

  const isIn = data.direction === "Received";
  const color = isIn ? (isDark ? "#34D399" : "#059669") : (isDark ? "#F87171" : "#DC2626");
  const signedValue = isIn ? Math.abs(value) : -Math.abs(value);

  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12.5px',
      fontWeight: 700,
      color: color
    }}>
      {fmtCurr(signedValue)}
    </span>
  );
}

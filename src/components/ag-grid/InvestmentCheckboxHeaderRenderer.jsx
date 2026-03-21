import { forwardRef, useImperativeHandle } from 'react';

const InvestmentCheckboxHeaderRenderer = forwardRef((props, ref) => {
  const { onToggleAll } = props;

  useImperativeHandle(ref, () => ({
    refresh: () => false
  }));

  const handleChange = (e) => {
    e.stopPropagation();
    if (onToggleAll) {
      onToggleAll();
    }
  };

  return (
    <div
      onClick={handleChange}
      style={{
        width: 14,
        height: 14,
        cursor: 'pointer',
        opacity: 0
      }}
    />
  );
});

InvestmentCheckboxHeaderRenderer.displayName = 'InvestmentCheckboxHeaderRenderer';

export default InvestmentCheckboxHeaderRenderer;

import { forwardRef, useImperativeHandle } from 'react';

const InvestmentCheckboxHeaderRenderer = forwardRef((props, ref) => {
  const { selection, totalCount, onToggleAll, context } = props;
  const { t } = context || {};

  useImperativeHandle(ref, () => ({
    refresh: () => false
  }));

  const isAllChecked = selection?.size === totalCount && totalCount > 0;

  const handleChange = (e) => {
    e.stopPropagation();
    if (onToggleAll) {
      onToggleAll();
    }
  };

  return (
    <input
      type="checkbox"
      checked={isAllChecked}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      style={{
        accentColor: t?.checkActive || '#3B82F6',
        width: 14,
        height: 14,
        cursor: 'pointer'
      }}
    />
  );
});

InvestmentCheckboxHeaderRenderer.displayName = 'InvestmentCheckboxHeaderRenderer';

export default InvestmentCheckboxHeaderRenderer;

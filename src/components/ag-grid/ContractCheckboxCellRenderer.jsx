export default function ContractCheckboxCellRenderer(props) {
  const { data, context } = props;
  const { t, selection, callbacks } = context;

  const isChecked = selection?.has(data.id);

  const handleChange = (e) => {
    e.stopPropagation();
    if (callbacks?.onToggleRow) {
      callbacks.onToggleRow(data.id);
    }
  };

  return (
    <input
      type="checkbox"
      checked={isChecked}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      style={{
        accentColor: t.checkActive,
        width: 14,
        height: 14,
        cursor: 'pointer'
      }}
    />
  );
}

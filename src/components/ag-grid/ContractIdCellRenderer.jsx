export default function ContractIdCellRenderer(props) {
  const { value, context } = props;
  const { isDark, t, callbacks } = context;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (callbacks?.onDrillDown) {
      callbacks.onDrillDown(props.data);
    }
  };

  return (
    <div style={{ fontFamily: t.mono, fontSize: '11px', color: t.idText }}>
      <a
        href="#"
        onClick={handleClick}
        style={{
          color: isDark ? '#60A5FA' : '#4F46E5',
          textDecoration: 'none',
          fontWeight: 600
        }}
      >
        {value}
      </a>
    </div>
  );
}

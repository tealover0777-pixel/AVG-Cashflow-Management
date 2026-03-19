export default function TenantLogoCellRenderer(props) {
  const { value } = props;

  if (!value) {
    return <span style={{ fontSize: '12px', color: '#ccc' }}>—</span>;
  }

  return (
    <img
      src={value}
      alt="Logo"
      style={{
        width: 32,
        height: 32,
        borderRadius: '6px',
        objectFit: 'cover'
      }}
    />
  );
}

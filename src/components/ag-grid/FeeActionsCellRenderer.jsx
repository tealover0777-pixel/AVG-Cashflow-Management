export default function FeeActionsCellRenderer(props) {
  const { context, data } = props;
  const { isDark, t, permissions, callbacks } = context;

  const handleEdit = (e) => {
    e.stopPropagation();
    if (callbacks?.onEdit) {
      callbacks.onEdit(data);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (callbacks?.onDelete) {
      callbacks.onDelete(data);
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {permissions.canUpdate && (
        <button
          className="action-btn"
          onClick={handleEdit}
          style={{
            background: isDark ? 'rgba(96,165,250,0.12)' : '#EFF6FF',
            color: isDark ? '#60A5FA' : '#2563EB',
            border: `1px solid ${isDark ? 'rgba(96,165,250,0.25)' : '#BFDBFE'}`,
            padding: '4px 10px',
            borderRadius: '7px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(96,165,250,0.2)' : '#DBEAFE';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(96,165,250,0.12)' : '#EFF6FF';
          }}
        >
          Edit
        </button>
      )}
      {permissions.canDelete && (
        <button
          className="action-btn"
          onClick={handleDelete}
          style={{
            background: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2',
            color: isDark ? '#F87171' : '#DC2626',
            border: `1px solid ${isDark ? 'rgba(248,113,113,0.25)' : '#FECACA'}`,
            padding: '4px 10px',
            borderRadius: '7px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(248,113,113,0.2)' : '#FEE2E2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2';
          }}
        >
          Del
        </button>
      )}
    </div>
  );
}

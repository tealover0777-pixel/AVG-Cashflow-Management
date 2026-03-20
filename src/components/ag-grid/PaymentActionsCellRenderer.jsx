import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export default function PaymentActionsCellRenderer(props) {
  const { data, context } = props;
  const { permissions, callbacks, t } = context;

  if (!permissions.canUpdate && !permissions.canDelete) return null;

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%' }}>
      {permissions.canUpdate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            callbacks.onEdit(data);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: context.isDark ? 'rgba(255,255,255,0.45)' : '#6B7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = context.isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6';
            e.currentTarget.style.color = context.isDark ? '#fff' : '#111827';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = context.isDark ? 'rgba(255,255,255,0.45)' : '#6B7280';
          }}
        >
          <Edit2 size={14} />
        </button>
      )}
      {permissions.canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            callbacks.onDelete({ id: data.id, name: data.id, docId: data.docId });
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            opacity: 0.6,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.opacity = 1;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.opacity = 0.6;
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

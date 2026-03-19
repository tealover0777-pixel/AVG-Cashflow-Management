import React from 'react';
import { ActBtns } from '../../components';

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
      justifyContent: 'flex-start',
      height: '100%'
    }}>
      <ActBtns
        show={permissions.canUpdate || permissions.canDelete}
        t={t}
        onEdit={permissions.canUpdate ? handleEdit : null}
        onDel={permissions.canDelete ? handleDelete : null}
      />
    </div>
  );
}

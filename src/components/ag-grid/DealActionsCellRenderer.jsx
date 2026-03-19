import React, { useState } from 'react';
import { ActBtns } from '../../components';

const DealActionsCellRenderer = (props) => {
  const { data, context } = props;
  const { permissions, t, callbacks } = context;
  const { canUpdate, canDelete } = permissions;
  const [isHovered, setIsHovered] = useState(false);

  const handleEdit = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    callbacks.onEdit(data);
  };

  const handleDelete = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    callbacks.onDelete({
      id: data.id,
      name: data.name,
      docId: data.docId
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        height: '100%',
        justifyContent: 'flex-start'
      }}
    >
      <ActBtns
        show={canUpdate || canDelete}
        t={t}
        onEdit={canUpdate ? handleEdit : null}
        onDel={canDelete ? handleDelete : null}
      />
    </div>
  );
};

export default DealActionsCellRenderer;

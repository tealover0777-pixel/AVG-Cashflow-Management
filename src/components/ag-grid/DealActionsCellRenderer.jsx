import React, { useState } from 'react';
import { ActBtns } from '../../components';

const DealActionsCellRenderer = (props) => {
  const { data, context } = props;
  const { permissions, t, callbacks } = context;
  const { canUpdate, canDelete } = permissions;
  const [isHovered, setIsHovered] = useState(false);

  const handleEdit = (e) => {
    e.stopPropagation();
    callbacks.onEdit(data);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    callbacks.onDelete({
      id: data.id,
      name: data.name,
      docId: data.docId
    });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center'
      }}
    >
      <ActBtns
        show={isHovered && (canUpdate || canDelete)}
        t={t}
        onEdit={canUpdate ? handleEdit : null}
        onDel={canDelete ? handleDelete : null}
      />
    </div>
  );
};

export default DealActionsCellRenderer;

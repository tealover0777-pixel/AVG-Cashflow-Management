import React, { useState } from 'react';
import { ActBtns, Tooltip } from '../../components';

const ContactActionsCellRenderer = (props) => {
  const { data, context } = props;
  const { permissions, t, isDark, callbacks, invitingId } = context;
  const { canUpdate, canDelete, canInvite } = permissions;
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

  const handleInvite = (e) => {
    e.stopPropagation();
    callbacks.onInvite(data);
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

      {canInvite && data.email && (
        <Tooltip text="Invite as Member (R10001)" t={t}>
          <button
            onClick={handleInvite}
            disabled={invitingId === data.id}
            className="action-btn"
            style={{
              background: "none",
              border: `1px solid ${t.border || t.surfaceBorder}`,
              borderRadius: 7,
              padding: "5px 8px",
              cursor: invitingId === data.id ? "default" : "pointer",
              fontSize: 13,
              color: t.textMuted,
              opacity: invitingId === data.id ? 0.5 : 1
            }}
          >
            {invitingId === data.id ? "..." : "✉️"}
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export default ContactActionsCellRenderer;

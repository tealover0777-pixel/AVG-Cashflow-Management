import { useState } from 'react';

export default function ScheduleActionsCellRenderer(props) {
  const { data, context } = props;
  const { t, permissions, callbacks } = context;
  const [hovered, setHovered] = useState(false);

  if (!data) return null;

  const canShowActions = hovered || !!data._undo_snapshot || !!(data.linked || data.linked_schedule_id);
  const hasUndo = data._undo_snapshot || data.linked;

  if (!canShowActions) return null;

  return (
    <div
      style={{ display: "flex", gap: 6, alignItems: "center" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {permissions.canUpdate && callbacks?.onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            callbacks.onEdit(data);
          }}
          style={{
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 7,
            border: `1px solid ${t.surfaceBorder}`,
            background: t.surfaceHover,
            color: t.textSecondary,
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
          title="Edit schedule"
        >
          ✎
        </button>
      )}
      {permissions.canDelete && callbacks?.onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            callbacks.onDelete({
              schedule_id: data.schedule_id,
              name: data.schedule_id,
              docId: data.docId,
              _path: data._path
            });
          }}
          style={{
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 7,
            border: "1px solid rgba(248,113,113,0.3)",
            background: "rgba(248,113,113,0.08)",
            color: "#DC2626",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
          title="Delete schedule"
        >
          ×
        </button>
      )}
      {hasUndo && callbacks?.onUndo && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            callbacks.onUndo(data);
          }}
          style={{
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 7,
            border: `1px solid ${t.surfaceBorder}`,
            background: t.surfaceHover,
            color: t.accent,
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
          title="Undo changes"
        >
          ↶
        </button>
      )}
    </div>
  );
}

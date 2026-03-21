import { ActBtns } from '../../components';

export default function ScheduleActionsCellRenderer(props) {
  const { data, context } = props;
  const { t, permissions, callbacks } = context;

  if (!data) return null;

  const hasUndo = data._undo_snapshot || data.linked || (Number(data.version_num || 1) > 1);

  const handleEdit = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    callbacks?.onEdit(data);
  };

  const handleDelete = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    callbacks?.onDelete({
      schedule_id: data.schedule_id,
      name: data.schedule_id,
      docId: data.docId,
      _path: data._path
    });
  };

  const handleUndo = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    callbacks?.onUndo(data);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        height: "100%",
        justifyContent: "flex-start"
      }}
    >
      <ActBtns
        show={permissions.canUpdate || permissions.canDelete}
        t={t}
        onEdit={permissions.canUpdate ? handleEdit : null}
        onDel={permissions.canDelete ? handleDelete : null}
        onUndo={hasUndo ? handleUndo : null}
      />
    </div>
  );
}

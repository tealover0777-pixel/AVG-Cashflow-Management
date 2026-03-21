import React from 'react';
import { CornerDownRight } from 'lucide-react';

export default function ScheduleIdCellRenderer(props) {
  const { value, data, context } = props;
  const { isDark, callbacks } = context;

  if (!value) return <span style={{ color: isDark ? "#fff" : "#D4D0CB" }}>—</span>;

  const isArchived = data.active_version === false;
  const hasLink = data.linked || (callbacks.hasLink && callbacks.hasLink(data));

  let content;
  if (hasLink && callbacks.onScheduleClick) {
    content = (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          callbacks.onScheduleClick(data);
        }}
        style={{
          color: isDark ? "#60A5FA" : "#4F46E5",
          textDecoration: "none",
          fontWeight: 600
        }}
      >
        {value}
      </a>
    );
  } else {
    content = <span>{value}</span>;
  }

  return (
    <div style={{ paddingLeft: isArchived ? 24 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
      {isArchived && <CornerDownRight size={14} style={{ opacity: 0.5, color: isDark ? '#fff' : '#1C1917' }} />}
      {content}
    </div>
  );
}

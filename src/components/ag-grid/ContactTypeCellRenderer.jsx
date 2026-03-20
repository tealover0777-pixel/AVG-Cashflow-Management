import React from 'react';

const ContactTypeCellRenderer = (props) => {
  const { value, context } = props;
  const { isDark, t } = context;

  const isCompany = value === "Company";
  const color = isCompany ? (isDark ? "#A78BFA" : "#7C3AED") : t.textMuted;
  const icon = isCompany ? "◈" : "◎";
  const text = isCompany ? "Company" : "Individual";

  return (
    <div style={{
      fontSize: 12.5,
      color: color,
      display: 'flex',
      alignItems: 'center',
      height: '100%'
    }}>
      {icon} {text}
    </div>
  );
};

export default ContactTypeCellRenderer;

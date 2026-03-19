import React from 'react';
import { Bdg } from '../../components';

const DealStatusCellRenderer = (props) => {
  const { value, context } = props;
  const { isDark } = context;

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
      <Bdg status={value} isDark={isDark} />
    </div>
  );
};

export default DealStatusCellRenderer;

import { Bdg } from '../../components';

export default function ScheduleStatusCellRenderer(props) {
  const { value, context } = props;
  const { isDark } = context;

  if (!value) return null;

  return <Bdg status={value} isDark={isDark} />;
}

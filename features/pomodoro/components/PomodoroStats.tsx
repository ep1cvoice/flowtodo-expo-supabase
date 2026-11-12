import { strings } from '@/shared/lib/strings';
import { Text, View } from 'react-native';
import { usePomodoroScreenStyles } from '@/features/pomodoro/components/pomodoroScreenStyles';
import { formatFocusTime, type PomoPeriodStats } from '@/features/pomodoro/lib/stats';
import { usePomodoroStats } from '@/features/pomodoro/lib/usePomodoroStats';

function Column({ title, data }: { title: string; data: PomoPeriodStats }) {
  const { styles } = usePomodoroScreenStyles();
  return (
    <View style={styles.statsCol}>
      <Text style={styles.statsPeriod}>{title}</Text>
      <Text style={styles.statsValue}>{data.sessions}</Text>
      <Text style={styles.statsCaption}>{strings.pomodoro.statsSessions}</Text>
      <Text style={styles.statsValue}>{data.completed}</Text>
      <Text style={styles.statsCaption}>{strings.pomodoro.statsCompleted}</Text>
      <Text style={styles.statsValue}>{formatFocusTime(data.focusSeconds)}</Text>
      <Text style={styles.statsCaption}>{strings.pomodoro.statsFocusTime}</Text>
    </View>
  );
}

export default function PomodoroStats() {
  const { styles } = usePomodoroScreenStyles();
  const stats = usePomodoroStats();
  if (!stats) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{strings.pomodoro.stats}</Text>
      <View style={styles.statsRow}>
        <Column title={strings.pomodoro.statsToday} data={stats.today} />
        <Column title={strings.pomodoro.statsWeek} data={stats.week} />
      </View>
    </View>
  );
}

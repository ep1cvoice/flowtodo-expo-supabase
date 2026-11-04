import { View, StyleSheet } from 'react-native';
import CalendarTasks from '@/features/tasks/components/CalendarTasks';
import ScreenBackground from '@/shared/ui/ScreenBackground';
import { tokens } from '@/shared/constants/theme';

export default function CalendarScreen() {
  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.panel}>
        <CalendarTasks />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  panel: {
    flex: 1,
    width: '100%',
    maxWidth: tokens.contentMaxWidth,
    paddingTop: 0,
    paddingBottom: 8,
    paddingHorizontal: 6,
    minHeight: 0,
    overflow: 'visible',
  },
});

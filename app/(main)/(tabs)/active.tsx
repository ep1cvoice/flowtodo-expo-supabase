import { View, StyleSheet } from 'react-native';
import ActiveTasks from '@/components/tasks/ActiveTasks';
import ScreenBackground from '@/components/ui/ScreenBackground';
import { tokens } from '@/constants/theme';

export default function ActiveTasksScreen() {
  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.panel}>
        <ActiveTasks />
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

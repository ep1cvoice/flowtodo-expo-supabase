import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CloudOff } from 'lucide-react-native';
import Button from '@/shared/ui/Button';
import { strings } from '@/shared/lib/strings';
import type { AppColors } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';

interface TasksLoadErrorProps {
  onRetry: () => Promise<void>;
}

// Shown instead of a (misleadingly empty) list when loading the tasks failed.
export default function TasksLoadError({ onRetry }: TasksLoadErrorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.icon}>
        <CloudOff size={48} color={colors.primary} />
      </View>
      <Text style={styles.title}>{strings.common.loadTasksFailed}</Text>
      <Text style={styles.text}>{strings.common.loadTasksFailedHint}</Text>
      <Button inner={strings.common.retry} onPress={onRetry} />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 40,
    },
    icon: {
      padding: 16,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    text: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.textMuted,
    },
  });
}

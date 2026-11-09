import { strings } from '@/shared/lib/strings';
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import type { AppColors } from '@/shared/constants/theme';
import { tokens } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';
import { webInteractive } from '@/shared/lib/pressableWeb';

export const CREATE_TASK_FAB_CLEARANCE = 44;

interface CreateTaskButtonProps {
  onPress: () => void;
}

export default function CreateTaskButton({ onPress }: CreateTaskButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed, hovered }) => [
        styles.fab,
        hovered && styles.hovered,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings.nav.createTask}>
      <Plus size={28} color="#fff" strokeWidth={2} />
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      zIndex: 9000,
      elevation: 9000,
      width: 60,
      height: 60,
      borderRadius: 50,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0f172a',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      ...webInteractive,
    },
    hovered: {
      backgroundColor: colors.primaryHover,
    },
    pressed: {
      backgroundColor: colors.primaryHover,
      opacity: 0.92,
    },
  });
}

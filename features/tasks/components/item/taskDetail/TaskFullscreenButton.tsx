import { strings } from '@/shared/lib/strings';
import { Pressable } from 'react-native';
import { Maximize2, Minimize2 } from 'lucide-react-native';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';

interface Props {
  fullscreen: boolean;
  styles: TaskDetailStyles;
  onPress: () => void;
}

export default function TaskFullscreenButton({ fullscreen, styles, onPress }: Props) {
  const { colors } = useTheme();
  const Icon = fullscreen ? Minimize2 : Maximize2;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed, hovered }) => [styles.iconBtn, (hovered || pressed) && styles.iconBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel={fullscreen ? strings.tasks.exitFullScreen : strings.tasks.enterFullScreen}>
      <Icon size={18} strokeWidth={2.2} color={colors.textSecondary} />
    </Pressable>
  );
}

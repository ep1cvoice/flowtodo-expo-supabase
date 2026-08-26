import { Pressable, Text } from 'react-native';
import { AlarmClock, Calendar, Pencil, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TodoItemStyles } from '@/components/tasks/todoItemStyles';
import AppModal from '@/components/ui/AppModal';
import type { AppColors } from '@/constants/theme';

interface MobileActionsSheetProps {
  visible: boolean;
  canStart: boolean;
  colors: AppColors;
  styles: TodoItemStyles;
  onClose: () => void;
  onStartPomodoro: () => void;
  onOpenCalendar: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MobileActionsSheet({
  visible,
  canStart,
  colors,
  styles,
  onClose,
  onStartPomodoro,
  onOpenCalendar,
  onEdit,
  onDelete,
}: MobileActionsSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <AppModal visible={visible} onClose={onClose}>
      <Pressable style={styles.mobileOverlay} onPress={onClose}>
        <Pressable
          style={[styles.mobileActionsModal, { paddingBottom: 8 + insets.bottom }]}
          onPress={(e) => e.stopPropagation()}>
          {canStart ? (
            <Pressable
              style={styles.mobileActionRow}
              onPress={() => {
                onClose();
                onStartPomodoro();
              }}>
              <AlarmClock size={18} color={colors.textPrimary} />
              <Text style={styles.mobileActionText}>Pomodoro</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.mobileActionRow}
            onPress={() => {
              onClose();
              onOpenCalendar();
            }}>
            <Calendar size={18} color={colors.textPrimary} />
            <Text style={styles.mobileActionText}>Calendar</Text>
          </Pressable>

          <Pressable
            style={styles.mobileActionRow}
            onPress={() => {
              onClose();
              onEdit();
            }}>
            <Pencil size={18} color={colors.textPrimary} />
            <Text style={styles.mobileActionText}>Edit</Text>
          </Pressable>

          <Pressable
            style={styles.mobileActionRow}
            onPress={() => {
              onClose();
              onDelete();
            }}>
            <Trash2 size={18} color={colors.textPrimary} />
            <Text style={styles.mobileActionText}>Delete</Text>
          </Pressable>

          <Pressable
            style={[styles.mobileActionRow, styles.mobileClose]}
            onPress={onClose}>
            <X size={18} color={colors.red} />
            <Text style={[styles.mobileActionText, { color: colors.red }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </AppModal>
  );
}

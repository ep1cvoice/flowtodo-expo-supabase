import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { AlarmClock, Calendar, Pencil, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TodoItemStyles } from '@/components/tasks/item/todoItemStyles';
import AppModal from '@/components/ui/AppModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { AppColors } from '@/constants/theme';

interface MobileActionsSheetProps {
  visible: boolean;
  canStart: boolean;
  taskTitle: string;
  colors: AppColors;
  styles: TodoItemStyles;
  onClose: () => void;
  onStartPomodoro: () => void;
  onOpenCalendar: () => void;
  onEdit: () => void;
  onDelete: () => void | boolean | Promise<void | boolean>;
}

export default function MobileActionsSheet({
  visible,
  canStart,
  taskTitle,
  colors,
  styles,
  onClose,
  onStartPomodoro,
  onOpenCalendar,
  onEdit,
  onDelete,
}: MobileActionsSheetProps) {
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!visible) setConfirming(false);
  }, [visible]);

  return (
    <AppModal visible={visible} onClose={confirming ? () => setConfirming(false) : onClose}>
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
            onPress={() => setConfirming(true)}>
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
      <ConfirmModal
        embedded
        visible={confirming}
        title="Delete task?"
        message={`"${taskTitle}" will be permanently deleted.`}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          const deleted = await onDelete();
          if (deleted === false) return;
          setConfirming(false);
          onClose();
        }}
      />
    </AppModal>
  );
}

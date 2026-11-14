import { strings } from '@/shared/lib/strings';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { AlarmClock, Calendar, Pencil, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import AppModal from '@/shared/ui/AppModal';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import type { AppColors } from '@/shared/constants/theme';

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

  // Reset while rendering when the sheet closes (no extra render with stale state).
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) setConfirming(false);
  }

  return (
    <AppModal visible={visible} onClose={confirming ? () => setConfirming(false) : onClose}>
      <Pressable style={styles.mobileOverlay} onPress={onClose}>
        <Pressable
          style={[styles.mobileActionsModal, { paddingBottom: 8 + insets.bottom }]}
          onPress={(e) => e.stopPropagation()}
        >
          {canStart ? (
            <Pressable
              style={styles.mobileActionRow}
              onPress={() => {
                onClose();
                onStartPomodoro();
              }}
            >
              <AlarmClock size={18} color={colors.textPrimary} />
              <Text style={styles.mobileActionText}>{strings.tasks.actionPomodoro}</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.mobileActionRow}
            onPress={() => {
              onClose();
              onOpenCalendar();
            }}
          >
            <Calendar size={18} color={colors.textPrimary} />
            <Text style={styles.mobileActionText}>{strings.tasks.actionCalendar}</Text>
          </Pressable>

          <Pressable
            style={styles.mobileActionRow}
            onPress={() => {
              onClose();
              onEdit();
            }}
          >
            <Pencil size={18} color={colors.textPrimary} />
            <Text style={styles.mobileActionText}>{strings.common.edit}</Text>
          </Pressable>

          <Pressable style={styles.mobileActionRow} onPress={() => setConfirming(true)}>
            <Trash2 size={18} color={colors.textPrimary} />
            <Text style={styles.mobileActionText}>{strings.common.delete}</Text>
          </Pressable>

          <Pressable style={[styles.mobileActionRow, styles.mobileClose]} onPress={onClose}>
            <X size={18} color={colors.red} />
            <Text style={[styles.mobileActionText, { color: colors.red }]}>
              {strings.common.close}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
      <ConfirmModal
        embedded
        visible={confirming}
        title={strings.tasks.deleteConfirmTitle}
        message={strings.tasks.deleteConfirmMessage(taskTitle)}
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

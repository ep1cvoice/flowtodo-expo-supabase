import { Alert, Pressable, Text, View } from 'react-native';
import { Lock, Trash2 } from 'lucide-react-native';
import { confirmDestructive } from '@/components/settings/confirmDestructive';
import SettingsSection from '@/components/settings/SettingsSection';
import { useSettingsStyles } from '@/components/settings/settingsStyles';
import { useTasks } from '@/context/TasksContext';
import { useToast } from '@/context/ToastContext';
import { toastForError } from '@/lib/networkError';

interface DataSectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function DataSection({ open, onToggle }: DataSectionProps) {
  const { colors, styles } = useSettingsStyles();
  const { showToast } = useToast();
  const { activeTasks, completedCount, deleteAllActive, deleteAllCompleted } = useTasks();

  const confirmDeleteAllActive = () => {
    if (activeTasks.length === 0) {
      Alert.alert('Nothing to delete', 'There are no active tasks.');
      return;
    }
    confirmDestructive({
      title: 'Delete all active tasks?',
      message: `This will remove ${activeTasks.length} active task(s).`,
      onConfirm: async () => {
        try {
          await deleteAllActive();
          showToast('Active tasks deleted.');
        } catch (err) {
          showToast(toastForError(err, 'Could not delete tasks.'), 'error');
        }
      },
    });
  };

  const confirmDeleteAllCompleted = () => {
    if (completedCount === 0) {
      Alert.alert('Nothing to delete', 'There are no completed tasks.');
      return;
    }
    confirmDestructive({
      title: 'Delete all completed tasks?',
      message: `This will remove ${completedCount} completed task(s).`,
      onConfirm: async () => {
        try {
          await deleteAllCompleted();
          showToast('Completed tasks deleted.');
        } catch (err) {
          showToast(toastForError(err, 'Could not delete tasks.'), 'error');
        }
      },
    });
  };

  return (
    <SettingsSection title="Data" Icon={Trash2} open={open} onToggle={onToggle}>
      {open ? (
        <>
          <View style={styles.encryptionInfo}>
            <View style={styles.encryptionInfoHeader}>
              <Lock size={16} color={colors.primary} />
              <Text style={styles.encryptionInfoTitle}>End-to-end encrypted</Text>
            </View>
            <Text style={styles.encryptionInfoText}>
              Your task titles, descriptions, tags, and categories are encrypted on your
              device before being stored. Only you can read them — not even we can access
              the contents.
            </Text>
          </View>

          <Text style={styles.description}>Bulk delete data.</Text>
          <Pressable
            style={({ pressed, hovered }) => [
              styles.dangerBtn,
              (hovered || pressed) && styles.dangerBtnPressed,
            ]}
            onPress={confirmDeleteAllActive}>
            <Trash2 size={16} color={colors.red} />
            <Text style={styles.dangerBtnText}>
              Delete all active ({activeTasks.length})
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed, hovered }) => [
              styles.dangerBtn,
              (hovered || pressed) && styles.dangerBtnPressed,
            ]}
            onPress={confirmDeleteAllCompleted}>
            <Trash2 size={16} color={colors.red} />
            <Text style={styles.dangerBtnText}>
              Delete all completed ({completedCount})
            </Text>
          </Pressable>
        </>
      ) : null}
    </SettingsSection>
  );
}

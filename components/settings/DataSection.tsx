import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Fingerprint, Lock, Trash2 } from 'lucide-react-native';
import SettingsSection from '@/components/settings/SettingsSection';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useSettingsStyles } from '@/components/settings/settingsStyles';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TasksContext';
import { useToast } from '@/context/ToastContext';
import { toastForError } from '@/lib/networkError';
import { isDeviceUnlockAvailable } from '@/lib/auth/secureStorage';

interface DataSectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function DataSection({ open, onToggle }: DataSectionProps) {
  const { colors, styles } = useSettingsStyles();
  const { showToast } = useToast();
  const { activeTasks, completedCount, deleteAllActive, deleteAllCompleted } = useTasks();
  const { biometricUnlockAvailable, enableBiometricUnlock, disableBiometricUnlock } = useAuth();
  const [deviceSupportsUnlock, setDeviceSupportsUnlock] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [pendingBulk, setPendingBulk] = useState<'active' | 'completed' | null>(null);

  useEffect(() => {
    let isMounted = true;
    isDeviceUnlockAvailable().then((supported) => {
      if (isMounted) setDeviceSupportsUnlock(supported);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleBiometricToggle = async (next: boolean) => {
    if (biometricBusy) return;
    setBiometricBusy(true);
    try {
      if (next) {
        const { error } = await enableBiometricUnlock();
        if (error) {
          showToast(error, 'error');
        } else {
          showToast('Biometric unlock enabled.');
        }
      } else {
        await disableBiometricUnlock();
        showToast('Biometric unlock disabled.');
      }
    } catch (err) {
      showToast(toastForError(err, 'Could not update biometric unlock.'), 'error');
    } finally {
      setBiometricBusy(false);
    }
  };

  const confirmDeleteAllActive = () => {
    if (activeTasks.length === 0) {
      showToast('There are no active tasks.', 'error');
      return;
    }
    setPendingBulk('active');
  };

  const confirmDeleteAllCompleted = () => {
    if (completedCount === 0) {
      showToast('There are no completed tasks.', 'error');
      return;
    }
    setPendingBulk('completed');
  };

  const pendingCount = pendingBulk === 'active' ? activeTasks.length : completedCount;
  const pendingNoun = pendingCount === 1 ? 'task' : 'tasks';

  return (
    <>
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

          {deviceSupportsUnlock ? (
            <View style={styles.encryptionInfo}>
              <View style={styles.encryptionInfoHeader}>
                <Fingerprint size={16} color={colors.primary} />
                <Text style={styles.encryptionInfoTitle}>Biometric unlock</Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 8,
                }}>
                <Text style={[styles.encryptionInfoText, { flex: 1, marginRight: 12 }]}>
                  Use Face ID, fingerprint, or device PIN to unlock instead of your password.
                </Text>
                <Switch
                  value={biometricUnlockAvailable}
                  onValueChange={handleBiometricToggle}
                  disabled={biometricBusy}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
            </View>
          ) : null}

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
      <ConfirmModal
        visible={pendingBulk !== null}
        title={
          pendingBulk === 'completed' ? 'Delete all completed tasks?' : 'Delete all active tasks?'
        }
        message={
          pendingBulk === 'completed'
            ? `This will permanently delete ${completedCount} completed ${pendingNoun}.`
            : `This will permanently delete ${activeTasks.length} active ${pendingNoun}.`
        }
        onClose={() => setPendingBulk(null)}
        onConfirm={async () => {
          const kind = pendingBulk;
          try {
            if (kind === 'active') {
              await deleteAllActive();
              showToast('Active tasks deleted.');
            } else if (kind === 'completed') {
              await deleteAllCompleted();
              showToast('Completed tasks deleted.');
            }
          } catch (err) {
            showToast(toastForError(err, 'Could not delete tasks.'), 'error');
          } finally {
            setPendingBulk(null);
          }
        }}
      />
    </>
  );
}

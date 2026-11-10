import { strings } from '@/shared/lib/strings';
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Fingerprint, Lock, Trash2 } from 'lucide-react-native';
import SettingsSection from '@/features/settings/components/SettingsSection';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useSettingsStyles } from '@/features/settings/components/settingsStyles';
import { useEncryption } from '@/core/auth/EncryptionContext';
import { useTasks } from '@/features/tasks/TasksContext';
import { useToast } from '@/shared/providers/ToastContext';
import { toastForError } from '@/shared/lib/networkError';
import { isDeviceUnlockAvailable } from '@/core/auth/secureStorage';

interface DataSectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function DataSection({ open, onToggle }: DataSectionProps) {
  const { colors, styles } = useSettingsStyles();
  const { showToast } = useToast();
  const { activeTasks, completedCount, deleteAllActive, deleteAllCompleted } = useTasks();
  const { biometricUnlockAvailable, enableBiometricUnlock, disableBiometricUnlock } = useEncryption();
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
          showToast(strings.settings.data.biometricEnabled);
        }
      } else {
        await disableBiometricUnlock();
        showToast(strings.settings.data.biometricDisabled);
      }
    } catch (err) {
      showToast(toastForError(err, strings.settings.data.biometricFailed), 'error');
    } finally {
      setBiometricBusy(false);
    }
  };

  const confirmDeleteAllActive = () => {
    if (activeTasks.length === 0) {
      showToast(strings.settings.data.noActive, 'error');
      return;
    }
    setPendingBulk('active');
  };

  const confirmDeleteAllCompleted = () => {
    if (completedCount === 0) {
      showToast(strings.settings.data.noCompleted, 'error');
      return;
    }
    setPendingBulk('completed');
  };

  const pendingCount = pendingBulk === 'active' ? activeTasks.length : completedCount;
  const pendingNoun = strings.settings.data.taskNoun(pendingCount);

  return (
    <>
      <SettingsSection title={strings.settings.data.title} Icon={Trash2} open={open} onToggle={onToggle}>
      {open ? (
        <>
          <View style={styles.encryptionInfo}>
            <View style={styles.encryptionInfoHeader}>
              <Lock size={16} color={colors.primary} />
              <Text style={styles.encryptionInfoTitle}>{strings.settings.data.e2eTitle}</Text>
            </View>
            <Text style={styles.encryptionInfoText}>
              {strings.settings.data.e2eText}
            </Text>
          </View>

          {deviceSupportsUnlock ? (
            <View style={styles.encryptionInfo}>
              <View style={styles.encryptionInfoHeader}>
                <Fingerprint size={16} color={colors.primary} />
                <Text style={styles.encryptionInfoTitle}>{strings.settings.data.biometricTitle}</Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 8,
                }}>
                <Text style={[styles.encryptionInfoText, { flex: 1, marginRight: 12 }]}>
                  {strings.settings.data.biometricText}
                </Text>
                <Switch
                  value={biometricUnlockAvailable}
                  onValueChange={handleBiometricToggle}
                  disabled={biometricBusy}
                  trackColor={{ false: colors.borderColor, true: colors.primary }}
                />
              </View>
            </View>
          ) : null}

          <Text style={styles.description}>{strings.settings.data.bulkDelete}</Text>
          <Pressable
            style={({ pressed, hovered }) => [
              styles.dangerBtn,
              (hovered || pressed) && styles.dangerBtnPressed,
            ]}
            onPress={confirmDeleteAllActive}>
            <Trash2 size={16} color={colors.red} />
            <Text style={styles.dangerBtnText}>
              {strings.settings.data.deleteAllActive(activeTasks.length)}
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
              {strings.settings.data.deleteAllCompleted(completedCount)}
            </Text>
          </Pressable>
        </>
      ) : null}
      </SettingsSection>
      <ConfirmModal
        visible={pendingBulk !== null}
        title={
          pendingBulk === 'completed' ? strings.settings.data.deleteCompletedTitle : strings.settings.data.deleteActiveTitle
        }
        message={
          pendingBulk === 'completed'
            ? strings.settings.data.deleteCompletedMessage(completedCount, pendingNoun)
            : strings.settings.data.deleteActiveMessage(activeTasks.length, pendingNoun)
        }
        onClose={() => setPendingBulk(null)}
        onConfirm={async () => {
          const kind = pendingBulk;
          try {
            if (kind === 'active') {
              await deleteAllActive();
              showToast(strings.settings.data.activeDeleted);
            } else if (kind === 'completed') {
              await deleteAllCompleted();
              showToast(strings.settings.data.completedDeleted);
            }
          } catch (err) {
            showToast(toastForError(err, strings.settings.data.deleteFailed), 'error');
          } finally {
            setPendingBulk(null);
          }
        }}
      />
    </>
  );
}

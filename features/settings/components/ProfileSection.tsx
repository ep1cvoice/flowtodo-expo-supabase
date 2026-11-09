import { strings } from '@/shared/lib/strings';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { AlertTriangle, User } from 'lucide-react-native';
import ChangePasswordModal from '@/features/settings/components/ChangePasswordModal';
import SettingsSection from '@/features/settings/components/SettingsSection';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useSettingsStyles } from '@/features/settings/components/settingsStyles';
import { useAuth } from '@/core/auth/AuthContext';
import { useEncryption } from '@/core/auth/EncryptionContext';

interface ProfileSectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function ProfileSection({ open, onToggle }: ProfileSectionProps) {
  const { user, deleteAccount } = useAuth();
  const { updatePassword } = useEncryption();
  const { colors, styles } = useSettingsStyles();
  const router = useRouter();
  const [accountMsg, setAccountMsg] = useState('');
  const [accountErr, setAccountErr] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confirmDeleteAccount = async () => {
    setAccountMsg('');
    setAccountErr('');
    setDeletingAccount(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        setAccountErr(error);
        return;
      }
      router.replace('/(auth)/login' as Href);
    } catch (err) {
      setAccountErr(err instanceof Error ? err.message : strings.settings.profile.deleteFailed);
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <SettingsSection title={strings.settings.profile.title} Icon={User} open={open} onToggle={onToggle}>
        {open ? (
          <>
            <Text style={styles.label}>{strings.settings.profile.username}</Text>
            <Text style={styles.description}>{user?.username ?? '—'}</Text>
            <Text style={[styles.label, { marginTop: 12 }]}>{strings.settings.profile.email}</Text>
            <Text style={styles.description}>{user?.email ?? '—'}</Text>

            <Pressable
              style={({ pressed, hovered }) => [
                styles.secondaryBtn,
                (hovered || pressed) && styles.secondaryBtnPressed,
              ]}
              onPress={() => {
                setAccountMsg('');
                setAccountErr('');
                setShowPasswordModal(true);
              }}>
              <Text style={styles.secondaryBtnText}>{strings.settings.profile.changePassword}</Text>
            </Pressable>
            {!!accountMsg && <Text style={styles.successInfo}>{accountMsg}</Text>}
            {!!accountErr && <Text style={styles.errorInfo}>{accountErr}</Text>}

            <View style={styles.dangerZone}>
              <View style={styles.dangerHeader}>
                <AlertTriangle size={18} color={colors.red} />
                <Text style={styles.dangerTitle}>{strings.settings.profile.dangerZone}</Text>
              </View>
              <Text style={styles.description}>
                {strings.settings.profile.dangerDescription}
              </Text>
              <Pressable
                style={({ pressed, hovered }) => [
                  styles.dangerBtn,
                  (hovered || pressed) && styles.dangerBtnPressed,
                  deletingAccount && styles.primaryBtnDisabled,
                ]}
                disabled={deletingAccount}
                onPress={() => setShowDeleteConfirm(true)}>
                <Text style={styles.dangerBtnText}>
                  {deletingAccount ? strings.settings.profile.deleting : strings.settings.profile.deleteAccount}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </SettingsSection>
      <ConfirmModal
        visible={showDeleteConfirm}
        title={strings.settings.profile.deleteConfirmTitle}
        message={strings.settings.profile.deleteConfirmMessage}
        busy={deletingAccount}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteAccount}
      />
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={async (currentPassword, newPassword) => {
          const result = await updatePassword(user, currentPassword, newPassword);
          if (!result.error) {
            setAccountMsg('Password updated.');
            setAccountErr('');
          }
          return result;
        }}
      />
    </>
  );
}

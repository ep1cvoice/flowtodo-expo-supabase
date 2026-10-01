import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { AlertTriangle, User } from 'lucide-react-native';
import ChangePasswordModal from '@/components/settings/ChangePasswordModal';
import SettingsSection from '@/components/settings/SettingsSection';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useSettingsStyles } from '@/components/settings/settingsStyles';
import { useAuth } from '@/context/AuthContext';

interface ProfileSectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function ProfileSection({ open, onToggle }: ProfileSectionProps) {
  const { user, updatePassword, deleteAccount } = useAuth();
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
      setAccountErr(err instanceof Error ? err.message : 'Could not delete account.');
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <SettingsSection title="Profile" Icon={User} open={open} onToggle={onToggle}>
        {open ? (
          <>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.description}>{user?.username ?? '—'}</Text>
            <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
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
              <Text style={styles.secondaryBtnText}>Change password</Text>
            </Pressable>
            {!!accountMsg && <Text style={styles.successInfo}>{accountMsg}</Text>}
            {!!accountErr && <Text style={styles.errorInfo}>{accountErr}</Text>}

            <View style={styles.dangerZone}>
              <View style={styles.dangerHeader}>
                <AlertTriangle size={18} color={colors.red} />
                <Text style={styles.dangerTitle}>Danger zone</Text>
              </View>
              <Text style={styles.description}>
                Permanently delete your account and all associated data.
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
                  {deletingAccount ? 'Deleting…' : 'Delete account'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </SettingsSection>
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete account?"
        message="This permanently deletes your account, tasks, categories, and tags. This cannot be undone."
        busy={deletingAccount}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteAccount}
      />
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={async (currentPassword, newPassword) => {
          const result = await updatePassword(currentPassword, newPassword);
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

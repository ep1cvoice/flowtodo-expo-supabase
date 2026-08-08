import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Lock } from 'lucide-react-native';
import Field from '@/components/ui/Field';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { webInteractive } from '@/utils/pressableWeb';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
}

function validateNewPassword(password: string): string {
  if (!password) return 'New password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[a-z]/.test(password)) return 'Must contain lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Must contain uppercase letter';
  if (!/[0-9]/.test(password)) return 'Must contain a digit';
  if (!/[!@#$%^&*()_\-+=[\]{};:'",.<>/?`~|]/.test(password)) {
    return 'Must contain a special character';
  }
  return '';
}

export default function ChangePasswordModal({
  visible,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 480;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setFormError('');
    setSuccess('');
    setSaving(false);
  }, [visible]);

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (!currentPassword) nextErrors.currentPassword = 'Current password is required';

    const newErr = validateNewPassword(newPassword);
    if (newErr) nextErrors.newPassword = newErr;

    if (!confirmPassword) nextErrors.confirmPassword = 'Confirm your password';
    else if (newPassword !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';

    if (currentPassword && newPassword && currentPassword === newPassword) {
      nextErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(nextErrors);
    setFormError('');
    setSuccess('');
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const { error } = await onSubmit(currentPassword, newPassword);
    setSaving(false);

    if (error) {
      setFormError(error);
      return;
    }

    setSuccess('Password updated.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.overlay, isMobile && styles.overlayMobile]} onPress={onClose}>
          <Pressable
            style={[styles.modal, isMobile && styles.modalMobile]}
            onPress={(e) => e.stopPropagation()}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}>
              <Text style={styles.title}>Change password</Text>
              <Text style={styles.subtitle}>Enter your current password, then choose a new one.</Text>

              <Field
                label="Current password"
                type="password"
                Icon={Lock}
                innerText="Current password"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setErrors((prev) => ({ ...prev, currentPassword: '' }));
                }}
                error={errors.currentPassword}
              />
              <Field
                label="New password"
                type="password"
                Icon={Lock}
                innerText="New password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setErrors((prev) => ({ ...prev, newPassword: '' }));
                }}
                error={errors.newPassword}
              />
              <Field
                label="Confirm new password"
                type="password"
                Icon={Lock}
                innerText="Confirm new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                error={errors.confirmPassword}
              />

              {!!formError && <Text style={styles.errorInfo}>{formError}</Text>}
              {!!success && <Text style={styles.successInfo}>{success}</Text>}

              <View style={styles.actions}>
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.secondaryBtn,
                    (hovered || pressed) && styles.secondaryBtnPressed,
                  ]}
                  onPress={onClose}
                  disabled={saving}>
                  <Text style={styles.secondaryBtnText}>Close</Text>
                </Pressable>
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.primaryBtn,
                    (hovered || pressed) && styles.primaryBtnPressed,
                    saving && styles.btnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={saving}>
                  <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Update password'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
    },
    overlayMobile: {
      justifyContent: 'flex-end',
    },
    modal: {
      width: '100%',
      maxWidth: 440,
      maxHeight: '90%',
      backgroundColor: colors.bgSurface,
      borderRadius: tokens.borderRadius,
      borderWidth: 1,
      borderColor: colors.borderColor,
      padding: 20,
    },
    modalMobile: {
      maxWidth: '100%',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    scroll: {
      gap: 12,
      paddingBottom: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 4,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 8,
    },
    primaryBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    primaryBtnPressed: {
      backgroundColor: colors.primaryHover,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    secondaryBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgTodoItem,
      ...webInteractive,
    },
    secondaryBtnPressed: {
      backgroundColor: colors.bgCardHover,
    },
    secondaryBtnText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    errorInfo: {
      color: colors.red,
      fontSize: 13,
      fontWeight: '500',
    },
    successInfo: {
      color: colors.green,
      fontSize: 13,
      fontWeight: '500',
    },
  });
}

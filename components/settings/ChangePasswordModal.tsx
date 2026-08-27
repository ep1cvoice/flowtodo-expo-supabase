import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Lock } from 'lucide-react-native';
import Field from '@/components/ui/Field';
import SheetFrame from '@/components/ui/SheetFrame';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/theme';
import {
  confirmPasswordError,
  validatePassword,
} from '@/lib/auth/authValidation';
import { webInteractive } from '@/utils/pressableWeb';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
}

export default function ChangePasswordModal({
  visible,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
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

    const newErr = validatePassword(newPassword, 'New password is required');
    if (newErr) nextErrors.newPassword = newErr;

    const confirmErr = confirmPasswordError(newPassword, confirmPassword);
    if (confirmErr) nextErrors.confirmPassword = confirmErr;

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
    <SheetFrame
      visible={visible}
      onClose={onClose}
      header="none"
      keyboardAvoiding
      maxWidth={440}
      cardStyle={styles.card}
      mobileCardStyle={styles.cardMobile}>
      <ScrollView
        style={styles.scrollView}
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
    </SheetFrame>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      maxHeight: '100%',
      flexShrink: 1,
      backgroundColor: colors.bgSurface,
      padding: 20,
    },
    cardMobile: {
      maxWidth: '100%',
      marginBottom: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    scrollView: {
      flexShrink: 1,
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

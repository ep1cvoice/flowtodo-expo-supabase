import { strings } from '@/shared/lib/strings';
import { useMemo, useState } from 'react';
import { Text, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Lock, Unlock, Fingerprint } from 'lucide-react-native';
import { useAuth } from '@/core/auth/AuthContext';
import { useEncryption } from '@/core/auth/EncryptionContext';
import { createUnlockGateStyles } from '@/core/auth/unlockGateStyles';
import { useTheme } from '@/shared/providers/ThemeContext';
import { lightSplashGradient } from '@/shared/constants/theme';
import Heading from '@/shared/ui/Heading';
import Field from '@/shared/ui/Field';
import Button from '@/shared/ui/Button';
import AuthLayout, { LoggingInOverlay } from '@/shared/ui/AuthLayout';

// Password / biometric unlock form shown while the session is authenticated but has no DEK.
export function LockedScreen() {
  const { user, logout } = useAuth();
  const { unlock, unlockWithBiometrics, biometricUnlockAvailable } = useEncryption();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createUnlockGateStyles(colors), [colors]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleUnlock = async () => {
    if (!password || submitting) return false;
    setSubmitting(true);
    setError(null);
    const { error: unlockError } = await unlock(password, user);
    if (unlockError) {
      setError(unlockError);
    } else {
      setPassword('');
    }
    setSubmitting(false);
    return false;
  };

  const handleBiometricRetry = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: bioError } = await unlockWithBiometrics();
    if (bioError) setError(bioError);
    setSubmitting(false);
  };

  const handleLogout = async () => {
    if (submitting) return;
    setPassword('');
    setError(null);
    await logout();
  };

  return (
    <View
      style={[
        styles.gate,
        { backgroundColor: isDark ? colors.bgPageStart : lightSplashGradient[0] },
      ]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthLayout
        gap={48}
        overlay={submitting ? <LoggingInOverlay message={strings.auth.unlock.unlocking} /> : null}>
        <Heading
          title={strings.auth.unlock.title}
          icon={Unlock}
          text={strings.auth.unlock.subtitle}
        />
        <Field
          innerText={strings.auth.unlock.passwordPlaceholder}
          Icon={Lock}
          type="password"
          label={strings.common.password}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) setError(null);
          }}
          error={error ?? ''}
          autoFocus
          editable={!submitting}
          onSubmitEditing={handleUnlock}
        />
        <Button inner={strings.auth.unlock.submit} onPress={handleUnlock} />
        {biometricUnlockAvailable && (
          <Pressable
            onPress={handleBiometricRetry}
            disabled={submitting}
            style={({ pressed, hovered }) => [
              styles.biometricRetry,
              (hovered || pressed) && styles.logoutPressed,
              submitting && styles.logoutDisabled,
            ]}>
            <Fingerprint size={18} color={colors.sidebarLogoutText} />
            <Text style={styles.logoutText}>{strings.auth.unlock.tryBiometric}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleLogout}
          disabled={submitting}
          style={({ pressed, hovered }) => [
            styles.logout,
            (hovered || pressed) && styles.logoutPressed,
            submitting && styles.logoutDisabled,
          ]}>
          <Text style={styles.logoutText}>{strings.auth.logOut}</Text>
        </Pressable>
      </AuthLayout>
    </View>
  );
}

import { useMemo, useState } from 'react';
import {
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Unlock } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/theme';
import Heading from '@/components/ui/Heading';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import AuthLayout, { LoggingInOverlay } from '@/components/ui/AuthLayout';
import { webInteractive } from '@/utils/pressableWeb';

export function UnlockGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, dek, loading, unlock, logout, isAuthenticating } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.bgPageStart, colors.bgPageMid, colors.bgPageEnd]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.loading}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </LinearGradient>
    );
  }

  const needsUnlock = isAuthenticated && dek === null && !isAuthenticating;
  if (!needsUnlock) {
    return <>{children}</>;
  }

  const handleUnlock = async () => {
    if (!password || submitting) return false;
    setSubmitting(true);
    setError(null);
    const { error: unlockError } = await unlock(password);
    if (unlockError) {
      setError(unlockError);
    } else {
      setPassword('');
    }
    setSubmitting(false);
    return false;
  };

  const handleLogout = async () => {
    if (submitting) return;
    setPassword('');
    setError(null);
    await logout();
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthLayout
        gap={48}
        overlay={submitting ? <LoggingInOverlay message="Unlocking..." /> : null}>
        <Heading
          title="Unlock application" 
          icon={Unlock}
          text="Enter your password to decrypt your data"
        />
        <Field
          innerText="Enter your password"
          Icon={Lock}
          type="password"
          label="Password"
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
        <Button inner="Unlock" onPress={handleUnlock} />
        <Pressable
          onPress={handleLogout}
          disabled={submitting}
          style={({ pressed, hovered }) => [
            styles.logout,
            (hovered || pressed) && styles.logoutPressed,
            submitting && styles.logoutDisabled,
          ]}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </AuthLayout>
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logout: {
      alignSelf: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      ...webInteractive,
    },
    logoutPressed: {
      backgroundColor: colors.sidebarLogoutHover,
    },
    logoutDisabled: {
      opacity: 0.6,
    },
    logoutText: {
      color: colors.sidebarLogoutText,
      textAlign: 'center',
      fontSize: 15,
      fontWeight: '500',
    },
  });
}

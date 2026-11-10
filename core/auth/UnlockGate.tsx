import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/core/auth/AuthContext';
import { useEncryption } from '@/core/auth/EncryptionContext';
import { LockedScreen } from '@/core/auth/LockedScreen';
import { createUnlockGateStyles, type UnlockGateStyles } from '@/core/auth/unlockGateStyles';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { AppColors } from '@/shared/constants/theme';
import { lightSplashGlow, lightSplashGradient } from '@/shared/constants/theme';

export function UnlockGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, isAuthenticating } = useAuth();
  const { dek, unlockWithBiometrics, biometricUnlockAvailable } = useEncryption();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createUnlockGateStyles(colors), [colors]);
  // Distinguishes the automatic first-try biometric prompt (full-screen
  // splash, nothing to interact with yet) from a manual retry tap
  // (handled inside `submitting` like the password path).
  const [autoBiometricPending, setAutoBiometricPending] = useState(biometricUnlockAvailable);
  const attemptedRef = useRef(false);

  const isLocked = isAuthenticated && dek === null && !isAuthenticating;

  useEffect(() => {
    if (!isLocked || !biometricUnlockAvailable) {
      attemptedRef.current = false;
      return;
    }
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    setAutoBiometricPending(true);

    (async () => {
      const { error: bioError } = await unlockWithBiometrics();
      // On success `dek` becomes non-null and this component unmounts
      // itself (isLocked flips false) — nothing else to do here.
      if (bioError) {
        // Don't surface the biometric error as a form error on first
        // load — it's expected (Face ID cancelled, not yet enrolled,
        // etc.) and the user hasn't touched the password field.
        setAutoBiometricPending(false);
      }
    })();
  }, [isLocked, biometricUnlockAvailable, unlockWithBiometrics]);

  if (loading) {
    return <GateSplash colors={colors} isDark={isDark} styles={styles} />;
  }

  // Locked session: show the gate. During sign-in `isAuthenticating` stays true
  // so the login screen is not replaced by this form (password was just entered).
  // Unlock does not set that flag, so the app never appears without a DEK.
  if (isLocked) {
    if (autoBiometricPending) {
      return <GateSplash colors={colors} isDark={isDark} styles={styles} />;
    }
    return <LockedScreen />;
  }

  return <>{children}</>;
}

function GateSplash({
  colors,
  isDark,
  styles,
}: {
  colors: AppColors;
  isDark: boolean;
  styles: UnlockGateStyles;
}) {
  const pageColors = isDark
    ? ([colors.bgPageStart, colors.bgPageMid, colors.bgPageEnd] as const)
    : lightSplashGradient;

  return (
    <LinearGradient
      colors={[...pageColors]}
      locations={[0, 0.45, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.loading}>
      {isDark ? null : (
        <LinearGradient
          colors={[...lightSplashGlow]}
          start={{ x: 0.5, y: 0.35 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ActivityIndicator size="large" color={colors.primary} />
    </LinearGradient>
  );
}


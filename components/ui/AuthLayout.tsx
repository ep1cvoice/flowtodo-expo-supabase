import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useKeyboardHeight } from '@/lib/useKeyboardBottomInset';

interface AuthLayoutProps {
  children: React.ReactNode;
  gap?: number;
  overlay?: React.ReactNode;
}

export default function AuthLayout({ children, gap = 48, overlay }: AuthLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= tokens.desktopBreakpoint;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const keyboardInset = useKeyboardHeight();
  const keyboardOpen = keyboardInset > 0;

  return (
    <LinearGradient
      colors={[colors.bgPageStart, colors.bgPageMid, colors.bgPageEnd]}
      locations={[0, 0.45, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.authLayout}>
        {overlay}
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              keyboardOpen && styles.scrollContentKeyboard,
              keyboardOpen && { paddingBottom: keyboardInset + 16 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View
              style={[
                styles.card,
                { gap },
                isDesktop ? styles.cardDesktop : styles.cardMobile,
              ]}>
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function LoggingInOverlay() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.loggingInOverlay}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loggingInText}>Logging in...</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    gradient: {
      flex: 1,
    },
    authLayout: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
      width: '100%',
    },
    scroll: {
      flex: 1,
      width: '100%',
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
    },
    scrollContentKeyboard: {
      flexGrow: 0,
      justifyContent: 'flex-start',
    },
    card: {
      flexDirection: 'column',
      justifyContent: 'center',
      width: '100%',
      alignItems: 'center',
    },
    cardMobile: {
      width: '100%',
      paddingHorizontal: 20,
      paddingVertical: 32,
      backgroundColor: 'transparent',
      borderWidth: 0,
      alignItems: 'stretch',
    },
    cardDesktop: {
      width: '100%',
      maxWidth: tokens.authCardMaxWidth,
      marginVertical: 24,
      padding: 32,
      backgroundColor: colors.bgTodoItem,
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: tokens.borderRadius,
      alignItems: 'stretch',
      ...tokens.shadow,
    },
    loggingInOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1000,
      backgroundColor: colors.overlayBg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    },
    loggingInText: {
      margin: 0,
      fontSize: 25,
      fontWeight: '500',
      lineHeight: 40,
      color: colors.textSecondary,
    },
  });
}

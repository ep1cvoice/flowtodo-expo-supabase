import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, X } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/theme';

export default function ToastHost() {
  const { toast, hideToast } = useToast();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (!toast) {
      opacity.setValue(0);
      translateY.setValue(-16);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(-16);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [toast?.id, opacity, translateY]);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;
  const accent = isError ? colors.red : colors.green;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: Math.max(insets.top, 8) + 8,
          opacity,
          transform: [{ translateY }],
        },
      ]}>
      <Pressable
        onPress={hideToast}
        style={[styles.toast, { borderColor: accent }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite">
        <Icon size={18} color={accent} strokeWidth={2.2} />
        <Text style={styles.message} numberOfLines={3}>
          {toast.message}
        </Text>
        <X size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 10000,
      elevation: 10000,
      alignItems: 'center',
    },
    toast: {
      maxWidth: 520,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: colors.bgSurface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    message: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
  });
}

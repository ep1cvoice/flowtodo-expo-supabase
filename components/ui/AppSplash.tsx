import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { LinearGradient } from 'expo-linear-gradient';
import { Waves } from 'lucide-react-native';
import { brand } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

/** Once per session. */
let splashShownThisSession = false;

const HOLD_MS = 1500;
const FADE_MS = 500;

export default function AppSplash() {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(() => !splashShownThisSession);
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(14)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(0.85)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const gradientColors = useMemo(
    () =>
      isDark
        ? ([colors.bgPageStart, colors.bgPageMid, '#0f766e'] as const)
        : (['#eef6f3', '#b8ddd4', '#5eead4'] as const),
    [isDark, colors.bgPageStart, colors.bgPageMid]
  );

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(glowOpacity, {
        toValue: isDark ? 0.35 : 0.55,
        duration: 700,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(glowScale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    const fadeTimer = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.ease),
      }).start();
    }, HOLD_MS);

    const hideTimer = setTimeout(() => {
      splashShownThisSession = true;
      setVisible(false);
    }, HOLD_MS + FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [
    visible,
    isDark,
    logoOpacity,
    logoScale,
    titleOpacity,
    titleTranslateY,
    overlayOpacity,
    glowOpacity,
    glowScale,
  ]);

  if (!visible) return null;

  const overlay = (
    <Animated.View
      collapsable={false}
      style={[
        styles.overlay,
        {
          width,
          height,
          opacity: overlayOpacity,
          pointerEvents: 'none',
        },
      ]}>
      <LinearGradient
        colors={[...gradientColors]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(45, 212, 191, 0.22)', 'transparent']
            : ['rgba(13, 148, 136, 0.18)', 'transparent']
        }
        start={{ x: 0.5, y: 0.35 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.logoStage}>
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: isDark ? 'rgba(45, 212, 191, 0.35)' : 'rgba(13, 148, 136, 0.28)',
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}>
            <Waves size={72} strokeWidth={2} color={colors.primary} />
          </Animated.View>
        </View>
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          }}>
          <Text style={[styles.title, { color: colors.primary }]}>{brand.name}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );

  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{overlay}</FullWindowOverlay>;
  }

  return overlay;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  logoStage: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

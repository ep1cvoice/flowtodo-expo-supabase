import { useMemo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

interface ButtonProps {
  inner: React.ReactNode;
  to?: string;
  onPress?: () => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
}

export default function Button({ inner, to, onPress, disabled }: ButtonProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePress = async () => {
    if (disabled) return;
    let shouldNavigate = true;

    if (onPress) {
      const result = await onPress();
      if (result === false) shouldNavigate = false;
    }

    if (to && shouldNavigate) {
      router.push(to as Href);
    }
  };

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed, hovered }) => [
        styles.button,
        hovered && !disabled && styles.buttonHovered,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={handlePress}>
      {typeof inner === 'string' ? (
        <Text style={styles.buttonText}>{inner}</Text>
      ) : (
        inner
      )}
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      height: tokens.buttonHeight,
      paddingVertical: 12,
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: tokens.borderRadius,
      gap: 8,
      ...webInteractive,
    },
    buttonHovered: {
      backgroundColor: colors.primaryHover,
    },
    buttonPressed: {
      backgroundColor: colors.primaryHover,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}

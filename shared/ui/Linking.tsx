import { useMemo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type { AppColors } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';
import { webInteractive } from '@/shared/lib/pressableWeb';

interface LinkingProps {
  to: Href;
  innerText: string;
}

export default function Linking({ to, innerText }: LinkingProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(to)}
      style={({ hovered }) => [styles.link, hovered && styles.linkHovered]}>
      <Text style={styles.linkText}>{innerText}</Text>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    link: {
      alignSelf: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      ...webInteractive,
    },
    linkHovered: {
      backgroundColor: colors.todoHighlight,
    },
    linkText: {
      color: colors.primary,
      textAlign: 'center',
      fontSize: 15,
    },
  });
}

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Search } from 'lucide-react-native';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface EmptyStateProps {
  title: string;
  text: string;
  /** `ring` matches Active (large icon + halo). `plain` matches Completed. */
  variant?: 'ring' | 'plain';
}

export default function EmptyState({ title, text, variant = 'ring' }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (variant === 'plain') {
    return (
      <View style={styles.plain}>
        <View style={styles.plainIcon}>
          <Search size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.ringState}>
      <View style={styles.ringContainer}>
        <View style={styles.ringIconWrap}>
          <Search size={68} color={colors.primary} />
        </View>
        <Text style={styles.ringTitle}>{title}</Text>
        <Text style={styles.ringText}>{text}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    ringState: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    ringContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 12,
    },
    ringIconWrap: {
      padding: 20,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
      borderWidth: 12,
      borderColor: colors.todoHighlight,
    },
    ringTitle: {
      margin: 0,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    ringText: {
      margin: 0,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    plain: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 40,
    },
    plainIcon: {
      padding: 16,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    text: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.textMuted,
    },
  });
}

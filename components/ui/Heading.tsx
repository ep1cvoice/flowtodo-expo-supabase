import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Waves, type LucideIcon } from 'lucide-react-native';
import type { AppColors } from '@/constants/theme';
import { brand } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface HeadingProps {
  title: string;
  text: string;
  icon?: LucideIcon;
}

export default function Heading({ title, text, icon: Icon }: HeadingProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.heading}>
      <View style={styles.brandRow}>
        <Waves size={40} strokeWidth={2.2} color={colors.primary} />
        <Text style={styles.brandName}>{brand.name}</Text>
      </View>

      <View style={styles.titleRow}>
        {Icon ? <Icon size={22} strokeWidth={2.2} color={colors.textPrimary} /> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.headingText}>{text}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    heading: {
      width: '100%',
      alignItems: 'center',
    },
    brandRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    brandName: {
      fontWeight: '700',
      fontSize: 32,
      letterSpacing: 0.3,
      color: colors.primary,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 4,
      paddingBottom: 6,
    },
    title: {
      margin: 0,
      fontWeight: '700',
      fontSize: 22,
      lineHeight: 35.2,
      textAlign: 'center',
      color: colors.textPrimary,
    },
    headingText: {
      fontWeight: '400',
      fontSize: 15,
      lineHeight: 24,
      textAlign: 'center',
      color: colors.textSecondary,
    },
  });
}

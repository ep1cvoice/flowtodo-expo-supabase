import { View, Text, StyleSheet } from 'react-native';
import { Waves } from 'lucide-react-native';
import { brand } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';

type BrandLogoProps = {
  size?: 'sm' | 'md';
};

export default function BrandLogo({ size = 'sm' }: BrandLogoProps) {
  const { colors } = useTheme();
  const iconSize = size === 'md' ? 28 : 22;
  const fontSize = size === 'md' ? 22 : 18;

  return (
    <View style={styles.row}>
      <Waves size={iconSize} strokeWidth={2.2} color={colors.primary} />
      <Text style={[styles.name, { color: colors.primary, fontSize }]}>{brand.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  name: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

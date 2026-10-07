import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function ScreenBackground({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.fill,
        { backgroundColor: isDark ? colors.bgContent : '#ffffff' },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

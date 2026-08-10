import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useNetwork } from '@/context/NetworkContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/theme';

const HEADER_CONTENT_HEIGHT = 56;

export default function OfflineBanner() {
  const { isOnline } = useNetwork();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (isOnline) return null;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          height: insets.top + HEADER_CONTENT_HEIGHT,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={styles.bar}>
        <WifiOff size={16} color="#fff" strokeWidth={2.2} />
        <Text style={styles.text}>No internet connection</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9000,
      elevation: 9000,
      backgroundColor: colors.red,
    },
    bar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
    },
    text: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

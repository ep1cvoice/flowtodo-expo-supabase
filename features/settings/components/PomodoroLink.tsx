import { strings } from '@/shared/lib/strings';
import { Pressable, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ChevronRight, Timer } from 'lucide-react-native';
import { useSettingsStyles } from '@/features/settings/components/settingsStyles';

// Settings row that opens the dedicated Pomodoro screen (hidden from the tab bar).
export default function PomodoroLink() {
  const { colors, styles } = useSettingsStyles();
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={strings.nav.pomodoro}
        style={({ hovered, pressed }) => [
          styles.sectionHeader,
          hovered && styles.sectionHeaderHovered,
          pressed && styles.controlPressed,
        ]}
        onPress={() => router.push('/(main)/(tabs)/pomodoro' as Href)}>
        <View style={styles.sectionHeaderStart}>
          <Timer size={22} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>{strings.nav.pomodoro}</Text>
        </View>
        <ChevronRight size={22} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

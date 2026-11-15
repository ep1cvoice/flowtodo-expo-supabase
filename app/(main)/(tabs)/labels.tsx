import { ScrollView, View } from 'react-native';
import LabelsSection from '@/features/settings/components/LabelsSection';
import { useSettingsStyles } from '@/features/settings/components/settingsStyles';
import ScreenBackground from '@/shared/ui/ScreenBackground';
import { useKeyboardBottomInset } from '@/shared/lib/useKeyboardBottomInset';

export default function LabelsTab() {
  const { styles } = useSettingsStyles();
  const keyboardInset = useKeyboardBottomInset();

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + keyboardInset }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <LabelsSection />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

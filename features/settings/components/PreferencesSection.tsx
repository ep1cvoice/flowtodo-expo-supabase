import { strings } from '@/shared/lib/strings';
import { Pressable, Text, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import SettingsSection from '@/features/settings/components/SettingsSection';
import { useSettingsStyles } from '@/features/settings/components/settingsStyles';
import type { ThemeMode } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';
import { useToast } from '@/shared/providers/ToastContext';
import { toastForError } from '@/shared/lib/networkError';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: strings.settings.preferences.themeAuto },
  { value: 'light', label: strings.settings.preferences.themeLight },
  { value: 'dark', label: strings.settings.preferences.themeDark },
];

interface PreferencesSectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function PreferencesSection({ open, onToggle }: PreferencesSectionProps) {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const { styles } = useSettingsStyles();

  const handleThemeChange = async (next: ThemeMode) => {
    if (next === theme) return;
    const { error } = await setTheme(next);
    if (error) {
      showToast(toastForError(error, error), 'error');
      return;
    }
    showToast(strings.settings.preferences.themeSaved);
  };

  return (
    <SettingsSection title={strings.settings.preferences.title} Icon={SlidersHorizontal} open={open} onToggle={onToggle}>
      {open ? (
        <>
          <Text style={styles.label}>{strings.settings.preferences.theme}</Text>
          <Text style={styles.description}>{strings.settings.preferences.themeHint}</Text>
          <View style={styles.segment}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleThemeChange(opt.value)}
                  style={({ hovered, pressed }) => [
                    styles.segmentBtn,
                    active && styles.segmentBtnActive,
                    !active && hovered && styles.segmentBtnHovered,
                    active && hovered && styles.segmentBtnActiveHovered,
                    pressed && styles.controlPressed,
                  ]}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </SettingsSection>
  );
}

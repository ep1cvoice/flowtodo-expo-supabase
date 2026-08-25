import { Pressable, Text, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import SettingsSection from '@/components/settings/SettingsSection';
import { useSettingsStyles } from '@/components/settings/settingsStyles';
import type { ThemeMode } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { toastForError } from '@/lib/networkError';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
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
    showToast('Theme saved.');
  };

  return (
    <SettingsSection title="Preferences" Icon={SlidersHorizontal} open={open} onToggle={onToggle}>
      {open ? (
        <>
          <Text style={styles.label}>Theme</Text>
          <Text style={styles.description}>Auto / Light / Dark</Text>
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

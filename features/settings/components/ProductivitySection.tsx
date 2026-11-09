import { strings } from '@/shared/lib/strings';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Zap } from 'lucide-react-native';
import SettingsSection from '@/features/settings/components/SettingsSection';
import { useSettingsStyles } from '@/features/settings/components/settingsStyles';
import PomodoroHistory from '@/features/pomodoro/components/PomodoroHistory';
import { useAuth } from '@/core/auth/AuthContext';
import { useToast } from '@/shared/providers/ToastContext';
import { toastForError } from '@/shared/lib/networkError';

interface ProductivitySectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function ProductivitySection({ open, onToggle }: ProductivitySectionProps) {
  const { user, updateProfile } = useAuth();
  const { colors, styles } = useSettingsStyles();
  const { showToast } = useToast();
  const [pomodoroTime, setPomodoroTime] = useState<string>(
    String(user?.settings?.pomodoroTime ?? 25)
  );
  const [pomodoroErr, setPomodoroErr] = useState('');
  const [pomodoroSaving, setPomodoroSaving] = useState(false);

  const handlePomodoroSave = async () => {
    setPomodoroErr('');
    const value = Number(pomodoroTime);
    if (!Number.isFinite(value) || value < 1 || value > 60) {
      setPomodoroErr(strings.settings.productivity.timeRange);
      return;
    }

    setPomodoroSaving(true);
    const { error } = await updateProfile({ pomodoroTime: value });
    setPomodoroSaving(false);

    if (error) {
      showToast(toastForError(error, error), 'error');
      return;
    }
    showToast(strings.settings.productivity.timeSaved);
  };

  return (
    <SettingsSection title={strings.settings.productivity.title} Icon={Zap} open={open} onToggle={onToggle}>
      {open ? (
        <>
          <Text style={styles.label}>{strings.settings.productivity.pomodoro}</Text>
          <Text style={styles.description}>{strings.settings.productivity.pomodoroHint}</Text>
          <View style={styles.pomodoroRow}>
            <TextInput
              value={pomodoroTime}
              onChangeText={(val) => {
                if (val === '') return setPomodoroTime('');
                if (/^\d{1,2}$/.test(val)) setPomodoroTime(val);
              }}
              keyboardType="number-pad"
              style={styles.pomodoroInput}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.description}>{strings.settings.productivity.minutes}</Text>
            <Pressable
              style={({ pressed, hovered }) => [
                styles.primaryBtn,
                (hovered || pressed) && styles.primaryBtnPressed,
                pomodoroSaving && styles.primaryBtnDisabled,
              ]}
              disabled={pomodoroSaving}
              onPress={handlePomodoroSave}>
              <Text style={styles.primaryBtnText}>
                {pomodoroSaving ? strings.common.saving : strings.settings.productivity.setTime}
              </Text>
            </Pressable>
          </View>
          {!!pomodoroErr && <Text style={styles.errorInfo}>{pomodoroErr}</Text>}

          <View style={styles.historyBlock}>
            <Text style={styles.label}>{strings.settings.productivity.recentSessions}</Text>
            <Text style={styles.description}>{strings.settings.productivity.recentSessionsHint}</Text>
            <PomodoroHistory />
          </View>
        </>
      ) : null}
    </SettingsSection>
  );
}

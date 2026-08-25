import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Zap } from 'lucide-react-native';
import SettingsSection from '@/components/settings/SettingsSection';
import { useSettingsStyles } from '@/components/settings/settingsStyles';
import PomodoroHistory from '@/components/tasks/PomodoroHistory';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { toastForError } from '@/lib/networkError';

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
      setPomodoroErr('Time must be between 1 and 60 minutes');
      return;
    }

    setPomodoroSaving(true);
    const { error } = await updateProfile({ pomodoroTime: value });
    setPomodoroSaving(false);

    if (error) {
      showToast(toastForError(error, error), 'error');
      return;
    }
    showToast('Pomodoro time saved.');
  };

  return (
    <SettingsSection title="Productivity" Icon={Zap} open={open} onToggle={onToggle}>
      {open ? (
        <>
          <Text style={styles.label}>Pomodoro</Text>
          <Text style={styles.description}>Focus duration for new sessions</Text>
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
            <Text style={styles.description}>min</Text>
            <Pressable
              style={({ pressed, hovered }) => [
                styles.primaryBtn,
                (hovered || pressed) && styles.primaryBtnPressed,
                pomodoroSaving && styles.primaryBtnDisabled,
              ]}
              disabled={pomodoroSaving}
              onPress={handlePomodoroSave}>
              <Text style={styles.primaryBtnText}>
                {pomodoroSaving ? 'Saving…' : 'Set Time'}
              </Text>
            </Pressable>
          </View>
          {!!pomodoroErr && <Text style={styles.errorInfo}>{pomodoroErr}</Text>}

          <View style={styles.historyBlock}>
            <Text style={styles.label}>Recent sessions</Text>
            <Text style={styles.description}>Last 5 Pomodoros (synced to your account)</Text>
            <PomodoroHistory />
          </View>
        </>
      ) : null}
    </SettingsSection>
  );
}

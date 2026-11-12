import { strings } from '@/shared/lib/strings';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import ActiveSessionCard from '@/features/pomodoro/components/ActiveSessionCard';
import PomodoroStats from '@/features/pomodoro/components/PomodoroStats';
import PomodoroHistory from '@/features/pomodoro/components/PomodoroHistory';
import { usePomodoroScreenStyles } from '@/features/pomodoro/components/pomodoroScreenStyles';
import type { PomodoroMode } from '@/features/pomodoro/lib/displayTime';
import ScreenBackground from '@/shared/ui/ScreenBackground';
import { useAuth } from '@/core/auth/AuthContext';
import { useToast } from '@/shared/providers/ToastContext';
import { toastForError } from '@/shared/lib/networkError';

const MODES = [
  {
    value: 'countdown',
    title: strings.pomodoro.modeCountdown,
    hint: strings.pomodoro.modeCountdownHint,
  },
  { value: 'countup', title: strings.pomodoro.modeCountup, hint: strings.pomodoro.modeCountupHint },
] as const;

export default function PomodoroScreen() {
  const { user, updateProfile } = useAuth();
  const { colors, styles } = usePomodoroScreenStyles();
  const { showToast } = useToast();
  const router = useRouter();
  const [pomodoroTime, setPomodoroTime] = useState<string>(
    String(user?.settings?.pomodoroTime ?? 25)
  );
  const mode = user?.settings?.pomodoroMode ?? 'countdown';
  const [modeSaving, setModeSaving] = useState(false);
  const [pomodoroErr, setPomodoroErr] = useState('');
  const [pomodoroSaving, setPomodoroSaving] = useState(false);

  const handlePomodoroSave = async () => {
    setPomodoroErr('');
    const value = Number(pomodoroTime);
    if (!Number.isFinite(value) || value < 1 || value > 60) {
      setPomodoroErr(strings.pomodoro.timeRange);
      return;
    }

    setPomodoroSaving(true);
    const { error } = await updateProfile({ pomodoroTime: value });
    setPomodoroSaving(false);

    if (error) {
      showToast(toastForError(error, error), 'error');
      return;
    }
    showToast(strings.pomodoro.timeSaved);
  };

  const handleModeChange = async (next: PomodoroMode) => {
    if (next === mode || modeSaving) return;
    setModeSaving(true);
    const { error } = await updateProfile({ pomodoroMode: next });
    setModeSaving(false);
    if (error) {
      showToast(toastForError(error, error), 'error');
      return;
    }
    showToast(strings.pomodoro.modeSaved);
  };

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <View style={styles.breadcrumb} accessibilityRole="header">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={strings.nav.settings}
              hitSlop={8}
              style={({ pressed, hovered }) => [
                styles.breadcrumbLink,
                (hovered || pressed) && styles.breadcrumbLinkPressed,
              ]}
              onPress={() => router.navigate('/(main)/(tabs)/settings' as Href)}>
              <Text style={styles.breadcrumbLinkText}>{strings.nav.settings}</Text>
            </Pressable>
            <ChevronRight size={16} color={colors.textMuted} />
            <Text style={styles.breadcrumbCurrent}>{strings.nav.pomodoro}</Text>
          </View>

          <ActiveSessionCard />

          <View style={styles.card}>
            <Text style={styles.label}>{strings.pomodoro.timerSettings}</Text>

            <Text style={styles.sectionLabel}>{strings.pomodoro.timerMode}</Text>
            <View accessibilityRole="radiogroup" style={styles.modeGroup}>
              {MODES.map(({ value, title, hint }) => {
                const selected = mode === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={title}
                    disabled={modeSaving}
                    onPress={() => void handleModeChange(value)}
                    style={({ pressed, hovered }) => [
                      styles.modeOption,
                      selected && styles.modeOptionSelected,
                      !selected && (hovered || pressed) && styles.modeOptionHover,
                    ]}>
                    <Text style={[styles.modeTitle, selected && styles.modeTitleSelected]}>
                      {title}
                    </Text>
                    <Text style={styles.description}>{hint}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>{strings.pomodoro.sessionLength}</Text>
            <Text style={styles.description}>
              {mode === 'countup'
                ? strings.pomodoro.sessionLengthHintCountup
                : strings.pomodoro.sessionLengthHintCountdown}
            </Text>
            <View style={styles.durationRow}>
              <TextInput
                value={pomodoroTime}
                onChangeText={(val) => {
                  if (val === '') return setPomodoroTime('');
                  if (/^\d{1,2}$/.test(val)) setPomodoroTime(val);
                }}
                keyboardType="number-pad"
                style={styles.durationInput}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.description}>{strings.pomodoro.minutes}</Text>
              <Pressable
                style={({ pressed, hovered }) => [
                  styles.primaryBtn,
                  (hovered || pressed) && styles.primaryBtnPressed,
                  pomodoroSaving && styles.primaryBtnDisabled,
                ]}
                disabled={pomodoroSaving}
                onPress={handlePomodoroSave}>
                <Text style={styles.primaryBtnText}>
                  {pomodoroSaving ? strings.common.saving : strings.pomodoro.setTime}
                </Text>
              </Pressable>
            </View>
            {!!pomodoroErr && <Text style={styles.errorInfo}>{pomodoroErr}</Text>}
          </View>

          <PomodoroStats />

          <View style={styles.card}>
            <Text style={styles.label}>{strings.pomodoro.recentSessions}</Text>
            <Text style={styles.description}>{strings.pomodoro.recentSessionsHint}</Text>
            <PomodoroHistory />
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

import { Linking, Pressable, Text, View } from 'react-native';
import { usePomodoroScreenStyles } from '@/features/pomodoro/components/pomodoroScreenStyles';
import { useNotificationPermission } from '@/features/pomodoro/lib/useNotificationPermission';
import { isWeb } from '@/shared/lib/platform';
import { strings } from '@/shared/lib/strings';

// Shows whether the "session finished" notification can be delivered and lets the user turn
// it on. Without this a blocked permission fails silently: the browser shows no prompt at all.
export default function PomodoroNotificationSettings() {
  const { styles } = usePomodoroScreenStyles();
  const { state, promptSuppressed, request } = useNotificationPermission();

  if (state === null) return null;

  const blocked = isWeb
    ? strings.pomodoro.notificationsBlockedWeb
    : strings.pomodoro.notificationsBlockedNative;
  const text =
    state === 'granted'
      ? strings.pomodoro.notificationsOn
      : state === 'denied'
        ? blocked
        : state === 'unsupported'
          ? strings.pomodoro.notificationsUnsupported
          : promptSuppressed
            ? strings.pomodoro.notificationsNoPrompt
            : strings.pomodoro.notificationsAsk;

  const action =
    state === 'default'
      ? { label: strings.pomodoro.notificationsEnable, onPress: () => void request() }
      : state === 'denied' && !isWeb
        ? {
            label: strings.pomodoro.notificationsOpenSettings,
            onPress: () => void Linking.openSettings(),
          }
        : null;

  return (
    <>
      <View style={styles.divider} />
      <Text style={styles.sectionLabel}>{strings.pomodoro.notifications}</Text>
      <Text style={styles.description}>{text}</Text>
      {action ? (
        <View style={styles.durationRow}>
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ pressed, hovered }) => [
              styles.primaryBtn,
              (hovered || pressed) && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>{action.label}</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

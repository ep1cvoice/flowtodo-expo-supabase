import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react-native';
import type { PomoRecord } from '@/types';
import type { AppColors } from '@/constants/theme';
import { usePomodoro } from '@/context/PomodoroContext';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function isCompleted(record: PomoRecord) {
  return record.elapsed >= record.duration * 1000;
}

/** Inline recent-sessions list for Settings → Productivity */
export default function PomodoroHistory() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { history, deleteHistoryRecord } = usePomodoro();

  if (history.length === 0) {
    return <Text style={styles.empty}>No sessions yet. Finish a Pomodoro to see it here.</Text>;
  }

  return (
    <View style={styles.list}>
      {history.map((record) => {
        const done = isCompleted(record);
        return (
          <View key={record.id} style={styles.row}>
            <View style={styles.rowMain}>
              <View style={styles.rowTop}>
                {done ? (
                  <CheckCircle size={14} color={colors.green} />
                ) : (
                  <XCircle size={14} color={colors.red} />
                )}
                <Text style={styles.taskName} numberOfLines={1}>
                  {record.taskName}
                </Text>
              </View>
              <Text style={styles.meta}>
                {formatDate(record.endedAt)} · {formatTime(record.endedAt)} ·{' '}
                {formatDuration(Math.floor(record.elapsed / 1000))}
                {done ? ' · Done' : ' · Stopped'}
              </Text>
            </View>
            <Pressable
              onPress={() => void deleteHistoryRecord(record.id)}
              hitSlop={8}
              style={({ pressed, hovered }) => [
                styles.deleteBtn,
                (hovered || pressed) && styles.deleteBtnPressed,
              ]}
              accessibilityLabel="Delete session">
              <Trash2 size={14} color={colors.red} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    list: {
      gap: 8,
    },
    empty: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
    },
    rowMain: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    taskName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    meta: {
      fontSize: 12,
      color: colors.textMuted,
    },
    deleteBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    deleteBtnPressed: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
  });
}

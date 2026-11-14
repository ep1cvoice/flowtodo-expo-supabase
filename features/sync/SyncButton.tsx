import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CloudCheck, CloudOff, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/core/auth/AuthContext';
import { createSyncStyles } from '@/features/sync/syncStyles';
import { useSyncStatus } from '@/features/sync/useSyncStatus';
import { taskStore } from '@/features/tasks/lib/store';
import { strings } from '@/shared/lib/strings';
import { useNetwork } from '@/shared/providers/NetworkContext';
import { useTheme } from '@/shared/providers/ThemeContext';
import SheetFrame from '@/shared/ui/SheetFrame';

/**
 * Header button for the local-first (native) build; the sync details open in a sheet.
 * Renders nothing on web, where data is not replicated locally.
 */
export default function SyncButton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createSyncStyles(colors), [colors]);
  const { user } = useAuth();
  const status = useSyncStatus();
  const { isOnline } = useNetwork();
  const [open, setOpen] = useState(false);

  if (!taskStore.localFirst || !user) return null;

  const s = strings.sync;
  // Offline is a normal state for a local-first app, not an error: show it calmly here
  // instead of a full-width banner.
  const offline = !isOnline;
  const failed = !offline && status.error != null;
  const syncing = status.syncing && !offline;
  const label = offline
    ? s.offline(status.pending)
    : syncing
      ? s.syncing
      : failed
        ? s.failed(status.pending)
        : status.pending > 0
          ? s.pending(status.pending)
          : s.upToDate;
  const Icon = offline || failed ? CloudOff : syncing ? RefreshCw : CloudCheck;
  const iconColor = failed ? colors.red : offline ? colors.textMuted : colors.primary;
  const showDot = offline || failed || status.pending > 0 || syncing;
  const dotColor = failed ? colors.red : offline ? colors.textMuted : colors.primary;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed, hovered }) => [
          styles.toggleBtn,
          (hovered || pressed) && styles.toggleBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${s.title}: ${label}`}
      >
        <Icon size={16} color={failed ? colors.red : colors.textSecondary} strokeWidth={2.2} />
        {showDot ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      </Pressable>

      <SheetFrame
        visible={open}
        onClose={() => setOpen(false)}
        title={s.title}
        compactHeader
        cardStyle={styles.card}
      >
        <View style={styles.body}>
          <View style={styles.statusRow}>
            <Icon size={20} color={iconColor} />
            <Text style={styles.statusText} accessibilityLiveRegion="polite">
              {label}
            </Text>
          </View>
          {status.lastSyncedAt ? (
            <Text style={styles.detail}>
              {s.lastSynced(new Date(status.lastSyncedAt).toLocaleString())}
            </Text>
          ) : null}
          {status.error ? <Text style={styles.detail}>{status.error}</Text> : null}
          <Pressable
            disabled={syncing || offline}
            onPress={() => taskStore.requestSync(user.id)}
            style={[styles.syncBtn, (syncing || offline) && styles.syncBtnDisabled]}
            accessibilityRole="button"
          >
            <Text style={styles.syncBtnText}>{s.syncNow}</Text>
          </Pressable>
        </View>
      </SheetFrame>
    </>
  );
}

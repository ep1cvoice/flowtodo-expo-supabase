import { StyleSheet } from 'react-native';
import type { AppColors } from '@/shared/constants/theme';
import { webInteractive } from '@/shared/lib/pressableWeb';

export function createSyncStyles(colors: AppColors) {
  return StyleSheet.create({
    toggleBtn: {
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    toggleBtnPressed: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
    dot: {
      position: 'absolute',
      top: 3,
      right: 3,
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.bgSurface,
    },
    card: { overflow: 'hidden' },
    body: { padding: 16, gap: 12 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusText: { flex: 1, color: colors.textPrimary, fontSize: 15 },
    detail: { color: colors.textMuted, fontSize: 13 },
    syncBtn: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    syncBtnDisabled: { opacity: 0.6 },
    syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  });
}

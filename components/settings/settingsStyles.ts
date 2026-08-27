import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

export function createSettingsStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      padding: 16,
      paddingBottom: 32,
      paddingTop: 10,
      alignItems: 'center',
    },
    panel: {
      width: '100%',
      maxWidth: 720,
      gap: 10,
    },
    section: {
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: tokens.borderRadius,
      backgroundColor: colors.bgTodoItem,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      ...webInteractive,
    },
    sectionHeaderActive: {
      backgroundColor: colors.sidebarItemActiveBg,
    },
    sectionHeaderHovered: {
      backgroundColor: colors.todoHighlight,
    },
    controlPressed: {
      opacity: 0.9,
    },
    sectionHeaderStart: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    sectionTitleActive: {
      color: colors.sidebarItemActiveText,
    },
    iconRotated: {
      transform: [{ rotate: '45deg' }],
    },
    sectionBody: {
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
      padding: 16,
      gap: 8,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    segment: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      alignItems: 'center',
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    segmentBtnHovered: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
    segmentBtnActiveHovered: {
      backgroundColor: colors.primaryHover,
      borderColor: colors.primaryHover,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: '#fff',
    },
    labelBlock: {
      gap: 8,
      marginTop: 4,
    },
    labelBlockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    filterLimitBlock: {
      gap: 10,
      marginBottom: 4,
    },
    filterLimitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    filterLimitLabel: {
      minWidth: 96,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    addLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    addLinkBtnPressed: {
      backgroundColor: colors.todoHighlight,
    },
    addLinkText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    manageList: {
      gap: 4,
    },
    manageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    manageRowStart: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
    },
    manageDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    manageName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    manageDeleteBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    manageDeleteBtnPressed: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    secondaryBtn: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      alignItems: 'center',
      ...webInteractive,
    },
    secondaryBtnPressed: {
      backgroundColor: colors.bgCardHover,
    },
    secondaryBtnText: {
      color: colors.textPrimary,
      fontWeight: '500',
      fontSize: 14,
    },
    dangerZone: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      backgroundColor: 'rgba(239, 68, 68, 0.06)',
      gap: 8,
    },
    dangerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dangerTitle: {
      color: colors.red,
      fontWeight: '700',
      fontSize: 14,
    },
    dangerBtn: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      ...webInteractive,
    },
    dangerBtnPressed: {
      backgroundColor: colors.sidebarLogoutHover,
    },
    dangerBtnText: {
      color: colors.red,
      fontWeight: '600',
      fontSize: 14,
    },
    pomodoroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    historyBlock: {
      marginTop: 12,
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    pomodoroInput: {
      width: 64,
      height: 40,
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: 10,
      backgroundColor: colors.bgSurface,
      color: colors.textPrimary,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
    },
    primaryBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    primaryBtnPressed: {
      backgroundColor: colors.primaryHover,
    },
    primaryBtnDisabled: {
      opacity: 0.6,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    successInfo: {
      color: colors.green,
      fontSize: 13,
      fontWeight: '500',
    },
    errorInfo: {
      color: colors.red,
      fontSize: 13,
      fontWeight: '500',
    },
    logout: {
      marginTop: 4,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: tokens.borderRadius,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      ...webInteractive,
    },
    logoutStart: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    logoutPressed: {
      backgroundColor: colors.sidebarLogoutHover,
      borderColor: colors.red,
    },
    logoutText: {
      color: colors.sidebarLogoutText,
      fontSize: 16,
      fontWeight: '600',
    },
    encryptionInfo: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      gap: 6,
      marginBottom: 4,
    },
    encryptionInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    encryptionInfoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    encryptionInfoText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}

export type SettingsStyles = ReturnType<typeof createSettingsStyles>;

export function useSettingsStyles() {
  const { colors } = useTheme();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);
  return { colors, styles };
}

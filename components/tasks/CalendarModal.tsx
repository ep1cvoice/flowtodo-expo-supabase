import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
  WEEKDAY_LABELS,
  buildMonthWeeks,
  sameDay,
  startOfDay,
} from '@/lib/calendarDate';
import AppModal from '@/components/ui/AppModal';
import { webInteractive } from '@/utils/pressableWeb';

interface CalendarModalProps {
  visible: boolean;
  selected: Date | null;
  onClose: () => void;
  onClear: () => void;
  onConfirm: (date: Date) => void;
}

export default function CalendarModal({
  visible,
  selected,
  onClose,
  onClear,
  onConfirm,
}: CalendarModalProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 480;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = useMemo(() => startOfDay(new Date()), []);

  const [draft, setDraft] = useState<Date | null>(selected);
  const [monthCursor, setMonthCursor] = useState(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (!visible) return;
    setDraft(selected);
    const base = selected ?? today;
    setMonthCursor(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [visible, selected, today]);

  const weeks = useMemo(() => buildMonthWeeks(monthCursor), [monthCursor]);

  const monthLabel = monthCursor.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const canConfirm = !!draft && startOfDay(draft) >= today;

  return (
    <AppModal visible={visible} onClose={onClose}>
      <Pressable style={[styles.overlay, isMobile && styles.overlayMobile]} onPress={onClose}>
        <Pressable
          style={[styles.modal, isMobile && styles.modalMobile]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Set due date</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.monthNav}>
            <Pressable
              onPress={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
              }
              style={styles.navBtn}
              hitSlop={8}>
              <ChevronLeft size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable
              onPress={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
              }
              style={styles.navBtn}
              hitSlop={8}>
              <ChevronRight size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((d) => (
              <View key={d} style={styles.weekdayCell}>
                <Text style={styles.weekday}>{d}</Text>
              </View>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={`w-${wi}`} style={styles.weekRow}>
              {week.map((day, di) => {
                if (!day) {
                  return <View key={`e-${wi}-${di}`} style={styles.cell} />;
                }

                const disabled = startOfDay(day) < today;
                const isSelected = draft ? sameDay(day, draft) : false;
                const isToday = sameDay(day, today);

                return (
                  <Pressable
                    key={day.toISOString()}
                    disabled={disabled}
                    onPress={() => setDraft(day)}
                    style={styles.cell}>
                    <View
                      style={[
                        styles.dayInner,
                        isSelected && styles.daySelected,
                        isToday && !isSelected && styles.dayToday,
                        disabled && styles.dayDisabled,
                      ]}>
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                          disabled && styles.dayTextDisabled,
                        ]}>
                        {day.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.footer}>
            <Pressable
              onPress={onClear}
              style={({ pressed, hovered }) => [
                styles.footerBtn,
                styles.clearBtn,
                (hovered || pressed) && styles.clearPressed,
              ]}>
              <Text style={styles.clearText}>Clear date</Text>
            </Pressable>
            <Pressable
              disabled={!canConfirm}
              onPress={() => draft && onConfirm(draft)}
              style={({ pressed, hovered }) => [
                styles.footerBtn,
                styles.setBtn,
                !canConfirm && styles.setDisabled,
                canConfirm && (hovered || pressed) && styles.setPressed,
              ]}>
              <Text style={styles.setText}>Set Date</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </AppModal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
    },
    overlayMobile: {
      justifyContent: 'flex-end',
    },
    modal: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.bgContent,
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: tokens.borderRadius,
      padding: 20,
      ...tokens.shadow,
    },
    modalMobile: {
      marginBottom: 16,
      maxWidth: 420,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    closeBtn: {
      padding: 4,
      borderRadius: 8,
      ...webInteractive,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    navBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    monthLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    weekRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    cell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekday: {
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    dayInner: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    daySelected: {
      backgroundColor: colors.primary,
    },
    dayToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dayDisabled: {
      opacity: 0.35,
    },
    dayText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    dayTextSelected: {
      color: '#fff',
      fontWeight: '700',
    },
    dayTextDisabled: {
      color: colors.textMuted,
    },
    footer: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    footerBtn: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    clearBtn: {
      backgroundColor: 'transparent',
    },
    clearPressed: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    clearText: {
      color: colors.red,
      fontWeight: '500',
      fontSize: 14,
    },
    setBtn: {
      backgroundColor: colors.primary,
    },
    setPressed: {
      backgroundColor: colors.primaryHover,
    },
    setDisabled: {
      opacity: 0.45,
    },
    setText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
  });
}

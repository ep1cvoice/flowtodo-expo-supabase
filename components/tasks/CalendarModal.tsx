import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
  buildMonthWeeks,
  sameDay,
  startOfDay,
} from '@/lib/calendarDate';
import MonthGrid from '@/components/tasks/MonthGrid';
import SheetFrame from '@/components/ui/SheetFrame';
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
    <SheetFrame
      visible={visible}
      onClose={onClose}
      title="Set due date"
      header="plain"
      maxWidth={360}
      cardStyle={styles.card}
      mobileCardStyle={styles.cardMobile}>
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

      <MonthGrid
        weeks={weeks}
        variant="modal"
        onPressDay={setDraft}
        dayState={(day) => ({
          selected: draft ? sameDay(day, draft) : false,
          today: sameDay(day, today),
          disabled: startOfDay(day) < today,
        })}
      />

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
    </SheetFrame>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      padding: 20,
    },
    cardMobile: {
      maxWidth: 420,
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

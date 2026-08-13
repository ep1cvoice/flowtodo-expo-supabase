import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ListFilter, X } from 'lucide-react-native';
import { TaskSearchToggle } from '@/components/tasks/TaskSearchBar';
import type { Category, Tag } from '@/types';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

interface TaskFilterBarProps {
  categories: Category[];
  tags: Tag[];
  selectedCategoryIds: number[];
  selectedTagIds: number[];
  onOpen: () => void;
  onClear: () => void;
  variant?: 'inline' | 'header';
  searchOpen?: boolean;
  searchHasQuery?: boolean;
  onToggleSearch?: () => void;
}

export default function TaskFilterBar({
  categories,
  tags,
  selectedCategoryIds,
  selectedTagIds,
  onOpen,
  onClear,
  variant = 'inline',
  searchOpen = false,
  searchHasQuery = false,
  onToggleSearch,
}: TaskFilterBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, variant), [colors, variant]);

  const activeCategories = categories.filter((c) => selectedCategoryIds.includes(c.id));
  const activeTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const filterCount = activeCategories.length + activeTags.length;
  const hasFilters = filterCount > 0;

  return (
    <View style={styles.bar}>
      {onToggleSearch ? (
        <TaskSearchToggle
          open={searchOpen}
          hasQuery={searchHasQuery}
          onPress={onToggleSearch}
        />
      ) : null}

      {!hasFilters ? (
        <Pressable
          onPress={onOpen}
          style={({ pressed, hovered }) => [
            styles.filterBtn,
            (hovered || pressed) && styles.filterBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Filter tasks">
          <ListFilter size={16} color={colors.textSecondary} />
          <Text style={styles.filterBtnText}>Filter</Text>
        </Pressable>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.summaryRow}
            style={styles.summaryScroll}>
            <Pressable
              onPress={onOpen}
              style={({ pressed, hovered }) => [
                styles.summaryOpen,
                (hovered || pressed) && styles.summaryOpenPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit filters">
              <ListFilter size={16} color={colors.primary} />
              {activeCategories.map((cat) => (
                <View
                  key={cat.id}
                  style={[
                    styles.summaryChip,
                    { borderColor: cat.color, backgroundColor: `${cat.color}18` },
                  ]}>
                  <View style={[styles.dot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.summaryChipText, { color: cat.color }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </View>
              ))}
              {activeTags.map((tag) => (
                <View
                  key={tag.id}
                  style={[
                    styles.summaryChip,
                    { borderColor: tag.color, backgroundColor: `${tag.color}18` },
                  ]}>
                  <Text style={[styles.summaryChipText, { color: tag.color }]} numberOfLines={1}>
                    #{tag.name}
                  </Text>
                </View>
              ))}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{filterCount}</Text>
              </View>
            </Pressable>
          </ScrollView>

          <Pressable
            onPress={onClear}
            hitSlop={8}
            style={({ pressed, hovered }) => [
              styles.clearIconBtn,
              (hovered || pressed) && styles.clearIconBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Clear filters">
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </>
      )}
    </View>
  );
}

function createStyles(colors: AppColors, variant: 'inline' | 'header') {
  const isHeader = variant === 'header';

  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
      marginBottom: isHeader ? 0 : 10,
      minHeight: isHeader ? undefined : 36,
      flexShrink: 1,
      maxWidth: '100%',
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: isHeader ? 7 : 8,
      paddingHorizontal: isHeader ? 10 : 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    filterBtnPressed: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
    filterBtnText: {
      fontSize: isHeader ? 13 : 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    summaryScroll: {
      flexGrow: 0,
      flexShrink: 1,
      maxWidth: '100%',
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
      paddingLeft: 4,
    },
    summaryOpen: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 4,
      borderRadius: 10,
      ...webInteractive,
    },
    summaryOpenPressed: {
      backgroundColor: colors.todoHighlight,
    },
    summaryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: isHeader ? 4 : 5,
      paddingHorizontal: isHeader ? 8 : 10,
      borderRadius: 999,
      borderWidth: 1,
      maxWidth: isHeader ? 110 : 160,
    },
    summaryChipText: {
      fontSize: isHeader ? 12 : 13,
      fontWeight: '600',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    badge: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    clearIconBtn: {
      padding: 8,
      borderRadius: 8,
      ...webInteractive,
    },
    clearIconBtnPressed: {
      backgroundColor: colors.bgCardHover,
    },
  });
}

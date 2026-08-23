import { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import type { Category, Tag } from '@/types';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AppModal from '@/components/ui/AppModal';
import { webInteractive } from '@/utils/pressableWeb';

interface TaskFilterSheetProps {
  visible: boolean;
  categories: Category[];
  tags: Tag[];
  selectedCategoryIds: number[];
  selectedTagIds: number[];
  maxFilterSelections: number;
  onClearCategories: () => void;
  onToggleCategory: (id: number) => void;
  onClearTags: () => void;
  onToggleTag: (id: number) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function TaskFilterSheet({
  visible,
  categories,
  tags,
  selectedCategoryIds,
  selectedTagIds,
  maxFilterSelections,
  onClearCategories,
  onToggleCategory,
  onClearTags,
  onToggleTag,
  onClear,
  onClose,
}: TaskFilterSheetProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 480;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const allCategories = selectedCategoryIds.length === 0;
  const allTags = selectedTagIds.length === 0;
  const hasFilters = !allCategories || !allTags;
  const selectedCount = selectedCategoryIds.length + selectedTagIds.length;
  const atSharedLimit = selectedCount >= maxFilterSelections;

  return (
    <AppModal visible={visible} onClose={onClose}>
      <Pressable style={[styles.overlay, isMobile && styles.overlayMobile]} onPress={onClose}>
        <Pressable
          style={[styles.modal, isMobile && styles.modalMobile]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Filter tasks</Text>
            <View style={styles.headerActions}>
              {hasFilters ? (
                <Pressable onPress={onClear} hitSlop={8} style={styles.clearBtn}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>Categories</Text>
                <Text style={styles.limitHint}>
                  {selectedCount}/{maxFilterSelections}
                </Text>
              </View>
              <View style={styles.chipWrap}>
                <Pressable
                  onPress={onClearCategories}
                  style={({ pressed, hovered }) => [
                    styles.chip,
                    allCategories && styles.chipSelectedNeutral,
                    hovered && !allCategories && styles.chipHovered,
                    pressed && styles.chipPressed,
                  ]}>
                  <Text
                    style={[styles.chipText, allCategories && styles.chipTextSelectedNeutral]}>
                    All
                  </Text>
                </Pressable>
                {categories.map((cat) => {
                  const selected = selectedCategoryIds.includes(cat.id);
                  const atLimit = !selected && atSharedLimit;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => onToggleCategory(cat.id)}
                      style={({ pressed, hovered }) => [
                        styles.chip,
                        { borderColor: cat.color },
                        selected && { backgroundColor: `${cat.color}22` },
                        atLimit && styles.chipDisabled,
                        hovered && !selected && !atLimit && styles.chipHovered,
                        pressed && styles.chipPressed,
                      ]}>
                      <View style={[styles.dot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.chipText, { color: cat.color }]}>{cat.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>Tags</Text>
              
              </View>
              {tags.length === 0 ? (
                <Text style={styles.emptyHint}>No tags yet. Create some in Settings.</Text>
              ) : (
                <View style={styles.chipWrap}>
                  <Pressable
                    onPress={onClearTags}
                    style={({ pressed, hovered }) => [
                      styles.chip,
                      allTags && styles.chipSelectedNeutral,
                      hovered && !allTags && styles.chipHovered,
                      pressed && styles.chipPressed,
                    ]}>
                    <Text style={[styles.chipText, allTags && styles.chipTextSelectedNeutral]}>
                      All
                    </Text>
                  </Pressable>
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    const atLimit = !selected && atSharedLimit;
                    return (
                      <Pressable
                        key={tag.id}
                        onPress={() => onToggleTag(tag.id)}
                        style={({ pressed, hovered }) => [
                          styles.chip,
                          { borderColor: tag.color },
                          selected && { backgroundColor: `${tag.color}22` },
                          atLimit && styles.chipDisabled,
                          hovered && !selected && !atLimit && styles.chipHovered,
                          pressed && styles.chipPressed,
                        ]}>
                        <Text style={[styles.chipText, { color: tag.color }]}>#{tag.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed, hovered }) => [
                styles.doneBtn,
                (hovered || pressed) && styles.doneBtnPressed,
              ]}>
              <Text style={styles.doneBtnText}>Done</Text>
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
      maxWidth: 420,
      maxHeight: '85%',
      backgroundColor: colors.bgContent,
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: tokens.borderRadius,
      overflow: 'hidden',
      ...tokens.shadow,
    },
    modalMobile: {
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.bgSurface,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
      gap: 8,
    },
    title: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 18,
      flex: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clearBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      ...webInteractive,
    },
    clearText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    body: {
      padding: 16,
      gap: 18,
    },
    section: {
      gap: 10,
    },
    sectionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    sectionLabel: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    limitHint: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    chipDisabled: {
      opacity: 0.45,
    },
    chipSelectedNeutral: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipHovered: {
      backgroundColor: colors.todoHighlight,
    },
    chipPressed: {
      opacity: 0.85,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextSelectedNeutral: {
      color: '#fff',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    emptyHint: {
      color: colors.textMuted,
      fontSize: 13,
    },
    footer: {
      padding: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    doneBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    doneBtnPressed: {
      backgroundColor: colors.primaryHover,
    },
    doneBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
  });
}

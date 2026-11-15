import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Copy, FolderOpen, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import SheetFrame from '@/shared/ui/SheetFrame';
import type { AppColors } from '@/shared/constants/theme';
import { useTheme } from '@/shared/providers/ThemeContext';
import { webInteractive } from '@/shared/lib/pressableWeb';
import { strings } from '@/shared/lib/strings';
import type { Category } from '@/types';

interface TaskSelectionBarProps {
  count: number;
  categories: Category[];
  onCancel: () => void;
  onDuplicate: () => void | Promise<void>;
  onSetCategory: (categoryId: number | null) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

// Bottom bar of the action mode: bulk category change, duplicate and delete.
export default function TaskSelectionBar({
  count,
  categories,
  onCancel,
  onDuplicate,
  onSetCategory,
  onDelete,
}: TaskSelectionBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pickingCategory, setPickingCategory] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <>
      <View style={[styles.bar, { paddingBottom: 10 + insets.bottom }]}>
        <Pressable
          onPress={onCancel}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={strings.tasks.cancelSelection}>
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.count}>{strings.tasks.selectedCount(count)}</Text>
        <Pressable
          onPress={() => setPickingCategory(true)}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={strings.tasks.categorySelected}>
          <FolderOpen size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => void onDuplicate()}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={strings.tasks.duplicateSelected}>
          <Copy size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => setConfirmingDelete(true)}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={strings.tasks.deleteSelected}>
          <Trash2 size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <SheetFrame
        centered
        compactHeader
        visible={pickingCategory}
        onClose={() => setPickingCategory(false)}
        title={strings.tasks.categoryMenuTitle}
        maxWidth={320}>
        <ScrollView contentContainerStyle={styles.menuList}>
          {[{ id: null, name: strings.form.noCategory, color: colors.textMuted }, ...categories].map(
            (item) => (
              <Pressable
                key={item.id ?? 'none'}
                style={styles.menuRow}
                accessibilityRole="button"
                onPress={() => {
                  setPickingCategory(false);
                  void onSetCategory(item.id);
                }}>
                <View style={[styles.menuDot, { backgroundColor: item.color }]} />
                <Text style={styles.menuText} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            )
          )}
        </ScrollView>
      </SheetFrame>

      <ConfirmModal
        visible={confirmingDelete}
        title={strings.tasks.deleteSelectedTitle(count)}
        message={strings.tasks.deleteSelectedMessage}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={async () => {
          await onDelete();
          setConfirmingDelete(false);
        }}
      />
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    bar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9500,
      elevation: 9500,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingTop: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.bgTodoItem,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    count: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    action: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      ...webInteractive,
    },
    menuList: { padding: 8, gap: 2 },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 12,
      ...webInteractive,
    },
    menuDot: { width: 12, height: 12, borderRadius: 6 },
    menuText: { flex: 1, fontSize: 16, color: colors.textPrimary },
  });
}

import { Pressable, ScrollView, Text, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { useTheme } from '@/shared/providers/ThemeContext';
import SheetFrame from '@/shared/ui/SheetFrame';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';

export interface MenuItem {
  id: number | null;
  name: string;
  color: string;
}

interface Props {
  visible: boolean;
  title: string;
  items: MenuItem[];
  selectedIds: (number | null)[];
  emptyText: string;
  hint?: string;
  // Optional last row that creates a new label (e.g. "+ New tag").
  createLabel?: string;
  onCreate?: () => void;
  styles: TaskDetailStyles;
  onToggle: (id: number | null) => void;
  onClose: () => void;
}

// Mini menu rendered above the detail sheet: a short list of tags or categories to pick from.
export default function TaskLabelMenu({
  visible,
  title,
  items,
  selectedIds,
  emptyText,
  hint,
  createLabel,
  onCreate,
  styles,
  onToggle,
  onClose,
}: Props) {
  const { colors } = useTheme();

  return (
    <SheetFrame
      embedded
      centered
      compactHeader
      visible={visible}
      onClose={onClose}
      title={title}
      maxWidth={320}
      cardStyle={styles.menuCard}
    >
      <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuList}>
        {items.length === 0 ? <Text style={styles.menuEmpty}>{emptyText}</Text> : null}
        {items.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <Pressable
              key={item.id ?? 'none'}
              onPress={() => onToggle(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed, hovered }) => [
                styles.menuRow,
                selected && { backgroundColor: `${item.color}22` },
                (hovered || pressed) && styles.menuRowPressed,
              ]}
            >
              <View style={[styles.menuDot, { backgroundColor: item.color }]} />
              <Text style={styles.menuRowText} numberOfLines={1}>
                {item.name}
              </Text>
              {selected ? <Check size={18} strokeWidth={2.5} color={item.color} /> : null}
            </Pressable>
          );
        })}
        {createLabel && onCreate ? (
          <Pressable
            onPress={onCreate}
            accessibilityRole="button"
            style={({ pressed, hovered }) => [
              styles.menuRow,
              (hovered || pressed) && styles.menuRowPressed,
            ]}
          >
            <Plus size={16} strokeWidth={2.5} color={colors.primary} />
            <Text style={[styles.menuRowText, { color: colors.primary }]} numberOfLines={1}>
              {createLabel}
            </Text>
          </Pressable>
        ) : null}
        {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
      </ScrollView>
    </SheetFrame>
  );
}

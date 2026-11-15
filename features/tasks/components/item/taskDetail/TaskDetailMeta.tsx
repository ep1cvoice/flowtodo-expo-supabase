import { strings } from '@/shared/lib/strings';
import { Pressable, Text, View } from 'react-native';
import { Calendar, ChevronDown, CircleDashed, Plus } from 'lucide-react-native';
import CategoryIconGlyph from '@/shared/ui/CategoryIconGlyph';
import DueDateBadge from '@/features/tasks/components/item/DueDateBadge';
import { useTodoItemStyles } from '@/features/tasks/components/item/todoItemStyles';
import { useTheme } from '@/shared/providers/ThemeContext';
import type { Task } from '@/types';
import type { TaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import { tagTint } from '@/features/tasks/components/item/taskDetail/taskDetailUtils';

interface Props {
  task: Task;
  dueDate: Date | null;
  showCalendarIcon: boolean;
  styles: TaskDetailStyles;
  onCommitFromOutside: () => void;
  onOpenCalendar: () => void;
  onOpenCategory: () => void;
  onOpenTags: () => void;
}

// A category dropdown chip with the due date on its right (the trailing arrow shows it can be changed) and one line of tags;
// tapping the tags opens the menu with the full list.
export default function TaskDetailMeta({
  task,
  dueDate,
  showCalendarIcon,
  styles,
  onCommitFromOutside,
  onOpenCalendar,
  onOpenCategory,
  onOpenTags,
}: Props) {
  const { colors } = useTheme();
  const { styles: todoStyles } = useTodoItemStyles();
  const category = task.category;
  const tags = task.tags ?? [];
  const categoryColor = category?.color ?? colors.textSecondary;

  return (
    <View style={[styles.meta, styles.metaDivider]}>
      <View style={styles.metaTopRow}>
        <Pressable
          onPress={onOpenCategory}
          accessibilityRole="button"
          accessibilityLabel={strings.tasks.changeCategory}
          style={({ pressed, hovered }) => [
            styles.tagChip,
            styles.categoryChip,
            { borderColor: category ? category.color : colors.borderColor },
            category && { backgroundColor: tagTint(category.color, 0.14) },
            (hovered || pressed) && styles.iconBtnPressed,
          ]}>
          {category ? (
            <CategoryIconGlyph icon={category.icon} size={14} strokeWidth={2.2} color={categoryColor} />
          ) : (
            <CircleDashed size={14} strokeWidth={2.2} color={categoryColor} />
          )}
          <Text
            style={[styles.tagChipText, styles.categoryChipText, { color: categoryColor }]}
            numberOfLines={1}>
            {category ? category.name : strings.tasks.categoryMenuTitle}
          </Text>
          <ChevronDown size={14} strokeWidth={2.5} color={categoryColor} />
        </Pressable>
        {dueDate ? (
          <View id="open-task-calendar" style={styles.dateSlot}>
            <DueDateBadge
              date={dueDate}
              styles={todoStyles}
              onPress={() => {
                onCommitFromOutside();
                onOpenCalendar();
              }}
            />
          </View>
        ) : null}
        {showCalendarIcon ? (
          <Pressable
            id="open-task-calendar"
            onPress={(event) => {
              event.stopPropagation();
              onCommitFromOutside();
              onOpenCalendar();
            }}
            hitSlop={4}
            style={({ pressed, hovered }) => [
              styles.iconBtn,
              styles.dateSlot,
              (hovered || pressed) && styles.iconBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={strings.tasks.setDueDate}>
            <Calendar size={18} strokeWidth={2.2} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={onOpenTags}
        accessibilityRole="button"
        accessibilityLabel={strings.tasks.addTagLabel}
        style={({ pressed, hovered }) => [
          styles.tagsRow,
          (hovered || pressed) && styles.iconBtnPressed,
        ]}>
        <Plus size={16} strokeWidth={2.5} color={colors.textSecondary} />
        <Text style={styles.tagsText} numberOfLines={1}>
          {tags.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>{strings.tasks.addTag}</Text>
          ) : (
            tags.map((tag) => (
              <Text key={tag.id} style={{ color: tag.color }}>
                #{tag.name}{'  '}
              </Text>
            ))
          )}
        </Text>
      </Pressable>
    </View>
  );
}

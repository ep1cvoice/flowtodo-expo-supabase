import { strings } from '@/shared/lib/strings';
import { View, Text, Pressable } from 'react-native';
import type { Category } from '@/types';
import { useTaskFormStyles } from '@/features/tasks/components/form/taskFormStyles';

interface CategoryChipPickerProps {
  categories: Category[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  onAddPress?: () => void;
}

export default function CategoryChipPicker({
  categories,
  selectedId,
  onChange,
  onAddPress,
}: CategoryChipPickerProps) {
  const { styles } = useTaskFormStyles();

  return (
    <>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{strings.form.category}</Text>
        {onAddPress ? (
          <Pressable onPress={onAddPress} hitSlop={8} style={styles.newLinkBtn}>
            <Text style={styles.newLink}>{strings.form.newLink}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.categoryList}>
        <Pressable
          onPress={() => onChange(null)}
          style={[styles.categoryChip, selectedId === null && styles.categoryChipSelected]}>
          <Text
            style={[
              styles.categoryChipText,
              selectedId === null && styles.categoryChipTextSelected,
            ]}>
            {strings.form.noCategory}
          </Text>
        </Pressable>
        {categories.map((cat) => {
          const selected = selectedId === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => onChange(cat.id)}
              style={[
                styles.categoryChip,
                { borderColor: cat.color },
                selected && { backgroundColor: `${cat.color}22` },
              ]}>
              <Text
                style={[
                  styles.categoryChipText,
                  { color: cat.color },
                  selected && styles.categoryChipTextSelected,
                ]}>
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

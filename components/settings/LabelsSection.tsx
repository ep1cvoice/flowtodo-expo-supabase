import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Plus, Tags, Trash2 } from 'lucide-react-native';
import { confirmDestructive } from '@/components/settings/confirmDestructive';
import SettingsSection from '@/components/settings/SettingsSection';
import { useSettingsStyles } from '@/components/settings/settingsStyles';
import CategoryModal from '@/components/tasks/CategoryModal';
import TagModal from '@/components/tasks/TagModal';
import {
  clampFilterLimit,
  FILTER_LIMIT_DEFAULT,
  FILTER_LIMIT_MAX,
  FILTER_LIMIT_MIN,
} from '@/constants/filterLimits';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TasksContext';
import { useToast } from '@/context/ToastContext';
import { toastForError } from '@/lib/networkError';
import type { CategoryIcon } from '@/types';

interface LabelsSectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function LabelsSection({ open, onToggle }: LabelsSectionProps) {
  const { user, updateProfile } = useAuth();
  const { colors, styles } = useSettingsStyles();
  const { showToast } = useToast();
  const { categories, tags, addCategory, addTag, deleteCategory, deleteTag } = useTasks();
  const [filterLimit, setFilterLimit] = useState<string>(
    String(user?.settings?.maxFilterSelections ?? FILTER_LIMIT_DEFAULT)
  );
  const [filterLimitErr, setFilterLimitErr] = useState('');
  const [filterLimitSaving, setFilterLimitSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const handleFilterLimitsSave = async () => {
    setFilterLimitErr('');
    const value = Number(filterLimit);
    if (!Number.isFinite(value) || value < FILTER_LIMIT_MIN || value > FILTER_LIMIT_MAX) {
      setFilterLimitErr(`Limit must be between ${FILTER_LIMIT_MIN} and ${FILTER_LIMIT_MAX}`);
      return;
    }

    setFilterLimitSaving(true);
    const next = clampFilterLimit(value);
    const { error } = await updateProfile({ maxFilterSelections: next });
    setFilterLimitSaving(false);

    if (error) {
      showToast(toastForError(error, error), 'error');
      return;
    }
    setFilterLimit(String(next));
    showToast('Filter limit saved.');
  };

  const confirmDeleteCategory = (id: number, name: string) => {
    confirmDestructive({
      title: 'Remove category?',
      message: `Remove "${name}"? Tasks keep their title; this category will be cleared.`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await deleteCategory(id);
          showToast('Category removed.');
        } catch (err) {
          showToast(toastForError(err, 'Could not remove category.'), 'error');
        }
      },
    });
  };

  const confirmDeleteTag = (id: number, name: string) => {
    confirmDestructive({
      title: 'Remove tag?',
      message: `Remove "#${name}"? It will be removed from any tasks that use it.`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await deleteTag(id);
          showToast('Tag removed.');
        } catch (err) {
          showToast(toastForError(err, 'Could not remove tag.'), 'error');
        }
      },
    });
  };

  return (
    <>
      <SettingsSection title="Categories & Tags" Icon={Tags} open={open} onToggle={onToggle}>
        {open ? (
          <>
            <Text style={styles.label}>Active filter limit</Text>
            <Text style={styles.description}>
              Shared max for selected categories + tags ({FILTER_LIMIT_MIN}–{FILTER_LIMIT_MAX})
            </Text>
            <View style={styles.filterLimitBlock}>
              <View style={styles.filterLimitRow}>
                <Text style={styles.filterLimitLabel}>Max selected</Text>
                <TextInput
                  value={filterLimit}
                  onChangeText={(val) => {
                    if (val === '') return setFilterLimit('');
                    if (/^\d{1,2}$/.test(val)) setFilterLimit(val);
                  }}
                  keyboardType="number-pad"
                  style={styles.pomodoroInput}
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.primaryBtn,
                    (hovered || pressed) && styles.primaryBtnPressed,
                    filterLimitSaving && styles.primaryBtnDisabled,
                  ]}
                  disabled={filterLimitSaving}
                  onPress={handleFilterLimitsSave}>
                  <Text style={styles.primaryBtnText}>
                    {filterLimitSaving ? 'Saving…' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </View>
            {!!filterLimitErr && <Text style={styles.errorInfo}>{filterLimitErr}</Text>}

            <View style={styles.labelBlock}>
              <View style={styles.labelBlockHeader}>
                <Text style={styles.label}>Categories</Text>
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.addLinkBtn,
                    (hovered || pressed) && styles.addLinkBtnPressed,
                  ]}
                  onPress={() => setShowCategoryModal(true)}>
                  <Plus size={14} color={colors.primary} />
                  <Text style={styles.addLinkText}>Add category</Text>
                </Pressable>
              </View>
              {categories.length === 0 ? (
                <Text style={styles.description}>No categories yet.</Text>
              ) : (
                <View style={styles.manageList}>
                  {categories.map((cat) => (
                    <View key={cat.id} style={styles.manageRow}>
                      <View style={styles.manageRowStart}>
                        <View style={[styles.manageDot, { backgroundColor: cat.color }]} />
                        <Text style={styles.manageName} numberOfLines={1}>
                          {cat.name}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => confirmDeleteCategory(cat.id, cat.name)}
                        hitSlop={8}
                        style={({ pressed, hovered }) => [
                          styles.manageDeleteBtn,
                          (hovered || pressed) && styles.manageDeleteBtnPressed,
                        ]}
                        accessibilityLabel={`Remove category ${cat.name}`}>
                        <Trash2 size={16} color={colors.red} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.labelBlock}>
              <View style={styles.labelBlockHeader}>
                <Text style={styles.label}>Tags</Text>
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.addLinkBtn,
                    (hovered || pressed) && styles.addLinkBtnPressed,
                  ]}
                  onPress={() => setShowTagModal(true)}>
                  <Plus size={14} color={colors.primary} />
                  <Text style={styles.addLinkText}>Add tag</Text>
                </Pressable>
              </View>
              {tags.length === 0 ? (
                <Text style={styles.description}>No tags yet.</Text>
              ) : (
                <View style={styles.manageList}>
                  {tags.map((tag) => (
                    <View key={tag.id} style={styles.manageRow}>
                      <View style={styles.manageRowStart}>
                        <View style={[styles.manageDot, { backgroundColor: tag.color }]} />
                        <Text style={styles.manageName} numberOfLines={1}>
                          #{tag.name}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => confirmDeleteTag(tag.id, tag.name)}
                        hitSlop={8}
                        style={({ pressed, hovered }) => [
                          styles.manageDeleteBtn,
                          (hovered || pressed) && styles.manageDeleteBtnPressed,
                        ]}
                        accessibilityLabel={`Remove tag ${tag.name}`}>
                        <Trash2 size={16} color={colors.red} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </SettingsSection>
      <CategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={async (name, color, icon) => {
          try {
            await addCategory({ name, color, icon: icon as CategoryIcon });
            showToast('Category created.');
          } catch (err) {
            showToast(toastForError(err, 'Could not save category.'), 'error');
            throw new Error('category save failed');
          }
        }}
      />
      <TagModal
        visible={showTagModal}
        onClose={() => setShowTagModal(false)}
        onSave={async (name, color) => {
          try {
            await addTag({ name, color });
            showToast('Tag created.');
          } catch (err) {
            showToast(toastForError(err, 'Could not save tag.'), 'error');
            throw new Error('tag save failed');
          }
        }}
      />
    </>
  );
}

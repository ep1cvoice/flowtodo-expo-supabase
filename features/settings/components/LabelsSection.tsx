import { strings } from '@/shared/lib/strings';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Plus, Tags, Trash2 } from 'lucide-react-native';
import SettingsSection from '@/features/settings/components/SettingsSection';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useSettingsStyles } from '@/features/settings/components/settingsStyles';
import LabelModal from '@/features/tasks/components/form/LabelModal';
import {
  clampFilterLimit,
  FILTER_LIMIT_DEFAULT,
  FILTER_LIMIT_MAX,
  FILTER_LIMIT_MIN,
} from '@/shared/constants/filterLimits';
import { useAuth } from '@/core/auth/AuthContext';
import { useTasks } from '@/features/tasks/TasksContext';
import { useToast } from '@/shared/providers/ToastContext';
import { toastForError } from '@/shared/lib/networkError';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import type { CategoryIcon } from '@/types';

interface LabelsSectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function LabelsSection({ open, onToggle }: LabelsSectionProps) {
  const { user, updateProfile } = useAuth();
  const { colors, styles } = useSettingsStyles();
  const { showToast } = useToast();
  const runToasted = useToastedAction();
  const { categories, tags, addCategory, addTag, deleteCategory, deleteTag } = useTasks();
  const [filterLimit, setFilterLimit] = useState<string>(
    String(user?.settings?.maxFilterSelections ?? FILTER_LIMIT_DEFAULT)
  );
  const [filterLimitErr, setFilterLimitErr] = useState('');
  const [filterLimitSaving, setFilterLimitSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<
    | { kind: 'category'; id: number; name: string }
    | { kind: 'tag'; id: number; name: string }
    | null
  >(null);

  const handleFilterLimitsSave = async () => {
    setFilterLimitErr('');
    const value = Number(filterLimit);
    if (!Number.isFinite(value) || value < FILTER_LIMIT_MIN || value > FILTER_LIMIT_MAX) {
      setFilterLimitErr(strings.settings.labels.filterLimitRange(FILTER_LIMIT_MIN, FILTER_LIMIT_MAX));
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
    showToast(strings.settings.labels.filterLimitSaved);
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    const current = pendingRemove;
    try {
      if (current.kind === 'category') {
        const result = await runToasted(
          () => deleteCategory(current.id),
          strings.settings.labels.removeCategoryFailed
        );
        if (result.ok) showToast(strings.settings.labels.categoryRemoved);
      } else {
        const result = await runToasted(
          () => deleteTag(current.id),
          strings.settings.labels.removeTagFailed
        );
        if (result.ok) showToast(strings.settings.labels.tagRemoved);
      }
    } finally {
      setPendingRemove(null);
    }
  };

  return (
    <>
      <SettingsSection title={strings.settings.labels.title} Icon={Tags} open={open} onToggle={onToggle}>
        {open ? (
          <>
            <Text style={styles.label}>{strings.settings.labels.filterLimit}</Text>
            <Text style={styles.description}>
              {strings.settings.labels.filterLimitDescription(FILTER_LIMIT_MIN, FILTER_LIMIT_MAX)}
            </Text>
            <View style={styles.filterLimitBlock}>
              <View style={styles.filterLimitRow}>
                <Text style={styles.filterLimitLabel}>{strings.settings.labels.maxSelected}</Text>
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
                    {filterLimitSaving ? strings.common.saving : strings.common.save}
                  </Text>
                </Pressable>
              </View>
            </View>
            {!!filterLimitErr && <Text style={styles.errorInfo}>{filterLimitErr}</Text>}

            <View style={styles.labelBlock}>
              <View style={styles.labelBlockHeader}>
                <Text style={styles.label}>{strings.common.categories}</Text>
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.addLinkBtn,
                    (hovered || pressed) && styles.addLinkBtnPressed,
                  ]}
                  onPress={() => setShowCategoryModal(true)}>
                  <Plus size={14} color={colors.primary} />
                  <Text style={styles.addLinkText}>{strings.settings.labels.addCategory}</Text>
                </Pressable>
              </View>
              {categories.length === 0 ? (
                <Text style={styles.description}>{strings.settings.labels.noCategories}</Text>
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
                        onPress={() =>
                          setPendingRemove({ kind: 'category', id: cat.id, name: cat.name })
                        }
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
                <Text style={styles.label}>{strings.common.tags}</Text>
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.addLinkBtn,
                    (hovered || pressed) && styles.addLinkBtnPressed,
                  ]}
                  onPress={() => setShowTagModal(true)}>
                  <Plus size={14} color={colors.primary} />
                  <Text style={styles.addLinkText}>{strings.settings.labels.addTag}</Text>
                </Pressable>
              </View>
              {tags.length === 0 ? (
                <Text style={styles.description}>{strings.settings.labels.noTags}</Text>
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
                        onPress={() => setPendingRemove({ kind: 'tag', id: tag.id, name: tag.name })}
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
      <ConfirmModal
        visible={pendingRemove !== null}
        title={pendingRemove?.kind === 'tag' ? strings.settings.labels.removeTagTitle : strings.settings.labels.removeCategoryTitle}
        message={
          pendingRemove?.kind === 'tag'
            ? strings.settings.labels.removeTagMessage(pendingRemove.name)
            : strings.settings.labels.removeCategoryMessage(pendingRemove?.name ?? '')
        }
        confirmLabel={strings.settings.labels.remove}
        onClose={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
      />
      <LabelModal
        kind="category"
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={async (name, color, icon) => {
          const result = await runToasted(
            () => addCategory({ name, color, icon: icon as CategoryIcon }),
            strings.settings.labels.saveCategoryFailed
          );
          if (!result.ok) throw new Error('category save failed');
          showToast(strings.settings.labels.categoryCreated);
        }}
      />
      <LabelModal
        kind="tag"
        visible={showTagModal}
        onClose={() => setShowTagModal(false)}
        onSave={async (name, color) => {
          const result = await runToasted(
            () => addTag({ name, color }),
            strings.settings.labels.saveTagFailed
          );
          if (!result.ok) throw new Error('tag save failed');
          showToast(strings.settings.labels.tagCreated);
        }}
      />
    </>
  );
}

import { strings } from '@/shared/lib/strings';
import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_TAGS_PER_TASK, type CategoryIcon } from '@/types';
import { useTasksActions, useTasksState } from '@/features/tasks/TasksContext';
import CalendarModal from '@/features/tasks/components/calendar/CalendarModal';
import LabelModal from '@/features/tasks/components/form/LabelModal';
import { createAddTaskStyles } from '@/features/tasks/components/form/addTaskStyles';
import TaskDetailHeader from '@/features/tasks/components/item/taskDetail/TaskDetailHeader';
import TaskTagsRow from '@/features/tasks/components/item/taskDetail/TaskTagsRow';
import TaskDescriptionField from '@/features/tasks/components/item/taskDetail/TaskDescriptionField';
import TaskDateButton from '@/features/tasks/components/item/taskDetail/TaskDateButton';
import TaskFullscreenButton from '@/features/tasks/components/item/taskDetail/TaskFullscreenButton';
import TaskLabelMenu from '@/features/tasks/components/item/taskDetail/TaskLabelMenu';
import { createTaskDetailStyles } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';
import { webTextCursor } from '@/features/tasks/components/item/taskDetail/taskDetailUtils';
import { toScheduledIso } from '@/features/tasks/lib/calendarDate';
import { validateTaskTitle } from '@/features/tasks/lib/taskValidation';
import type { AddTaskInput } from '@/features/tasks/lib/types';
import SheetFrame from '@/shared/ui/SheetFrame';
import { useTheme } from '@/shared/providers/ThemeContext';
import { useToast } from '@/shared/providers/ToastContext';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import { useAutoFocus } from '@/shared/lib/useAutoFocus';
import { isWeb } from '@/shared/lib/platform';
import { logger } from '@/shared/lib/logger';

interface AddTaskModalProps {
  visible: boolean;
  onAdd: (task: AddTaskInput) => void | Promise<void>;
  onClose: () => void;
  defaultCategoryId?: number | null;
  defaultTagIds?: number[];
  defaultScheduled?: Date | null;
}

const NO_TAGS: number[] = [];

// Create sheet with the same layout as the task detail sheet (category in the header, title,
// tags, description, action bar), with placeholders explaining each field. Nothing is saved
// until "Add task".
export default function AddTaskModal({
  visible,
  onAdd,
  onClose,
  defaultCategoryId = null,
  defaultTagIds = NO_TAGS,
  defaultScheduled = null,
}: AddTaskModalProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createTaskDetailStyles(colors, isDark), [colors, isDark]);
  const addStyles = useMemo(() => createAddTaskStyles(colors), [colors]);
  const { categories, tags: allTags } = useTasksState();
  const { addCategory, addTag } = useTasksActions();
  const { showToast } = useToast();
  const runToasted = useToastedAction();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = isWeb && width >= 768;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(defaultCategoryId);
  const [tagIds, setTagIds] = useState<number[]>(defaultTagIds);
  const [date, setDate] = useState<Date | null>(defaultScheduled);
  const [titleError, setTitleError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [menu, setMenu] = useState<'tags' | 'category' | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [labelModal, setLabelModal] = useState<'category' | 'tag' | null>(null);
  const titleRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  useAutoFocus(titleRef, visible);
  const expanded = fullscreen || wide;

  // Start from the defaults every time the sheet opens (e.g. the calendar day selected now).
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTitle('');
      setDescription('');
      setCategoryId(defaultCategoryId);
      setTagIds(defaultTagIds);
      setDate(defaultScheduled);
      setTitleError('');
      setFullscreen(false);
      setMenu(null);
      setShowCalendar(false);
    }
  }

  const category = categories.find((cat) => cat.id === categoryId) ?? null;
  const selectedTags = allTags.filter((tag) => tagIds.includes(tag.id));

  const handleClose = () => {
    if (submittingRef.current) return;
    onClose();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (titleError) setTitleError(validateTaskTitle(value));
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    const error = validateTaskTitle(title);
    if (error) {
      setTitleError(error);
      titleRef.current?.focus();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    const result = await runToasted(async () => {
      await onAdd({
        title,
        description,
        categoryId,
        tagIds,
        scheduled: date ? toScheduledIso(date) : null,
      });
      showToast(strings.form.taskCreated);
      onClose();
    }, strings.tasks.saveFailed);
    submittingRef.current = false;
    setSubmitting(false);
    if (!result.ok) logger.warn(strings.form.addTaskFailedLog, result.error);
  };

  return (
    <SheetFrame
      visible={visible}
      onClose={handleClose}
      keyboardAvoiding
      header="none"
      centered
      maxWidth={fullscreen ? 100000 : wide ? 720 : undefined}
      overlayStyle={fullscreen ? styles.overlayFull : undefined}
      cardStyle={
        fullscreen
          ? [styles.card, styles.cardFull, { paddingTop: insets.top, paddingBottom: insets.bottom }]
          : [styles.card, wide && styles.cardWide]
      }
      accessory={
        <>
          <CalendarModal
            embedded
            visible={showCalendar}
            selected={date}
            onClose={() => setShowCalendar(false)}
            onClear={() => {
              setDate(null);
              setShowCalendar(false);
            }}
            onConfirm={(next) => {
              setDate(next);
              setShowCalendar(false);
            }}
          />
          <TaskLabelMenu
            visible={menu === 'tags'}
            title={strings.tasks.tagsMenuTitle}
            items={allTags.map((tag) => ({ id: tag.id, name: `#${tag.name}`, color: tag.color }))}
            selectedIds={tagIds}
            emptyText={strings.form.noTagsYetCreate}
            hint={
              tagIds.length >= MAX_TAGS_PER_TASK
                ? strings.tasks.tagLimit(MAX_TAGS_PER_TASK)
                : undefined
            }
            createLabel={strings.form.newTag}
            onCreate={() => {
              setMenu(null);
              setLabelModal('tag');
            }}
            styles={styles}
            onClose={() => setMenu(null)}
            onToggle={(id) => {
              if (id === null) return;
              setTagIds((ids) => {
                if (ids.includes(id)) return ids.filter((x) => x !== id);
                return ids.length >= MAX_TAGS_PER_TASK ? ids : [...ids, id];
              });
            }}
          />
          <TaskLabelMenu
            visible={menu === 'category'}
            title={strings.tasks.categoryMenuTitle}
            items={[
              { id: null, name: strings.form.noCategory, color: colors.textMuted },
              ...categories.map((cat) => ({ id: cat.id, name: cat.name, color: cat.color })),
            ]}
            selectedIds={[categoryId]}
            emptyText=""
            createLabel={strings.form.newCategory}
            onCreate={() => {
              setMenu(null);
              setLabelModal('category');
            }}
            styles={styles}
            onClose={() => setMenu(null)}
            onToggle={(id) => {
              setCategoryId(id);
              setMenu(null);
            }}
          />
          <LabelModal
            kind="category"
            visible={labelModal === 'category'}
            onClose={() => setLabelModal(null)}
            onSave={async (name, color, icon) => {
              const result = await runToasted(async () => {
                const created = await addCategory({ name, color, icon: icon as CategoryIcon });
                setCategoryId(created.id);
                showToast(strings.form.categoryCreated);
              }, strings.form.saveCategoryFailed);
              if (!result.ok) {
                logger.warn('Failed to create category:', result.error);
                throw result.error;
              }
            }}
          />
          <LabelModal
            kind="tag"
            visible={labelModal === 'tag'}
            onClose={() => setLabelModal(null)}
            onSave={async (name, color) => {
              const result = await runToasted(async () => {
                const created = await addTag({ name, color });
                setTagIds((ids) =>
                  ids.includes(created.id) || ids.length >= MAX_TAGS_PER_TASK
                    ? ids
                    : [...ids, created.id]
                );
                showToast(strings.form.tagCreated);
              }, strings.form.saveTagFailed);
              if (!result.ok) {
                logger.warn('Failed to create tag:', result.error);
                throw result.error;
              }
            }}
          />
        </>
      }
    >
      <View style={[styles.sheetBody, expanded && styles.sheetBodyFull]}>
        <TaskDetailHeader
          category={category}
          placeholder={strings.form.chooseCategory}
          styles={styles}
          onClose={handleClose}
          onPressOutside={() => {}}
          onOpenCategory={() => setMenu('category')}
        />
        <View style={[styles.content, expanded && styles.contentFull]}>
          <View style={[styles.meta, styles.metaDivider]}>
            <View style={styles.titleRow}>
              <View style={styles.titleWrap}>
                <TextInput
                  ref={titleRef}
                  value={title}
                  onChangeText={handleTitleChange}
                  onSubmitEditing={() => {
                    void handleSubmit();
                  }}
                  returnKeyType="done"
                  submitBehavior="submit"
                  maxLength={50}
                  placeholder={strings.form.newTitlePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  cursorColor={colors.textPrimary}
                  underlineColorAndroid="transparent"
                  accessibilityLabel={strings.tasks.taskTitleInput}
                  style={[styles.title, styles.titleInput, webTextCursor]}
                />
              </View>
            </View>
            {titleError ? <Text style={addStyles.titleError}>{titleError}</Text> : null}
            <TaskTagsRow
              tags={selectedTags}
              placeholder={strings.form.addTags}
              styles={styles}
              onPress={() => setMenu('tags')}
            />
          </View>
          <TaskDescriptionField
            inputRef={descriptionRef}
            value={description}
            done={false}
            fullscreen={expanded}
            placeholder={strings.form.newDescriptionPlaceholder}
            styles={styles}
            onChange={setDescription}
            onFocus={() => {}}
            onBlur={() => {}}
          />
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <View style={styles.footerGroup}>
                <TaskDateButton
                  dueDate={date}
                  showCalendarIcon
                  label={strings.form.dueDate}
                  styles={styles}
                  onPress={() => setShowCalendar(true)}
                />
                <TaskFullscreenButton
                  fullscreen={fullscreen}
                  styles={styles}
                  onPress={() => setFullscreen((prev) => !prev)}
                />
              </View>
              <Pressable
                onPress={() => {
                  void handleSubmit();
                }}
                disabled={submitting}
                accessibilityRole="button"
                style={({ pressed, hovered }) => [
                  addStyles.submitBtn,
                  (pressed || hovered) && !submitting && addStyles.submitBtnPressed,
                  submitting && addStyles.submitBtnDisabled,
                ]}
              >
                <Plus size={16} strokeWidth={2.5} color="#ffffff" />
                <Text style={addStyles.submitText}>
                  {submitting ? strings.form.addingTask : strings.form.addTask}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SheetFrame>
  );
}

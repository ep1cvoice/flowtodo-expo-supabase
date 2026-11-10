import { strings } from '@/shared/lib/strings';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import type { CategoryIcon } from '@/types';
import LabelModal from '@/features/tasks/components/form/LabelModal';
import { useTaskFormStyles } from '@/features/tasks/components/form/taskFormStyles';
import CategoryChipPicker from '@/features/tasks/components/form/CategoryChipPicker';
import TagChipPicker from '@/features/tasks/components/form/TagChipPicker';
import SheetFrame from '@/shared/ui/SheetFrame';
import { useTasks } from '@/features/tasks/TasksContext';
import { useTheme } from '@/shared/providers/ThemeContext';
import { useToast } from '@/shared/providers/ToastContext';
import { categoryCardWash } from '@/shared/lib/color';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import { useAutoFocus } from '@/shared/lib/useAutoFocus';
import { validateTaskTitle, type TaskFormInput } from '@/features/tasks/lib/taskValidation';
import { logger } from '@/shared/lib/logger';

export type { TaskFormInput };

interface TaskFormModalProps {
  visible: boolean;
  heading: string;
  submitLabel: string;
  submittingLabel: string;
  SubmitIcon: LucideIcon;
  initialValues: TaskFormInput;
  syncKey?: unknown;
  disableCloseWhileSubmitting?: boolean;
  resetOnClose?: boolean;
  autoFocusTitle?: boolean;
  failLog: string;
  successToast: string;
  onSubmit: (values: TaskFormInput) => void | Promise<void>;
  onClose: () => void;
}

export default function TaskFormModal({
  visible,
  heading,
  submitLabel,
  submittingLabel,
  SubmitIcon,
  initialValues,
  syncKey,
  disableCloseWhileSubmitting = false,
  resetOnClose = false,
  autoFocusTitle = false,
  failLog,
  successToast,
  onSubmit,
  onClose,
}: TaskFormModalProps) {
  const { isDark } = useTheme();
  const { colors, styles } = useTaskFormStyles();
  const { showToast } = useToast();
  const runToasted = useToastedAction();
  const { categories, tags, addCategory, addTag } = useTasks();

  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [categoryId, setCategoryId] = useState<number | null>(initialValues.categoryId);
  const [tagIds, setTagIds] = useState<number[]>(initialValues.tagIds);
  const [inputError, setInputError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const titleRef = useRef<TextInput>(null);
  useAutoFocus(titleRef, visible && autoFocusTitle);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const selectedCategory = categories.find((cat) => cat.id === categoryId) ?? null;
  const headerStyle = !isDark
    ? {
        backgroundColor: selectedCategory
          ? categoryCardWash(selectedCategory.color, 0.3)
          : colors.chrome,
      }
    : undefined;
  const [showTagModal, setShowTagModal] = useState(false);

  // Callers usually pass a fresh initialValues object every render, so the sync effect reads the
  // latest one through a ref and only re-runs when `visible` or `syncKey` changes.
  const initialValuesRef = useRef(initialValues);
  useEffect(() => {
    initialValuesRef.current = initialValues;
  });

  const applyInitial = useCallback((values: TaskFormInput) => {
    setTitle(values.title);
    setDescription(values.description);
    setCategoryId(values.categoryId);
    setTagIds(values.tagIds);
    setInputError('');
    setSubmitting(false);
    submittingRef.current = false;
  }, []);

  useEffect(() => {
    if (syncKey === undefined || !visible) return;
    applyInitial(initialValuesRef.current);
  }, [visible, syncKey, applyInitial]);

  const reset = () => applyInitial(initialValues);

  const handleClose = () => {
    if (submittingRef.current) return;
    if (resetOnClose) reset();
    onClose();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (inputError) setInputError(validateTaskTitle(value));
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;

    const error = validateTaskTitle(title);
    if (error) {
      setInputError(error);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    const result = await runToasted(async () => {
      await onSubmit({ title, description, categoryId, tagIds });
      showToast(successToast);
      if (resetOnClose) reset();
      onClose();
    }, strings.tasks.saveFailed);
    if (!result.ok) {
      logger.warn(failLog, result.error);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <SheetFrame
      visible={visible}
      onClose={handleClose}
      title={heading}
      titleWeight="500"
      closeDisabled={disableCloseWhileSubmitting && submitting}
      keyboardAvoiding
      cardStyle={styles.card}
      headerStyle={headerStyle}
      accessory={
        <>
          <LabelModal
          kind="category"
            visible={showCategoryModal}
            onClose={() => setShowCategoryModal(false)}
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
            visible={showTagModal}
            onClose={() => setShowTagModal(false)}
            onSave={async (name, color) => {
              const result = await runToasted(async () => {
                const created = await addTag({ name, color });
                setTagIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
                showToast(strings.form.tagCreated);
              }, strings.form.saveTagFailed);
              if (!result.ok) {
                logger.warn('Failed to create tag:', result.error);
                throw result.error;
              }
            }}
          />
        </>
      }>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{strings.form.taskTitle}</Text>
                <TextInput
                  ref={titleRef}
                  value={title}
                  onChangeText={handleTitleChange}
                  placeholder={strings.form.taskTitlePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, inputError ? styles.inputError : null]}
                />
                {!!inputError && <Text style={styles.inputErrorMsg}>{inputError}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{strings.form.description}</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={strings.form.descriptionPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[styles.input, styles.textarea]}
                />
              </View>

              <View style={styles.inputGroup}>
                <CategoryChipPicker
                  categories={categories}
                  selectedId={categoryId}
                  onChange={setCategoryId}
                  onAddPress={() => setShowCategoryModal(true)}
                />
              </View>

              <View style={styles.inputGroup}>
                <TagChipPicker
                  tags={tags}
                  selectedIds={tagIds}
                  onChange={setTagIds}
                  onAddPress={() => setShowTagModal(true)}
                />
              </View>

              <View style={styles.footer}>
                <Pressable
                  onPress={handleClose}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.cancel,
                    pressed && !submitting && styles.cancelPressed,
                    submitting && styles.btnDisabled,
                  ]}>
                  <Text style={styles.cancelText}>{strings.common.cancel}</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.submit,
                    pressed && !submitting && styles.submitPressed,
                    submitting && styles.btnDisabled,
                  ]}>
                  <SubmitIcon size={16} color="#fff" />
                  <Text style={styles.submitText}>
                    {submitting ? submittingLabel : submitLabel}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
    </SheetFrame>
  );
}

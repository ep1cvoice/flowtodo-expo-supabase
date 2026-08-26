import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import type { Category, CategoryIcon, Tag } from '@/types';
import CategoryModal from '@/components/tasks/CategoryModal';
import { useTaskFormStyles } from '@/components/tasks/form/taskFormStyles';
import TagChipPicker from '@/components/tasks/TagChipPicker';
import TagModal from '@/components/tasks/TagModal';
import SheetFrame from '@/components/ui/SheetFrame';
import { useTasks } from '@/context/TasksContext';
import { useToast } from '@/context/ToastContext';
import { toastForError } from '@/lib/networkError';
import { validateTaskTitle, type TaskFormInput } from '@/lib/taskValidation';

export type { TaskFormInput };

interface TaskFormModalProps {
  visible: boolean;
  heading: string;
  submitLabel: string;
  submittingLabel: string;
  SubmitIcon: LucideIcon;
  categories: Category[];
  tags: Tag[];
  initialValues: TaskFormInput;
  syncKey?: unknown;
  disableCloseWhileSubmitting?: boolean;
  resetOnClose?: boolean;
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
  categories,
  tags,
  initialValues,
  syncKey,
  disableCloseWhileSubmitting = false,
  resetOnClose = false,
  failLog,
  successToast,
  onSubmit,
  onClose,
}: TaskFormModalProps) {
  const { colors, styles } = useTaskFormStyles();
  const { showToast } = useToast();
  const { addCategory, addTag } = useTasks();

  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [categoryId, setCategoryId] = useState<number | null>(initialValues.categoryId);
  const [tagIds, setTagIds] = useState<number[]>(initialValues.tagIds);
  const [inputError, setInputError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const applyInitial = (values: TaskFormInput) => {
    setTitle(values.title);
    setDescription(values.description);
    setCategoryId(values.categoryId);
    setTagIds(values.tagIds);
    setInputError('');
    setSubmitting(false);
    submittingRef.current = false;
  };

  useEffect(() => {
    if (syncKey === undefined || !visible) return;
    applyInitial(initialValues);
  }, [visible, syncKey]);

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
    try {
      await onSubmit({ title, description, categoryId, tagIds });
      showToast(successToast);
      if (resetOnClose) reset();
      onClose();
    } catch (err) {
      console.warn(failLog, err);
      showToast(toastForError(err, 'Could not save task.'), 'error');
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
      accessory={
        <>
          <CategoryModal
            visible={showCategoryModal}
            onClose={() => setShowCategoryModal(false)}
            onSave={async (name, color, icon) => {
              try {
                const created = await addCategory({ name, color, icon: icon as CategoryIcon });
                setCategoryId(created.id);
                showToast('Category created.');
              } catch (err) {
                console.warn('Failed to create category:', err);
                showToast(toastForError(err, 'Could not save category.'), 'error');
                throw err;
              }
            }}
          />
          <TagModal
            visible={showTagModal}
            onClose={() => setShowTagModal(false)}
            onSave={async (name, color) => {
              try {
                const created = await addTag({ name, color });
                setTagIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
                showToast('Tag created.');
              } catch (err) {
                console.warn('Failed to create tag:', err);
                showToast(toastForError(err, 'Could not save tag.'), 'error');
                throw err;
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
                <Text style={styles.label}>Task Title</Text>
                <TextInput
                  value={title}
                  onChangeText={handleTitleChange}
                  placeholder="Enter task title..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, inputError ? styles.inputError : null]}
                />
                {!!inputError && <Text style={styles.inputErrorMsg}>{inputError}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter description..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[styles.input, styles.textarea]}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Category (optional)</Text>
                  <Pressable
                    onPress={() => setShowCategoryModal(true)}
                    hitSlop={8}
                    style={styles.newLinkBtn}>
                    <Text style={styles.newLink}>+ New</Text>
                  </Pressable>
                </View>
                <View style={styles.categoryList}>
                  <Pressable
                    onPress={() => setCategoryId(null)}
                    style={[
                      styles.categoryChip,
                      categoryId === null && styles.categoryChipSelected,
                    ]}>
                    <Text
                      style={[
                        styles.categoryChipText,
                        categoryId === null && styles.categoryChipTextSelected,
                      ]}>
                      No category
                    </Text>
                  </Pressable>
                  {categories.map((cat) => {
                    const selected = categoryId === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setCategoryId(cat.id)}
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
                  <Text style={styles.cancelText}>Cancel</Text>
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

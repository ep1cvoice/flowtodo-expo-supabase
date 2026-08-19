import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { X, Pencil } from 'lucide-react-native';
import type { Category, CategoryIcon, Tag, Task } from '@/types';
import CategoryModal from '@/components/tasks/CategoryModal';
import TagChipPicker from '@/components/tasks/TagChipPicker';
import TagModal from '@/components/tasks/TagModal';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTasks } from '@/context/TasksContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { toastForError } from '@/lib/networkError';
import { webInteractive } from '@/utils/pressableWeb';

export interface EditTaskUpdates {
  title: string;
  description: string;
  categoryId: number | null;
  tagIds: number[];
}

interface EditTaskModalProps {
  visible: boolean;
  task: Task;
  onUpdate: (id: number, updates: EditTaskUpdates) => void | Promise<void>;
  onClose: () => void;
  categories: Category[];
  tags: Tag[];
}

export default function EditTaskModal({
  visible,
  task,
  onUpdate,
  onClose,
  categories,
  tags,
}: EditTaskModalProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 480;
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { addCategory, addTag } = useTasks();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [categoryId, setCategoryId] = useState<number | null>(task.categoryId);
  const [tagIds, setTagIds] = useState<number[]>((task.tags ?? []).map((t) => t.id));
  const [inputError, setInputError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(task.title);
    setDescription(task.description || '');
    setCategoryId(task.categoryId);
    setTagIds((task.tags ?? []).map((t) => t.id));
    setInputError('');
    setSubmitting(false);
    submittingRef.current = false;
  }, [visible, task]);

  const validateTitle = (value: string): string => {
    if (!value.trim()) return 'Title is required';
    if (value.length > 50) return 'Title must be less than 50 characters';
    const allowedPattern = /^[\p{L}\p{N}\s.,!?'"/:()#\p{Pd}]+$/u;
    if (!allowedPattern.test(value)) {
      return 'Title contains unsupported characters.';
    }
    return '';
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (inputError) setInputError(validateTitle(value));
  };

  const handleClose = () => {
    if (submittingRef.current) return;
    onClose();
  };

  const handleSave = async () => {
    if (submittingRef.current) return;

    const error = validateTitle(title);
    if (error) {
      setInputError(error);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onUpdate(task.id, { title, description, categoryId, tagIds });
      showToast('Task updated.');
      onClose();
    } catch (err) {
      console.warn('Failed to update task:', err);
      showToast(toastForError(err, 'Could not save task.'), 'error');
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.overlay, isMobile && styles.overlayMobile]} onPress={handleClose}>
          <Pressable
            style={[styles.modal, isMobile && styles.modalMobile]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit Task</Text>
              <Pressable
                onPress={handleClose}
                disabled={submitting}
                style={styles.closeBtn}
                hitSlop={8}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
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
                  onPress={handleSave}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.save,
                    pressed && !submitting && styles.savePressed,
                    submitting && styles.btnDisabled,
                  ]}>
                  <Pencil size={16} color="#fff" />
                  <Text style={styles.saveText}>{submitting ? 'Saving…' : 'Save changes'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

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
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
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
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    title: {
      color: colors.textPrimary,
      fontWeight: '500',
      fontSize: 18,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
    },
    form: {
      padding: 18,
      gap: 16,
    },
    inputGroup: {
      gap: 6,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      color: colors.textSecondary,
      fontSize: 15,
      marginBottom: 2,
    },
    newLinkBtn: {
      ...webInteractive,
    },
    newLink: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    input: {
      width: '100%',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      color: colors.textPrimary,
      fontSize: 15,
    },
    textarea: {
      minHeight: 88,
    },
    inputError: {
      borderColor: colors.red,
      backgroundColor: colors.sidebarLogoutHover,
    },
    inputErrorMsg: {
      marginTop: 2,
      color: colors.red,
      fontSize: 13,
    },
    categoryList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    categoryChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
    },
    categoryChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    categoryChipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    categoryChipTextSelected: {
      fontWeight: '600',
      color: colors.primary,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 6,
    },
    btn: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cancel: {
      backgroundColor: 'transparent',
    },
    cancelPressed: {
      backgroundColor: colors.bgSurface,
    },
    cancelText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    save: {
      backgroundColor: colors.primary,
    },
    savePressed: {
      backgroundColor: colors.primaryHover,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    saveText: {
      fontSize: 14,
      color: '#fff',
      fontWeight: '600',
    },
  });
}

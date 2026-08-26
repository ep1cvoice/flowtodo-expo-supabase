import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Check } from 'lucide-react-native';
import type { Tag } from '@/types';
import { PALETTE_COLORS } from '@/constants/palette';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import SheetFrame from '@/components/ui/SheetFrame';
import { webInteractive } from '@/utils/pressableWeb';

interface TagModalProps {
  visible: boolean;
  tag?: Tag | null;
  onSave: (name: string, color: string) => void | Promise<void>;
  onClose: () => void;
}

export default function TagModal({ visible, tag = null, onSave, onClose }: TagModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('#64748b');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(tag?.name ?? '');
    setSelectedColor(tag?.color ?? '#64748b');
    setNameError('');
  }, [visible, tag]);

  const validate = (value: string): string => {
    if (!value.trim()) return 'Name is required';
    if (value.startsWith('#')) return "Don't include the # — it's added automatically";
    if (/\s/.test(value)) return 'Tag names cannot contain spaces';
    if (value.length > 30) return 'Name must be 30 characters or less';
    if (!/^[\p{L}\p{N}_\-]+$/u.test(value.trim())) {
      return 'Only letters, numbers, underscores and hyphens allowed';
    }
    return '';
  };

  const handleSave = async () => {
    const error = validate(name);
    if (error) {
      setNameError(error);
      return;
    }
    try {
      await onSave(name.trim(), selectedColor);
      onClose();
    } catch (err) {
      console.warn('Failed to save tag:', err);
      setNameError('Could not save tag. Try again.');
    }
  };

  return (
    <SheetFrame
      visible={visible}
      onClose={onClose}
      title={tag ? 'Edit Tag' : 'Add Tag'}
      keyboardAvoiding
      cardStyle={styles.card}>
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    if (nameError) setNameError(validate(value));
                  }}
                  placeholder="e.g. urgent, idea, blocked..."
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  maxLength={30}
                  autoCapitalize="none"
                  style={[styles.input, nameError ? styles.inputError : null]}
                />
                {!!nameError && <Text style={styles.inputErrorMsg}>{nameError}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Color</Text>
                <View style={styles.colorGrid}>
                  {PALETTE_COLORS.map((color) => {
                    const selected = selectedColor === color;
                    return (
                      <Pressable
                        key={color}
                        onPress={() => setSelectedColor(color)}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          selected && styles.colorSelected,
                        ]}>
                        {selected ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.footer}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed, hovered }) => [
                    styles.btn,
                    styles.cancel,
                    (hovered || pressed) && styles.cancelPressed,
                  ]}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  style={({ pressed, hovered }) => [
                    styles.btn,
                    styles.save,
                    (hovered || pressed) && styles.savePressed,
                  ]}>
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
    </SheetFrame>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      maxHeight: '90%',
      overflow: 'hidden',
    },
    form: {
      padding: 18,
      gap: 16,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '500',
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
    inputError: {
      borderColor: colors.red,
      backgroundColor: colors.sidebarLogoutHover,
    },
    inputErrorMsg: {
      color: colors.red,
      fontSize: 13,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorOption: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...webInteractive,
    },
    colorSelected: {
      borderWidth: 2,
      borderColor: '#fff',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 4,
    },
    btn: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      ...webInteractive,
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
      fontWeight: '500',
    },
    save: {
      backgroundColor: colors.primary,
    },
    savePressed: {
      backgroundColor: colors.primaryHover,
    },
    saveText: {
      fontSize: 14,
      color: '#fff',
      fontWeight: '600',
    },
  });
}

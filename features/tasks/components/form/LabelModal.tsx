import { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { Check } from 'lucide-react-native';
import type { Category, CategoryIcon, Tag } from '@/types';
import { CATEGORY_ICON_MAP, CATEGORY_ICONS } from '@/shared/constants/categoryIcons';
import { PALETTE_COLORS } from '@/shared/constants/palette';
import { createLabelModalStyles } from '@/features/tasks/components/form/labelModalStyles';
import SheetFrame from '@/shared/ui/SheetFrame';
import { useTheme } from '@/shared/providers/ThemeContext';
import { useAutoFocus } from '@/shared/lib/useAutoFocus';

type BaseProps = {
  visible: boolean;
  onClose: () => void;
};

export type LabelModalProps =
  | (BaseProps & {
      kind: 'category';
      item?: Category | null;
      onSave: (name: string, color: string, icon: CategoryIcon) => void | Promise<void>;
    })
  | (BaseProps & {
      kind: 'tag';
      item?: Tag | null;
      onSave: (name: string, color: string) => void | Promise<void>;
    });

interface KindConfig {
  noun: string;
  placeholder: string;
  maxLength: number;
  defaultColor: string;
  hasIcon: boolean;
  autoCapitalize?: 'none';
  validate: (value: string) => string;
}

const CONFIG: Record<LabelModalProps['kind'], KindConfig> = {
  category: {
    noun: 'Category',
    placeholder: 'e.g. Work, Health...',
    maxLength: 15,
    defaultColor: PALETTE_COLORS[0],
    hasIcon: true,
    validate: (value) => {
      if (!value.trim()) return 'Name is required';
      if (value.length > 15) return 'Name must be 15 characters or less';
      if (!/^[\p{L}\p{N}\s\-]+$/u.test(value.trim())) {
        return 'Only letters, numbers, spaces and hyphens allowed';
      }
      return '';
    },
  },
  tag: {
    noun: 'Tag',
    placeholder: 'e.g. urgent, idea, blocked...',
    maxLength: 30,
    defaultColor: '#64748b',
    hasIcon: false,
    autoCapitalize: 'none',
    validate: (value) => {
      if (!value.trim()) return 'Name is required';
      if (value.startsWith('#')) return "Don't include the # — it's added automatically";
      if (/\s/.test(value)) return 'Tag names cannot contain spaces';
      if (value.length > 30) return 'Name must be 30 characters or less';
      if (!/^[\p{L}\p{N}_\-]+$/u.test(value.trim())) {
        return 'Only letters, numbers, underscores and hyphens allowed';
      }
      return '';
    },
  },
};

export default function LabelModal(props: LabelModalProps) {
  const { visible, onClose, kind } = props;
  const item = props.item ?? null;
  const cfg = CONFIG[kind];

  const { colors } = useTheme();
  const styles = useMemo(() => createLabelModalStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(cfg.defaultColor);
  const [selectedIcon, setSelectedIcon] = useState<CategoryIcon>(CATEGORY_ICONS[0]);
  const [nameError, setNameError] = useState('');
  const nameRef = useRef<TextInput>(null);
  useAutoFocus(nameRef, visible);

  useEffect(() => {
    if (!visible) return;
    setName(item?.name ?? '');
    setSelectedColor(item?.color ?? cfg.defaultColor);
    if (kind === 'category') {
      setSelectedIcon(((item as Category | null)?.icon as CategoryIcon) || CATEGORY_ICONS[0]);
    }
    setNameError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item, kind]);

  const handleSave = async () => {
    const error = cfg.validate(name);
    if (error) {
      setNameError(error);
      return;
    }
    try {
      if (props.kind === 'category') {
        await props.onSave(name.trim(), selectedColor, selectedIcon);
      } else {
        await props.onSave(name.trim(), selectedColor);
      }
      onClose();
    } catch (err) {
      console.warn(`Failed to save ${kind}:`, err);
      setNameError(`Could not save ${kind}. Try again.`);
    }
  };

  return (
    <SheetFrame
      visible={visible}
      onClose={onClose}
      title={`${item ? 'Edit' : 'Add'} ${cfg.noun}`}
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
              if (nameError) setNameError(cfg.validate(value));
            }}
            placeholder={cfg.placeholder}
            placeholderTextColor={colors.textMuted}
            maxLength={cfg.maxLength}
            autoCapitalize={cfg.autoCapitalize}
            style={[styles.input, nameError ? styles.inputError : null]}
            ref={nameRef}
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

        {cfg.hasIcon && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICONS.map((iconKey) => {
                const Icon = CATEGORY_ICON_MAP[iconKey];
                const selected = selectedIcon === iconKey;
                return (
                  <Pressable
                    key={iconKey}
                    onPress={() => setSelectedIcon(iconKey)}
                    style={[
                      styles.iconOption,
                      selected && {
                        borderColor: selectedColor,
                        backgroundColor: `${selectedColor}22`,
                      },
                    ]}>
                    <Icon
                      size={20}
                      color={selected ? selectedColor : colors.textSecondary}
                      strokeWidth={2}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

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

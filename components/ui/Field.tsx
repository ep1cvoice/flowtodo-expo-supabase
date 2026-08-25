import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type InputType = 'text' | 'email' | 'password';

interface FieldProps {
  innerText?: string;
  Icon?: LucideIcon;
  id?: string;
  type?: InputType;
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoFocus?: boolean;
  editable?: boolean;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
}

export default function Field({
  innerText,
  Icon,
  type = 'text',
  label,
  value,
  onChangeText,
  error,
  autoCapitalize = 'none',
  autoFocus,
  editable = true,
  onSubmitEditing,
}: FieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const isPassword = type === 'password';
  const secure = isPassword && !showPassword;

  useEffect(() => {
    if (!showPassword) return;
    const timer = setTimeout(() => setShowPassword(false), 3000);
    return () => clearTimeout(timer);
  }, [showPassword]);

  return (
    <View style={styles.field}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputWrapper}>
        {Icon && (
          <View style={styles.icon}>
            <Icon
              size={20}
              color={focused && !error ? colors.primary : colors.textMuted}
            />
          </View>
        )}

        <TextInput
          style={[
            styles.input,
            error ? styles.inputError : null,
            focused && !error ? styles.inputFocused : null,
            Icon ? styles.inputWithIcon : null,
            isPassword ? styles.inputWithEye : null,
          ]}
          placeholder={innerText}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoFocus={autoFocus}
          editable={editable}
          keyboardType={type === 'email' ? 'email-address' : 'default'}
          returnKeyType={onSubmitEditing ? 'go' : 'done'}
          onSubmitEditing={onSubmitEditing}
          textContentType={type === 'password' ? 'password' : type === 'email' ? 'emailAddress' : 'none'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {isPassword && (
          <Pressable
            style={styles.eyeIcon}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}>
            {showPassword ? (
              <Eye size={20} color={colors.textMuted} />
            ) : (
              <EyeOff size={20} color={colors.textMuted} />
            )}
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    field: {
      flexDirection: 'column',
      gap: 6,
      width: '100%',
    },
    label: {
      color: colors.textSecondary,
      fontSize: 14.4,
      fontWeight: '500',
    },
    inputWrapper: {
      position: 'relative',
      width: '100%',
      justifyContent: 'center',
    },
    input: {
      width: '100%',
      height: tokens.inputHeight,
      paddingHorizontal: 16,
      borderRadius: tokens.borderRadius,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      color: colors.textPrimary,
      fontSize: 15.2,
    },
    inputWithIcon: {
      paddingLeft: 46,
    },
    inputWithEye: {
      paddingRight: 46,
    },
    inputFocused: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 2,
    },
    inputError: {
      borderColor: colors.red,
      backgroundColor: colors.sidebarLogoutHover,
    },
    icon: {
      position: 'absolute',
      left: 14,
      zIndex: 1,
    },
    eyeIcon: {
      position: 'absolute',
      right: 15,
      zIndex: 1,
    },
    error: {
      fontSize: 12.8,
      color: colors.red,
      marginLeft: 4,
    },
  });
}

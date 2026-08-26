import { type ReactNode, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import AppModal from '@/components/ui/AppModal';
import type { AppColors } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

export const SHEET_MOBILE_BREAKPOINT = 480;

type HeaderMode = 'bar' | 'plain' | 'none';

interface SheetFrameProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  headerRight?: ReactNode;
  header?: HeaderMode;
  compactHeader?: boolean;
  titleWeight?: '500' | '600';
  closeDisabled?: boolean;
  keyboardAvoiding?: boolean;
  maxWidth?: number;
  cardStyle?: StyleProp<ViewStyle>;
  mobileCardStyle?: StyleProp<ViewStyle>;
  accessory?: ReactNode;
}

export default function SheetFrame({
  visible,
  onClose,
  children,
  title,
  headerRight,
  header = 'bar',
  compactHeader = false,
  titleWeight,
  closeDisabled = false,
  keyboardAvoiding = false,
  maxWidth = 420,
  cardStyle,
  mobileCardStyle,
  accessory,
}: SheetFrameProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < SHEET_MOBILE_BREAKPOINT;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedTitleWeight = titleWeight ?? (header === 'plain' ? '500' : '600');

  const card = (
    <Pressable
      style={[
        styles.card,
        { maxWidth },
        cardStyle,
        isMobile && styles.cardMobile,
        isMobile && mobileCardStyle,
      ]}
      onPress={(e) => e.stopPropagation()}>
      {header !== 'none' && title ? (
        <View
          style={[
            header === 'bar' && styles.headerBar,
            header === 'bar' && (compactHeader ? styles.headerBarCompact : styles.headerBarDefault),
            header === 'plain' && styles.headerPlain,
          ]}>
          <Text
            style={[
              styles.title,
              { fontWeight: resolvedTitleWeight },
              header === 'plain' && styles.titlePlain,
            ]}
            numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerActions}>
            {headerRight}
            <Pressable
              onPress={onClose}
              disabled={closeDisabled}
              style={[styles.closeBtn, header === 'plain' && styles.closeBtnPlain]}
              hitSlop={8}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      ) : null}
      {children}
    </Pressable>
  );

  const overlay = (
    <Pressable style={[styles.overlay, isMobile && styles.overlayMobile]} onPress={onClose}>
      {card}
    </Pressable>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {overlay}
    </KeyboardAvoidingView>
  ) : (
    overlay
  );

  return (
    <AppModal visible={visible} onClose={onClose}>
      {body}
      {accessory}
    </AppModal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
    },
    overlayMobile: {
      justifyContent: 'flex-end',
    },
    card: {
      width: '100%',
      backgroundColor: colors.bgContent,
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: tokens.borderRadius,
      ...tokens.shadow,
    },
    cardMobile: {
      marginBottom: 16,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.bgSurface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
      gap: 8,
    },
    headerBarCompact: {
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    headerBarDefault: {
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    headerPlain: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 8,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      flex: 1,
    },
    titlePlain: {
      fontWeight: '500',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    closeBtnPlain: {
      padding: 4,
    },
  });
}

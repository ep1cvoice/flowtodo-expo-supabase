import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import SheetFrame from '@/components/ui/SheetFrame';
import type { AppColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  embedded?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  embedded = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const locked = busy || pending;

  useEffect(() => {
    if (visible) return;
    pendingRef.current = false;
    setPending(false);
  }, [visible]);

  const handleClose = () => {
    if (locked) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (busy || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await onConfirm();
    } catch (err) {
      console.warn('Confirmation action failed:', err);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <SheetFrame
      visible={visible}
      embedded={embedded}
      onClose={handleClose}
      header="none"
      centered
      maxWidth={360}
      closeDisabled={locked}
      overlayStyle={embedded ? styles.embeddedScrim : undefined}
      cardStyle={styles.card}>
      <View accessibilityRole="alert" style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Pressable
            style={({ pressed, hovered }) => [
              styles.btn,
              styles.cancelBtn,
              (hovered || pressed) && !locked && styles.cancelBtnPressed,
              locked && styles.btnDisabled,
            ]}
            onPress={handleClose}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            style={({ pressed, hovered }) => [
              styles.btn,
              styles.confirmBtn,
              (hovered || pressed) && !locked && styles.confirmBtnPressed,
              locked && styles.btnDisabled,
            ]}
            onPress={() => {
              void handleConfirm();
            }}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}>
            <Text style={styles.confirmText}>{locked ? `${confirmLabel}…` : confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </SheetFrame>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    embeddedScrim: {
      backgroundColor: colors.overlayBg,
    },
    card: {
      backgroundColor: colors.bgSurface,
      padding: 20,
    },
    body: {
      gap: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    btn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      ...webInteractive,
    },
    cancelBtn: {
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgTodoItem,
    },
    cancelBtnPressed: {
      backgroundColor: colors.bgCardHover,
    },
    cancelText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    confirmBtn: {
      backgroundColor: colors.red,
    },
    confirmBtnPressed: {
      backgroundColor: colors.redHover,
    },
    confirmText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    btnDisabled: {
      opacity: 0.6,
    },
  });
}

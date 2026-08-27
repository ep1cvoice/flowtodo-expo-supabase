import { type ReactNode, useEffect, useRef } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useKeyboardHeight } from '@/lib/useKeyboardBottomInset';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

let webModalZ = 9999;

export default function AppModal({ visible, onClose, children }: AppModalProps) {
  const { colors } = useTheme();
  const keyboardInset = useKeyboardHeight();
  const rootRef = useRef<View>(null);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const node = rootRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.parentElement === 'undefined') return;

    let el: HTMLElement | null = node;
    while (el) {
      if (window.getComputedStyle(el).position === 'fixed') {
        webModalZ += 1;
        el.style.zIndex = String(webModalZ);
        break;
      }
      el = el.parentElement;
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View ref={rootRef} style={styles.root}>
        <View style={[styles.dim, { backgroundColor: colors.overlayBg }]} pointerEvents="none" />
        <View style={[styles.content, { paddingBottom: keyboardInset }]} pointerEvents="box-none">
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
  },
});

import { type ReactNode, useEffect, useRef } from 'react';
import { Modal, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
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
  const { width, height } = useWindowDimensions();
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
      navigationBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}>
      <View
        ref={rootRef}
        collapsable={false}
        style={[styles.root, { width, height }]}>
        <View
          style={[
            styles.dim,
            { backgroundColor: colors.overlayBg, pointerEvents: 'none' },
          ]}
        />
        <View
          style={[
            styles.content,
            { paddingBottom: keyboardInset, pointerEvents: 'box-none' },
          ]}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  dim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  content: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

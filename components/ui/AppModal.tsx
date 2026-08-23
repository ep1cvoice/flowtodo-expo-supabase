import { type ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useKeyboardHeight } from '@/lib/useKeyboardBottomInset';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function AppModal({ visible, onClose, children }: AppModalProps) {
  const { colors } = useTheme();
  const keyboardInset = useKeyboardHeight();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
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

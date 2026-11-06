import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

function useAndroidKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return Platform.OS === 'android' ? height : 0;
}

/** Full keyboard height on Android. Use on screens that do not already resize. */
export function useKeyboardHeight() {
  return useAndroidKeyboardHeight();
}

/**
 * Keyboard space that is not already taken by a window resize.
 * Use in modals — Expo Go often resizes, native often overlays.
 */
export function useKeyboardBottomInset() {
  const keyboardHeight = useAndroidKeyboardHeight();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const maxHeight = useRef(windowHeight);
  const lastWidth = useRef(windowWidth);

  if (windowWidth !== lastWidth.current) {
    lastWidth.current = windowWidth;
    maxHeight.current = windowHeight;
  } else if (windowHeight > maxHeight.current) {
    maxHeight.current = windowHeight;
  }

  if (keyboardHeight === 0) return 0;

  const alreadyResized = Math.max(0, maxHeight.current - windowHeight);
  return Math.max(0, keyboardHeight - alreadyResized);
}

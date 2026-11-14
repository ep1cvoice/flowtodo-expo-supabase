import { useEffect, useState } from 'react';
import { Keyboard, useWindowDimensions } from 'react-native';
import { isAndroid } from '@/shared/lib/platform';

function useAndroidKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!isAndroid) return;

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

  return isAndroid ? height : 0;
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
  // Tallest window height seen at the current width (a rotation resets it). Updated while
  // rendering; the local value is used right away, the state keeps it for later renders.
  const [seen, setSeen] = useState({ width: windowWidth, maxHeight: windowHeight });
  let maxHeight = seen.maxHeight;
  if (windowWidth !== seen.width) {
    maxHeight = windowHeight;
    setSeen({ width: windowWidth, maxHeight });
  } else if (windowHeight > seen.maxHeight) {
    maxHeight = windowHeight;
    setSeen({ width: windowWidth, maxHeight });
  }

  if (keyboardHeight === 0) return 0;

  const alreadyResized = Math.max(0, maxHeight - windowHeight);
  return Math.max(0, keyboardHeight - alreadyResized);
}

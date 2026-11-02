import { type RefObject, useEffect } from 'react';
import { Platform, type TextInput } from 'react-native';

const DEFAULT_DELAY = Platform.OS === 'android' ? 350 : 50;

export function useAutoFocus(
  ref: RefObject<TextInput | null>,
  active: boolean,
  delayMs: number = DEFAULT_DELAY,
) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => ref.current?.focus(), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs, ref]);
}

import { type RefObject, useEffect } from 'react';
import { type TextInput } from 'react-native';
import { isAndroid } from '@/shared/lib/platform';

const DEFAULT_DELAY = isAndroid ? 350 : 50;

export function useAutoFocus(
  ref: RefObject<TextInput | null>,
  active: boolean,
  delayMs: number = DEFAULT_DELAY
) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => ref.current?.focus(), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs, ref]);
}

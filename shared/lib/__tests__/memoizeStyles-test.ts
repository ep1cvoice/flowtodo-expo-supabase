import { memoizeStyles } from '@/shared/lib/memoizeStyles';
import { darkColors, lightColors } from '@/shared/constants/theme';

describe('memoizeStyles', () => {
  it('creates styles once per (colors, isDark) pair', () => {
    const create = jest.fn((_colors, isDark: boolean) => ({ isDark }));
    const get = memoizeStyles(create);

    const a = get(lightColors, false);
    expect(get(lightColors, false)).toBe(a);
    expect(create).toHaveBeenCalledTimes(1);

    const b = get(lightColors, true);
    expect(b).not.toBe(a);
    const c = get(darkColors, true);
    expect(c).not.toBe(b);
    expect(get(darkColors, true)).toBe(c);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('keeps separate caches per memoized factory', () => {
    const first = memoizeStyles(() => ({}));
    const second = memoizeStyles(() => ({}));
    expect(first(lightColors, false)).not.toBe(second(lightColors, false));
  });
});

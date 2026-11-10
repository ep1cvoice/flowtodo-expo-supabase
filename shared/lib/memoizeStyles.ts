import type { AppColors } from '@/shared/constants/theme';

// Module-level cache for theme-dependent StyleSheets, keyed by (colors, isDark). Components that
// are rendered many times (list items) share one StyleSheet per theme instead of one per instance.
export function memoizeStyles<T>(create: (colors: AppColors, isDark: boolean) => T) {
  const cache = new WeakMap<AppColors, { light?: T; dark?: T }>();

  return (colors: AppColors, isDark: boolean): T => {
    let entry = cache.get(colors);
    if (!entry) {
      entry = {};
      cache.set(colors, entry);
    }
    const key = isDark ? 'dark' : 'light';
    return (entry[key] ??= create(colors, isDark));
  };
}

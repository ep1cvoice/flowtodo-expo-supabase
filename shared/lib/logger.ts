/**
 * Unified logger. Single place to route diagnostics (e.g. to a crash reporter later).
 * Debug output is suppressed in production builds.
 */
type LogArgs = unknown[];

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const logger = {
  debug: (...args: LogArgs) => {
    if (isDev) console.debug(...args);
  },
  warn: (...args: LogArgs) => {
    console.warn(...args);
  },
  error: (...args: LogArgs) => {
    console.error(...args);
  },
};

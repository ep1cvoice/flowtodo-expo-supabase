export type PomodoroMode = 'countdown' | 'countup';

/** Seconds to show on the clock: time left when counting down, time spent when counting up. */
export function displaySeconds(mode: PomodoroMode, elapsed: number, duration: number): number {
  return mode === 'countup' ? elapsed : duration - elapsed;
}

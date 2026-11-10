/** Delay before a long press starts dragging a task in the sortable list. */
export const DRAG_ACTIVATION_DELAY_MS = 450;

/** Timeout for loading/refreshing tasks (and seeding demo data). */
export const TASKS_REFRESH_TIMEOUT_MS = 15_000;

/** Timeout for loading/refreshing the Pomodoro state. */
export const POMO_REFRESH_TIMEOUT_MS = 12_000;

/** Timeout of the PBKDF2 derivation inside the hidden WebView. */
export const PBKDF2_WEBVIEW_TIMEOUT_MS = 15_000;

/**
 * Outer timeout around the WebView call. Deliberately a little longer than the
 * WebView's own timeout so the inner one fires (and reports) first.
 */
export const PBKDF2_WEBVIEW_OUTER_TIMEOUT_MS = PBKDF2_WEBVIEW_TIMEOUT_MS + 1_000;

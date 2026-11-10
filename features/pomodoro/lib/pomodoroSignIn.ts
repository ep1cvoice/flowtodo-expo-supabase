// Remembers that the user just signed in during this app session, so PomodoroProvider can tell
// a login (continue the session frozen on logout) from an app restart with a stored session
// (a pomodoro paused by hand must stay paused).
let signedInUserId: string | null = null;

export function markPomodoroSignIn(userId: string) {
  signedInUserId = userId;
}

/** True once per sign-in for this user; later calls return false. */
export function consumePomodoroSignIn(userId: string): boolean {
  const fresh = signedInUserId === userId;
  if (fresh) signedInUserId = null;
  return fresh;
}

export function clearPomodoroSignIn() {
  signedInUserId = null;
}

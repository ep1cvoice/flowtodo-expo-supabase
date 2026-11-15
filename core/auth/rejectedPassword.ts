/** True when Supabase Auth refused the password itself (not a network or server failure). */
export function isRejectedPassword(
  err: { message?: string; status?: number; code?: string } | null
): boolean {
  if (!err) return false;
  if (err.code === 'invalid_credentials') return true;
  const message = (err.message ?? '').toLowerCase();
  return (
    message.includes('invalid login credentials') ||
    message.includes('invalid password') ||
    message.includes('email not confirmed')
  );
}

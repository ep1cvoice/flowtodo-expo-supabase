/**
 * Validated public environment variables.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` only when written as a static
 * dot-notation reference, so each variable is read literally below.
 */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ),
};

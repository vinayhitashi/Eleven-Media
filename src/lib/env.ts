/**
 * Centralised environment access. Server-only secrets are read lazily so that
 * importing this module on the client never leaks them (they're undefined there).
 */
export const env = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? "",
    cronSecret: process.env.CRON_SECRET ?? "",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    youtubeApiKey: process.env.YOUTUBE_API_KEY ?? "",
  };
}

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** The minimum configuration for the app to run: Supabase (public + service role). */
export function isConfigured() {
  return isSupabaseConfigured() && Boolean(serverEnv().serviceRoleKey);
}

export function configStatus() {
  const s = serverEnv();
  return {
    supabase: isSupabaseConfigured(),
    serviceRole: Boolean(s.serviceRoleKey),
    encryptionKey: Boolean(s.tokenEncryptionKey),
    cronSecret: Boolean(s.cronSecret),
    googleOAuth: Boolean(s.googleClientId && s.googleClientSecret),
    youtubeApiKey: Boolean(s.youtubeApiKey),
  };
}

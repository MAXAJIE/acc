function readEnv(...names: string[]) {
  const processEnv = typeof process !== "undefined" ? process.env : undefined;
  const viteEnv = import.meta.env as Record<string, string | undefined>;

  for (const name of names) {
    const value = processEnv?.[name] ?? viteEnv?.[name];
    if (value) return value;
  }

  return undefined;
}

export function getSupabaseUrl() {
  return readEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
}

export function getSupabasePublishableKey() {
  return readEnv(
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
  );
}

export function getSupabaseServiceRoleKey() {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function requireSupabasePublicEnv() {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL or VITE_SUPABASE_URL"] : []),
      ...(!publishableKey
        ? ["SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY"]
        : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(
      ", ",
    )}. Copy .env.example to .env and set your project URL and publishable key.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return { url, publishableKey };
}

export function requireSupabaseServiceRoleEnv() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL or VITE_SUPABASE_URL"] : []),
      ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(
      ", ",
    )}. SUPABASE_SERVICE_ROLE_KEY is only needed for privileged admin scripts; normal local login and first-dealer bootstrap do not require it.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return { url, serviceRoleKey };
}
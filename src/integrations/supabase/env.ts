const DEFAULT_SUPABASE_URL = "https://xvijbmcpqfmjbujspzlc.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WZgeuQO2YC4PxDcOnegh7A_Pw8yfkiy";

export function getSupabaseUrl() {
  return (
    (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined) ||
    import.meta.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  );
}

export function getSupabasePublishableKey() {
  return (
    (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined) ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseServiceRoleKey() {
  return typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined;
}

export function requireSupabasePublicEnv() {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL or VITE_SUPABASE_URL"] : []),
      ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Add them to your local .env.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return { url, publishableKey };
}

export function requireSupabaseAdminEnv() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL or VITE_SUPABASE_URL"] : []),
      ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Add SUPABASE_SERVICE_ROLE_KEY only for privileged local admin tasks.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return { url, serviceRoleKey };
}
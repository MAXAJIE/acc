// Public Supabase config.
//
// These two values are PUBLIC by design (RLS-gated publishable key +
// project URL). They are already committed to `.env` and `.env.example`
// and are inlined into the browser bundle by Vite.
//
// We also export them as plain constants so that server code running on
// Cloudflare Workers (where `process.env.*` is only populated from
// `wrangler.toml [vars]` / `wrangler secret put`, NOT from `.env`) has a
// reliable fallback. Without this, `npx wrangler deploy` produces a
// worker that throws "Missing Supabase environment variable(s):
// SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY" on the first request.
//
// The SERVICE ROLE key is NOT included here — it is a real secret and
// must be provisioned with `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`.

export const PUBLIC_SUPABASE_URL: string =
  (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ??
  (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined) ??
  "https://xvijbmcpqfmjbujspzlc.supabase.co";

export const PUBLIC_SUPABASE_PUBLISHABLE_KEY: string =
  (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined) ??
  "sb_publishable_WZgeuQO2YC4PxDcOnegh7A_Pw8yfkiy";

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Bootstrap: if NO dealer_admin exists yet, calling user claims the role.
 * Backed by SECURITY DEFINER RPC `public.bootstrap_dealer()` so no
 * service_role key is required. The dealer keeps the role until they
 * voluntarily resign via `resignDealer`.
 */
export const bootstrapDealer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("bootstrap_dealer" as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Dealer voluntarily gives up their dealer_admin role. */
export const resignDealer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("resign_dealer" as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Dealer creates an agent seat and (optionally) links it to a user account.
 * For MVP we let the dealer assign the "agent" role to any user id.
 */
export const grantAgentRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("grant_agent_role" as any, {
      _user_id: data.user_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Return current caller's role(s). */
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r: { role: string }) => r.role);
    const { data: dealerExists } = await context.supabase.rpc("dealer_exists" as any);
    return {
      userId: context.userId,
      is_dealer: roles.includes("dealer_admin"),
      is_agent: roles.includes("agent"),
      dealer_exists: dealerExists === true,
      roles,
    };
  });

/** App settings (public read via anon, dealer-only update). */
export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client.from("app_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      default_commission_percent: z.number().min(0).max(100),
      aging_alert_days: z.number().int().min(1).max(365),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isDealer } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "dealer_admin",
    });
    if (!isDealer) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("app_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

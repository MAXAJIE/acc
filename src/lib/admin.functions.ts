import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireSupabasePublicEnv } from "@/integrations/supabase/env";
import { z } from "zod";

/**
 * Bootstrap route: if NO dealer_admin exists in the whole app, allow the
 * calling user to claim the role. Otherwise deny. Uses an authenticated
 * security-definer RPC so local dev does not need a service-role key.
 */
export const bootstrapDealer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("claim_first_dealer_admin");
    if (error) {
      if (error.message.includes("claim_first_dealer_admin")) {
        throw new Error("Run local-supabase-bootstrap.sql once, then try Make me dealer again.");
      }
      throw new Error(error.message);
    }
    if (data !== true) throw new Error("A dealer already exists.");
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
    const { data: isDealer } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "dealer_admin",
    });
    if (!isDealer) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.user_id, role: "agent" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
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
    return {
      userId: context.userId,
      is_dealer: roles.includes("dealer_admin"),
      is_agent: roles.includes("agent"),
      roles,
    };
  });

/** App settings (public read via anon, dealer-only update). */
export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { url, publishableKey: key } = requireSupabasePublicEnv();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
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

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * In-memory rate limiter: 2 requests per 10 seconds per user.
 * Note: state is per-isolate, which is acceptable for a light abuse guard.
 */
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 2;
const createInviteHits = new Map<string, number[]>();

function checkRateLimit(userId: string) {
  const now = Date.now();
  const hits = (createInviteHits.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (hits.length >= RATE_LIMIT_MAX) {
    const retryIn = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - hits[0])) / 1000,
    );
    throw new Error(
      `Too many requests. Please wait ${retryIn}s before generating another code.`,
    );
  }
  hits.push(now);
  createInviteHits.set(userId, hits);
}

/** Dealer generates a new unique invitation code (rate-limited: 2 per 10s). */
export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    checkRateLimit(context.userId);
    const { data, error } = await context.supabase.rpc(
      "create_agent_invite" as any,
    );
    if (error) throw new Error(error.message);
    return { code: data as string };
  });

/** Dealer lists their active (unused, unrevoked) invitation codes. */
export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agent_invites" as any)
      .select("*")
      .is("used_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Dealer hard-deletes an invitation code. */
export const deleteInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Scope deletion to the caller's own invites.
    const { error } = await supabaseAdmin
      .from("agent_invites" as any)
      .delete()
      .eq("code", data.code)
      .eq("dealer_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Any authenticated user redeems an invitation code to become an agent.
 * The invite row is deleted after a successful redemption so it doesn't
 * linger as clutter.
 */
export const redeemInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().trim().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("redeem_agent_invite" as any, {
      _code: data.code,
    });
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin
      .from("agent_invites" as any)
      .delete()
      .eq("code", data.code);
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function isDealer(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "dealer_admin",
  });
  return data === true;
}

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS handles filtering (dealer sees all, agent sees only own)
    const { data, error } = await context.supabase
      .from("agents")
      .select("*")
      .order("joined_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const agentSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullish(),
  employment_type: z.enum(["employee", "independent"]).default("independent"),
  commission_percent: z.number().nullish(),
  user_id: z.string().uuid().nullish(),
});

export const createAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => agentSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isDealer(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("agents")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: agentSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isDealer(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("agents")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isDealer(context.supabase, context.userId))) throw new Error("Forbidden");
    const { error } = await context.supabase.from("agents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

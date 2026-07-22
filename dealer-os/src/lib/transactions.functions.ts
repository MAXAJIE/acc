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

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS: dealer sees all, agent sees own
    const { data, error } = await context.supabase
      .from("transactions")
      .select("*, vehicles(id,make,model,year,plate:vin), agents(id,name)")
      .order("sale_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCommissionLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("commission_ledger")
      .select("*, agents(id,name), transactions(id,sale_date,sale_price,vehicle_id)")
      .order("entry_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const txSchema = z.object({
  vehicle_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  sale_price: z.number().positive(),
  sale_date: z.string(),
  commission_amount: z.number().min(0),
  notes: z.string().nullish(),
});

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => txSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Default state MUST be unconfirmed (SKILL §2).
    const { data: row, error } = await context.supabase
      .from("transactions")
      .insert({
        ...data,
        dealer_confirmed: false,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const confirmTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      commission_amount: z.number().min(0).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Only the dealer can confirm.
    if (!(await isDealer(context.supabase, context.userId))) throw new Error("Forbidden");
    const patch = {
      dealer_confirmed: true as const,
      confirmed_at: new Date().toISOString(),
      confirmed_by: context.userId,
      ...(data.commission_amount !== undefined
        ? { commission_amount: data.commission_amount }
        : {}),
    };
    const { data: row, error } = await context.supabase
      .from("transactions")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    // Also mark the vehicle sold with the sale price/date if not already.
    await context.supabase
      .from("vehicles")
      .update({
        status: "sold",
        sale_price: row.sale_price,
        sale_date: row.sale_date,
      })
      .eq("id", row.vehicle_id);
    return row;
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isDealer(context.supabase, context.userId))) throw new Error("Forbidden");
    const { error } = await context.supabase.from("transactions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

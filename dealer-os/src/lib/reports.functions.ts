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

const reportSchema = z.object({
  title: z.string().trim().min(1).max(120),
  period_start: z.string(),
  period_end: z.string(),
  currency: z.string().max(8).default("RM"),
  revenue: z.number().min(0).default(0),
  cogs: z.number().min(0).default(0),
  rent: z.number().min(0).default(0),
  salaries: z.number().min(0).default(0),
  marketing: z.number().min(0).default(0),
  utilities: z.number().min(0).default(0),
  other_opex: z.number().min(0).default(0),
  other_income: z.number().min(0).default(0),
  other_expenses: z.number().min(0).default(0),
  cash_balance: z.number().default(0),
  notes: z.string().max(2000).nullish(),
});

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isDealer((context.supabase as any), context.userId))) throw new Error("Forbidden");
    const { data, error } = await (context.supabase as any)
      .from("financial_reports")
      .select("*")
      .order("period_end", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reportSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isDealer((context.supabase as any), context.userId))) throw new Error("Forbidden");
    const { data: row, error } = await (context.supabase as any)
      .from("financial_reports")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: reportSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isDealer((context.supabase as any), context.userId))) throw new Error("Forbidden");
    const { data: row, error } = await (context.supabase as any)
      .from("financial_reports")
      .update({ ...data.patch, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isDealer((context.supabase as any), context.userId))) throw new Error("Forbidden");
    const { error } = await (context.supabase as any)
      .from("financial_reports")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

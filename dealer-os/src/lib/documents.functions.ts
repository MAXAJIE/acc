import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DOC_TYPES = [
  "spa",
  "invoice",
  "receipt",
  "booking_receipt",
  "loan",
  "customer",
  "vehicle",
  "jpj_transfer",
  "insurance_road_tax",
  "payment_log",
] as const;

const upsertSchema = z.object({
  doc_type: z.enum(DOC_TYPES),
  doc_number: z.string().max(120).nullish(),
  doc_date: z.string().nullish(),
  title: z.string().trim().min(1).max(200),
  customer_name: z.string().max(200).nullish(),
  vehicle_ref: z.string().max(200).nullish(),
  data: z.record(z.string(), z.any()).default({}),
  notes: z.string().max(2000).nullish(),
});

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("documents")
      .select("*")
      .order("doc_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("documents")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: upsertSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("documents")
      .update({ ...data.patch, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("documents")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTransactionDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("transaction_documents")
      .select("*, documents(*)");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const linkDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        transaction_id: z.string().uuid(),
        document_id: z.string().uuid(),
        role: z.string().min(1).max(60),
        notes: z.string().max(500).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("transaction_documents")
      .insert({ ...data, created_by: context.userId })
      .select("*, documents(*)")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const unlinkDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("transaction_documents")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

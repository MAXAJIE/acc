import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// --- Role helpers ------------------------------------------------------------

async function isDealer(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "dealer_admin",
  });
  return data === true;
}

// Fields agents/customers must NEVER see.
const AGENT_STRIP: readonly string[] = [
  "purchase_cost",
  "amount_financed",
  "rate",
  "drawdown_date",
  "recon_cost",
  "puspakom_status",
  "puspakom_date",
  "condition_grade",
];

function stripForAgent<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(row)) {
    if (!AGENT_STRIP.includes(k)) out[k] = row[k];
  }
  return out as Partial<T>;
}

// --- List (role-aware) -------------------------------------------------------

export const listVehicles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const dealer = await isDealer(supabase, userId);
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("stocked_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      dealer,
      vehicles: dealer ? data ?? [] : (data ?? []).map(stripForAgent),
    };
  });

// --- CRUD (dealer only) ------------------------------------------------------

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int(),
  variant: z.string().nullish(),
  vin: z.string().nullish(),
  engine_no: z.string().nullish(),
  color: z.string().nullish(),
  mileage_km: z.number().int().nullish(),
  transmission: z.string().nullish(),
  fuel: z.string().nullish(),
  purchase_cost: z.number().default(0),
  financing_type: z.enum(["cash", "financed"]).default("cash"),
  amount_financed: z.number().default(0),
  rate: z.number().default(0),
  drawdown_date: z.string().nullish(),
  recon_cost: z.number().default(0),
  condition_grade: z.string().nullish(),
  puspakom_status: z.string().nullish(),
  puspakom_date: z.string().nullish(),
  condition_summary: z.string().nullish(),
  photos: z.array(z.string()).default([]),
  asking_price: z.number().default(0),
  status: z.enum(["in_stock", "reserved", "sold"]).default("in_stock"),
  stocked_at: z.string().optional(),
});

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vehicleSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isDealer(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("vehicles")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: vehicleSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isDealer(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("vehicles")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isDealer(context.supabase, context.userId))) throw new Error("Forbidden");
    const { error } = await context.supabase.from("vehicles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Public link toggle (dealer only) ---------------------------------------

export const togglePublicLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), enable: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isDealer(context.supabase, context.userId))) throw new Error("Forbidden");
    const publicId = data.enable ? crypto.randomUUID() : null;
    const { data: row, error } = await context.supabase
      .from("vehicles")
      .update({ public_link_id: publicId })
      .eq("id", data.id)
      .select("id, public_link_id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// --- Public read (unauthenticated) via publishable server client ------------

const PUB_ALLOWED = [
  "id", "public_link_id", "make", "model", "year", "variant",
  "color", "mileage_km", "transmission", "fuel",
  "condition_summary", "photos", "asking_price", "status",
] as const;

export const getPublicVehicle = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ publicId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
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
    const { data: row, error } = await client
      .from("public_vehicle_view")
      .select(PUB_ALLOWED.join(","))
      .eq("public_link_id", data.publicId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

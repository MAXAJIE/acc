import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  togglePublicLink,
} from "@/lib/vehicles.functions";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";
import { daysInStock } from "@/lib/formulas";
import { Link, Copy, Trash2, Pencil, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

const EMPTY = {
  make: "", model: "", year: new Date().getFullYear(),
  variant: "", vin: "", engine_no: "", color: "",
  mileage_km: 0, transmission: "", fuel: "",
  purchase_cost: 0, financing_type: "cash" as "cash" | "financed",
  amount_financed: 0, rate: 0, drawdown_date: "",
  recon_cost: 0, condition_grade: "", puspakom_status: "",
  puspakom_date: "", condition_summary: "",
  photos: "" as string, // newline-separated in UI
  asking_price: 0,
  status: "in_stock" as "in_stock" | "reserved" | "sold",
};

function InventoryPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const fetchList = useServerFn(listVehicles);
  const doCreate = useServerFn(createVehicle);
  const doUpdate = useServerFn(updateVehicle);
  const doDelete = useServerFn(deleteVehicle);
  const doTogglePub = useServerFn(togglePublicLink);
  const { data, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => fetchList(),
  });
  const dealer = data?.dealer ?? false;
  const vehicles = (data?.vehicles ?? []) as any[];

  const [editing, setEditing] = useState<any | null>(null);
  const [q, setQ] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["vehicles"] });

  const filtered = vehicles.filter((v) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (v.make ?? "").toLowerCase().includes(s) ||
      (v.model ?? "").toLowerCase().includes(s) ||
      (v.vin ?? "").toLowerCase().includes(s)
    );
  });

  const saveMutation = useMutation({
    mutationFn: async (form: typeof EMPTY & { id?: string }) => {
      const payload = {
        ...form,
        photos: (form.photos || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        year: Number(form.year),
        mileage_km: Number(form.mileage_km) || null,
        purchase_cost: Number(form.purchase_cost),
        amount_financed: Number(form.amount_financed),
        rate: Number(form.rate),
        recon_cost: Number(form.recon_cost),
        asking_price: Number(form.asking_price),
        drawdown_date: form.drawdown_date || null,
        puspakom_date: form.puspakom_date || null,
      };
      if (form.id) {
        const { id, ...patch } = payload as any;
        return doUpdate({ data: { id: form.id, patch } });
      }
      return doCreate({ data: payload as any });
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusCounts = {
    all: vehicles.length,
    in_stock: vehicles.filter((v) => v.status === "in_stock").length,
    reserved: vehicles.filter((v) => v.status === "reserved").length,
    sold: vehicles.filter((v) => v.status === "sold").length,
  };
  const [status, setStatus] = useState<"all" | "in_stock" | "reserved" | "sold">("all");
  const scoped = status === "all" ? filtered : filtered.filter((v) => v.status === status);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("inventory")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusCounts.all} vehicles · {statusCounts.in_stock} in stock
          </p>
        </div>
        {dealer && (
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> {t("add_vehicle")}
          </button>
        )}
      </header>

      <div className="panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
            {(["all", "in_stock", "reserved", "sold"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  status === s
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : t(s as any)}{" "}
                <span className="ml-1 text-[10px] opacity-60">
                  {statusCounts[s]}
                </span>
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="ml-auto w-full max-w-xs rounded-full border border-input bg-background px-4 py-2 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : scoped.length === 0 ? (
        <div className="panel p-12 text-center text-sm text-muted-foreground">
          {t("no_vehicles")}
        </div>
      ) : (
        <div className="panel overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("vehicle")}</th>
                <th>{t("status")}</th>
                <th>{t("days_in_stock")}</th>
                <th className="!text-right">{t("asking_price")}</th>
                {dealer && <th className="!text-right">{t("purchase_cost")}</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((v) => {
                const badgeCls =
                  v.status === "in_stock"
                    ? "badge badge-success"
                    : v.status === "reserved"
                      ? "badge badge-warn"
                      : "badge badge-primary";
                return (
                  <tr key={v.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="avatar">
                          {(v.make ?? "?").slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {v.year} {v.make} {v.model}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {[v.variant, v.color, v.transmission].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={badgeCls}>{t(v.status as any)}</span>
                    </td>
                    <td className="text-muted-foreground">{daysInStock(v as any)}</td>
                    <td className="mono !text-right font-medium">{fmt(v.asking_price)}</td>
                    {dealer && (
                      <td className="mono !text-right text-muted-foreground">
                        {fmt(v.purchase_cost)}
                      </td>
                    )}
                    <td>
                      {dealer && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded p-1.5 hover:bg-muted"
                            onClick={() => setEditing({ ...v, photos: (v.photos ?? []).join("\n") })}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded p-1.5 hover:bg-muted"
                            title={v.public_link_id ? t("copy_link") : t("generate_public")}
                            onClick={async () => {
                              try {
                                if (v.public_link_id) {
                                  const link = `${window.location.origin}/v/${v.public_link_id}`;
                                  await navigator.clipboard.writeText(link);
                                  toast.success(t("link_copied"));
                                } else {
                                  await doTogglePub({ data: { id: v.id, enable: true } });
                                  invalidate();
                                  toast.success(t("saved"));
                                }
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }}
                          >
                            {v.public_link_id ? <Copy className="h-4 w-4" /> : <Link className="h-4 w-4" />}
                          </button>
                          {v.public_link_id && (
                            <button
                              className="rounded p-1.5 hover:bg-muted"
                              title={t("revoke_public")}
                              onClick={async () => {
                                await doTogglePub({ data: { id: v.id, enable: false } });
                                invalidate();
                              }}
                            >
                              <Link className="h-4 w-4 opacity-50" />
                            </button>
                          )}
                          <button
                            className="rounded p-1.5 hover:bg-muted text-destructive/70 hover:text-destructive"
                            onClick={async () => {
                              if (!confirm("Delete?")) return;
                              await doDelete({ data: { id: v.id } });
                              invalidate();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <VehicleForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSubmit={(form) => saveMutation.mutate(form)}
          busy={saveMutation.isPending}
        />
      )}
    </div>
  );
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return "RM " + Number(n).toLocaleString();
}

function VehicleForm({
  initial,
  onCancel,
  onSubmit,
  busy,
}: {
  initial: any;
  onCancel: () => void;
  onSubmit: (form: any) => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(initial);
  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg"
      >
        <h2 className="mb-4 text-lg font-semibold">{form.id ? t("edit") : t("add_vehicle")}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label={t("make")} v={form.make} on={(v) => update("make", v)} required />
          <Field label={t("model")} v={form.model} on={(v) => update("model", v)} required />
          <Field label={t("year")} type="number" v={form.year} on={(v) => update("year", v)} required />
          <Field label={t("variant")} v={form.variant} on={(v) => update("variant", v)} />
          <Field label={t("color")} v={form.color} on={(v) => update("color", v)} />
          <Field label={t("mileage_km")} type="number" v={form.mileage_km} on={(v) => update("mileage_km", v)} />
          <Field label={t("transmission")} v={form.transmission} on={(v) => update("transmission", v)} />
          <Field label={t("fuel")} v={form.fuel} on={(v) => update("fuel", v)} />
          <Field label={t("vin")} v={form.vin} on={(v) => update("vin", v)} />
          <Field label={t("engine_no")} v={form.engine_no} on={(v) => update("engine_no", v)} />
          <Field label={t("asking_price")} type="number" v={form.asking_price} on={(v) => update("asking_price", v)} />
          <label className="block text-xs text-muted-foreground">
            {t("status")}
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="in_stock">{t("in_stock")}</option>
              <option value="reserved">{t("reserved")}</option>
              <option value="sold">{t("sold")}</option>
            </select>
          </label>
        </div>

        <h3 className="mt-6 text-sm font-medium text-muted-foreground">
          {t("purchase_cost")} / {t("financing_type")}
        </h3>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label={t("purchase_cost")} type="number" v={form.purchase_cost} on={(v) => update("purchase_cost", v)} />
          <label className="block text-xs text-muted-foreground">
            {t("financing_type")}
            <select
              value={form.financing_type}
              onChange={(e) => update("financing_type", e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="cash">{t("cash")}</option>
              <option value="financed">{t("financed")}</option>
            </select>
          </label>
          <Field label={t("recon_cost")} type="number" v={form.recon_cost} on={(v) => update("recon_cost", v)} />
          {form.financing_type === "financed" && (
            <>
              <Field label={t("amount_financed")} type="number" v={form.amount_financed} on={(v) => update("amount_financed", v)} />
              <Field label={t("rate")} type="number" step="0.0001" v={form.rate} on={(v) => update("rate", v)} />
              <Field label={t("drawdown_date")} type="date" v={form.drawdown_date} on={(v) => update("drawdown_date", v)} />
            </>
          )}
        </div>

        <h3 className="mt-6 text-sm font-medium text-muted-foreground">{t("condition")}</h3>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label={t("condition_grade")} v={form.condition_grade} on={(v) => update("condition_grade", v)} />
          <Field label={t("puspakom_status")} v={form.puspakom_status} on={(v) => update("puspakom_status", v)} />
          <Field label={t("puspakom_date")} type="date" v={form.puspakom_date} on={(v) => update("puspakom_date", v)} />
        </div>
        <label className="mt-3 block text-xs text-muted-foreground">
          {t("condition_summary")}
          <textarea
            value={form.condition_summary ?? ""}
            onChange={(e) => update("condition_summary", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="mt-3 block text-xs text-muted-foreground">
          {t("photos")}
          <textarea
            value={form.photos ?? ""}
            onChange={(e) => update("photos", e.target.value)}
            rows={3}
            placeholder="https://…"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  v,
  on,
  type = "text",
  step,
  required,
}: {
  label: string;
  v: any;
  on: (v: any) => void;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <input
        type={type}
        step={step}
        required={required}
        value={v ?? ""}
        onChange={(e) => on(type === "number" ? Number(e.target.value) : e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}

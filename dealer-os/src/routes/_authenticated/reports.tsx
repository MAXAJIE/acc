import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listReports,
  createReport,
  updateReport,
  deleteReport,
} from "@/lib/reports.functions";
import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Printer,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

type ReportForm = {
  id?: string;
  title: string;
  period_start: string;
  period_end: string;
  currency: string;
  revenue: number;
  cogs: number;
  rent: number;
  salaries: number;
  marketing: number;
  utilities: number;
  other_opex: number;
  other_income: number;
  other_expenses: number;
  cash_balance: number;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const EMPTY: ReportForm = {
  title: "",
  period_start: firstOfMonth(),
  period_end: today(),
  currency: "RM",
  revenue: 0,
  cogs: 0,
  rent: 0,
  salaries: 0,
  marketing: 0,
  utilities: 0,
  other_opex: 0,
  other_income: 0,
  other_expenses: 0,
  cash_balance: 0,
  notes: "",
};

function fmt(n: number, cur = "RM") {
  return `${cur} ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function calc(r: ReportForm | any) {
  const revenue = Number(r.revenue) || 0;
  const cogs = Number(r.cogs) || 0;
  const opex =
    (Number(r.rent) || 0) +
    (Number(r.salaries) || 0) +
    (Number(r.marketing) || 0) +
    (Number(r.utilities) || 0) +
    (Number(r.other_opex) || 0);
  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - opex;
  const netProfit =
    operatingProfit + (Number(r.other_income) || 0) - (Number(r.other_expenses) || 0);
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return { revenue, cogs, opex, grossProfit, operatingProfit, netProfit, grossMargin, netMargin };
}

function ReportsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const fetchList = useServerFn(listReports);
  const doCreate = useServerFn(createReport);
  const doUpdate = useServerFn(updateReport);
  const doDelete = useServerFn(deleteReport);

  const { data, isLoading } = useQuery({
    queryKey: ["financial_reports"],
    queryFn: () => fetchList(),
  });
  const reports = (data ?? []) as any[];

  const [editing, setEditing] = useState<ReportForm | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  const totals = useMemo(() => {
    const tot = reports.reduce(
      (acc, r) => {
        const c = calc(r);
        acc.revenue += c.revenue;
        acc.net += c.netProfit;
        return acc;
      },
      { revenue: 0, net: 0 },
    );
    return tot;
  }, [reports]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["financial_reports"] });

  const saveMutation = useMutation({
    mutationFn: async (form: ReportForm) => {
      const payload = {
        ...form,
        revenue: Number(form.revenue),
        cogs: Number(form.cogs),
        rent: Number(form.rent),
        salaries: Number(form.salaries),
        marketing: Number(form.marketing),
        utilities: Number(form.utilities),
        other_opex: Number(form.other_opex),
        other_income: Number(form.other_income),
        other_expenses: Number(form.other_expenses),
        cash_balance: Number(form.cash_balance),
        notes: form.notes || null,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Financial reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Owner-only P&L snapshots. Fill in a few numbers — totals and margins compute automatically.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New report
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI
          label="Reports on file"
          value={String(reports.length)}
          icon={FileText}
        />
        <KPI
          label="Total revenue"
          value={fmt(totals.revenue)}
          icon={TrendingUp}
          tone="pos"
        />
        <KPI
          label="Net profit total"
          value={fmt(totals.net)}
          icon={totals.net >= 0 ? Wallet : TrendingDown}
          tone={totals.net >= 0 ? "pos" : "neg"}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : reports.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No reports yet. Click <span className="font-medium text-foreground">New report</span> to create your first P&L.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {reports.map((r) => {
            const c = calc(r);
            return (
              <article
                key={r.id}
                className="panel panel-hover rise-in group relative overflow-hidden p-5"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{
                    background:
                      c.netProfit >= 0
                        ? "linear-gradient(90deg, var(--color-chart-2), var(--color-primary))"
                        : "linear-gradient(90deg, var(--color-destructive), var(--color-chart-3))",
                  }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold leading-tight">{r.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.period_start} → {r.period_end}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Preview"
                      onClick={() => setPreview(r)}
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title={t("edit")}
                      onClick={() =>
                        setEditing({
                          ...EMPTY,
                          ...r,
                          notes: r.notes ?? "",
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title={t("delete")}
                      onClick={async () => {
                        if (!confirm(`Delete "${r.title}"?`)) return;
                        try {
                          await doDelete({ data: { id: r.id } });
                          toast.success(t("saved"));
                          invalidate();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Revenue" value={fmt(c.revenue, r.currency)} />
                  <Stat
                    label="Gross profit"
                    value={fmt(c.grossProfit, r.currency)}
                    hint={`${c.grossMargin.toFixed(1)}%`}
                  />
                  <Stat
                    label="Net profit"
                    value={fmt(c.netProfit, r.currency)}
                    hint={`${c.netMargin.toFixed(1)}%`}
                    tone={c.netProfit >= 0 ? "pos" : "neg"}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <ReportForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSubmit={(f) => saveMutation.mutate(f)}
          busy={saveMutation.isPending}
        />
      )}

      {preview && <ReportPreview report={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function KPI({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: any;
  tone?: "neutral" | "pos" | "neg";
}) {
  const color =
    tone === "pos"
      ? "var(--color-chart-2)"
      : tone === "neg"
        ? "var(--color-destructive)"
        : "var(--color-primary)";
  return (
    <div className="panel panel-hover flex items-center gap-4 p-4">
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
        style={{
          background: `color-mix(in oklab, ${color} 14%, var(--color-card))`,
          color,
        }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "pos" | "neg";
}) {
  const color =
    tone === "pos"
      ? "var(--color-chart-2)"
      : tone === "neg"
        ? "var(--color-destructive)"
        : "var(--color-foreground)";
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold" style={{ color }}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ReportForm({
  initial,
  onCancel,
  onSubmit,
  busy,
}: {
  initial: ReportForm;
  onCancel: () => void;
  onSubmit: (f: ReportForm) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<ReportForm>(initial);
  const set = (k: keyof ReportForm, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const c = calc(form);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="w-full max-w-4xl rounded-2xl border border-border bg-card shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">
              {form.id ? "Edit financial report" : "New financial report"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter figures for the reporting period. Gross profit, opex and net profit calculate automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_280px]">
          {/* Left: inputs */}
          <div className="space-y-6 p-6">
            <Section title="Reporting period">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field
                  label="Report title"
                  v={form.title}
                  on={(v) => set("title", v)}
                  placeholder="e.g. March 2026 P&L"
                  required
                />
                <Field
                  label="Currency"
                  v={form.currency}
                  on={(v) => set("currency", v)}
                  placeholder="RM"
                />
                <Field
                  label="Period start"
                  type="date"
                  v={form.period_start}
                  on={(v) => set("period_start", v)}
                  required
                />
                <Field
                  label="Period end"
                  type="date"
                  v={form.period_end}
                  on={(v) => set("period_end", v)}
                  required
                />
              </div>
            </Section>

            <Section title="Income">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Revenue (sales)" type="number" v={form.revenue} on={(v) => set("revenue", v)} />
                <Field label="Cost of goods sold" type="number" v={form.cogs} on={(v) => set("cogs", v)} />
              </div>
            </Section>

            <Section title="Operating expenses">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Rent" type="number" v={form.rent} on={(v) => set("rent", v)} />
                <Field label="Salaries" type="number" v={form.salaries} on={(v) => set("salaries", v)} />
                <Field label="Marketing" type="number" v={form.marketing} on={(v) => set("marketing", v)} />
                <Field label="Utilities" type="number" v={form.utilities} on={(v) => set("utilities", v)} />
                <Field label="Other opex" type="number" v={form.other_opex} on={(v) => set("other_opex", v)} />
              </div>
            </Section>

            <Section title="Other">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field
                  label="Other income"
                  type="number"
                  v={form.other_income}
                  on={(v) => set("other_income", v)}
                />
                <Field
                  label="Other expenses"
                  type="number"
                  v={form.other_expenses}
                  on={(v) => set("other_expenses", v)}
                />
                <Field
                  label="Cash balance (end of period)"
                  type="number"
                  v={form.cash_balance}
                  on={(v) => set("cash_balance", v)}
                />
              </div>
            </Section>

            <Section title="Notes">
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Anything worth remembering about this period…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </Section>
          </div>

          {/* Right: live summary */}
          <aside className="border-t border-border bg-muted/30 p-6 md:border-l md:border-t-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live summary
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Row k="Revenue" v={fmt(c.revenue, form.currency)} />
              <Row k="COGS" v={`- ${fmt(c.cogs, form.currency)}`} />
              <Row
                k="Gross profit"
                v={fmt(c.grossProfit, form.currency)}
                strong
                hint={`${c.grossMargin.toFixed(1)}% margin`}
              />
              <hr className="border-border" />
              <Row k="Operating expenses" v={`- ${fmt(c.opex, form.currency)}`} />
              <Row k="Operating profit" v={fmt(c.operatingProfit, form.currency)} strong />
              <hr className="border-border" />
              <Row k="+ Other income" v={fmt(Number(form.other_income) || 0, form.currency)} />
              <Row k="- Other expenses" v={fmt(Number(form.other_expenses) || 0, form.currency)} />
              <Row
                k="Net profit"
                v={fmt(c.netProfit, form.currency)}
                strong
                tone={c.netProfit >= 0 ? "pos" : "neg"}
                hint={`${c.netMargin.toFixed(1)}% net margin`}
              />
            </dl>
          </aside>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save report"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({
  k,
  v,
  strong,
  hint,
  tone = "neutral",
}: {
  k: string;
  v: string;
  strong?: boolean;
  hint?: string;
  tone?: "neutral" | "pos" | "neg";
}) {
  const color =
    tone === "pos"
      ? "var(--color-chart-2)"
      : tone === "neg"
        ? "var(--color-destructive)"
        : undefined;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd
        className={strong ? "text-right font-semibold" : "text-right"}
        style={color ? { color } : undefined}
      >
        {v}
        {hint && (
          <div className="text-[10px] font-normal text-muted-foreground">{hint}</div>
        )}
      </dd>
    </div>
  );
}

function Field({
  label,
  v,
  on,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  v: any;
  on: (v: any) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={v ?? ""}
        onChange={(e) => on(type === "number" ? Number(e.target.value) : e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}

function ReportPreview({ report, onClose }: { report: any; onClose: () => void }) {
  const c = calc(report);
  const cur = report.currency || "RM";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 print:hidden">
          <h2 className="text-base font-semibold">Report preview</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-8">
          <div className="mb-6 flex items-end justify-between border-b border-border pb-4">
            <div>
              <h1 className="text-xl font-bold">{report.title}</h1>
              <p className="text-xs text-muted-foreground">
                Period: {report.period_start} → {report.period_end}
              </p>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              Prepared {new Date(report.created_at).toLocaleDateString()}
            </div>
          </div>

          <table className="w-full text-sm">
            <tbody>
              <PLRow label="Revenue" value={fmt(c.revenue, cur)} />
              <PLRow label="Cost of goods sold" value={`(${fmt(c.cogs, cur)})`} />
              <PLRow label="Gross profit" value={fmt(c.grossProfit, cur)} bold border />
              <PLRow label="Rent" value={`(${fmt(Number(report.rent) || 0, cur)})`} indent />
              <PLRow label="Salaries" value={`(${fmt(Number(report.salaries) || 0, cur)})`} indent />
              <PLRow label="Marketing" value={`(${fmt(Number(report.marketing) || 0, cur)})`} indent />
              <PLRow label="Utilities" value={`(${fmt(Number(report.utilities) || 0, cur)})`} indent />
              <PLRow label="Other opex" value={`(${fmt(Number(report.other_opex) || 0, cur)})`} indent />
              <PLRow label="Total operating expenses" value={`(${fmt(c.opex, cur)})`} border />
              <PLRow label="Operating profit" value={fmt(c.operatingProfit, cur)} bold />
              <PLRow label="Other income" value={fmt(Number(report.other_income) || 0, cur)} />
              <PLRow
                label="Other expenses"
                value={`(${fmt(Number(report.other_expenses) || 0, cur)})`}
              />
              <PLRow
                label="Net profit"
                value={fmt(c.netProfit, cur)}
                bold
                border
                tone={c.netProfit >= 0 ? "pos" : "neg"}
              />
              <PLRow label="Cash balance (end of period)" value={fmt(Number(report.cash_balance) || 0, cur)} />
            </tbody>
          </table>

          {report.notes && (
            <div className="mt-6 rounded-lg bg-muted/40 p-4 text-xs">
              <div className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </div>
              <p className="whitespace-pre-wrap text-foreground">{report.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PLRow({
  label,
  value,
  bold,
  border,
  indent,
  tone = "neutral",
}: {
  label: string;
  value: string;
  bold?: boolean;
  border?: boolean;
  indent?: boolean;
  tone?: "neutral" | "pos" | "neg";
}) {
  const color =
    tone === "pos"
      ? "var(--color-chart-2)"
      : tone === "neg"
        ? "var(--color-destructive)"
        : undefined;
  return (
    <tr className={border ? "border-t border-border" : ""}>
      <td
        className={`py-1.5 ${indent ? "pl-6" : ""} ${bold ? "font-semibold" : "text-muted-foreground"}`}
      >
        {label}
      </td>
      <td
        className={`py-1.5 text-right tabular-nums ${bold ? "font-semibold" : ""}`}
        style={color ? { color } : undefined}
      >
        {value}
      </td>
    </tr>
  );
}

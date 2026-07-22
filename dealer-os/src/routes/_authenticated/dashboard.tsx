import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVehicles } from "@/lib/vehicles.functions";
import { listTransactions } from "@/lib/transactions.functions";
import { getSettings } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";
import { APP_CONFIG } from "@/lib/config";
import {
  daysInStock,
  floatingProfit,
  financingExposure,
  accruedFinancingCost,
} from "@/lib/formulas";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useMemo } from "react";
import { Wallet, Landmark, Boxes, AlarmClock, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function fmtRM(n: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(n);
}

const CHART = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function Card({
  title,
  value,
  hint,
  accent = 0,
  delta,
  index = 0,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint?: string;
  accent?: number;
  delta?: string;
  index?: number;
  icon?: LucideIcon;
}) {
  const color = CHART[accent % CHART.length];
  return (
    <div
      className="panel panel-hover rise-in relative p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between">
        {Icon && (
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${color} 14%, var(--color-card))`,
              color,
            }}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
        {delta && (
          <span
            className="mono rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: `color-mix(in oklab, ${color} 14%, var(--color-card))`,
              color,
            }}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4 text-xs font-medium text-muted-foreground">{title}</div>
      <div
        className="mono mt-1 text-[26px] font-semibold leading-tight"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function Dashboard() {
  const { t } = useI18n();
  const fetchVehicles = useServerFn(listVehicles);
  const fetchTx = useServerFn(listTransactions);
  const fetchSettings = useServerFn(getSettings);

  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: () => fetchVehicles() });
  const txQ = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });

  const dealer = vehiclesQ.data?.dealer;
  const vehicles = (vehiclesQ.data?.vehicles ?? []) as any[];
  const txs = (txQ.data ?? []) as any[];
  const settings = settingsQ.data as any;
  const agingDays = settings?.aging_alert_days ?? 60;

  const metrics = useMemo(() => {
    if (!dealer) return null;
    const stock = vehicles.filter((v) => v.status !== "sold");
    const confirmed = txs.filter((t) => t.dealer_confirmed);

    // Net cash position (approx) = sum(confirmed sale_price) − sum(purchase_cost of stock) − sum(financing_exposure)
    const sales = confirmed.reduce((s, x) => s + Number(x.sale_price ?? 0), 0);
    const stockCost = stock.reduce((s, x) => s + Number(x.purchase_cost ?? 0), 0);
    const exposure = stock.reduce(
      (s, x) => s + financingExposure(x as any),
      0,
    );
    const past = stock.filter((v) => daysInStock(v as any) >= agingDays).length;
    return { net: sales - stockCost - exposure, exposure, past };
  }, [dealer, vehicles, txs, agingDays]);

  const aging = useMemo(() => {
    const stock = vehicles.filter((v) => v.status !== "sold");
    return APP_CONFIG.aging_buckets.map((b) => ({
      bucket: b.key,
      count: stock.filter((v) => {
        const d = daysInStock(v as any);
        return d >= b.min && d <= b.max;
      }).length,
    }));
  }, [vehicles]);

  const exposureByVehicle = useMemo(() => {
    if (!dealer) return [];
    return vehicles
      .filter((v) => v.status !== "sold" && v.financing_type === "financed")
      .map((v) => ({
        name: `${v.make} ${v.model}`,
        exposure: Math.round(financingExposure(v as any)),
      }))
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 8);
  }, [vehicles, dealer]);

  const agingTotal = useMemo(() => aging.reduce((s, x) => s + x.count, 0), [aging]);

  const monthlyProfit = useMemo(() => {
    if (!dealer) return [];
    const buckets: Record<string, number> = {};
    for (const t of txs) {
      if (!t.dealer_confirmed) continue;
      const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
      if (!vehicle) continue;
      const month = (t.sale_date as string).slice(0, 7);
      buckets[month] = (buckets[month] ?? 0) + floatingProfit({
        ...(vehicle as any),
        sale_price: Number(t.sale_price),
        sale_date: t.sale_date,
      });
    }
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, profit]) => ({ month, profit: Math.round(profit) }));
  }, [txs, vehicles, dealer]);

  // Agent view
  const myConfirmed = useMemo(() => txs.filter((t) => t.dealer_confirmed), [txs]);
  const myTotalCommission = myConfirmed.reduce(
    (s, x) => s + Number(x.commission_amount ?? 0),
    0,
  );
  const monthKey = new Date().toISOString().slice(0, 7);
  const myMonthCommission = myConfirmed
    .filter((t) => (t.sale_date as string).startsWith(monthKey))
    .reduce((s, x) => s + Number(x.commission_amount ?? 0), 0);

  return (
    <div className="space-y-8">
      {dealer ? (
        <>
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="page-title">{t("dashboard")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Live overview of stock, cash and exposure.
              </p>
            </div>
            <div className="chip">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-chart-2)]" />
              {new Date().toLocaleDateString()}
            </div>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              index={0}
              accent={0}
              icon={Wallet}
              title={t("net_cash_position")}
              value={fmtRM(metrics?.net ?? 0)}
              hint={t("total_confirmed_sales")}
              delta={`${txs.filter((x) => x.dealer_confirmed).length} sales`}
            />
            <Card
              index={1}
              accent={3}
              icon={Landmark}
              title={t("financing_exposure")}
              value={fmtRM(metrics?.exposure ?? 0)}
              hint={`${vehicles.filter((v) => v.financing_type === "financed" && v.status !== "sold").length} financed`}
            />
            <Card
              index={2}
              accent={1}
              icon={Boxes}
              title={t("inventory")}
              value={String(vehicles.filter((v) => v.status !== "sold").length)}
              hint={`${vehicles.filter((v) => v.status === "sold").length} sold total`}
            />
            <Card
              index={3}
              accent={4}
              icon={AlarmClock}
              title={t("aging_alerts")}
              value={String(metrics?.past ?? 0)}
              hint={`≥ ${agingDays} ${t("days_in_stock")}`}
              delta={metrics?.past ? "attention" : "ok"}
            />
          </div>

          <h2 className="text-base font-semibold">Distribution</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartFrame title={t("aging_buckets")} index="a">
              {agingTotal > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={aging}
                      dataKey="count"
                      nameKey="bucket"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={52}
                      paddingAngle={3}
                      stroke="var(--color-card)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      label={({ bucket, count }) => `${bucket}: ${count}`}
                    >
                      {aging.map((_, i) => (
                        <Cell key={i} fill={CHART[i % CHART.length]} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={24} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label={t("no_vehicles")} />
              )}
            </ChartFrame>
            <ChartFrame title={t("financing_by_vehicle")} index="b">
              {exposureByVehicle.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={exposureByVehicle} barCategoryGap={12} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "color-mix(in oklab, var(--color-foreground) 4%, transparent)" }} />
                    <Bar dataKey="exposure" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {exposureByVehicle.map((_, i) => (
                        <Cell key={i} fill={CHART[i % CHART.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No financed vehicles" />
              )}
            </ChartFrame>
          </div>

          <h2 className="text-base font-semibold">Trend</h2>
          <ChartFrame title={t("monthly_profit")} index="c">
            <ResponsiveContainer>
              <LineChart data={monthlyProfit}>
                <defs>
                  <linearGradient id="profitLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-chart-1)" />
                    <stop offset="50%" stopColor="var(--color-chart-4)" />
                    <stop offset="100%" stopColor="var(--color-chart-2)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="url(#profitLine)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "var(--color-chart-2)", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--color-chart-4)", stroke: "var(--color-card)", strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>

          <h2 className="text-base font-semibold">Activity</h2>
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="panel panel-hover rise-in p-5 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-medium">Recent transactions</div>
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  last {Math.min(txs.length, 6)}
                </div>
              </div>
              <div className="divide-y divide-border">
                {txs.length === 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {t("no_transactions")}
                  </div>
                )}
                {txs
                  .slice()
                  .sort((a, b) => (b.sale_date as string).localeCompare(a.sale_date as string))
                  .slice(0, 6)
                  .map((tx, i) => {
                    const v = vehicles.find((x) => x.id === tx.vehicle_id);
                    return (
                      <div
                        key={tx.id}
                        className="group flex items-center gap-3 py-3 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-md"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div
                          className="h-2 w-2 shrink-0 rounded-full transition-transform group-hover:scale-150"
                          style={{
                            background: tx.dealer_confirmed
                              ? "var(--color-chart-5)"
                              : "var(--color-chart-3)",
                            boxShadow: `0 0 10px ${
                              tx.dealer_confirmed ? "var(--color-chart-5)" : "var(--color-chart-3)"
                            }`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {v ? `${v.make} ${v.model}` : "—"}
                          </div>
                          <div className="mono truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                            {(tx.sale_date as string).slice(0, 10)} ·{" "}
                            {tx.dealer_confirmed ? "confirmed" : t("unconfirmed")}
                          </div>
                        </div>
                        <div className="mono text-sm font-semibold tabular-nums">
                          {fmtRM(Number(tx.sale_price ?? 0))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="panel panel-hover rise-in p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-medium">Top stock by cost</div>
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  live
                </div>
              </div>
              <div className="space-y-3">
                {(() => {
                  const list = vehicles
                    .filter((v) => v.status !== "sold")
                    .slice()
                    .sort((a, b) => Number(b.purchase_cost ?? 0) - Number(a.purchase_cost ?? 0))
                    .slice(0, 6);
                  const max = Math.max(1, ...list.map((v) => Number(v.purchase_cost ?? 0)));
                  if (list.length === 0)
                    return (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        {t("no_vehicles")}
                      </div>
                    );
                  return list.map((v, i) => {
                    const pct = (Number(v.purchase_cost ?? 0) / max) * 100;
                    const color = CHART[i % CHART.length];
                    return (
                      <div key={v.id} className="group">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate">
                            {v.make} {v.model}
                          </span>
                          <span className="mono ml-2 text-muted-foreground">
                            {fmtRM(Number(v.purchase_cost ?? 0))}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 40%, transparent))`,
                              boxShadow: `0 0 10px color-mix(in oklab, ${color} 60%, transparent)`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <div className="section-label">Agent view</div>
            <h1 className="mt-2 text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {t("dashboard")}
            </h1>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card accent={0} title={t("my_month")} value={fmtRM(myMonthCommission)} />
            <Card accent={1} title={t("my_total")} value={fmtRM(myTotalCommission)} />
            <Card accent={2} title={t("total_sales_count")} value={String(myConfirmed.length)} />
          </div>
          <p className="text-xs text-muted-foreground">{t("unconfirmed_hidden")}</p>
        </>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-popover-foreground)",
  fontSize: 12,
};

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function ChartFrame({
  title,
  children,
  index,
}: {
  title: string;
  children: React.ReactNode;
  index?: string;
}) {
  return (
    <div className="panel panel-hover rise-in p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        {index && (
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            fig · {index}
          </div>
        )}
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}
// Silence unused-import warning for accruedFinancingCost imported for potential future use.
void accruedFinancingCost;

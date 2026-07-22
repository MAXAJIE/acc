import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCommissionLedger } from "@/lib/transactions.functions";
import { useI18n } from "@/lib/i18n";
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: Leaderboard,
});

const CHART = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function Leaderboard() {
  const { t } = useI18n();
  const fetchLedger = useServerFn(listCommissionLedger);
  const { data, isLoading } = useQuery({
    queryKey: ["ledger"],
    queryFn: () => fetchLedger(),
  });

  const board = useMemo(() => {
    const totals: Record<string, { name: string; total: number; count: number }> = {};
    for (const row of (data ?? []) as any[]) {
      const name = row.agents?.name ?? "—";
      if (!totals[name]) totals[name] = { name, total: 0, count: 0 };
      totals[name].total += Number(row.amount);
      totals[name].count += 1;
    }
    return Object.values(totals).sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 text-sm font-medium">{t("leaderboard")}</div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={board}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {board.map((_, i) => (
                  <Cell key={i} fill={CHART[i % CHART.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">{t("agent")}</th>
                <th className="p-3">{t("total_commission")}</th>
                <th className="p-3">{t("total_sales_count")}</th>
              </tr>
            </thead>
            <tbody>
              {board.map((row, i) => (
                <tr key={row.name} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3">RM {row.total.toLocaleString()}</td>
                  <td className="p-3">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

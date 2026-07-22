import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings, updateSettings } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const fetchS = useServerFn(getSettings);
  const doUpdate = useServerFn(updateSettings);
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => fetchS() });
  const [pct, setPct] = useState(20);
  const [days, setDays] = useState(60);

  useEffect(() => {
    if (data) {
      setPct(Number((data as any).default_commission_percent));
      setDays(Number((data as any).aging_alert_days));
    }
  }, [data]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">{t("settings")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Edited here → applied everywhere. Per-agent commission overrides win over these defaults.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-muted-foreground">
            {t("default_commission")}
            <input
              type="number"
              step="0.01"
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            {t("aging_alert_days")}
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          onClick={async () => {
            try {
              await doUpdate({
                data: { default_commission_percent: pct, aging_alert_days: days },
              });
              qc.invalidateQueries({ queryKey: ["settings"] });
              toast.success(t("saved"));
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          {t("save")}
        </button>
      </div>
    </div>
  );
}

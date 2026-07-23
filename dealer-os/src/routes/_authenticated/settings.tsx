import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings, updateSettings, resignDealer, getMyRole } from "@/lib/admin.functions";
import { createInvite, listInvites, revokeInvite } from "@/lib/invites.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchS = useServerFn(getSettings);
  const doUpdate = useServerFn(updateSettings);
  const doResign = useServerFn(resignDealer);
  const fetchRole = useServerFn(getMyRole);
  const doCreateInvite = useServerFn(createInvite);
  const fetchInvites = useServerFn(listInvites);
  const doRevokeInvite = useServerFn(revokeInvite);
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => fetchS() });
  const { data: role } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const isDealer = !!role?.is_dealer;
  const { data: invites, refetch: refetchInvites } = useQuery({
    queryKey: ["invites"],
    queryFn: () => fetchInvites(),
    enabled: isDealer,
  });
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

      {isDealer && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold">{t("invitations")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("invitations_hint")}</p>
          <button
            onClick={async () => {
              try {
                const res = await doCreateInvite();
                toast.success(res.code);
                refetchInvites();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t("generate_invite")}
          </button>

          <div className="mt-4 divide-y divide-border overflow-hidden rounded-md border border-border">
            {(invites ?? []).length === 0 && (
              <div className="p-3 text-xs text-muted-foreground">—</div>
            )}
            {(invites ?? []).map((inv: any) => {
              const status = inv.revoked_at
                ? t("invite_revoked")
                : inv.used_at
                ? t("invite_used")
                : t("invite_active");
              const badgeCls = inv.revoked_at
                ? "bg-muted text-muted-foreground"
                : inv.used_at
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-primary/10 text-primary";
              return (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center gap-3 p-3 text-sm"
                >
                  <span className="font-mono tracking-widest">{inv.code}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeCls}`}
                  >
                    {status}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString(
                      lang === "zh" ? "zh-CN" : "en-US",
                    )}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inv.code);
                      toast.success(t("copy_code"));
                    }}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    {t("copy_code")}
                  </button>
                  {!inv.used_at && !inv.revoked_at && (
                    <button
                      onClick={async () => {
                        try {
                          await doRevokeInvite({ data: { code: inv.code } });
                          refetchInvites();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                      className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                    >
                      {t("invite_revoke")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-destructive/30 bg-card p-6">
        <h3 className="text-sm font-semibold text-destructive">{t("resign_dealer")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("confirm_resign_dealer")}</p>
        <button
          onClick={async () => {
            if (!confirm(t("confirm_resign_dealer"))) return;
            try {
              await doResign();
              await supabase.auth.signOut();
              qc.clear();
              toast.success(t("saved"));
              navigate({ to: "/auth", replace: true });
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
          className="mt-4 rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
        >
          {t("resign_dealer")}
        </button>
      </div>
    </div>
  );
}

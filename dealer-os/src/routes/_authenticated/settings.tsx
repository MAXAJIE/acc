import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings, updateSettings, resignDealer, getMyRole } from "@/lib/admin.functions";
import { createInvite, listInvites, deleteInvite } from "@/lib/invites.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

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
  const doDeleteInvite = useServerFn(deleteInvite);
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
            {(invites ?? []).map((inv: any) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center gap-3 p-3 text-sm"
              >
                <span className="font-mono tracking-widest">{inv.code}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(inv.created_at).toLocaleDateString(
                    lang === "zh" ? "zh-CN" : "en-US",
                  )}
                </span>
                <button
                  onClick={async () => {
                    const ok = await copyToClipboard(inv.code);
                    if (ok) toast.success(t("code_copied"));
                    else toast.error(t("copy_failed"));
                  }}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  {t("copy_code")}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await doDeleteInvite({ data: { code: inv.code } });
                      toast.success(t("invite_deleted"));
                      refetchInvites();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                  className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  {t("invite_delete")}
                </button>
              </div>
            ))}
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

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole, bootstrapDealer } from "@/lib/admin.functions";
import { redeemInvite } from "@/lib/invites.functions";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const { t } = useI18n();
  const fetchRole = useServerFn(getMyRole);
  const bootstrap = useServerFn(bootstrapDealer);
  const doRedeem = useServerFn(redeemInvite);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  const isDealer = !!data?.is_dealer;
  const isAgent = !!data?.is_agent;
  const dealerExists = !!data?.dealer_exists;
  const hasRole = isDealer || isAgent;

  if (!hasRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{t("role")}</h2>

          {dealerExists ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("enter_invite_hint")}
              </p>
              <div className="mt-4 space-y-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t("invite_code_placeholder")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tracking-widest"
                  autoFocus
                />
                <button
                  disabled={busy || !code.trim()}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await doRedeem({ data: { code: code.trim() } });
                      toast.success(t("saved"));
                      refetch();
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {t("be_an_agent")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">{t("no_role_yet")}</p>
              <button
                onClick={async () => {
                  try {
                    await bootstrap();
                    toast.success(t("saved"));
                    refetch();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {t("make_me_dealer")}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <AppShell isDealer={isDealer}>
      <Outlet />
    </AppShell>
  );
}

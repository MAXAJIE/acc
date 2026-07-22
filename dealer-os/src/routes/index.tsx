import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Moon, Sun, Globe } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dealer OS — sign in" },
      {
        name: "description",
        content: "Sign in to Dealer OS: cash flow, inventory and agent commissions for one dealership.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          {t("app_name")}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-24">
        <h1
          className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("app_name")}
          <span className="block text-muted-foreground">{t("tagline")}</span>
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          {lang === "en"
            ? "One dealership. One console. Cash flow, floor-plan interest, aging alerts, agent leaderboard, and shareable vehicle links — all role-scoped so agents never see purchase cost."
            : "一个车行,一套控制台。现金流、库存融资、库龄告警、销售员排行榜、可分享的车辆链接——全部按角色隔离,销售员绝不会看到你的进货成本。"}
        </p>
        <Link
          to="/auth"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {t("sign_in")} →
        </Link>
      </section>
    </div>
  );
}

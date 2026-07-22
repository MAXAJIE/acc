import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import {
  Moon,
  Sun,
  Globe,
  LogOut,
  LayoutDashboard,
  Boxes,
  Receipt,
  Trophy,
  Users,
  Settings as SettingsIcon,
  FileText,
  FolderArchive,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode } from "react";

export function AppShell({
  children,
  isDealer,
}: {
  children: ReactNode;
  isDealer: boolean;
}) {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { to: "/inventory", label: t("inventory"), icon: Boxes },
    { to: "/transactions", label: t("transactions"), icon: Receipt },
    { to: "/documents", label: t("documents"), icon: FolderArchive },
    { to: "/leaderboard", label: t("leaderboard"), icon: Trophy },
    ...(isDealer
      ? [
          { to: "/agents", label: t("agents"), icon: Users },
          { to: "/reports", label: t("reports"), icon: FileText },
          { to: "/settings", label: t("settings"), icon: SettingsIcon },
        ]
      : []),
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sideWidth = "72px";

  // Reusable icon button with hover label tooltip
  const IconWithTooltip = ({
    label,
    active,
    onClick,
    to,
    children,
    variant = "default",
  }: {
    label: string;
    active?: boolean;
    onClick?: () => void;
    to?: string;
    children: ReactNode;
    variant?: "default" | "danger";
  }) => {
    const base =
      "group/link relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ease-out";
    const state = active
      ? "bg-accent text-accent-foreground shadow-sm"
      : variant === "danger"
        ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        : "text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-110";

    const tooltip = (
      <span
        className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg translate-x-[-6px] transition-all duration-200 ease-out group-hover/link:translate-x-0 group-hover/link:opacity-100"
      >
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
      </span>
    );

    const inner = (
      <>
        {active && (
          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <span className="transition-transform duration-200 ease-out group-hover/link:scale-110">
          {children}
        </span>
        {tooltip}
      </>
    );

    if (to) {
      return (
        <Link to={to} className={`${base} ${state}`} aria-label={label}>
          {inner}
        </Link>
      );
    }
    return (
      <button onClick={onClick} className={`${base} ${state}`} aria-label={label}>
        {inner}
      </button>
    );
  };

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ ["--sb-w" as string]: sideWidth }}
    >
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col items-center border-r border-border bg-card md:flex"
        style={{ width: sideWidth }}
      >
        {/* Brand */}
        <div className="flex w-full items-center justify-center border-b border-border py-4">
          <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-300 hover:rotate-12">
            <span className="h-2 w-2 rounded-full bg-primary-foreground" />
          </span>
        </div>

        {/* Nav */}
        <nav className="mt-3 flex flex-1 flex-col items-center gap-1.5 overflow-y-visible px-2">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = pathname.startsWith(n.to);
            return (
              <IconWithTooltip key={n.to} to={n.to} label={n.label} active={active}>
                <Icon className="h-[18px] w-[18px]" />
              </IconWithTooltip>
            );
          })}
        </nav>

        {/* Footer controls */}
        <div className="flex w-full flex-col items-center gap-1.5 border-t border-border p-2">
          <IconWithTooltip
            label={t("language")}
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
          >
            <Globe className="h-[18px] w-[18px]" />
          </IconWithTooltip>
          <IconWithTooltip
            label={t("theme")}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? (
              <Moon className="h-[18px] w-[18px]" />
            ) : (
              <Sun className="h-[18px] w-[18px]" />
            )}
          </IconWithTooltip>
          <IconWithTooltip label={t("sign_out")} onClick={signOut} variant="danger">
            <LogOut className="h-[18px] w-[18px]" />
          </IconWithTooltip>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:hidden">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card">
            <span className="absolute inset-1 rounded-sm bg-gradient-to-br from-[var(--color-chart-1)] via-[var(--color-chart-4)] to-[var(--color-chart-2)]" />
          </span>
          {t("app_name")}
        </Link>
        <button
          onClick={signOut}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label={t("sign_out")}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>
      <nav className="sticky top-[57px] z-30 flex gap-1 overflow-x-auto border-b border-border bg-background/80 px-3 py-2 backdrop-blur md:hidden">
        {nav.map((n) => {
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              activeProps={{ className: "!bg-accent !text-accent-foreground" }}
            >
              <Icon className="h-3.5 w-3.5" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Main */}
      <main className="transition-[padding] duration-300 ease-out md:pl-[var(--sb-w)]">
        <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}

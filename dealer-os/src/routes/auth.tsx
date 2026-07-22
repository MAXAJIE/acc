import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Dealer OS" },
      { name: "description", content: "Sign in or create your Dealer OS account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      toast.success(t("saved"));
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("app_name")}
          </h1>
          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="text-xs text-muted-foreground underline"
          >
            {lang === "en" ? "中文" : "English"}
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
          <div className="mb-4 flex rounded-lg bg-muted p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={
                "flex-1 rounded-md px-3 py-1.5 transition " +
                (mode === "signin" ? "bg-background text-foreground shadow" : "text-muted-foreground")
              }
            >
              {t("sign_in")}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={
                "flex-1 rounded-md px-3 py-1.5 transition " +
                (mode === "signup" ? "bg-background text-foreground shadow" : "text-muted-foreground")
              }
            >
              {t("sign_up")}
            </button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs text-muted-foreground">
              {t("email")}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              {t("password")}
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "…" : mode === "signin" ? t("sign_in") : t("sign_up")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

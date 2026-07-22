import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getPublicVehicle } from "@/lib/vehicles.functions";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Moon, Sun, Globe } from "lucide-react";

export const Route = createFileRoute("/v/$publicId")({
  head: () => ({
    meta: [
      { title: "Vehicle — Dealer OS" },
      { name: "description", content: "Vehicle details shared by the dealership." },
    ],
  }),
  component: PublicVehicle,
});

function PublicVehicle() {
  const { publicId } = Route.useParams();
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const fetchOne = useServerFn(getPublicVehicle);
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-vehicle", publicId],
    queryFn: () => fetchOne({ data: { publicId } }),
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">{t("loading")}</div>;
  }
  if (error || !data) {
    throw notFound();
  }

  const v: any = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          {t("app_name")}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <Globe className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-4 pb-16">
        <h1
          className="text-4xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {v.year} {v.make} {v.model}
        </h1>
        <div className="text-3xl font-medium">RM {Number(v.asking_price).toLocaleString()}</div>
        {v.photos && v.photos.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {v.photos.map((src: string, i: number) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`${v.make} ${v.model}`}
                className="w-full rounded-xl border border-border object-cover"
              />
            ))}
          </div>
        )}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-muted-foreground">{t("all_specs")}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ["variant", v.variant],
              ["color", v.color],
              ["mileage_km", v.mileage_km],
              ["transmission", v.transmission],
              ["fuel", v.fuel],
            ]
              .filter(([, val]) => val)
              .map(([k, val]) => (
                <div key={k as string} className="flex justify-between border-b border-border py-1">
                  <dt className="text-muted-foreground">{t(k as any)}</dt>
                  <dd>{val as string}</dd>
                </div>
              ))}
          </dl>
        </section>
        {v.condition_summary && (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-medium text-muted-foreground">{t("condition")}</h2>
            <p className="mt-2 whitespace-pre-line text-sm">{v.condition_summary}</p>
          </section>
        )}
        <p className="text-xs text-muted-foreground">{t("contact_dealer")}</p>
      </main>
    </div>
  );
}

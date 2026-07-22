/**
 * ============================================================
 *  APP CONFIG — safe to modify locally.
 *  Anything here is picked up on the next build. Runtime-editable
 *  values (like default_commission_percent) live in the
 *  `app_settings` table and are editable from Dealer → Settings.
 * ============================================================
 */

export const APP_CONFIG = {
  currency: "RM",
  locale_default: "en" as "en" | "zh",
  // Aging buckets (days_in_stock)
  aging_buckets: [
    { key: "0-30", min: 0, max: 30 },
    { key: "31-60", min: 31, max: 60 },
    { key: "61-90", min: 61, max: 90 },
    { key: "90+", min: 91, max: 100000 },
  ],
  // The floating-profit formula wording — matches Malaysian
  // conventional interest facility. Change label + formula together
  // if the dealer switches to Islamic profit-rate financing.
  finance: {
    label: "Interest", // vs "Profit rate" for Islamic
    accrual_basis_days: 365, // simple daily accrual
  },
  // Vehicle spec fields shown in the Add Inventory form.
  // Adding a field here does NOT add a database column — schema lives
  // in the migration. This just controls which columns the UI exposes
  // in the shared "specs" section (visible to agents & customers).
  vehicle_spec_fields: [
    "make", "model", "year", "variant", "color",
    "mileage_km", "transmission", "fuel",
  ] as const,
} as const;

export type AppConfig = typeof APP_CONFIG;

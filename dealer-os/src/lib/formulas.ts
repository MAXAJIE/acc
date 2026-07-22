/**
 * All money math the app trusts.
 * Kept together so a change here can't silently diverge across the codebase.
 * See car_dealer_app_spec.md §4.2 & SKILL §3.
 */
import { APP_CONFIG } from "./config";

export type VehicleForMath = {
  purchase_cost: number;
  amount_financed: number;
  rate: number;              // annual, decimal (0.0575 = 5.75%)
  drawdown_date: string | null;
  recon_cost: number;
  sale_price: number | null;
  sale_date: string | null;
  stocked_at: string;
  financing_type: "cash" | "financed";
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  return Math.max(0, Math.floor((to - from) / DAY_MS));
}

/** days_in_stock — used for aging AND for interest accrual. Compute ONCE. */
export function daysInStock(v: VehicleForMath, referenceISO?: string): number {
  const ref = v.sale_date ?? referenceISO ?? new Date().toISOString();
  return daysBetween(v.stocked_at, ref);
}

/** Simple daily-accrual interest. See SKILL §3. */
export function accruedFinancingCost(v: VehicleForMath, referenceISO?: string): number {
  if (v.financing_type !== "financed" || !v.drawdown_date) return 0;
  const ref = v.sale_date ?? referenceISO ?? new Date().toISOString();
  const days = daysBetween(v.drawdown_date, ref);
  return (
    v.amount_financed *
    (v.rate / APP_CONFIG.finance.accrual_basis_days) *
    days
  );
}

/** floating_profit = sale_price − purchase_cost − accrued_financing − recon */
export function floatingProfit(v: VehicleForMath, referenceISO?: string): number {
  const sale = v.sale_price ?? 0;
  return sale - v.purchase_cost - accruedFinancingCost(v, referenceISO) - v.recon_cost;
}

/** Suggested commission from % of floating profit; caller decides to override. */
export function suggestedCommission(
  vehicle: VehicleForMath,
  percent: number,
): number {
  return Math.max(0, Math.round(floatingProfit(vehicle) * (percent / 100) * 100) / 100);
}

/** For dashboard exposure card. */
export function financingExposure(v: VehicleForMath, referenceISO?: string): number {
  if (v.financing_type !== "financed") return 0;
  return v.amount_financed + accruedFinancingCost(v, referenceISO);
}

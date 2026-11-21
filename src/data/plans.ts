/** Subscription plans shown in the Paywall. Change prices here only. */

export type BillingCycle = "annual" | "monthly";

export type Plan = {
  id: string;
  name: string;
  /** Price in USD per billing period. */
  priceUsd: number;
  period: string;
  billingCycle: string;
  features: string[];
  recommended?: boolean;
};

export const PLANS: Record<BillingCycle, Plan> = {
  annual: {
    id: "premium_annual",
    name: "Premium",
    priceUsd: 59.99,
    period: "year",
    billingCycle: "Billed yearly",
    features: ["7-day free trial", "Cancel anytime"],
    recommended: true,
  },
  monthly: {
    id: "premium_monthly",
    name: "Premium",
    priceUsd: 9.99,
    period: "month",
    billingCycle: "Billed monthly",
    features: ["7-day free trial", "Cancel anytime"],
  },
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatPrice(plan: Plan): string {
  return usd.format(plan.priceUsd);
}

/** Annual savings vs paying monthly for 12 months, as a whole percentage (e.g. 50). */
export const ANNUAL_SAVINGS_PERCENT = Math.round(
  (1 - PLANS.annual.priceUsd / (PLANS.monthly.priceUsd * 12)) * 100,
);

export type CheckoutOffer = "monthly" | "lifetime";
export const CHECKOUT_RETURN = "/builder?resume=checkout";
export function checkoutReturn(value: unknown): string {
  return value === CHECKOUT_RETURN ? CHECKOUT_RETURN : "/dashboard";
}
export function checkoutPrice(offer: CheckoutOffer, founder: boolean): number {
  return offer === "monthly" ? (founder ? 499 : 999) : (founder ? 3499 : 9999);
}
export function checkoutPlan(offer: CheckoutOffer, founder: boolean): string {
  return offer === "monthly" ? (founder ? "founder_monthly" : "pro_monthly") : (founder ? "founder_lifetime" : "lifetime");
}
export function checkoutPlanMatches(plan: unknown, mode: unknown): boolean {
  return mode === "subscription" ? plan === "pro_monthly" || plan === "founder_monthly" : mode === "payment" && (plan === "lifetime" || plan === "founder_lifetime");
}

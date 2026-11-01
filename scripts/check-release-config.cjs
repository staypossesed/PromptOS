// Run with Vercel's production environment, preferably during its cloud build.
// An explicitly supplied ignored env file is also supported; never load local dev defaults.
// Read-only: never create customers, sessions, charges, users, or database rows.
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { checkoutPrice } = require("./load-ts.cjs").loadTS("lib/checkout.ts");
if (process.argv[2]) {
  const fs = require("node:fs");
  const env = require("@next/env");
  env.processEnv([{ path: process.argv[2], contents: fs.readFileSync(process.argv[2], "utf8") }], process.cwd(), { info() {}, error() {} }, true);
}
const required = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO_MONTHLY", "STRIPE_PRICE_FOUNDER_MONTHLY", "STRIPE_PRICE_LIFETIME", "STRIPE_PRICE_FOUNDER_LIFETIME"];
let failedChecks = 0;
function check(ok, message) {
  if (!ok) { failedChecks++; console.error(`FAIL ${message}`); }
  else console.log(`PASS ${message}`);
  return Boolean(ok);
}
(async () => {
  for (const name of required) check(Boolean(process.env[name]), `${name} is configured`);
  if (failedChecks) throw new Error("Required production configuration is missing.");
  check(!process.env.UMPROMPT_BILLING_TEST && !process.env.BILLING_TEST_MODE, "production billing-test mode is disabled");
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  check(stripeKey === stripeKey.trim(), "production Stripe key has no surrounding whitespace");
  check(!/^(sk|rk)_test_/.test(stripeKey), "production Stripe key is not a test-mode key");
  check(/^(sk|rk)_live_/.test(stripeKey), "production Stripe key has a valid live-key prefix");
  const site = new URL(process.env.NEXT_PUBLIC_SITE_URL);
  check(site.protocol === "https:" && ["www.umprompt.com", "umprompt.com"].includes(site.hostname) && site.pathname === "/", "production return origin is Umprompt HTTPS");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
  try {
    const account = await stripe.accounts.retrieve();
    check(account.charges_enabled === true, "live Stripe account is enabled to accept payments");
  } catch {
    check(false, "live Stripe account payment readiness can be verified");
  }
  for (const [name, offer, founder] of [["STRIPE_PRICE_PRO_MONTHLY", "monthly", false], ["STRIPE_PRICE_FOUNDER_MONTHLY", "monthly", true], ["STRIPE_PRICE_LIFETIME", "lifetime", false], ["STRIPE_PRICE_FOUNDER_LIFETIME", "lifetime", true]]) {
    try {
      const price = await stripe.prices.retrieve(process.env[name]);
      check(price.active && price.currency === "usd" && price.unit_amount === checkoutPrice(offer, founder) && (offer === "monthly" ? price.type === "recurring" && price.recurring?.interval === "month" && price.recurring?.interval_count === 1 : price.type === "one_time"), `${name} matches the displayed offer and interval`);
      check(price.livemode, `${name} is a live production price`);
    } catch {
      check(false, `${name} can be read with the configured Stripe key`);
    }
  }
  const expectedEvents = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed", "invoice.paid"];
  async function collect(list) { const result = []; for await (const item of list) result.push(item); return result; }
  // Dashboard-created destinations use the newer API. Request the URL only,
  // never a signing secret; legacy v1 webhook endpoints remain supported.
  const sources = await Promise.allSettled([
    collect(stripe.webhookEndpoints.list({ limit: 100 })),
    collect(stripe.v2.core.eventDestinations.list({ limit: 100, include: ["webhook_endpoint.url"] })),
  ]);
  check(sources.some((result) => result.status === "fulfilled"), "Stripe webhook settings can be read with the configured key");
  const endpoints = [
    ...(sources[0].status === "fulfilled" ? sources[0].value.map((item) => ({ ...item, event_payload: "snapshot", snapshot_api_version: item.api_version })) : []),
    ...(sources[1].status === "fulfilled" ? sources[1].value.filter((item) => item.type === "webhook_endpoint").map((item) => ({ ...item, url: item.webhook_endpoint?.url })) : []),
  ];
  const endpoint = endpoints.find((item) => {
    try {
      const url = new URL(item.url);
      return item.status === "enabled" && item.livemode && url.protocol === "https:"
        && ["www.umprompt.com", "umprompt.com"].includes(url.hostname)
        && url.pathname.replace(/\/$/, "") === "/api/stripe/webhook" && !url.search && !url.hash;
    } catch { return false; }
  });
  check(Boolean(endpoint), "enabled production webhook targets Umprompt");
  check(Boolean(endpoint) && expectedEvents.every((name) => endpoint.enabled_events.includes("*") || endpoint.enabled_events.includes(name)), "production webhook subscribes to required billing events");
  check(endpoint?.event_payload === "snapshot", "billing webhook delivers snapshot event objects");
  check(Boolean(endpoint) && (!endpoint.snapshot_api_version || endpoint.snapshot_api_version === "2026-04-22.dahlia"), "explicit billing event API version matches the application");
  if (endpoint) {
    try {
      const probe = await fetch(endpoint.url, { redirect: "manual", signal: AbortSignal.timeout(6000) });
      check(probe.status === 405, "billing webhook is directly reachable without redirects or a login gate");
    } catch { check(false, "billing webhook reachability can be verified"); }
  }
  try {
    const configurations = [];
    for await (const configuration of stripe.billingPortal.configurations.list({ active: true, limit: 100 })) configurations.push(configuration);
    const portal = configurations.find((item) => item.active && item.is_default && item.livemode);
    check(Boolean(portal), "default live customer portal is active");
    check(Boolean(portal?.features.subscription_cancel.enabled) && portal.features.subscription_cancel.mode === "at_period_end", "live portal supports cancellation at the end of the paid period");
    check(Boolean(portal?.features.payment_method_update.enabled), "live portal supports payment-method updates");
  } catch {
    check(false, "live customer portal configuration can be verified");
  }
  const options = { auth: { autoRefreshToken: false, persistSession: false } };
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
  for (const [table, columns] of [["workspace_items", "id,user_id,kind,name,payload"], ["billing_subscriptions", "id,user_id,stripe_checkout_session_id,plan,status"], ["billing_customers", "user_id,stripe_customer_id"], ["promo_redemptions", "id,stripe_checkout_session_id,status"], ["usage_events", "id,user_id,created_at"]]) {
    const result = await admin.from(table).select(columns).limit(0);
    check(!result.error && result.data?.length === 0, `${table} schema is accessible without reading records`);
  }
  const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
  const blocked = await anonymous.from("workspace_items").select("id").limit(0);
  check(blocked.error?.code === "42501", "anonymous library access is denied");
  const count = await admin.rpc("get_founder_count");
  check(!count.error && Number.isInteger(count.data) && count.data >= 0, "founder availability function is present");
  // Audit counts only: no customer IDs, account data, or subscription rows are returned.
  const monthlyAccess = () => admin.from("billing_subscriptions")
    .select("id", { count: "exact", head: true })
    .in("status", ["active", "trialing"])
    .or("is_lifetime.eq.false,is_lifetime.is.null");
  const [missingExpiry, expiredAccess] = await Promise.all([
    monthlyAccess().is("current_period_end", null),
    monthlyAccess().lte("current_period_end", new Date().toISOString()),
  ]);
  check(!missingExpiry.error && !expiredAccess.error && Number.isInteger(missingExpiry.count) && Number.isInteger(expiredAccess.count), "existing monthly access audit returned aggregate counts only");
  check(missingExpiry.count === 0 && expiredAccess.count === 0, "existing active monthly records have valid paid-access dates");
  if (failedChecks) throw new Error("Production configuration checks failed.");
  console.log("Production configuration verified read-only. This is NOT a completed payment test and does not verify the stored webhook signing secret.");
})().catch(() => { console.error("Release configuration check failed. Review the last unconfirmed check; no secrets or provider error payloads are printed."); process.exitCode = 1; });

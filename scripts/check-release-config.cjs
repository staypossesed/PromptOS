// Pass an ignored Vercel production env file; never load the local dev file here.
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
function check(ok, message) { if (!ok) throw new Error(message); console.log(`PASS ${message}`); }
(async () => {
  for (const name of required) check(Boolean(process.env[name]), `${name} is configured`);
  const site = new URL(process.env.NEXT_PUBLIC_SITE_URL);
  check(site.protocol === "https:" && ["www.umprompt.com", "umprompt.com"].includes(site.hostname) && site.pathname === "/", "production return origin is Umprompt HTTPS");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
  for (const [name, offer, founder] of [["STRIPE_PRICE_PRO_MONTHLY", "monthly", false], ["STRIPE_PRICE_FOUNDER_MONTHLY", "monthly", true], ["STRIPE_PRICE_LIFETIME", "lifetime", false], ["STRIPE_PRICE_FOUNDER_LIFETIME", "lifetime", true]]) {
    const price = await stripe.prices.retrieve(process.env[name]);
    check(price.active && price.currency === "usd" && price.unit_amount === checkoutPrice(offer, founder) && (offer === "monthly" ? price.type === "recurring" && price.recurring?.interval === "month" && price.recurring?.interval_count === 1 : price.type === "one_time"), `${name} matches the displayed offer and interval`);
    check(price.livemode, `${name} is a live production price`);
  }
  const expectedEvents = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed"];
  const endpoints = [];
  for await (const endpoint of stripe.webhookEndpoints.list({ limit: 100 })) endpoints.push(endpoint);
  const endpoint = endpoints.find((item) => item.status === "enabled" && item.url.replace(/\/$/, "") === `${site.origin}/api/stripe/webhook`);
  check(Boolean(endpoint), "enabled production webhook targets Umprompt");
  check(expectedEvents.every((name) => endpoint.enabled_events.includes("*") || endpoint.enabled_events.includes(name)), "production webhook subscribes to required billing events");
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
  console.log("Production configuration verified read-only. This is NOT a completed payment test and does not verify the stored webhook signing secret.");
})().catch(() => { console.error("Release configuration check failed. Review the last unconfirmed check; no secrets or provider error payloads are printed."); process.exitCode = 1; });

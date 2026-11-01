const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const { checkoutPrice } = require("./load-ts.cjs").loadTS("lib/checkout.ts");

const required = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO_MONTHLY", "STRIPE_PRICE_FOUNDER_MONTHLY", "STRIPE_PRICE_LIFETIME", "STRIPE_PRICE_FOUNDER_LIFETIME"];
const optional = ["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "DEFAULT_AI_PROVIDER", "DEFAULT_AI_MODEL", "SCORE_AI_MODEL"];
const priceFields = [
  ["STRIPE_PRICE_PRO_MONTHLY", "monthly", false], ["STRIPE_PRICE_FOUNDER_MONTHLY", "monthly", true],
  ["STRIPE_PRICE_LIFETIME", "lifetime", false], ["STRIPE_PRICE_FOUNDER_LIFETIME", "lifetime", true],
];

function validateConfig(env, productionRefs = []) {
  if (env.BILLING_TEST_MODE !== "isolated") throw new Error("Set BILLING_TEST_MODE=isolated in the separate test file.");
  for (const name of required) if (!env[name]?.trim()) throw new Error(`${name} is missing from the test file.`);
  if (!/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY)) throw new Error("Only a Stripe sk_test_ key is allowed. Live keys are rejected.");
  if (!/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET)) throw new Error("Use the isolated Stripe listener signing secret.");
  const site = new URL(env.NEXT_PUBLIC_SITE_URL);
  if (site.origin !== "http://localhost:3002" || site.pathname !== "/" || site.search || site.hash || site.username || site.password) throw new Error("The test site must be exactly http://localhost:3002.");
  const database = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const ref = env.BILLING_TEST_SUPABASE_PROJECT_REF;
  if (!/^[a-z0-9]{20}$/.test(ref ?? "") || database.origin !== `https://${ref}.supabase.co` || database.pathname !== "/" || database.search || database.hash || database.username || database.password) throw new Error("Confirm the separate test project's 20-character ref and matching Supabase HTTPS URL.");
  // The first ref is the currently shipped Umprompt project, not a credential.
  const blocked = new Set(["yxprfdhuhwdcjreyahha", ...productionRefs]);
  if (blocked.has(ref)) throw new Error("The test database matches a non-test Umprompt database. Use a separate project.");
  for (const [name] of priceFields) if (!/^price_[A-Za-z0-9]+$/.test(env[name])) throw new Error(`${name} must be a test price ID.`);
  if (new Set(priceFields.map(([name]) => env[name])).size !== 4) throw new Error("Each of the four offers must have its own test price.");
  for (const [name, role, prefix] of [["NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon", "sb_publishable_"], ["SUPABASE_SERVICE_ROLE_KEY", "service_role", "sb_secret_"]]) {
    const key = env[name];
    if (key.startsWith(prefix)) continue;
    let payload;
    try { payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")); } catch {}
    if (payload?.role !== role || payload?.ref !== ref) throw new Error(`${name} must belong to the separate test project and have the correct role.`);
  }
  return env;
}

function isolatedEnvironment(env, inherited = process.env) {
  const child = { ...inherited };
  for (const name of Object.keys(child)) {
    if (/^(NEXT_PUBLIC_|STRIPE_|SUPABASE_|ANTHROPIC_|OPENROUTER_|UPSTASH_|POSTHOG_|BILLING_)/.test(name) || name === "ADMIN_EMAILS") child[name] = "";
  }
  // Defined empty values prevent Next from falling back to .env.local credentials.
  for (const name of [...required, ...optional, "NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "ADMIN_EMAILS"]) child[name] = "";
  for (const name of [...required, ...optional]) if (env[name]) child[name] = env[name];
  child.DEFAULT_AI_PROVIDER ||= "anthropic";
  child.DEFAULT_AI_MODEL ||= "claude-sonnet-4-6";
  child.SCORE_AI_MODEL ||= "claude-sonnet-4-6";
  child.NODE_ENV = "development";
  child.UMPROMPT_BILLING_TEST = "1";
  return child;
}

function knownDatabaseRefs() {
  return [".env", ".env.local", ".env.development", ".env.development.local", ".env.production.local"].flatMap(name => {
    const filename = path.join(root, name);
    if (!fs.existsSync(filename)) return [];
    try { return [new URL(parseEnv(fs.readFileSync(filename, "utf8")).NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]]; } catch { return []; }
  });
}

async function preflight(env, services = {}) {
  const Stripe = require("stripe");
  const { createClient } = require("@supabase/supabase-js");
  const stripe = services.stripe ?? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia", timeout: 10000, maxNetworkRetries: 0 });
  const balance = await stripe.balance.retrieve();
  if (balance.livemode !== false) throw new Error("Stripe must report test mode.");
  for (const [name, offer, founder] of priceFields) {
    const price = await stripe.prices.retrieve(env[name]);
    if (price.livemode !== false || !price.active || price.currency !== "usd" || price.unit_amount !== checkoutPrice(offer, founder) || (offer === "monthly" ? price.type !== "recurring" || price.recurring?.interval !== "month" || price.recurring?.interval_count !== 1 : price.type !== "one_time")) throw new Error(`${name} does not match its test offer.`);
    console.log(`PASS ${name}: test mode and displayed offer verified`);
  }
  const admin = services.admin ?? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const [table, columns] of [["billing_customers", "user_id,stripe_customer_id"], ["billing_subscriptions", "user_id,stripe_checkout_session_id,status,current_period_end"], ["promo_redemptions", "stripe_checkout_session_id,status"], ["usage_events", "user_id,created_at"]]) {
    const { error } = await admin.from(table).select(columns).limit(0);
    if (error) throw new Error(`${table} is not ready in the test project.`);
  }
  const founder = await admin.rpc("get_founder_count");
  if (founder.error || !Number.isInteger(founder.data)) throw new Error("Apply billing.sql in the test project first.");
  console.log("PASS isolated test database schema (no user records read or written)");
}

async function main() {
  const index = process.argv.indexOf("--env");
  if (index < 0 || !process.argv[index + 1] || process.argv[index + 1].startsWith("--")) throw new Error("Usage: npm run billing:test -- --env .env.billing-test.local [--check]");
  const filename = path.resolve(root, process.argv[index + 1]);
  if (!fs.existsSync(filename)) throw new Error("The separate test file does not exist. Follow docs/payment-verification.md; no server was started.");
  const env = validateConfig(parseEnv(fs.readFileSync(filename, "utf8")), knownDatabaseRefs());
  try { await preflight(env); } catch (error) {
    // Stripe errors can contain request details; never print their raw payloads.
    if (error?.type || error?.name === "AuthApiError") throw new Error("Test-provider preflight failed. Check the test configuration privately; no server was started.");
    throw error;
  }
  console.log("Configuration checks passed. This is NOT a completed Stripe test purchase.");
  if (process.argv.includes("--check")) return;
  console.log("Starting isolated billing test at http://localhost:3002. Keep the matching Stripe CLI listener running.");
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "localhost", "--port", "3002"], { cwd: root, env: isolatedEnvironment(env), stdio: "inherit", windowsHide: true });
  process.on("SIGINT", () => child.kill("SIGINT"));
  child.on("error", () => { console.error("Could not start the isolated test server."); process.exitCode = 1; });
  child.on("exit", code => { process.exitCode = code ?? 1; });
}

module.exports = { validateConfig, isolatedEnvironment, preflight };
if (require.main === module) main().catch(error => { console.error(error instanceof Error ? error.message : "Test setup failed."); process.exitCode = 1; });

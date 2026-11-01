const test = require("node:test");
const assert = require("node:assert/strict");
const { validateConfig, isolatedEnvironment, preflight } = require("../scripts/billing-test.cjs");
const ref = "abcdefghijklmnopqrst";
const config = { BILLING_TEST_MODE: "isolated", BILLING_TEST_SUPABASE_PROJECT_REF: ref,
  NEXT_PUBLIC_SITE_URL: "http://localhost:3002", NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_synthetic", SUPABASE_SERVICE_ROLE_KEY: "sb_secret_synthetic",
  STRIPE_SECRET_KEY: "sk_test_synthetic", STRIPE_WEBHOOK_SECRET: "whsec_synthetic",
  STRIPE_PRICE_PRO_MONTHLY: "price_test1", STRIPE_PRICE_FOUNDER_MONTHLY: "price_test2", STRIPE_PRICE_LIFETIME: "price_test3", STRIPE_PRICE_FOUNDER_LIFETIME: "price_test4" };

test("isolated billing configuration rejects live keys, production databases, bad redirects and missing secrets", () => {
  assert.equal(validateConfig(config), config);
  for (const override of [
    { STRIPE_SECRET_KEY: "sk_live_synthetic" }, { STRIPE_SECRET_KEY: "rk_live_synthetic" }, { BILLING_TEST_MODE: "" },
    { NEXT_PUBLIC_SITE_URL: "https://www.umprompt.com" }, { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
    { NEXT_PUBLIC_SITE_URL: "http://localhost:3002?redirect=bad" }, { STRIPE_WEBHOOK_SECRET: "" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://yxprfdhuhwdcjreyahha.supabase.co", BILLING_TEST_SUPABASE_PROJECT_REF: "yxprfdhuhwdcjreyahha" },
    { SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_wrongRole" }, { NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_secret_wrongRole" },
    { STRIPE_PRICE_LIFETIME: "price_test1" },
  ]) assert.throws(() => validateConfig({ ...config, ...override }));
  assert.throws(() => validateConfig(config, [ref]), /non-test/);
});

test("legacy Supabase keys must match the separate project and role", () => {
  const jwt = (role, project) => `synthetic.${Buffer.from(JSON.stringify({ role, ref: project })).toString("base64url")}.synthetic`;
  assert.doesNotThrow(() => validateConfig({ ...config, SUPABASE_SERVICE_ROLE_KEY: jwt("service_role", ref), NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("anon", ref) }));
  assert.throws(() => validateConfig({ ...config, SUPABASE_SERVICE_ROLE_KEY: jwt("service_role", "wrongproject") }));
  assert.throws(() => validateConfig({ ...config, NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("service_role", ref) }));
});

test("test server cannot inherit production secrets or send test events into production analytics", () => {
  const env = isolatedEnvironment(config, { PATH: "synthetic-path", STRIPE_SECRET_KEY: "sk_live_old", ANTHROPIC_API_KEY: "live-ai", NEXT_PUBLIC_POSTHOG_KEY: "live-analytics", SUPABASE_OTHER_SECRET: "production", UPSTASH_REDIS_REST_TOKEN: "production" });
  assert.equal(env.STRIPE_SECRET_KEY, config.STRIPE_SECRET_KEY);
  assert.equal(env.NEXT_PUBLIC_POSTHOG_KEY, "");
  assert.equal(env.ANTHROPIC_API_KEY, "");
  assert.equal(env.SUPABASE_OTHER_SECRET, "");
  assert.equal(env.UPSTASH_REDIS_REST_TOKEN, "");
  assert.equal(env.UMPROMPT_BILLING_TEST, "1");
  assert.equal(env.SCORE_AI_MODEL, "claude-sonnet-4-6");
  assert.equal(env.PATH, "synthetic-path");
});

test("preflight rejects live Stripe responses, mismatched prices, and unavailable test schemas without writes", async () => {
  const amounts = { price_test1: 999, price_test2: 499, price_test3: 9999, price_test4: 3499 };
  for (const failure of [null, "live_balance", "live_price", "wrong_amount", "wrong_interval", "database", "founder"]) {
    const queries = [];
    const services = {
      stripe: { balance: { retrieve: async () => ({ livemode: failure === "live_balance" }) }, prices: { retrieve: async id => ({
        active: true, livemode: failure === "live_price", currency: "usd", unit_amount: failure === "wrong_amount" ? 1 : amounts[id],
        type: ["price_test1", "price_test2"].includes(id) ? "recurring" : "one_time",
        recurring: { interval: failure === "wrong_interval" ? "year" : "month", interval_count: 1 },
      }) } },
      admin: { from: table => ({ select: columns => ({ limit: async limit => { queries.push({ table, columns, limit }); return { error: failure === "database" ? {} : null }; } }) }),
        rpc: async name => { assert.equal(name, "get_founder_count"); return { data: failure === "founder" ? null : 0 }; } },
    };
    if (failure) await assert.rejects(preflight(config, services));
    else { await preflight(config, services); assert.equal(queries.length, 4); }
    assert.ok(queries.every(q => q.limit === 0));
  }
});

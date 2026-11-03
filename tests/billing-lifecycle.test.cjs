const test = require("node:test");
const assert = require("node:assert/strict");
const Stripe = require("stripe");
const { NextRequest, NextResponse } = require("next/server");
const load = require("./load-with-imports.cjs");

const stripe = new Stripe("sk_test_synthetic");
const secret = "whsec_synthetic_only";
function setup({ type, object, status = "active", fail = false }) {
  const writes = [];
  const reads = [];
  const current = { id: "sub_synthetic", status, cancel_at_period_end: true, items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86400 }] } };
  const sync = load("lib/subscription-state.ts", {
    "@/lib/stripe": { stripe: { subscriptions: { retrieve: async id => { reads.push(id); return current; } } } },
    "@/lib/supabase/admin": { createAdminClient: () => ({ from: table => ({ update: data => ({ eq: async (field, id) => { writes.push({ table, data, field, id }); return { error: fail ? { message: "Synthetic database error" } : null }; } }) }) }) },
  });
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  const route = load("app/api/stripe/webhook/route.ts", {
    "next/server": { NextResponse }, "@/lib/stripe": { stripe },
    "@/lib/subscription-state": sync,
    "@/lib/fulfill-checkout": { fulfillCheckout: async () => {}, CheckoutVerificationError: class extends Error {} },
  });
  const payload = JSON.stringify({ id: "evt_synthetic", type, data: { object } });
  function request(body = payload, header = stripe.webhooks.generateTestHeaderString({ payload, secret })) {
    return new NextRequest("http://localhost:3002/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": header } });
  }
  return { route, writes, reads, current, request };
}

test("cancellation uses current Stripe state, not a delayed active snapshot", async () => {
  const t = setup({ type: "customer.subscription.updated", object: { id: "sub_synthetic", status: "active" }, status: "canceled" });
  assert.equal((await t.route.POST(t.request())).status, 200);
  assert.deepEqual(t.reads, ["sub_synthetic"]);
  assert.equal(t.writes[0].data.status, "cancelled");
  assert.equal(t.writes[0].field, "stripe_subscription_id");
});

test("end-of-period cancellation retains access until the paid period ends", async () => {
  const t = setup({ type: "customer.subscription.updated", object: { id: "sub_synthetic" } });
  await t.route.POST(t.request());
  assert.equal(t.writes[0].data.status, "active");
  assert.ok(Date.parse(t.writes[0].data.current_period_end) > Date.now());
});

test("failed invoices remove access, paid recovery restores it, and old failures do not undo recovery", async () => {
  for (const [type, status] of [["invoice.payment_failed", "past_due"], ["invoice.paid", "active"], ["invoice.payment_failed", "active"], ["invoice.paid", "unpaid"]]) {
    const t = setup({ type, status, object: { parent: { type: "subscription_details", subscription_details: { subscription: "sub_synthetic" } } } });
    assert.equal((await t.route.POST(t.request())).status, 200);
    assert.equal(t.writes[0].data.status, status);
  }
});

test("subscription deletion, retries, and persistence failures remain safe", async () => {
  for (const fail of [false, true]) {
    const t = setup({ type: "customer.subscription.deleted", object: { id: "sub_synthetic" }, status: "canceled", fail });
    for (let i = 0; i < 2; i++) assert.equal((await t.route.POST(t.request())).status, fail ? 500 : 200);
    assert.equal(t.writes.length, 2);
    assert.ok(t.writes.every(w => w.data.status === "cancelled" && w.id === "sub_synthetic"));
  }
});

test("tampered, invalid, missing, and expired signatures cannot change paid access", async () => {
  const t = setup({ type: "customer.subscription.deleted", object: { id: "sub_synthetic" }, status: "canceled" });
  const stale = stripe.webhooks.generateTestHeaderString({ payload: "{}", secret, timestamp: Math.floor(Date.now() / 1000) - 600 });
  for (const req of [t.request("{\"tampered\":true}"), t.request("{}", "invalid"), t.request("{}", ""), t.request("{}", stale)]) assert.equal((await t.route.POST(req)).status, 400);
  assert.equal(t.writes.length, 0);
  assert.equal(t.reads.length, 0);
});

test("one-time invoices and unrelated events do not modify any subscription", async () => {
  for (const type of ["invoice.paid", "invoice.payment_failed", "customer.created"]) {
    const t = setup({ type, object: { parent: null } });
    assert.equal((await t.route.POST(t.request())).status, 200);
    assert.equal(t.writes.length, 0);
    assert.equal(t.reads.length, 0);
  }
});

test("paid access queries exclude expired or missing monthly periods while allowing lifetime purchases", async () => {
  let condition;
  const query = { select: () => query, eq: () => query, in: () => query, order: () => query, limit: () => query, gte: () => Promise.resolve({ count: 0 }),
    or: value => { condition = value; return query; }, maybeSingle: async () => ({ data: null }) };
  const helper = load("lib/billing.ts", { "@/lib/purchase-policy": require("../scripts/load-ts.cjs").loadTS("lib/purchase-policy.ts"), "@/lib/stripe": { stripe: {} }, "@/lib/supabase/admin": {} });
  const result = await helper.getBillingStatus({ from: () => query }, "synthetic-owner");
  assert.equal(result.isPaid, false);
  assert.match(condition, /^is_lifetime\.eq\.true,current_period_end\.gt\.\d{4}-/);
  const cutoff = Date.parse(condition.split("current_period_end.gt.")[1]);
  assert.ok(Math.abs(cutoff - Date.now()) < 1000);
});

test("strict billing lookup rejects subscription and usage read failures without changing legacy callers", async () => {
  const helper = load("lib/billing.ts", { "@/lib/purchase-policy": require("../scripts/load-ts.cjs").loadTS("lib/purchase-policy.ts"), "@/lib/stripe": { stripe: {} }, "@/lib/supabase/admin": {} });
  for (const failure of ["subscription", "week", "day", "throw"]) {
    let reads = 0;
    const query = {
      select: () => query, eq: () => query, in: () => query, or: () => query, order: () => query, limit: () => query,
      maybeSingle: async () => {
        if (failure === "throw") throw new Error("Synthetic network failure");
        return { data: null, error: failure === "subscription" ? { code: "SYNTHETIC" } : null };
      },
      gte: async () => ({ count: 0, error: ++reads === (failure === "week" ? 1 : failure === "day" ? 2 : -1) ? { code: "SYNTHETIC" } : null }),
    };
    await assert.rejects(helper.getBillingStatus({ from: () => query }, "synthetic-owner", { failOnError: true }), /Billing is temporarily unavailable/);
    assert.equal((await helper.getBillingStatus({ from: () => query }, "synthetic-owner")).isPaid, false);
  }
});

test("billing portal handles authentication, missing accounts, database and Stripe outages", async () => {
  for (const [user, customer, dbError, stripeError, expected] of [
    [null, null, null, false, 401], [{ id: "owner" }, null, null, false, 404],
    [{ id: "owner" }, null, {}, false, 503], [{ id: "owner" }, { stripe_customer_id: "cus_synthetic" }, null, true, 503],
    [{ id: "owner" }, { stripe_customer_id: "cus_synthetic" }, null, false, 200],
  ]) {
    let owner;
    const query = { select: () => query, eq: (_field, id) => { owner = id; return query; }, maybeSingle: async () => ({ data: customer, error: dbError }) };
    const route = load("app/api/billing/portal/route.ts", { "next/server": { NextResponse },
      "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: () => query }) },
      "@/lib/stripe": { stripe: { billingPortal: { sessions: { create: async () => { if (stripeError) throw new Error("Synthetic outage"); return { url: "https://billing.stripe.com/synthetic" }; } } } } },
    });
    const res = await route.POST();
    assert.equal(res.status, expected);
    if (user) assert.equal(owner, "owner");
    if (expected === 200) assert.equal(res.headers.get("cache-control"), "private, no-store");
  }
});

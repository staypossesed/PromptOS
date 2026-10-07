const test = require("node:test");
const assert = require("node:assert/strict");
const { NextRequest, NextResponse } = require("next/server");
const load = require("./load-with-imports.cjs");
const { loadTS } = require("../scripts/load-ts.cjs");
const checkout = loadTS("lib/checkout.ts");
const drafts = loadTS("lib/checkout-draft.ts");
const req = (body) => new NextRequest("http://localhost/api/billing/checkout", { method: "POST", body: JSON.stringify(body) });
const paidSession = { id: "cs_test_synthetic", metadata: { user_id: "owner", plan: "lifetime", return_to: checkout.CHECKOUT_RETURN }, status: "complete", payment_status: "paid", mode: "payment", customer: "cus_synthetic", line_items: { data: [{ price: { id: "price_synthetic" } }] } };
function fulfillment(session = paidSession, dbError = null) {
  const writes = [];
  const query = { upsert: async (data, options) => { writes.push({ data, options }); return { error: dbError }; } };
  const helper = load("lib/fulfill-checkout.ts", {
    "@/lib/stripe": { stripe: { checkout: { sessions: { retrieve: async () => session } }, subscriptions: { retrieve: async () => ({ id: "sub_synthetic", status: "active", items: { data: [] } }) } } },
    "@/lib/supabase/admin": { createAdminClient: () => ({ from: () => query }) }, "@/lib/checkout": checkout,
  });
  return { helper, writes };
}
test("checkout destinations reject external redirects", () => {
  for (const path of ["https://evil.invalid", "//evil.invalid", "/builder?resume=checkout&other=1", null]) assert.equal(checkout.checkoutReturn(path), "/dashboard");
  assert.equal(checkout.checkoutReturn(checkout.CHECKOUT_RETURN), checkout.CHECKOUT_RETURN);
});
test("payment verification blocks unpaid, incomplete, foreign and invalid-plan sessions before writes", async () => {
  for (const overrides of [{ payment_status: "unpaid" }, { status: "open" }, { metadata: { user_id: "other", plan: "lifetime" } }, { metadata: { user_id: "owner", plan: "pro_monthly" } }]) {
    const { helper, writes } = fulfillment({ ...paidSession, ...overrides });
    await assert.rejects(helper.fulfillCheckout(paidSession.id, "owner"), helper.CheckoutVerificationError);
    assert.equal(writes.length, 0);
  }
});
test("old checkout cannot revive an inactive monthly subscription", async () => {
  for (const status of ["canceled", "past_due", "unpaid", "incomplete", "incomplete_expired"]) {
    const { helper, writes } = fulfillment({ ...paidSession, metadata: { user_id: "owner", plan: "pro_monthly" }, mode: "subscription", subscription: { id: "sub_synthetic", status, items: { data: [] } } });
    await assert.rejects(helper.fulfillCheckout(paidSession.id, "owner"), /PLAN_INACTIVE/);
    assert.equal(writes.length, 0);
  }
});
test("confirmed payment records real price ID and uses idempotent session conflict key", async () => {
  const { helper, writes } = fulfillment();
  const result = await helper.fulfillCheckout(paidSession.id, "owner");
  assert.equal(result.returnTo, checkout.CHECKOUT_RETURN);
  assert.equal(writes[0].data.stripe_price_id, "price_synthetic");
  assert.equal(writes[0].options.onConflict, "stripe_checkout_session_id");
});
test("activation database errors are not reported as success", async () => {
  const { helper } = fulfillment(paidSession, { message: "Synthetic database failure" });
  await assert.rejects(helper.fulfillCheckout(paidSession.id, "owner"), /could not be saved/);
});
test("founder fulfillment recovers promo records even when initial checkout insert was lost", async () => {
  const { helper, writes } = fulfillment({ ...paidSession, metadata: { user_id: "owner", plan: "founder_lifetime", promo_code: "UMPROMPT" } });
  await helper.fulfillCheckout(paidSession.id, "owner");
  assert.equal(writes[2].data.status, "succeeded");
  assert.equal(writes[2].data.user_id, "owner");
});
function checkoutRoute({ user = { id: "owner", email: "synthetic@example.invalid" }, paid = false, founder = false, amount = 999, recurring = true, config = true } = {}) {
  const calls = [];
  for (const name of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_PRICE_PRO_MONTHLY", "STRIPE_PRICE_FOUNDER_MONTHLY", "STRIPE_PRICE_LIFETIME", "STRIPE_PRICE_FOUNDER_LIFETIME"]) process.env[name] = config ? "synthetic_test_configuration" : "";
  const stripe = { prices: { retrieve: async () => ({ active: true, currency: "usd", unit_amount: amount, type: recurring ? "recurring" : "one_time", recurring: recurring ? { interval: "month", interval_count: 1 } : null }) }, checkout: { sessions: { create: async (data) => { calls.push(data); return { id: paidSession.id, url: "https://checkout.stripe.com/c/pay/cs_test_synthetic" }; }, expire: async () => {} } } };
  const route = load("app/api/billing/checkout/route.ts", { "next/server": { NextResponse }, "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) }, "@/lib/stripe": { stripe }, "@/lib/supabase/admin": { createAdminClient: () => ({ from: () => ({ upsert: async () => ({ error: null }) }) }) }, "@/lib/billing": { getBillingStatus: async () => ({ isPaid: paid }), isFounderEligible: async () => founder, getOrCreateStripeCustomer: async () => "cus_synthetic" }, "@/lib/checkout": checkout });
  return { route, calls };
}
test("checkout rejects unauthenticated, paid, malformed and expired-offer requests", async () => {
  for (const [options, body, expected] of [[{ user: null }, { offerType: "monthly" }, 401], [{ paid: true }, { offerType: "monthly" }, 409], [{}, null, 422], [{}, { offerType: "invalid" }, 422], [{}, { offerType: "monthly", promoCode: "UMPROMPT" }, 409]]) {
    const { route, calls } = checkoutRoute(options);
    assert.equal((await route.POST(req(body))).status, expected);
    assert.equal(calls.length, 0);
  }
});
test("missing configuration and mismatched prices block checkout before a charge can be started", async () => {
  for (const options of [{ config: false }, { amount: 10000 }, { recurring: false }]) {
    const { route, calls } = checkoutRoute(options);
    assert.equal((await route.POST(req({ offerType: "monthly" }))).status, 503);
    assert.equal(calls.length, 0);
  }
});
test("monthly and lifetime offers have matching totals, mode and safe return destination", async () => {
  for (const founder of [false, true]) for (const offerType of ["monthly", "lifetime"]) {
    const { route, calls } = checkoutRoute({ founder, amount: checkout.checkoutPrice(offerType, founder), recurring: offerType === "monthly" });
    const res = await route.POST(req({ offerType, promoCode: founder ? "UMPROMPT" : undefined, returnTo: checkout.CHECKOUT_RETURN }));
    assert.equal(res.status, 200);
    assert.equal(calls[0].mode, offerType === "monthly" ? "subscription" : "payment");
    assert.equal(calls[0].metadata.return_to, checkout.CHECKOUT_RETURN);
    assert.match(calls[0].cancel_url, /returnTo=/);
    if (founder) assert.match(calls[0].cancel_url, /promo=UMPROMPT/);
  }
});
test("checkout draft restores only bounded, fresh data and preserves version history", () => {
  const draft = { idea: "Synthetic idea", context: { versions: [{ prompt: "Old", action: "shorter", createdAt: new Date().toISOString() }] }, prompt: "Synthetic result", tool: "claude", copied: true, createdAt: 1000 };
  assert.equal(drafts.parseCheckoutDraft(JSON.stringify(draft), 1500).prompt, draft.prompt);
  assert.equal(drafts.parseCheckoutDraft(JSON.stringify(draft), 1500).context.versions.length, 1);
  assert.equal(drafts.parseCheckoutDraft(JSON.stringify(draft), 1000 + 31 * 60 * 1000), null);
  assert.equal(drafts.parseCheckoutDraft("malformed"), null);
  assert.equal(drafts.parseCheckoutDraft(JSON.stringify({ ...draft, prompt: "x".repeat(16001) }), 1500), null);
});
test("signed webhooks share verified fulfillment and retry failed persistence", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "synthetic_secret";
  for (const fail of [false, true]) {
    let fulfilled = 0;
    const route = load("app/api/stripe/webhook/route.ts", {
      "next/server": { NextResponse }, "@/lib/stripe": { stripe: { webhooks: { constructEvent: () => ({ type: "checkout.session.async_payment_succeeded", id: "evt_synthetic", data: { object: { id: paidSession.id } } }) } } },
      "@/lib/supabase/admin": { createAdminClient: () => ({}) },
      "@/lib/fulfill-checkout": { fulfillCheckout: async (id) => { fulfilled++; assert.equal(id, paidSession.id); if (fail) throw new Error("Synthetic persistence failure"); }, CheckoutVerificationError: class extends Error {} },
    });
    const request = new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: "{}", headers: { "stripe-signature": "synthetic_signature" } });
    assert.equal((await route.POST(request)).status, fail ? 500 : 200);
    assert.equal(fulfilled, 1);
    assert.equal((await route.POST(req({}))).status, 400);
  }
});
test("sync endpoint verifies ownership and refuses to claim success when paid access is unavailable", async () => {
  for (const paid of [false, true]) {
    const route = load("app/api/billing/sync-checkout/route.ts", { "next/server": { NextResponse }, "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) }, "@/lib/billing": { getBillingStatus: async () => ({ isPaid: paid }) }, "@/lib/fulfill-checkout": { fulfillCheckout: async (id, owner) => { assert.equal(owner, "owner"); return { returnTo: checkout.CHECKOUT_RETURN }; }, CheckoutVerificationError: class extends Error {} }, "@/lib/checkout": checkout });
    const response = await route.POST(req({ sessionId: paidSession.id }));
    assert.equal(response.status, paid ? 200 : 503);
    assert.equal((await response.json()).ok, paid ? true : undefined);
  }
});

// Explicit operational check, separate from the read-only release preflight.
// Sends a synthetic, locally signed no-op to the existing production receiver.
// This is NOT a Stripe-originated event or proof of a completed payment.
// Run in Vercel; never export its production signing secret into local files.
const Stripe = require("stripe");
const { randomUUID } = require("node:crypto");

(async () => {
  if (process.argv[2] !== "--confirm-production-probe") throw new Error();
  if (process.env.VERCEL_ENV !== "production" || !/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || "")) throw new Error();
  if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) throw new Error();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
  const payload = JSON.stringify({
    id: "umprompt_probe_" + randomUUID(), object: "event", type: "umprompt.connection_check",
    api_version: "2026-04-22.dahlia", created: Math.floor(Date.now() / 1000),
    livemode: true, data: { object: {} },
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const response = await fetch("https://www.umprompt.com/api/stripe/webhook", {
    method: "POST", redirect: "manual", signal: AbortSignal.timeout(10000),
    headers: { "content-type": "application/json", "stripe-signature": signature }, body: payload,
  });
  if (response.status !== 200 || (await response.json()).received !== true) throw new Error();
  console.log("PASS Vercel-signed synthetic no-op returned HTTP 200 from the public billing receiver.");
  console.log("This verifies the deployed signature boundary, not a Stripe-originated delivery or payment.");
})().catch(() => {
  console.error("Signed synthetic billing probe failed; no request, provider response, or credentials printed.");
  process.exitCode = 1;
});

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckout, CheckoutVerificationError } from "@/lib/fulfill-checkout";
import { syncSubscriptionState } from "@/lib/subscription-state";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[webhook] signature error:", msg);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  console.info("[webhook] received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionState(sub.id);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const details = invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details : null;
        const ref = details?.subscription;
        const id = typeof ref === "string" ? ref : ref?.id;
        if (id) await syncSubscriptionState(id);
        break;
      }
      default:
        console.info("[webhook] unhandled event type:", event.type);
    }
  } catch (err) {
    console.error("[webhook] handler error:", { type: event.type, message: err instanceof Error ? err.message : err });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    await fulfillCheckout(session.id);
  } catch (error) {
    // Delayed payments get another event when funds settle. Never grant access early.
    if (error instanceof CheckoutVerificationError && ["PAYMENT_PENDING", "PLAN_INACTIVE"].includes(error.code)) return;
    throw error;
  }
}

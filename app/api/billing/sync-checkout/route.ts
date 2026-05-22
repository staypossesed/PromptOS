import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { getBillingStatus } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId } = body as { sessionId?: string };
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // Retrieve session from Stripe and expand subscription for period details
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
  } catch (err) {
    console.error("[sync-checkout] retrieve failed", {
      message: err instanceof Error ? err.message : err,
      hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
    });
    return NextResponse.json({ error: "Could not retrieve checkout session." }, { status: 500 });
  }

  // Verify this session belongs to the authenticated user
  if (session.metadata?.user_id !== user.id) {
    console.error("[sync-checkout] user_id mismatch", {
      expected: user.id,
      got: session.metadata?.user_id,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const plan = session.metadata?.plan ?? (session.mode === "payment" ? "lifetime" : "pro_monthly");
  const isFounder = session.metadata?.is_founder === "true";
  const isLifetime = session.mode === "payment";

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id ?? null;

  // Resolve subscription ID and period_end for monthly plans
  let stripeSubId: string | null = null;
  let periodEnd: string | null = null;
  let subStatus = "active";

  if (session.mode === "subscription" && session.subscription) {
    const sub = session.subscription;
    if (typeof sub === "string") {
      stripeSubId = sub;
      // Sub was not expanded — retrieve separately to get period_end
      try {
        const retrieved = await stripe.subscriptions.retrieve(stripeSubId);
        const itemPeriodEnd = retrieved.items?.data?.[0]?.current_period_end;
        if (itemPeriodEnd) periodEnd = new Date(itemPeriodEnd * 1000).toISOString();
        subStatus = retrieved.status === "active" || retrieved.status === "trialing" ? retrieved.status : "active";
      } catch { /* non-critical — period_end just stays null */ }
    } else {
      // Expanded subscription object
      const expanded = sub as Stripe.Subscription;
      stripeSubId = expanded.id;
      const itemPeriodEnd = expanded.items?.data?.[0]?.current_period_end;
      if (itemPeriodEnd) periodEnd = new Date(itemPeriodEnd * 1000).toISOString();
      subStatus = expanded.status === "active" || expanded.status === "trialing" ? expanded.status : "active";
    }
  }

  const admin = createAdminClient();

  // Upsert billing_subscriptions — idempotent on stripe_checkout_session_id
  const { error: upsertError } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubId,
      stripe_checkout_session_id: session.id,
      stripe_price_id: session.metadata?.plan ?? null,
      plan,
      status: subStatus,
      is_lifetime: isLifetime,
      is_founder: isFounder,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_checkout_session_id" }
  );

  if (upsertError) {
    console.error("[sync-checkout] upsert failed", {
      message: upsertError.message,
      userId: user.id,
      plan,
      sessionId: session.id,
    });
  } else {
    console.info("[sync-checkout] billing synced", {
      userId: user.id,
      plan,
      isFounder,
      isLifetime,
      sessionId: session.id,
    });
  }

  // Upsert customer mapping
  if (customerId) {
    await admin.from("billing_customers").upsert(
      { user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }

  // Return fresh billing status
  const billing = await getBillingStatus(supabase, user.id);
  return NextResponse.json({ ok: true, billing });
}

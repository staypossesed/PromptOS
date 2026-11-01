import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Event delivery can be delayed or out of order. Never apply its old status snapshot.
export async function syncSubscriptionState(subscriptionId: string): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = subscription.items.data[0]?.current_period_end;
  const { error } = await createAdminClient().from("billing_subscriptions").update({
    status: subscription.status === "canceled" ? "cancelled" : subscription.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subscription.id);
  if (error) throw new Error("Could not synchronize subscription access.");
}

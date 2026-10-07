import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBillingStatus } from "@/lib/billing";
import { CheckoutVerificationError, fulfillCheckout } from "@/lib/fulfill-checkout";
import { checkoutReturn } from "@/lib/checkout";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 }); }
  const sessionId = body && typeof body === "object" && !Array.isArray(body) ? (body as { sessionId?: unknown }).sessionId : null;
  if (typeof sessionId !== "string" || !/^cs_(test_|live_)?[a-zA-Z0-9_]{1,200}$/.test(sessionId)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  try {
    const verified = await fulfillCheckout(sessionId, user.id);
    const billing = await getBillingStatus(supabase, user.id);
    if (!billing.isPaid) return NextResponse.json({ error: "ACTIVATION_PENDING" }, { status: 503 });
    return NextResponse.json({ ok: true, billing, returnTo: checkoutReturn(verified.returnTo) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CheckoutVerificationError) return NextResponse.json({ error: error.code }, { status: error.status });
    console.error("[sync-checkout] activation failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "VERIFICATION_FAILED" }, { status: 503 });
  }
}

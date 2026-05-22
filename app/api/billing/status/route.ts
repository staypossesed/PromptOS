import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBillingStatus } from "@/lib/billing";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingStatus(supabase, user.id);

  return NextResponse.json({
    plan: billing.plan,
    status: billing.status,
    isPaid: billing.isPaid,
    isFounder: billing.isFounder,
    isLifetime: billing.isLifetime,
    weeklyLimit: billing.weeklyLimit,
    usedThisWeek: billing.usedThisWeek,
    remainingThisWeek: billing.remainingThisWeek,
    fairUseLabel: billing.fairUseLabel,
  });
}

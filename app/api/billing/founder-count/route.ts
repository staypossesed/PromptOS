import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFounderCount, FOUNDER_LIMIT } from "@/lib/billing";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const count = await getFounderCount(supabase);
    return NextResponse.json({ count, limit: FOUNDER_LIMIT, spotsLeft: Math.max(0, FOUNDER_LIMIT - count) });
  } catch (err) {
    console.error("[founder-count] failed:", err instanceof Error ? err.message : err, {
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    // Graceful fallback — plan page still renders, just omits spots-remaining
    return NextResponse.json({ count: null, limit: FOUNDER_LIMIT, spotsLeft: null });
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFounderCount, FOUNDER_LIMIT } from "@/lib/billing";

export async function GET() {
  const supabase = createAdminClient();
  const count = await getFounderCount(supabase);
  return NextResponse.json({ count, limit: FOUNDER_LIMIT, spotsLeft: Math.max(0, FOUNDER_LIMIT - count) });
}

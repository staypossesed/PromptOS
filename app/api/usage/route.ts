import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 20;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("prompts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString());

  if (error) {
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }

  const usedToday = count ?? 0;

  return NextResponse.json({
    plan: "free",
    dailyLimit: DAILY_LIMIT,
    usedToday,
    remainingToday: Math.max(0, DAILY_LIMIT - usedToday),
  });
}

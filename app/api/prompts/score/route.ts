import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreForClient } from "@/lib/api/score";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return scoreForClient(request, await createClient());
}

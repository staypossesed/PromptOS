import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { optimizeForClient } from "@/lib/api/optimize";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return optimizeForClient(request, await createClient());
}

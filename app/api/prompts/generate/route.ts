import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateForClient } from "@/lib/api/generate";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return generateForClient(request, await createClient());
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseWorkspaceItem } from "@/lib/workspace";

const headers = { "Cache-Control": "private, no-store" };
function databaseError(code?: string) {
  const missing = code === "42P01" || code === "PGRST205";
  return NextResponse.json({ error: missing ? "Workspace storage is not enabled yet. Ask the project owner to apply workspace.sql." : "Could not save or load your library. Please try again." }, { status: 503, headers });
}
export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers });
  const { data, error } = await db.from("workspace_items").select("id, kind, name, payload, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
  if (error) return databaseError(error.code);
  return NextResponse.json({ data }, { headers });
}
export async function POST(request: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers }); }
  const parsed = parseWorkspaceItem(body);
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 422, headers });
  const { data, error } = await db.from("workspace_items").insert({ ...parsed.data, user_id: user.id }).select("id, kind, name, payload, updated_at").single();
  if (error) return databaseError(error.code);
  return NextResponse.json({ data }, { status: 201, headers });
}
export async function PATCH(request: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers });
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ error: "Invalid item ID." }, { status: 422, headers });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers }); }
  const parsed = parseWorkspaceItem(body);
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 422, headers });
  const { data, error } = await db.from("workspace_items").update(parsed.data).eq("id", id).eq("user_id", user.id).select("id, kind, name, payload, updated_at").maybeSingle();
  if (error) return databaseError(error.code);
  if (!data) return NextResponse.json({ error: "Item not found." }, { status: 404, headers });
  return NextResponse.json({ data }, { headers });
}
function validId(id: string | null) { return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id); }
export async function DELETE(request: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers });
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ error: "Invalid item ID." }, { status: 422, headers });
  const { data, error } = await db.from("workspace_items").delete().eq("id", id).eq("user_id", user.id).select("id");
  if (error) return databaseError(error.code);
  if (!data?.length) return NextResponse.json({ error: "Item not found." }, { status: 404, headers });
  return NextResponse.json({ success: true }, { headers });
}

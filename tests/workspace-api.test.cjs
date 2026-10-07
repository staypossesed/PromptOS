const test = require("node:test");
const assert = require("node:assert/strict");
const { NextRequest, NextResponse } = require("next/server");
const loadWithImports = require("./load-with-imports.cjs");
const { loadTS } = require("../scripts/load-ts.cjs");
const workspace = loadTS("lib/workspace.ts");
const context = loadTS("lib/prompt-context.ts");
const types = loadTS("types/prompt.ts");
const id = "12345678-1234-1234-1234-123456789abc";
const profile = { kind: "profile", name: "Synthetic shop", payload: { audience: "Students" }, user_id: "other-owner" };
function setup(user = { id: "owner" }, result = { data: [], error: null }) {
  const calls = [];
  const query = {};
  for (const name of ["select", "eq", "order", "insert", "update", "delete", "single", "maybeSingle"]) query[name] = (...args) => { calls.push([name, ...args]); return query; };
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  const db = { auth: { getUser: async () => ({ data: { user } }) }, from: (table) => { calls.push(["from", table]); return query; } };
  const route = loadWithImports("app/api/workspace/route.ts", { "next/server": { NextResponse }, "@/lib/supabase/server": { createClient: async () => db }, "@/lib/workspace": workspace });
  return { route, calls };
}
function request(method, body, suffix = "") { return new NextRequest(`http://localhost/api/workspace${suffix}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); }
test("library API rejects anonymous access before querying storage", async () => {
  const { route, calls } = setup(null);
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    const response = await route[method](request(method, method === "POST" || method === "PATCH" ? profile : null, `?id=${id}`));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(calls.length, 0);
});
test("library inserts derive ownership from verified auth, never request data", async () => {
  const { route, calls } = setup({ id: "owner" }, { data: { id }, error: null });
  assert.equal((await route.POST(request("POST", profile))).status, 201);
  const inserted = calls.find(([name]) => name === "insert")[1];
  assert.equal(inserted.user_id, "owner");
  assert.equal(inserted.payload.audience, "Students");
});
test("reads, edits and deletes add owner filters alongside database RLS", async () => {
  for (const method of ["GET", "PATCH", "DELETE"]) {
    const { route, calls } = setup({ id: "owner" }, { data: method === "PATCH" ? { id } : [{ id }], error: null });
    assert.equal((await route[method](request(method, method === "PATCH" ? profile : null, `?id=${id}`))).status, 200);
    assert.ok(calls.some(([name, field, value]) => name === "eq" && field === "user_id" && value === "owner"));
    if (method !== "GET") assert.ok(calls.some(([name, field, value]) => name === "eq" && field === "id" && value === id));
  }
});
test("missing migration, malformed input and invisible records have honest errors", async () => {
  const missing = setup({ id: "owner" }, { data: null, error: { code: "PGRST205" } });
  const response = await missing.route.GET();
  assert.equal(response.status, 503); assert.match((await response.json()).error, /workspace.sql/);
  const { route, calls } = setup();
  assert.equal((await route.POST(request("POST", { ...profile, name: "" }))).status, 422);
  assert.equal((await route.DELETE(request("DELETE", null, "?id=bad"))).status, 422);
  assert.equal(calls.length, 0);
  assert.equal((await route.DELETE(request("DELETE", null, `?id=${id}`))).status, 404);
});
function generation({ user = { id: "owner" }, allowed = true } = {}) {
  const calls = [];
  class ProviderConfigError extends Error {}
  const route = loadWithImports("app/api/prompts/generate/route.ts", {
    "next/server": { NextResponse },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    "@/lib/ai/generate-prompt": { streamGeneratedPrompt: (input) => { calls.push(["generate", input]); return { stream: { toTextStreamResponse: ({ headers }) => new Response("Synthetic prompt", { headers }) }, choice: { config: { shortName: "synthetic" }, provider: "anthropic" } }; } },
    "@/types/prompt": types, "@/lib/ai/providers": { ProviderConfigError }, "@/lib/prompt-context": context, "@/lib/workspace": workspace,
    "@/lib/billing": { getBillingStatus: async () => ({ isPaid: false, remainingThisWeek: allowed ? 3 : 0 }), checkUsageLimits: () => allowed ? { allowed: true } : { allowed: false, status: 402, errorCode: "FREE_LIMIT_REACHED", message: "Limit reached" }, recordUsageEvent: async (...args) => { calls.push(["usage", ...args.slice(1)]); } },
    "@/lib/generation-runs": { newRequestId: () => "synthetic-request", insertGenerationRun: async () => null, markGenerationSuccess: async () => {}, markGenerationFailed: async () => {} },
  });
  return { route, calls };
}
const generationBody = { idea: "Draft a message", target_tool: "claude", context: { universal: true }, refinement: { action: "shorter", prompt: "Synthetic original" } };
test("refinements use the existing auth and usage gates", async () => {
  for (const options of [{ user: null }, { allowed: false }]) {
    const { route, calls } = generation(options);
    const response = await route.POST(request("POST", generationBody));
    assert.equal(response.status, options.user === null ? 401 : 402);
    assert.equal(calls.length, 0);
  }
  const { route, calls } = generation();
  assert.equal((await route.POST(request("POST", generationBody))).status, 200);
  assert.equal(calls.filter(([kind]) => kind === "usage").length, 1);
  assert.equal(calls.find(([kind]) => kind === "usage")[2], "generate");
});
test("refinements reject invalid actions and oversized originals before calling AI", async () => {
  for (const refinement of [{ action: "arbitrary", prompt: "test" }, { action: "shorter", prompt: "x".repeat(16001) }, { action: "shorter", prompt: "" }]) {
    const { route, calls } = generation();
    assert.equal((await route.POST(request("POST", { ...generationBody, refinement }))).status, 422);
    assert.equal(calls.length, 0);
  }
});
test("AI route excludes unconfirmed profiles and all history", async () => {
  const snapshot = { id, name: "Synthetic", details: "Shop", audience: "Students", voice: "", constraints: "" };
  for (const consent of [false, true]) {
    const { route, calls } = generation();
    const body = { ...generationBody, context: { universal: true, profile: snapshot, profileConsent: consent, versions: [{ prompt: "Private history", action: "shorter", createdAt: new Date().toISOString() }] } };
    assert.equal((await route.POST(request("POST", body))).status, 200);
    const input = calls.find(([kind]) => kind === "generate")[1];
    assert.equal(input.context.versions, undefined);
    assert.equal(!!input.context.profile, consent);
    assert.ok(input.signal instanceof AbortSignal);
  }
});

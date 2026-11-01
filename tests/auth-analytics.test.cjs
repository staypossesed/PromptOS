const test = require("node:test");
const assert = require("node:assert/strict");
const { NextRequest, NextResponse } = require("next/server");
const { loadTS } = require("../scripts/load-ts.cjs");
const load = require("./load-with-imports.cjs");

test("successful sign-in records actual account creation time, not a new signup on every login", async () => {
  const events = [];
  const user = { id: "synthetic-account", created_at: "2026-09-01T00:00:00Z", last_sign_in_at: "2026-10-15T00:00:00Z" };
  const route = load("app/auth/callback/route.ts", {
    "next/server": { NextRequest, NextResponse }, "@/lib/auth-redirect": loadTS("lib/auth-redirect.ts"),
    "@/lib/supabase/server": { createClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ data: { user }, error: null }) } }) },
    "@/lib/server-analytics": { captureServerEvent: async (...args) => { events.push(args); return false; } },
  });
  const response = await route.GET(new NextRequest("http://localhost:3002/auth/callback?code=synthetic&next=%2Fbuilder"));
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")).pathname, "/builder");
  assert.equal(events.find(e => e[0] === "signup_completed")[4], user.created_at);
  assert.equal(events.find(e => e[0] === "signup_completed")[2], user.id);
  assert.equal(events.length, 2);
});

test("failed sign-ins never count as completed signups", async () => {
  let captures = 0;
  const route = load("app/auth/callback/route.ts", {
    "next/server": { NextRequest, NextResponse }, "@/lib/auth-redirect": loadTS("lib/auth-redirect.ts"),
    "@/lib/supabase/server": { createClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ data: {}, error: new Error("Synthetic auth failure") }) } }) },
    "@/lib/server-analytics": { captureServerEvent: async () => { captures++; } },
  });
  const response = await route.GET(new NextRequest("http://localhost:3002/auth/callback?code=synthetic"));
  assert.equal(new URL(response.headers.get("location")).pathname, "/login");
  assert.equal(captures, 0);
});

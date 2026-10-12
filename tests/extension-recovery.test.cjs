const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { NextResponse } = require("next/server");
const loadWithImports = require("./load-with-imports.cjs");
const { loadTS } = require("../scripts/load-ts.cjs");
const auth = loadTS("extension/src/auth-flow.ts");
const currentManifest = { host_permissions: ["https://public.example/*"], content_security_policy: { extension_pages: "default-src 'self'; connect-src https://public.example; object-src 'none'" } };
let previousChrome;
beforeEach(() => { previousChrome = globalThis.chrome; globalThis.chrome = { runtime: { getManifest: () => currentManifest } }; });
afterEach(() => { if (previousChrome === undefined) delete globalThis.chrome; else globalThis.chrome = previousChrome; });

function client(session = { token: "synthetic.token", userId: "owner" }) {
  return loadWithImports("extension/src/api.ts", {
    "./core": { background: async () => session },
    "./config": { siteOrigin: "https://public.example" },
  });
}

test("extension health is public, uncached, and contains no private configuration", async () => {
  const route = loadWithImports("app/api/extension/health/route.ts", { "next/server": { NextResponse } });
  const response = route.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { service: "umprompt-extension", version: 1 });
});

test("backend access requires both the active connection policy and host permission", () => {
  const { hasBackendAccess } = client();
  assert.equal(hasBackendAccess(currentManifest, "https://public.example"), true);
  assert.equal(hasBackendAccess({ ...currentManifest, host_permissions: ["http://localhost:3000/*"] }, "https://public.example"), false);
  assert.equal(hasBackendAccess({ ...currentManifest, content_security_policy: { extension_pages: "connect-src http://localhost:3000" } }, "https://public.example"), false);
  assert.equal(hasBackendAccess({}, "https://public.example"), false);
});

test("a stale installed manifest requires reload before any health, token, or account request", async () => {
  const previous = globalThis.fetch;
  let requests = 0; let tokenReads = 0;
  const api = loadWithImports("extension/src/api.ts", {
    "./core": { background: async () => { tokenReads++; return { token: "synthetic.token", userId: "owner" }; } },
    "./config": { siteOrigin: "https://public.example" },
  });
  try {
    globalThis.chrome.runtime.getManifest = () => ({ host_permissions: ["http://localhost:3000/*"], content_security_policy: { extension_pages: "connect-src http://localhost:3000" } });
    globalThis.fetch = async () => { requests++; throw new Error("This request must not happen."); };
    await assert.rejects(api.checkBackend(), (e) => e.reason === "reload");
    for (const endpoint of ["status", "generate", "prompts"]) {
      await assert.rejects(api.api(endpoint, { ownerId: "owner" }), (e) => e.reason === "reload");
    }
    assert.equal(requests, 0);
    assert.equal(tokenReads, 0);
  } finally { globalThis.fetch = previous; }
});

test("client distinguishes a missing backend, offline connection, and incompatible backend", async () => {
  const previous = globalThis.fetch;
  const api = client();
  try {
    globalThis.fetch = async () => new Response("Not found", { status: 404 });
    await assert.rejects(api.checkBackend(), (e) => e.reason === "missing");
    globalThis.fetch = async () => { throw new TypeError("Failed to fetch private network details"); };
    await assert.rejects(api.checkBackend(), (e) => e.reason === "network" && !e.message.includes("private"));
    globalThis.fetch = async () => Response.json({ service: "umprompt-extension", version: 2 });
    await assert.rejects(api.checkBackend(), (e) => e.reason === "invalid");
    globalThis.fetch = async (_url, options) => { assert.equal(options.credentials, "omit"); assert.equal(options.cache, "no-store"); return Response.json({ service: "umprompt-extension", version: 1 }); };
    await api.checkBackend();
  } finally { globalThis.fetch = previous; }
});

test("extension rejects HTML results, invalid JSON, empty streams, and oversized results", async () => {
  const previous = globalThis.fetch;
  const api = client();
  try {
    globalThis.fetch = async () => new Response("<h1>Sign in</h1>", { headers: { "Content-Type": "text/html" } });
    await assert.rejects(api.api("generate", { ownerId: "owner" }), (e) => e.reason === "invalid");
    await assert.rejects(api.readJson(new Response("{")), (e) => e.reason === "invalid");
    for (const value of [" ", "x".repeat(16001)]) await assert.rejects(api.readPrompt(new Response(value), () => {}), (e) => e.reason === "invalid");
    assert.equal(await api.readPrompt(new Response("Useful prompt"), () => {}), "Useful prompt");
  } finally { globalThis.fetch = previous; }
});

test("cancellation and wrong owners cannot reach the backend; rate limits remain distinct from upgrades", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; return Response.json({ error: "private provider detail" }, { status: 429 }); };
    await assert.rejects(client().api("generate", { ownerId: "another-owner" }), (e) => e.status === 401);
    const abort = new AbortController(); abort.abort();
    await assert.rejects(client().api("generate", { ownerId: "owner", signal: abort.signal }), (e) => e.name === "AbortError");
    assert.equal(calls, 0);
    await assert.rejects(client().api("generate", { ownerId: "owner" }), (e) => e.reason === "rateLimit" && !e.upgradeRequired && !e.message.includes("private"));
  } finally { globalThis.fetch = previous; }
});

test("expired refresh and temporary auth outages preserve the stored account draft", async () => {
  const previous = globalThis.chrome;
  try {
    for (const kind of ["expired", "network"]) {
      let listener;
      const stored = { "draft:owner": { idea: "Private draft" }, "umprompt-extension-auth-owner": "owner" };
      const expiredSession = { expires_at: 1, access_token: "synthetic.token", user: { id: "owner" } };
      globalThis.chrome = {
        storage: { local: { setAccessLevel: async () => {}, get: async () => stored, set: async (value) => Object.assign(stored, value), remove: async (keys) => { for (const key of keys) delete stored[key]; } } },
        runtime: { id: "fixture", getURL: (file) => `chrome-extension://fixture/${file}`, onMessage: { addListener: (fn) => { listener = fn; } }, onInstalled: { addListener() {} } },
      };
      const sdk = { auth: {
        getSession: async () => ({ data: { session: expiredSession }, error: null }),
        refreshSession: async () => ({ error: { name: kind === "network" ? "AuthRetryableFetchError" : "AuthApiError" } }),
      } };
      loadWithImports("extension/src/background.ts", {
        "@supabase/supabase-js": { createClient: () => sdk, isAuthRetryableFetchError: (e) => e?.name === "AuthRetryableFetchError" },
        "./config": { supabaseUrl: "https://public.example", supabaseKey: "public-fixture" }, "./auth-flow": auth,
      });
      const reply = await new Promise((resolve) => listener({ type: "session" }, { id: "fixture", url: "chrome-extension://fixture/panel.html" }, resolve));
      assert.equal(reply.ok, false);
      assert.equal(reply.authIssue, kind);
      assert.equal(stored["draft:owner"].idea, "Private draft");
    }
  } finally { if (previous === undefined) delete globalThis.chrome; else globalThis.chrome = previous; }
});

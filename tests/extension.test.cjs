const test = require("node:test");
const assert = require("node:assert/strict");
const { NextRequest, NextResponse } = require("next/server");
const loadWithImports = require("./load-with-imports.cjs");
const { loadTS } = require("../scripts/load-ts.cjs");
const core = loadTS("extension/src/core.ts");
const types = loadTS("types/prompt.ts");
const token = "synthetic.valid.token";
const id = "12345678-1234-4123-8123-123456789abc";
const { AuthFlowError, readAuthCode, classifyAuthWindowError, isAuthFailure } = loadTS("extension/src/auth-flow.ts");
const redirectTo = "https://fiafphalkoaeokjpcanfihpaankoefbh.chromiumapp.org/auth";

test("native login failures distinguish cancellation, launch, connection and already-open windows", () => {
  const cases = [
    ["The user did not approve access.", "cancelled"],
    ["Only one web auth flow is allowed at a time.", "busy"],
    ["Authorization page could not be loaded.", "network"],
    ["Authorization page load timed out.", "network"],
    ["Couldn't create a browser window to display an authorization page.", "window"],
    ["Identity API is disabled in incognito windows.", "window"],
    ["Did not redirect to the right URL.", "redirect"],
    ["Unknown failure with https://private.example/?code=private-code", "failed"],
  ];
  for (const [message, reason] of cases) {
    const error = classifyAuthWindowError(new Error(message));
    assert.equal(error.reason, reason);
    assert.equal(error.message.includes("private"), false);
    assert.equal(isAuthFailure(reason), true);
  }
  for (const invalid of [undefined, "private-error", {}, "__proto__"]) assert.equal(isAuthFailure(invalid), false);
  for (const language of ["en", "ru", "es"]) {
    const copy = loadTS("extension/src/copy.ts").extensionCopy(language);
    for (const reason of ["cancelled", "redirect", "failed", "busy", "network", "window", "connection", "start", "exchange"]) {
      assert.equal(typeof copy.signInErrors[reason], "string");
    }
  }
});

test("reopened panels rejoin login without racing SDK initialization or replacing PKCE proof", async () => {
  const previousChrome = globalThis.chrome;
  let listener;
  let finishInitialization;
  let finishWindow;
  let current = null;
  const calls = [];
  const initialized = new Promise((resolve) => { finishInitialization = resolve; });
  const window = new Promise((resolve) => { finishWindow = resolve; });
  const sdk = { auth: {
    getSession: async () => { await initialized; calls.push("session"); return { data: { session: current }, error: null }; },
    signInWithOAuth: async () => { calls.push("prepare"); return { data: { url: "https://public.example/authorize" }, error: null }; },
    exchangeCodeForSession: async () => { calls.push("exchange"); current = { expires_at: Math.floor(Date.now() / 1000) + 3600, access_token: token, user: { id } }; return { data: { session: current }, error: null }; },
    getUser: async () => ({ data: { user: { id } }, error: null }),
  } };
  globalThis.chrome = {
    storage: { local: { setAccessLevel: async () => {}, get: async () => ({}), set: async () => {}, remove: async () => { calls.push("remove-proof"); } } },
    identity: { getRedirectURL: () => redirectTo, launchWebAuthFlow: async () => { calls.push("window"); return window; } },
    runtime: { id: "synthetic-extension", getURL: (file) => `chrome-extension://synthetic-extension/${file}`, onMessage: { addListener: (value) => { listener = value; } }, onInstalled: { addListener: () => {} } },
  };
  const send = (message) => new Promise((reply) => {
    assert.equal(listener(message, { id: "synthetic-extension", url: "chrome-extension://synthetic-extension/panel.html" }, reply), true);
  });
  try {
    loadWithImports("extension/src/background.ts", { "@supabase/supabase-js": { createClient: () => sdk, isAuthRetryableFetchError: (e) => e?.name === "AuthRetryableFetchError" }, "./config": { supabaseUrl: "https://public.example", supabaseKey: "public-fixture" }, "./auth-flow": { AuthFlowError, readAuthCode, classifyAuthWindowError } });
    const first = send({ type: "signIn", provider: "google" });
    const reopened = send({ type: "signIn", provider: "google" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, [], "PKCE creation waits for session recovery.");
    finishInitialization();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, ["session", "prepare", "window"]);
    const competing = await send({ type: "signIn", provider: "github" });
    assert.equal(competing.authIssue, "busy");
    assert.equal(calls.includes("remove-proof"), false, "A competing provider must not delete the active proof.");
    finishWindow(`${redirectTo}?code=synthetic-code`);
    const results = await Promise.all([first, reopened]);
    assert.equal(results.every((result) => result.ok && result.data.id === id), true);
    assert.equal(calls.filter((value) => value === "prepare").length, 1);
    assert.equal(calls.filter((value) => value === "exchange").length, 1);
    assert.equal(calls.filter((value) => value === "remove-proof").length, 1);
  } finally {
    if (previousChrome === undefined) delete globalThis.chrome; else globalThis.chrome = previousChrome;
  }
});

test("extension sign-in only accepts a PKCE code at its own exact callback", () => {
  assert.equal(readAuthCode(`${redirectTo}?code=synthetic-code`, redirectTo), "synthetic-code");
  for (const callback of ["not-a-url", "https://umprompt.com/?code=synthetic-code", `${redirectTo}/extra?code=synthetic-code`, redirectTo.replace("https:", "http:") + "?code=synthetic-code", redirectTo.replace("fiaf", "fake") + "?code=synthetic-code", redirectTo.replace("https://", "https://name:pass@") + "?code=synthetic-code"]) {
    assert.throws(() => readAuthCode(callback, redirectTo), (error) => error instanceof AuthFlowError && error.reason === "redirect");
  }
});

test("extension sign-in rejects missing, duplicate, malformed and implicit-flow results", () => {
  for (const suffix of ["", "?code=", "?code=one&code=two", "?code=%20", "?code=%00", `?code=${"x".repeat(2049)}`, "#access_token=never-accept-this-token"]) {
    assert.throws(() => readAuthCode(redirectTo + suffix, redirectTo), (error) => error.reason === "redirect");
  }
});

test("extension handles OAuth errors in queries and fragments without exposing provider data", () => {
  for (const separator of ["?", "#"]) {
    assert.throws(() => readAuthCode(`${redirectTo}${separator}error=access_denied&error_description=private-provider-detail`, redirectTo), (error) => error.reason === "cancelled" && !error.message.includes("private-provider-detail"));
    assert.throws(() => readAuthCode(`${redirectTo}${separator}error_code=server_error`, redirectTo), (error) => error.reason === "failed");
  }
  assert.throws(() => readAuthCode(undefined, redirectTo), (error) => error.reason === "cancelled");
});

test("extension rejects malformed bearer tokens instead of falling back to website cookies", () => {
  const { readBearerToken } = loadWithImports("lib/extension-auth.ts", { "@supabase/supabase-js": {} });
  for (const header of ["", "Bearer bad", "Basic synthetic", "Bearer a.b.c extra", `Bearer ${"a".repeat(8200)}.b.c`]) {
    assert.equal(readBearerToken(new Request("http://localhost", { headers: { authorization: header, cookie: "existing-web-session" } })), null);
  }
  assert.equal(readBearerToken(new Request("http://localhost", { headers: { authorization: `Bearer ${token}` } })), token);
});

test("extension Supabase client uses a user bearer session, no cookie or service role", () => {
  let options;
  const module = loadWithImports("lib/extension-auth.ts", { "@supabase/supabase-js": { createClient: (_url, _key, value) => { options = value; } } });
  module.createExtensionClient(token);
  assert.equal(options.global.headers.Authorization, `Bearer ${token}`);
  assert.equal(options.auth.persistSession, false);
  assert.equal(options.auth.autoRefreshToken, false);
});

test("draft refinements keep identity, preserve prior results and require explicit Save", () => {
  const original = { ...core.emptyDraft(), idea: "Write a polite email" };
  const result = core.acceptResult(original, "Synthetic expanded prompt", "expand");
  assert.equal(result.id, original.id);
  assert.equal(core.isCurrent(result), true);
  assert.equal(core.isSaved(result), false);
  const saved = { ...result, savedFingerprint: core.fingerprint(result) };
  assert.equal(core.isSaved(saved), true);
  assert.equal(core.isSaved({ ...result, savedFingerprint: JSON.stringify([core.inputFingerprint(result), result.prompt, result.versions]) }), true, "Previously saved 0.1.2 drafts remain saved after updating.");
  const optimized = core.acceptResult(saved, "Synthetic optimized prompt", "optimize");
  assert.equal(optimized.id, saved.id);
  assert.equal(core.isSaved(optimized), false);
  assert.equal(optimized.versions[0].prompt, result.prompt);
  for (const invalid of [null, "", " ", "x".repeat(16001)]) assert.throws(() => core.acceptResult(saved, invalid, "optimize"));
  assert.equal(core.isSaved(saved), true);
});

test("changed ideas cannot save mismatched results, and new tasks get their own draft IDs", () => {
  const first = core.acceptResult({ ...core.emptyDraft(), idea: "First task" }, "First prompt", "expand");
  const edited = { ...first, idea: "Second task" };
  assert.equal(core.isCurrent(edited), false);
  const second = core.acceptResult(edited, "Second prompt", "expand");
  assert.notEqual(second.id, first.id);
  assert.deepEqual(second.versions, []);
});

test("quality feedback is bounded and tied to the exact idea and prompt", () => {
  const feedback = { overall: 81, dimensions: [{ key: "clarity", label: "Clarity", score: 80, reason: "Clear goal.", tip: "Specify the recipient." }] };
  const result = core.acceptResult({ ...core.emptyDraft(), idea: "Write an email for my manager" }, "Original expanded prompt", "expand");
  const scored = core.withScore(result, feedback);
  assert.deepEqual(core.draftScore(scored), feedback);
  assert.deepEqual(core.draftBody(scored).score, feedback);
  assert.deepEqual(core.draftScore(core.restoreDraft(scored)), feedback);
  assert.equal(core.draftScore({ ...scored, idea: "A different task" }), null);
  assert.equal(core.draftScore({ ...scored, prompt: "Manually edited output" }), null);
  assert.equal(core.draftScore(core.restoreDraft({ ...scored, prompt: "Manually edited output" })), null);
  const optimized = core.acceptResult(scored, "Improved expanded prompt", "optimize");
  assert.equal(core.draftScore(optimized), null);
  assert.equal(optimized.versions.at(-1).prompt, result.prompt);
  for (const invalid of [null, {}, { ...feedback, overall: NaN }, { ...feedback, overall: 101 }, { ...feedback, dimensions: [] }, { ...feedback, dimensions: [...feedback.dimensions, ...feedback.dimensions] }, { ...feedback, dimensions: [{ ...feedback.dimensions[0], tip: "x".repeat(4001) }] }]) {
    assert.equal(core.parsePromptScore(invalid), null);
    assert.throws(() => core.withScore(result, invalid));
  }
  const saved = { ...scored, savedFingerprint: core.fingerprint(scored) };
  assert.equal(core.isSaved(saved), true);
  const editing = { ...saved, idea: `${saved.idea}\nInclude the new detail.` };
  assert.equal(core.isSaved(editing), false);
  assert.equal(core.isSaved(saved), true, "Cancel can restore the exact saved snapshot.");
  assert.notEqual(core.acceptResult(editing, "Updated idea result", "expand").id, saved.id);
});

test("local drafts are owner scoped, bounded and never contain unconfirmed profiles", () => {
  assert.notEqual(core.draftKey({ id: "one" }), core.draftKey({ id: "two" }));
  assert.notEqual(core.draftKey(null), core.draftKey({ id: "one" }));
  const restored = core.restoreDraft({ id, idea: "x".repeat(5000), prompt: "x".repeat(20000), category: "unknown", versions: [null, { prompt: null }] });
  assert.equal(restored.idea.length, 4000); assert.equal(restored.prompt.length, 16000);
  assert.equal(restored.category, "auto"); assert.deepEqual(restored.versions, []);
  assert.equal(core.draftBody(restored).context.profile, undefined);
});

function setup({ user = { id: "verified-owner" }, dbError = null } = {}) {
  const calls = [];
  const query = {};
  for (const method of ["upsert", "select", "single"]) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  query.then = (resolve, reject) => Promise.resolve({ data: { id }, error: dbError }).then(resolve, reject);
  const db = { auth: { getUser: async (jwt) => { calls.push(["verify", jwt]); return { data: { user }, error: user ? null : new Error("Expired") }; } }, from: (table) => { calls.push(["table", table]); return query; } };
  const route = loadWithImports("app/api/extension/[...path]/route.ts", {
    "next/server": { NextRequest, NextResponse },
    "@/lib/extension-auth": { readBearerToken: (r) => r.headers.get("authorization") === `Bearer ${token}` ? token : null, createExtensionClient: () => db },
    "@/lib/api/generate": { generateForClient: async (r, client) => { calls.push(["generate", await r.json(), client]); return new Response("Synthetic prompt"); } },
    "@/lib/api/optimize": { optimizeForClient: async (_r, client) => { calls.push(["optimize", client]); return NextResponse.json({ data: { improved_prompt: "Synthetic optimized" } }); } },
    "@/lib/api/score": { scoreForClient: async (_r, client) => { calls.push(["score", client]); return NextResponse.json({ data: { overall: 80, dimensions: [] } }); } },
    "@/lib/prompts": { listPrompts: async (_limit, client) => { calls.push(["history", client]); return { data: [], error: null }; } },
    "@/types/prompt": types,
    "@/lib/billing": { getBillingStatus: async (client, userId) => { calls.push(["billing", userId, client]); return { isPaid: false, remainingThisWeek: 2 }; } },
  });
  return { route, calls, db };
}
function request(method, path, body, authorization = true) {
  return new NextRequest(`http://localhost/api/extension/${path}`, { method,
    headers: { ...(authorization ? { authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", cookie: "website-session-is-not-extension-auth" },
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });
}

test("extension API requires verified auth before AI, billing, history or writes", async () => {
  for (const user of [null, { id: "owner" }]) {
    const { route, calls } = setup({ user });
    const response = await route.POST(request("POST", "generate", {}, user === null));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(calls.filter(([kind]) => kind !== "verify").length, 0);
  }
});

test("extension reuses website AI services with the bearer-scoped client", async () => {
  for (const path of ["generate", "score", "optimize"]) {
    const { route, calls, db } = setup();
    assert.equal((await route.POST(request("POST", path, { idea: "Synthetic" }))).status, 200);
    assert.equal(calls.find(([kind]) => kind === path).at(-1), db);
    assert.equal(calls.find(([kind]) => kind === "verify")[1], token);
  }
});

test("history and allowance read the same account using user-scoped database access", async () => {
  const { route, calls, db } = setup();
  await route.GET(request("GET", "prompts"));
  await route.GET(request("GET", "status"));
  assert.equal(calls.find(([kind]) => kind === "history")[1], db);
  assert.deepEqual(calls.find(([kind]) => kind === "billing").slice(1), ["verified-owner", db]);
});

test("explicit Save uses the stable draft ID and derives ownership from verified auth", async () => {
  const { route, calls } = setup();
  const body = { idea: "Synthetic idea", generated_prompt: "Synthetic prompt", target_tool: "claude", user_id: "attacker" };
  for (let n = 0; n < 2; n++) assert.equal((await route.PUT(request("PUT", `prompts/${id}`, body))).status, 200);
  const writes = calls.filter(([kind]) => kind === "upsert");
  assert.equal(writes.length, 2);
  assert.equal(writes[0][1].id, id);
  assert.equal(writes[0][1].user_id, "verified-owner");
  assert.equal(writes[0][2].onConflict, "id");
  assert.equal(writes[1][1].id, id);
});

test("invalid and oversized input cannot reach the database; RLS failures never claim a successful Save", async () => {
  const { route, calls } = setup();
  assert.equal((await route.PUT(request("PUT", "prompts/not-a-uuid", {}))).status, 404);
  assert.equal((await route.PUT(request("PUT", `prompts/${id}`, "{"))).status, 400);
  assert.equal((await route.PUT(request("PUT", `prompts/${id}`, { idea: "x".repeat(4001), generated_prompt: "Synthetic", target_tool: "claude" }))).status, 422);
  assert.equal((await route.POST(request("POST", "generate", "x".repeat(512001)))).status, 413);
  assert.equal(calls.some(([kind]) => kind === "upsert" || kind === "generate"), false);
  const denied = setup({ dbError: { code: "42501" } });
  assert.equal((await denied.route.PUT(request("PUT", `prompts/${id}`, { idea: "Synthetic", generated_prompt: "Synthetic", target_tool: "claude" }))).status, 500);
});

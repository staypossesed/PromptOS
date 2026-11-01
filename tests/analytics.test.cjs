const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-with-imports.cjs");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function providerFixture(previousUser) {
  let effect, authChanged, finishUser;
  let persisted = previousUser;
  const calls = [];
  const user = new Promise(resolve => { finishUser = resolve; });
  const imports = {
    react: { useRef: () => ({ current: false }), useEffect: fn => { effect = fn; } },
    "react/jsx-runtime": require("react/jsx-runtime"),
    "posthog-js": { default: { init: () => calls.push(["init"]), get_property: () => persisted } },
    "@/lib/supabase/client": { createClient: () => ({ auth: { getUser: () => user, onAuthStateChange: callback => { authChanged = callback; return { data: { subscription: { unsubscribe: () => calls.push(["unsubscribe"]) } } }; } } }) },
    "@/lib/analytics": {
      identify: id => { persisted = id; calls.push(["identify", id]); }, resetAnalytics: clear => { persisted = null; calls.push(["reset", clear]); },
      analyticsReady: () => calls.push(["ready"]), track: event => calls.push([event]), stripPrivateAnalytics: value => value,
    },
  };
  const source = fs.readFileSync(path.join(__dirname, "../components/providers/posthog-provider.tsx"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${outputText}})`)(name => { assert.ok(name in imports); return imports[name]; }, module, module.exports);
  module.exports.PostHogProvider({ children: null });
  const dispose = effect();
  return { calls, dispose, finish: id => finishUser({ data: { user: id ? { id } : null } }), change: (event, id) => authChanged(event, id ? { user: { id } } : null) };
}

test("provider resets persisted identities on account switch, expiry and logout", async () => {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "synthetic-project-token";
  try {
    const p = providerFixture("old-account");
    p.finish("new-account");
    await Promise.resolve();
    assert.ok(p.calls.findIndex(c => c[0] === "reset") < p.calls.findIndex(c => c[0] === "identify"));
    assert.deepEqual(p.calls.find(c => c[0] === "identify"), ["identify", "new-account"]);
    p.change("SIGNED_OUT", null);
    assert.equal(p.calls.filter(c => c[0] === "reset").length, 2);
    p.dispose();
    assert.deepEqual(p.calls.at(-1), ["unsubscribe"]);
  } finally { delete process.env.NEXT_PUBLIC_POSTHOG_KEY; }
});

test("a late initial auth response cannot overwrite a newer signed-in account", async () => {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "synthetic-project-token";
  try {
    const p = providerFixture(null);
    p.change("SIGNED_IN", "new-account");
    p.finish("outdated-account");
    await Promise.resolve();
    assert.deepEqual(p.calls.filter(c => c[0] === "identify"), [["identify", "new-account"]]);
    p.dispose();
  } finally { delete process.env.NEXT_PUBLIC_POSTHOG_KEY; }
});

test("client events wait for identity, retain their original time, and have a bounded safe queue", () => {
  const calls = [];
  global.window = {};
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "synthetic-project-token";
  try {
    const analytics = load("lib/analytics.ts", { "posthog-js": { default: { capture: (...args) => calls.push(args), identify: (...args) => calls.push(args), reset: () => calls.push(["reset"]) } } });
    const time = new Date("2026-10-15T00:00:00Z");
    analytics.track("site_visited", { prompt: "Private text must be dropped", task_id: "synthetic-task" }, time);
    assert.equal(calls.length, 0);
    analytics.identify("synthetic-account");
    analytics.analyticsReady();
    assert.deepEqual(calls[0], ["synthetic-account"]);
    assert.deepEqual(calls[1][1], { task_id: "synthetic-task", funnel_version: 1 });
    assert.equal(calls[1][2].timestamp, time);
    analytics.track("prompt_generated", { generated_prompt: "Private output", score_overall: Infinity, category: "writing" });
    assert.deepEqual(calls[2][1], { category: "writing", funnel_version: 1 });
    analytics.resetAnalytics();
    assert.deepEqual(calls.at(-1), ["reset"]);
  } finally { delete global.window; delete process.env.NEXT_PUBLIC_POSTHOG_KEY; }
});

test("disabled analytics and server rendering never capture events", () => {
  let captures = 0;
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const analytics = load("lib/analytics.ts", { "posthog-js": { default: { capture: () => captures++ } } });
  analytics.analyticsReady();
  analytics.track("site_visited");
  global.window = {};
  analytics.track("site_visited");
  delete global.window;
  assert.equal(captures, 0);
});

test("full URLs, referrers and old email person properties are stripped from SDK payloads", () => {
  const { stripPrivateAnalytics } = load("lib/analytics.ts", { "posthog-js": { default: {} } });
  const properties = { $current_url: "https://test.invalid?token=private", $referrer: "private", $pathname: "/builder", $set_once: { $initial_current_url: "private", email: "private", $initial_browser: "Chrome" } };
  assert.deepEqual(stripPrivateAnalytics(properties), { $pathname: "/builder", $set_once: { $initial_browser: "Chrome" } });
  assert.equal(properties.$current_url, "https://test.invalid?token=private");
});

test("server capture uses the approved HTTPS destination, a stable receipt key, and only allowed metadata", async () => {
  const originalFetch = global.fetch;
  const calls = [];
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "synthetic-project-token";
  process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
  global.fetch = async (url, options) => { calls.push({ url: String(url), body: JSON.parse(options.body) }); return { ok: true }; };
  try {
    const { captureServerEvent } = load("lib/server-analytics.ts", { "node:crypto": crypto });
    for (let i = 0; i < 2; i++) assert.equal(await captureServerEvent("purchase_confirmed", "synthetic-account", "cs_test_synthetic", { plan: "lifetime", amount_cents: 9999, currency: "usd", live_mode: false, email: "private", prompt: "private" }), true);
    assert.equal(calls[0].url, "https://us.i.posthog.com/capture/");
    assert.equal(calls[0].body.properties.event_key, calls[1].body.properties.event_key);
    assert.doesNotMatch(JSON.stringify(calls), /private|cs_test_synthetic/);
    assert.equal(calls[0].body.properties.live_mode, false);
    global.fetch = async () => { throw new Error("Synthetic network outage"); };
    assert.equal(await captureServerEvent("purchase_confirmed", "synthetic-account", "receipt"), false);
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    assert.equal(await captureServerEvent("login_success", "synthetic-account", "login"), false);
  } finally { global.fetch = originalFetch; delete process.env.NEXT_PUBLIC_POSTHOG_KEY; delete process.env.NEXT_PUBLIC_POSTHOG_HOST; }
});

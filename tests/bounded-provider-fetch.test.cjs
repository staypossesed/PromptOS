const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("../scripts/load-ts.cjs");
const { boundedProviderFetch } = loadTS("lib/ai/bounded-fetch.ts");

test("provider fetch preserves successful streams, status, headers and abort signal", async () => {
  const original = global.fetch;
  const abort = new AbortController();
  try {
    global.fetch = async (input, init) => {
      assert.equal(input, "https://example.invalid/provider");
      assert.equal(init.signal, abort.signal);
      return new Response("data: synthetic\n\n", { headers: { "Content-Type": "text/event-stream" } });
    };
    const response = await boundedProviderFetch("https://example.invalid/provider", { signal: abort.signal });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "text/event-stream");
    assert.equal(await response.text(), "data: synthetic\n\n");
  } finally { global.fetch = original; }
});

test("provider fetch rejects oversized bodies even without a trustworthy content length", async () => {
  const original = global.fetch;
  for (const status of [200, 500]) {
    let cancelled = false;
    try {
      global.fetch = async () => new Response(new ReadableStream({
        pull(controller) { controller.enqueue(new Uint8Array(512 * 1024)); },
        cancel() { cancelled = true; },
      }), { status, headers: { "Content-Length": "1" } });
      const response = await boundedProviderFetch("https://example.invalid/provider");
      assert.equal(response.status, status);
      await assert.rejects(response.text(), /safe size limit/);
      assert.equal(cancelled, true);
    } finally { global.fetch = original; }
  }
});

test("provider fetch forwards cancellation and leaves bodyless responses intact", async () => {
  const original = global.fetch;
  try {
    let cancelled = false;
    global.fetch = async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }));
    await (await boundedProviderFetch("https://example.invalid/provider")).body.cancel();
    assert.equal(cancelled, true);
    const empty = new Response(null, { status: 204 });
    global.fetch = async () => empty;
    assert.equal(await boundedProviderFetch("https://example.invalid/provider"), empty);
  } finally { global.fetch = original; }
});

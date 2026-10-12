const test = require("node:test");
const assert = require("node:assert/strict");
const loadWithImports = require("./load-with-imports.cjs");

test("production rate limiting fails closed without shared Redis", async () => {
  const original = { mode: process.env.NODE_ENV, url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  try {
    process.env.NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const limiter = loadWithImports("lib/rate-limit.ts", { "@upstash/ratelimit": {}, "@upstash/redis": {} });
    await assert.rejects(limiter.rateLimit("synthetic", "generate"), /Distributed rate limiting is unavailable/);
    process.env.NODE_ENV = "development";
    assert.equal((await limiter.rateLimit("synthetic", "generate")).allowed, true);
  } finally {
    for (const [key, value] of Object.entries({ NODE_ENV: original.mode, UPSTASH_REDIS_REST_URL: original.url, UPSTASH_REDIS_REST_TOKEN: original.token })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("paid and free generation use separate shared counters with the existing allowances", async () => {
  const original = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  const calls = [];
  try {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.invalid";
    process.env.UPSTASH_REDIS_REST_TOKEN = "synthetic";
    class Ratelimit {
      static slidingWindow(max, window) { return { max, window }; }
      constructor(options) { this.options = options; }
      async limit(key) { calls.push([key, this.options]); return { success: true, remaining: this.options.limiter.max - 1, reset: 123 }; }
    }
    const limiter = loadWithImports("lib/rate-limit.ts", { "@upstash/ratelimit": { Ratelimit }, "@upstash/redis": { Redis: { fromEnv: () => ({}) } } });
    assert.equal((await limiter.rateLimit("synthetic", "generate")).limit, 20);
    assert.equal((await limiter.rateLimit("synthetic", "generate_paid")).limit, 200);
    assert.notEqual(calls[0][1].prefix, calls[1][1].prefix);
  } finally {
    for (const [key, value] of Object.entries({ UPSTASH_REDIS_REST_URL: original.url, UPSTASH_REDIS_REST_TOKEN: original.token })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

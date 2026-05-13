/**
 * lib/rate-limit.ts — Centralized rate limiting.
 *
 * Production: Upstash Redis (persists across serverless invocations).
 *   Requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars.
 *
 * Fallback: in-memory Map.
 *   NOT reliable in serverless — resets on cold starts and does not
 *   share state across concurrent function instances. Fine for local dev.
 *
 * Free-tier limits (per user per day):
 *   generate  → 20
 *   score     → 50
 *   optimize  → 10
 *   pack      → 5
 *   model_lab → 30 (internal/beta tool)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitAction = "generate" | "score" | "optimize" | "pack" | "model_lab";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix ms
  limit: number;
}

const LIMITS: Record<RateLimitAction, { max: number; windowMs: number; window: string }> = {
  generate:  { max: 20, windowMs: 24 * 60 * 60 * 1000, window: "1 d" },
  score:     { max: 50, windowMs: 24 * 60 * 60 * 1000, window: "1 d" },
  optimize:  { max: 10, windowMs: 24 * 60 * 60 * 1000, window: "1 d" },
  pack:      { max: 5,  windowMs: 24 * 60 * 60 * 1000, window: "1 d" },
  model_lab: { max: 30, windowMs: 24 * 60 * 60 * 1000, window: "1 d" },
};

// ── Upstash Redis (production) ─────────────────────────────────────────────

let _upstashLimiters: Map<RateLimitAction, Ratelimit> | null = null;

function getUpstashLimiters(): Map<RateLimitAction, Ratelimit> | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (_upstashLimiters) return _upstashLimiters;

  try {
    const redis = Redis.fromEnv();
    _upstashLimiters = new Map([
      ["generate", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.generate.max, LIMITS.generate.window as `${number} ${"ms" | "s" | "m" | "h" | "d"}`), prefix: "umprompt:rl:generate", analytics: false })],
      ["score",    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.score.max,    LIMITS.score.window    as `${number} ${"ms" | "s" | "m" | "h" | "d"}`), prefix: "umprompt:rl:score",    analytics: false })],
      ["optimize", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.optimize.max, LIMITS.optimize.window as `${number} ${"ms" | "s" | "m" | "h" | "d"}`), prefix: "umprompt:rl:optimize", analytics: false })],
      ["pack",      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.pack.max,      LIMITS.pack.window      as `${number} ${"ms" | "s" | "m" | "h" | "d"}`), prefix: "umprompt:rl:pack",      analytics: false })],
      ["model_lab", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.model_lab.max, LIMITS.model_lab.window as `${number} ${"ms" | "s" | "m" | "h" | "d"}`), prefix: "umprompt:rl:model_lab", analytics: false })],
    ]);
    return _upstashLimiters;
  } catch {
    return null;
  }
}

// ── In-memory fallback (dev / not-serverless) ──────────────────────────────

const _memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(key: string, action: RateLimitAction): RateLimitResult {
  const { max, windowMs } = LIMITS[action];
  const now = Date.now();
  const entry = _memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    _memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs, limit: max };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit: max };
  }

  entry.count += 1;
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt, limit: max };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function rateLimit(userId: string, action: RateLimitAction): Promise<RateLimitResult> {
  const key = `${userId}:${action}`;
  const limiters = getUpstashLimiters();

  if (limiters) {
    const limiter = limiters.get(action)!;
    const { success, remaining, reset } = await limiter.limit(key);
    return {
      allowed: success,
      remaining,
      resetAt: reset, // Upstash returns Unix ms timestamp
      limit: LIMITS[action].max,
    };
  }

  return memoryRateLimit(key, action);
}

export function retryAfterMessage(resetAt: number): string {
  const diffMs = resetAt - Date.now();
  if (diffMs <= 0) return "shortly";
  const totalMinutes = Math.ceil(diffMs / (1000 * 60));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

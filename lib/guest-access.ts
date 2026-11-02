import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { Redis } from "@upstash/redis";

const WINDOW = 7 * 24 * 60 * 60;
const memory = new Map<string, { value: string; expires: number }>();
export interface GuestReservation { key: string; token: string }

export function guestKey(headers: Headers): string {
  const production = process.env.NODE_ENV === "production";
  const ip = production ? headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : "127.0.0.1";
  if (production && (process.env.VERCEL !== "1" || !ip || !isIP(ip))) throw new Error("Guest access unavailable");
  const salt = production ? process.env.UPSTASH_REDIS_REST_TOKEN : "local-preview";
  if (!salt) throw new Error("Guest access unavailable");
  return "umprompt:guest:v1:" + createHmac("sha256", salt).update(ip ?? "127.0.0.1").digest("hex");
}

function redis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error("Guest access unavailable");
  return Redis.fromEnv();
}

export async function reserveGuest(key: string): Promise<GuestReservation | "used" | "busy"> {
  const token = randomUUID();
  if (process.env.NODE_ENV === "production") {
    const held = await redis().set(key, token, { nx: true, ex: 90 });
    return held ? { key, token } : await redis().get(key) === "complete" ? "used" : "busy";
  }
  const current = memory.get(key);
  if (current && current.expires > Date.now()) return current.value === "complete" ? "used" : "busy";
  memory.set(key, { value: token, expires: Date.now() + 90000 });
  return { key, token };
}

export async function finishGuest(reservation: GuestReservation, success: boolean): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    const result = await redis().eval(
      "if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end if ARGV[2] == '1' then redis.call('SET',KEYS[1],'complete','EX',ARGV[3]) else redis.call('DEL',KEYS[1]) end return 1",
      [reservation.key], [reservation.token, success ? "1" : "0", String(WINDOW)],
    );
    if (success && result !== 1) throw new Error("Guest reservation expired");
    return;
  }
  if (memory.get(reservation.key)?.value !== reservation.token) { if (success) throw new Error("Guest reservation expired"); return; }
  if (success) memory.set(reservation.key, { value: "complete", expires: Date.now() + WINDOW * 1000 });
  else memory.delete(reservation.key);
}

import { createHash } from "node:crypto";

type ServerEvent = "signup_completed" | "login_success" | "purchase_confirmed";
interface Properties {
  plan?: string;
  is_founder?: boolean;
  offer_type?: string;
  amount_cents?: number;
  currency?: string;
  live_mode?: boolean;
}

// Best effort, not the financial ledger. Reports deduplicate using this stable key.
export async function captureServerEvent(event: ServerEvent, userId: string, key: string, properties: Properties = {}, timestamp?: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const host = new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com");
    if (host.protocol !== "https:") return false;
    const id = createHash("sha256").update(`${event}:${key}`).digest("hex");
    const safe = Object.fromEntries(Object.entries(properties).filter(([name, value]) =>
      ["plan", "is_founder", "offer_type", "amount_cents", "currency", "live_mode"].includes(name) && ["string", "number", "boolean"].includes(typeof value)));
    const response = await fetch(new URL("/capture/", host), {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ api_key: apiKey, event, distinct_id: userId, ...(timestamp && { timestamp }),
        properties: { ...safe, event_key: id, source: "server", funnel_version: 1, $geoip_disable: true } }),
    });
    return response.ok;
  } catch { return false; }
  finally { clearTimeout(timeout); }
}

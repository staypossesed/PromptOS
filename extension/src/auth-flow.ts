const failures = ["cancelled", "redirect", "failed", "busy", "network", "window", "connection", "start", "exchange", "expired"] as const;
export type AuthFailure = typeof failures[number];

export function isAuthFailure(value: unknown): value is AuthFailure {
  return typeof value === "string" && (failures as readonly string[]).includes(value);
}

export class AuthFlowError extends Error {
  constructor(public reason: AuthFailure) {
    super({
      cancelled: "The sign-in window was closed.", redirect: "Sign-in did not return to this extension.",
      failed: "Could not connect your account.", busy: "Another sign-in window is already open.",
      network: "The sign-in page could not be loaded.", window: "Chrome could not open the sign-in window.",
      connection: "The extension connection was interrupted.", start: "Could not prepare sign-in.",
      exchange: "Could not complete sign-in in this extension.",
      expired: "Sign in to Umprompt again.",
    }[reason]);
  }
}

export function classifyAuthWindowError(error: unknown): AuthFlowError {
  const message = error instanceof Error ? error.message : "";
  if (/did not approve|cancelled|canceled|window.*closed/i.test(message)) return new AuthFlowError("cancelled");
  if (/one web auth flow|in progress|already open/i.test(message)) return new AuthFlowError("busy");
  if (/authorization page (could not be loaded|load timed out)|failed to fetch|network/i.test(message)) return new AuthFlowError("network");
  if (/create a browser window|incognito|disabled|not supported|not available/i.test(message)) return new AuthFlowError("window");
  if (/did not redirect to the right URL/i.test(message)) return new AuthFlowError("redirect");
  return new AuthFlowError("failed");
}

export function readAuthCode(callback: string | undefined, redirectTo: string): string {
  if (!callback) throw new AuthFlowError("cancelled");
  let url: URL;
  try { url = new URL(callback); } catch { throw new AuthFlowError("redirect"); }
  if (`${url.origin}${url.pathname}` !== redirectTo || url.username || url.password) throw new AuthFlowError("redirect");
  const fragment = new URLSearchParams(url.hash.slice(1));
  const error = url.searchParams.get("error") ?? fragment.get("error");
  if (error !== null || url.searchParams.has("error_code") || fragment.has("error_code")) {
    throw new AuthFlowError(error === "access_denied" ? "cancelled" : "failed");
  }
  const codes = url.searchParams.getAll("code");
  if (codes.length !== 1 || !codes[0] || codes[0].length > 2048 || /[\s\u0000-\u001f\u007f]/.test(codes[0])) throw new AuthFlowError("redirect");
  return codes[0];
}

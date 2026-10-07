export const AUTH_NEXT_COOKIE = "umprompt_auth_next";

export function safeAuthNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/builder";
  try {
    const url = new URL(value, "https://umprompt.invalid");
    return url.origin === "https://umprompt.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/builder";
  } catch {
    return "/builder";
  }
}

export function prepareAuthRedirect(origin: string, next: string): string {
  // Keep the allowlisted callback exact; carry the destination on this browser instead.
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(safeAuthNext(next))}; Path=/auth/callback; Max-Age=3600; SameSite=Lax${origin.startsWith("https:") ? "; Secure" : ""}`;
  return `${origin}/auth/callback`;
}

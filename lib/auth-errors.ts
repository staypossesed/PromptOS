export function emailSignInErrorKey(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const { code, message, status } = error as { code?: unknown; message?: unknown; status?: unknown };
  if (code === "over_email_send_rate_limit" ||
      (typeof message === "string" && /^email rate limit exceeded\.?$/i.test(message.trim()))) {
    return "auth.emailRateLimited";
  }
  if (code === "over_request_rate_limit" || status === 429) return "auth.signInRateLimited";
  return null;
}

/**
 * Returns true when the given email belongs to an admin user.
 * Reads ADMIN_EMAILS (comma-separated) from the server environment.
 * Safe to call in middleware, server components, and API routes.
 */
export function isAdminUser(email: string | null | undefined): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const admins = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes((email ?? "").trim().toLowerCase());
}

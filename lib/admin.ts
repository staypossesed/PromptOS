/**
 * lib/admin.ts — Admin access helpers.
 *
 * Safe to call in middleware, server components, and API routes.
 * ADMIN_EMAILS is a comma-separated list of email addresses (server env only).
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Returns true when the given email belongs to an admin user. */
export function isAdminUser(email: string | null | undefined): boolean {
  return getAdminEmails().includes((email ?? "").trim().toLowerCase());
}

/** Alias for isAdminUser — same semantics. */
export const isAdminEmail = isAdminUser;

/**
 * Server-side guard for admin-only server components and route handlers.
 * - Not logged in → redirect to /login
 * - Logged in but not admin → redirect to /dashboard
 * - Admin → returns the user's email
 */
export async function requireAdminUser(): Promise<{ email: string; id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminUser(user.email)) {
    redirect("/dashboard");
  }

  return { email: user.email!, id: user.id };
}

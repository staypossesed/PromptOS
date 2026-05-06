"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Signs the current user out and hard-redirects to /login.
 * Called from the user-menu dropdown via a form action.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Sends a magic-link email to the given address.
 * Returns { error: string } on failure, { error: null } on success.
 *
 * The emailRedirectTo must match one of the Redirect URLs configured
 * in Supabase → Authentication → URL Configuration.
 */
export async function sendMagicLink(
  email: string,
  redirectPath: string = "/dashboard"
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Where Supabase redirects after the user clicks the link in their email.
      // Must be listed in Supabase → Auth → URL Configuration → Redirect URLs.
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      // Prevent auto-creating accounts — keep it explicit (optional, remove if you want open sign-ups)
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("[sendMagicLink] Supabase error:", error.message);
    return { error: error.message };
  }

  return { error: null };
}

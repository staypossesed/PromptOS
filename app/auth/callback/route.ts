import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * /auth/callback
 *
 * Supabase redirects here after the user clicks the magic-link in their email.
 * The URL contains either:
 *   ?code=…  (PKCE flow — default for magic links)
 *   #access_token=…&refresh_token=…  (implicit flow — fragment, handled client-side)
 *
 * We always use the PKCE code exchange here because fragments are not sent to the server.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Base URL for redirects — works on localhost and Vercel previews
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Magic link failed — it may have expired or been opened in a different browser. Please request a new one.")}`
      );
    }

    // Session established — send to the intended destination
    // next is already URL-encoded in the emailRedirectTo, so decode it once
    const destination = decodeURIComponent(next);

    // Validate the destination starts with / to prevent open redirect
    const safePath =
      destination.startsWith("/") && !destination.startsWith("//")
        ? destination
        : "/dashboard";

    return NextResponse.redirect(`${origin}${safePath}`);
  }

  // No code param — something unexpected happened
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`
  );
}

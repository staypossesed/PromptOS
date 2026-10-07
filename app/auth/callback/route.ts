import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AUTH_NEXT_COOKIE, safeAuthNext } from "@/lib/auth-redirect";

// OAuth and email links both return a PKCE code to this same-origin callback.
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  let storedNext: string | undefined;
  try { storedNext = decodeURIComponent(request.cookies.get(AUTH_NEXT_COOKIE)?.value ?? ""); } catch {}
  const next = safeAuthNext(requestUrl.searchParams.get("next") ?? storedNext);

  // Base URL for redirects — works on localhost and Vercel previews
  const origin = requestUrl.origin;
  function redirect(path: string) {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/auth/callback", maxAge: 0 });
    return response;
  }
  function fail(message: string) {
    return redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
  }
  if (requestUrl.searchParams.has("error")) return fail("Sign-in was cancelled or rejected. Please try again.");

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return fail("Sign-in expired or was opened in a different browser. Please sign in again in this browser.");
      }
      return redirect(next);
    } catch {
      return fail("We could not finish signing you in. Please try again.");
    }
  }

  // No code param — something unexpected happened
  return fail("Authentication did not complete. Please try again.");
}

import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

/**
 * Routes that require an active session.
 * Any path that starts with these prefixes will be guarded.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/builder", "/history", "/settings", "/templates", "/model-lab", "/admin"];

/**
 * Routes that authenticated users should not see.
 * Visiting /login while already signed in redirects to /dashboard.
 */
const AUTH_ONLY_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create the Supabase middleware client.
  // IMPORTANT: we must await getUser() before returning supabaseResponse
  // so that any session-refresh cookies are written into the response.
  const { supabase, supabaseResponse } = createMiddlewareClient(request);

  // Refresh the session if a refresh token is stored.
  // getUser() is the only reliable way to verify the JWT server-side —
  // session.user from cookies can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Authenticated user hits a login-only page ──────────────────────────
  if (user && AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // ── Unauthenticated user hits a protected page ─────────────────────────
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    // Preserve the intended destination so we can redirect back after sign-in
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ── Authenticated non-admin hits /model-lab or /admin ───────────────────
  if (user && (pathname.startsWith("/model-lab") || pathname.startsWith("/admin")) && !isAdminUser(user.email)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // ── All other cases: pass through with refreshed session cookies ────────
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match every path EXCEPT:
     * - _next/static  (static assets)
     * - _next/image   (image optimiser)
     * - favicon.ico
     * - public files with an extension (png, svg, …)
     * This is the recommended Next.js pattern.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

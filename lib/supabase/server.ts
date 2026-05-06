import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Server Component / Route Handler / Server Action client.
 * Reads and writes cookies via next/headers.
 * Must be called inside a request context (RSC, Route Handler, or Server Action).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component — ignore.
            // The middleware keeps sessions fresh for page navigations.
          }
        },
      },
    }
  );
}

/**
 * Middleware client — operates on the raw Request/Response pair
 * so it can update auth cookies before the response is sent.
 * Returns both the supabase client and the mutated response object.
 */
export function createMiddlewareClient(request: NextRequest) {
  // Start with a plain NextResponse that we will mutate
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write back to the request first so subsequent middleware can read them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Re-create the response to carry the updated cookies to the browser
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, supabaseResponse };
}

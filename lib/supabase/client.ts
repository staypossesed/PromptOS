import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components.
 * Reads credentials from NEXT_PUBLIC_* env vars at runtime.
 * Call inside components. The SSR library reuses a browser singleton
 * so components share the same auth state and refresh lifecycle.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

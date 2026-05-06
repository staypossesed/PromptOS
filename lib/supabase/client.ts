import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components.
 * Reads credentials from NEXT_PUBLIC_* env vars at runtime.
 * Call this inside components — do NOT call at module level,
 * because it instantiates a new client each time (cheap, by design).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

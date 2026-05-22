import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS.
// Use only in Route Handlers and webhook handlers. Never in Client Components.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

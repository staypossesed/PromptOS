"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminUser(user?.email);
}

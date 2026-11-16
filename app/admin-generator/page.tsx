import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canUseAdminGenerator } from "@/lib/admin-generator/access";
import { generatorConfiguration } from "@/lib/admin-generator/provider";
import { AdminPromptGenerator } from "@/components/admin-generator/admin-prompt-generator";

export const metadata: Metadata = { title: "Private Prompt Generator — Umprompt", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function AdminGeneratorPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=%2Fadmin-generator");
  if (!canUseAdminGenerator(user)) notFound();
  return <AdminPromptGenerator ownerId={user.id} initialConfiguration={generatorConfiguration()} />;
}

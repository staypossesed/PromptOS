import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canUseStudyCoach } from "@/lib/study-coach/access";
import { StudyCoach } from "@/components/study-coach/study-coach";

export const metadata: Metadata = { title: "Private Study Coach — Umprompt", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudyCoachPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=%2Fstudy-coach");
  if (!canUseStudyCoach(user)) notFound();
  return <StudyCoach ownerId={user.id} />;
}

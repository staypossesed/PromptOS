import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { StartExperience } from "@/components/builder/start-experience";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PageViewTracker event="landing_view" />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-5 text-sm text-zinc-500">
            <Link href="/plan" className="hover:text-zinc-900">Plans</Link>
            <Link href="/login" className="flex items-center gap-2 font-medium text-zinc-900">Sign in<ArrowRight className="size-4" /></Link>
          </nav>
        </div>
      </header>
      <main className="workspace-enter px-5 py-10 sm:px-8 sm:py-14"><StartExperience /></main>
      <footer className="mt-6 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-zinc-500">
          <span>Free to start · 7 prompts per week</span>
          <div className="flex flex-wrap gap-5"><Link href="/help">Help</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
        </div>
      </footer>
    </div>
  );
}

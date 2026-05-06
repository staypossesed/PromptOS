import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * /login  — Server Component shell.
 *
 * useSearchParams() inside LoginForm requires a Suspense boundary per Next.js 15.
 * We wrap the client component here at the page level.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-clay-200/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-[400px] rounded-full bg-clay-100/30 blur-3xl" />
      </div>

      {/* Nav */}
      <header className="flex h-16 items-center px-6 md:px-10">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      {/* Card — Suspense isolates the useSearchParams() hook */}
      <main className="flex flex-1 items-center justify-center px-4 pb-20">
        <Suspense fallback={<LoginSkeleton />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border border-ink-100/70 bg-white card-soft-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-clay-400 via-clay-500 to-clay-600" />
        <div className="p-8 md:p-10 space-y-5 animate-pulse">
          <div className="h-4 w-24 rounded-full bg-cream-200" />
          <div className="h-8 w-3/4 rounded-xl bg-cream-200" />
          <div className="h-4 w-full rounded bg-cream-100" />
          <div className="h-11 w-full rounded-xl bg-cream-200" />
          <div className="h-12 w-full rounded-full bg-clay-100" />
        </div>
      </div>
    </div>
  );
}

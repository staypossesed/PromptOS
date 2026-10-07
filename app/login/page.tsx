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

      {/* Nav */}
      <header className="flex h-16 shrink-0 items-center border-b border-zinc-200 bg-white px-6 md:px-10">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      {/* Card — Suspense isolates the useSearchParams() hook */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
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
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <div className="p-6 sm:p-8 space-y-5 animate-pulse">
          <div className="h-4 w-24 rounded bg-zinc-100" />
          <div className="h-8 w-3/4 rounded bg-zinc-200" />
          <div className="h-4 w-full rounded bg-zinc-100" />
          <div className="h-11 w-full rounded-lg bg-zinc-100" />
          <div className="h-12 w-full rounded-lg bg-emerald-100" />
        </div>
      </div>
    </div>
  );
}

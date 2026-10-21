import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Footer } from "@/components/system/footer";

export const metadata = {
  title: "Sign in",
  description: "Sign in to Umprompt and keep your prompts, profiles, and history.",
};

export default function LoginPage() {
  return (
    <>
    <div className="auth">
      <aside className="auth__side">
        <Link href="/" className="wordmark">Umprompt</Link>
        <div className="stack--loose stack">
          <p className="display" style={{ fontSize: "clamp(44px, 5vw, 88px)", maxWidth: "9ch" }}>
            Say it rough.
          </p>
          <p className="lead" style={{ maxWidth: "28ch" }}>
            The first seven prompts this week are free. No card. No prompt engineering.
          </p>
        </div>
        <p className="small" style={{ color: "#a9b8b0" }}>
          No card · 7 free prompts
        </p>
      </aside>
      <main id="main" className="auth__main">
        <Suspense fallback={<p className="body">Loading sign-in.</p>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
    <Footer />
    </>
  );
}

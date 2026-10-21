"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/system/button";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { prepareAuthRedirect, safeAuthNext } from "@/lib/auth-redirect";

type Stage = "idle" | "sent";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeAuthNext(searchParams.get("next"));
  const urlError = searchParams.get("error");
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(urlError);
  const [pending, setPending] = useState<"google" | "github" | "email" | null>(null);

  async function providerSignIn(provider: "google" | "github") {
    setPending(provider);
    setErrorMsg(null);
    try {
      track(provider === "google" ? "google_signin_started" : "github_signin_started");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: prepareAuthRedirect(window.location.origin, next), skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error("The sign-in provider did not respond. Please try again.");
      window.location.assign(data.url);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not start sign-in. Please try again.");
      setPending(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg(null);
    track("signup_started");
    setPending("email");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: prepareAuthRedirect(window.location.origin, next), shouldCreateUser: true },
      });
      if (error) setErrorMsg(error.message);
      else setStage("sent");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not send the sign-in link. Please try again.");
    } finally {
      setPending(null);
    }
  }

  if (stage === "sent") {
    return (
      <div className="stack--loose stack">
        <p className="small muted">Check your email</p>
        <h1 className="app-head__title" style={{ fontSize: "clamp(36px, 4vw, 64px)" }}>The link is on its way.</h1>
        <p className="body">
          We sent a sign-in link to <strong>{email}</strong>. Open it in this browser to return
          to the workspace.
        </p>
        <Button variant="ghost" onClick={() => setStage("idle")}>Use a different email</Button>
      </div>
    );
  }

  return (
    <div className="stack--loose stack">
      <div className="stack">
        <h1 className="app-head__title" style={{ fontSize: "clamp(40px, 5vw, 76px)" }}>
          Keep the work.
        </h1>
        <p className="body">
          Sign in to generate, save, and reopen prompts. Your draft is kept in this browser
          until you return.
        </p>
      </div>

      {errorMsg ? <p className="field__error" role="alert">{errorMsg}</p> : null}

      <div className="auth__options">
        <Button variant="ink" full onClick={() => providerSignIn("google")} disabled={pending !== null}>
          {pending === "google" ? "Opening Google" : "Continue with Google"}
        </Button>
        <Button variant="ghost" full onClick={() => providerSignIn("github")} disabled={pending !== null}>
          {pending === "github" ? "Opening GitHub" : "Continue with GitHub"}
        </Button>
      </div>

      <div className="stack">
        <div className="small muted">or use an email link</div>
        <form className="stack" onSubmit={submit}>
          <label className="field__label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="field__input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            disabled={pending !== null}
            placeholder="you@example.com"
          />
          <Button type="submit" variant="accent" disabled={pending !== null || !email.trim()}>
            {pending === "email" ? "Sending the link" : "Email me a sign-in link"}
          </Button>
        </form>
      </div>

      <p className="auth__legal">
        By continuing you agree to the <Link href="/terms">terms</Link> and the{" "}
        <Link href="/privacy">privacy policy</Link>. No card is required.
      </p>
    </div>
  );
}

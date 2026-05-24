"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { useTranslations } from "@/lib/i18n/use-translations";

type Stage = "idle" | "sent";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const urlError = searchParams.get("error");
  const { t } = useTranslations();

  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(urlError);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isGithubPending, setIsGithubPending] = useState(false);

  // Create the client once at mount so PKCE storage is warm before the first click.
  const supabase = useMemo(() => createClient(), []);

  async function handleGoogleSignIn() {
    setIsGooglePending(true);
    setErrorMsg(null);
    track("google_signin_started");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error) { setErrorMsg(error.message); setIsGooglePending(false); return; }
    if (data.url) window.location.href = data.url;
  }

  async function handleGithubSignIn() {
    setIsGithubPending(true);
    setErrorMsg(null);
    track("github_signin_started");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error) { setErrorMsg(error.message); setIsGithubPending(false); return; }
    if (data.url) window.location.href = data.url;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg(null);
    track("signup_started");
    startTransition(async () => {
      const { error } = await sendMagicLink(trimmed, next);
      if (error) setErrorMsg(error);
      else setStage("sent");
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md"
    >
      <div className="rounded-3xl border border-ink-100/70 bg-card card-soft-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-clay-400 via-clay-500 to-clay-600" />
        <div className="p-8 md:p-10">
          <AnimatePresence mode="wait">
            {stage === "sent" ? (
              <SentState key="sent" email={email} t={t} />
            ) : (
              <FormState
                key="form"
                email={email}
                setEmail={setEmail}
                onSubmit={handleSubmit}
                isPending={isPending}
                errorMsg={errorMsg}
                onGoogleSignIn={handleGoogleSignIn}
                isGooglePending={isGooglePending}
                onGithubSignIn={handleGithubSignIn}
                isGithubPending={isGithubPending}
                t={t}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-ink-400">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="size-3 text-clay-500" />
          {t("auth.noCreditCard")}
        </span>
        <span className="text-ink-200">·</span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="size-3 text-clay-500" />
          {t("auth.freePlan")}
        </span>
        <span className="text-ink-200">·</span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="size-3 text-clay-500" />
          {t("auth.twentyPrompts")}
        </span>
      </div>

      <p className="mt-3 text-center text-xs text-ink-400">
        {t("auth.byContinuing")}{" "}
        <Link href="/terms" className="underline hover:text-ink-700 transition-colors">
          {t("auth.termsOfService")}
        </Link>{" "}
        {t("auth.and")}{" "}
        <Link href="/privacy" className="underline hover:text-ink-700 transition-colors">
          {t("auth.privacyPolicy")}
        </Link>
        .
      </p>
    </motion.div>
  );
}

function FormState({
  email, setEmail, onSubmit, isPending, errorMsg,
  onGoogleSignIn, isGooglePending, onGithubSignIn, isGithubPending, t,
}: {
  email: string; setEmail: (v: string) => void; onSubmit: (e: React.FormEvent) => void;
  isPending: boolean; errorMsg: string | null;
  onGoogleSignIn: () => void; isGooglePending: boolean;
  onGithubSignIn: () => void; isGithubPending: boolean;
  t: (key: string) => string;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.22 }}>
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-clay-500/10 px-3 py-1 text-xs font-medium text-clay-700 mb-4">
          <span className="size-1.5 rounded-full bg-clay-500" />
          {t("auth.noPasswordRequired")}
        </div>
        <h1 className="font-serif text-3xl font-medium text-ink-900 leading-tight">{t("auth.signInTitle")}</h1>
        <p className="mt-2 text-sm text-ink-500 leading-relaxed">{t("auth.signInSubtitle")}</p>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-ink-800">{t("auth.emailLabel")}</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-400 pointer-events-none" />
            <Input
              id="email" type="email" placeholder={t("auth.emailPlaceholder")}
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 rounded-xl" autoComplete="email" autoFocus required disabled={isPending}
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isPending || !email.trim()}>
          {isPending ? (
            <><Loader2 className="size-4 animate-spin" />{t("auth.sendingLink")}</>
          ) : (
            <>{t("auth.continueWithEmail")}<ArrowRight className="size-4" /></>
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink-100" /></div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-ink-400">{t("common.or")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" className="w-full" onClick={onGoogleSignIn} disabled={isGooglePending || isGithubPending || isPending} type="button">
          {isGooglePending ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
          {isGooglePending ? t("common.redirecting") : t("auth.continueWithGoogle")}
        </Button>
        <Button variant="outline" size="lg" className="w-full" onClick={onGithubSignIn} disabled={isGithubPending || isGooglePending || isPending} type="button">
          {isGithubPending ? <Loader2 className="size-4 animate-spin" /> : <GitHubIcon />}
          {isGithubPending ? t("common.redirecting") : t("auth.continueWithGithub")}
        </Button>
      </div>
    </motion.div>
  );
}

function SentState({ email, t }: { email: string; t: (key: string) => string }) {
  const tips = [t("auth.checkSpam"), t("auth.linkExpires"), t("auth.requestNewLink")];
  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.22 }} className="py-4 text-center">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.08 }}
        className="mx-auto mb-6 size-16 rounded-2xl bg-clay-500/10 flex items-center justify-center"
      >
        <CheckCircle2 className="size-8 text-sage-600" />
      </motion.div>
      <h2 className="font-serif text-2xl font-medium text-ink-900 mb-2">{t("auth.checkInbox")}</h2>
      <p className="text-sm text-ink-500 leading-relaxed max-w-xs mx-auto">
        {t("auth.sentLinkTo")}{" "}
        <span className="font-medium text-ink-800">{email}</span>.{" "}
        {t("auth.clickAndIn")}
      </p>
      <div className="mt-7 rounded-xl border border-ink-100/70 bg-cream-50 p-4 text-left space-y-2">
        {tips.map((tip) => (
          <div key={tip} className="flex items-start gap-2 text-xs text-ink-500">
            <span className="size-1.5 rounded-full bg-clay-400/60 mt-1.5 shrink-0" />
            {tip}
          </div>
        ))}
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 text-sm text-ink-500 hover:text-clay-600 transition-colors underline underline-offset-2"
      >
        {t("auth.useDifferentEmail")}
      </button>
    </motion.div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0110 4.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.138 18.163 20 14.418 20 10c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
      <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4a4.62 4.62 0 01-2 3.03v2.51h3.23c1.89-1.74 2.97-4.3 2.97-7.33z" fill="#4285F4"/>
      <path d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.23-2.51c-.9.6-2.04.96-3.4.96-2.6 0-4.81-1.76-5.6-4.12H1.07v2.6A9.99 9.99 0 0010 20z" fill="#34A853"/>
      <path d="M4.4 11.89A5.99 5.99 0 014.18 10c0-.65.11-1.28.22-1.89V5.51H1.07A9.99 9.99 0 000 10c0 1.61.39 3.13 1.07 4.49l3.33-2.6z" fill="#FBBC05"/>
      <path d="M10 3.98c1.47 0 2.78.51 3.82 1.5l2.85-2.85C14.96.99 12.7 0 10 0A9.99 9.99 0 001.07 5.51l3.33 2.6C5.19 5.74 7.4 3.98 10 3.98z" fill="#EA4335"/>
    </svg>
  );
}

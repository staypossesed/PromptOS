"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wand2, User, CheckCircle, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/use-translations";
import { track } from "@/lib/analytics";
import { CHECKOUT_RETURN, checkoutReturn } from "@/lib/checkout";
import { CHECKOUT_DRAFT_KEY } from "@/lib/checkout-draft";

type SyncState = "syncing" | "success" | "pending" | "failed" | "auth";
export default function PlanSuccessPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [syncState, setSyncState] = useState<SyncState>("syncing");
  const [attempt, setAttempt] = useState(0);
  const [returnTo, setReturnTo] = useState("/builder");

  useEffect(() => {
    try { if (sessionStorage.getItem(CHECKOUT_DRAFT_KEY)) setReturnTo(CHECKOUT_RETURN); } catch {}
  }, []);
  const retry = useCallback(() => setAttempt((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setSyncState("syncing");
    async function verify() {
      if (!sessionId) { setSyncState("failed"); return; }
      let finalState: SyncState = "failed";
      for (let index = 0; index < 4 && !cancelled; index++) {
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch("/api/billing/sync-checkout", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }), signal: controller.signal,
          });
          const json = await res.json();
          if (cancelled) return;
          if (res.ok && json.ok === true && json.billing?.isPaid === true) {
            setReturnTo(checkoutReturn(json.returnTo));
            setSyncState("success");
            window.dispatchEvent(new Event("prompt_usage_refresh"));
            // Count activation only after server verification, once per browser session.
            try {
              const key = `ump:checkout_verified:${sessionId}`;
              if (!sessionStorage.getItem(key)) {
                track("checkout_completed", { plan: json.billing.plan, is_founder: json.billing.isFounder });
                sessionStorage.setItem(key, "1");
              }
            } catch {}
            return;
          }
          if (res.status === 401) { finalState = "auth"; break; }
          if (json.error === "PAYMENT_PENDING" || json.error === "ACTIVATION_PENDING") finalState = "pending";
          else if (res.status < 500) { finalState = "failed"; break; }
        } catch { finalState = "failed"; }
        finally { clearTimeout(timeout); }
        if (index < 3 && !cancelled) await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!cancelled) {
        setSyncState(finalState);
        track("checkout_verification_pending", { reason: finalState });
      }
    }
    void verify();
    return () => { cancelled = true; controller.abort(); };
  }, [sessionId, attempt]);

  const loading = syncState === "syncing";
  const verified = syncState === "success";
  return <div className="flex min-h-screen items-center justify-center bg-paper p-4">
    <div className="w-full max-w-md text-center" role="status" aria-live="polite">
      <div className="mb-6 flex justify-center"><div className="flex size-16 items-center justify-center rounded-lg bg-emerald-50">
        {loading ? <Loader2 className="size-8 animate-spin text-emerald-700" /> : verified ? <CheckCircle className="size-8 text-emerald-700" /> : <AlertCircle className="size-8 text-amber-700" />}
      </div></div>
      <h1 className="mb-3 text-2xl font-semibold text-ink-900">{loading ? "Confirming your plan..." : verified ? t("billing.successTitle") : syncState === "pending" ? "Confirmation is still pending" : syncState === "auth" ? "Sign in to confirm your plan" : "We couldn't confirm this payment"}</h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-500">{loading ? "Checking payment and access with Stripe." : verified ? t("billing.successSubtitle") : "Paid access has not been confirmed here. You can retry or check your account. Do not pay again while confirmation is pending."}</p>
      {!loading && <div className="flex flex-wrap justify-center gap-3">
        {syncState === "auth" ? <Button asChild><Link href={`/login?next=${encodeURIComponent(`/plan/success?session_id=${encodeURIComponent(sessionId ?? "")}`)}`}>Sign in</Link></Button> : !verified && sessionId && <Button onClick={retry}><RotateCcw className="size-4" />Retry confirmation</Button>}
        <Button asChild variant={verified ? "default" : "outline"}><Link href={returnTo}><Wand2 className="size-4" />{t("billing.goToBuilder")}</Link></Button>
        <Button asChild variant="outline"><Link href="/account"><User className="size-4" />{t("billing.goToAccount")}</Link></Button>
      </div>}
    </div>
  </div>;
}

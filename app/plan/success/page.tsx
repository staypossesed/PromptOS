"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/system/button";
import { track } from "@/lib/analytics";
import { CHECKOUT_RETURN, checkoutReturn } from "@/lib/checkout";
import { CHECKOUT_DRAFT_KEY } from "@/lib/checkout-draft";
import { Footer } from "@/components/system/footer";

type SyncState = "syncing" | "success" | "pending" | "failed" | "auth";

function SuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [syncState, setSyncState] = useState<SyncState>("syncing");
  const [attempt, setAttempt] = useState(0);
  const [returnTo, setReturnTo] = useState("/builder");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHECKOUT_DRAFT_KEY)) setReturnTo(CHECKOUT_RETURN);
    } catch {
      // Storage can be blocked.
    }
  }, []);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setSyncState("syncing");

    async function verify() {
      if (!sessionId) {
        setSyncState("failed");
        return;
      }
      let finalState: SyncState = "failed";
      for (let index = 0; index < 4 && !cancelled; index++) {
        const timeout = window.setTimeout(() => controller.abort(), 10000);
        try {
          const response = await fetch("/api/billing/sync-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
            signal: controller.signal,
          });
          const json = await response.json();
          if (cancelled) return;
          if (response.ok && json.ok === true && json.billing?.isPaid === true) {
            setReturnTo(checkoutReturn(json.returnTo));
            setSyncState("success");
            window.dispatchEvent(new Event("prompt_usage_refresh"));
            try {
              const key = `ump:checkout_verified:${sessionId}`;
              if (!sessionStorage.getItem(key)) {
                track("checkout_completed", { plan: json.billing.plan, is_founder: json.billing.isFounder });
                sessionStorage.setItem(key, "1");
              }
            } catch {
              // Ignore storage.
            }
            return;
          }
          if (response.status === 401) {
            finalState = "auth";
            break;
          }
          if (json.error === "PAYMENT_PENDING" || json.error === "ACTIVATION_PENDING") finalState = "pending";
          else if (response.status < 500) {
            finalState = "failed";
            break;
          }
        } catch {
          finalState = "failed";
        } finally {
          window.clearTimeout(timeout);
        }
        if (index < 3 && !cancelled) await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!cancelled) {
        setSyncState(finalState);
        track("checkout_verification_pending", { reason: finalState });
      }
    }

    void verify();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [sessionId, attempt]);

  const loading = syncState === "syncing";
  const verified = syncState === "success";
  const title = loading
    ? "Confirming your plan."
    : verified
    ? "Paid access is active."
    : syncState === "pending"
    ? "Confirmation is still pending."
    : syncState === "auth"
    ? "Sign in to confirm."
    : "We could not confirm this payment.";

  return (
    <>
    <div className="wrap" style={{ paddingBlock: "clamp(48px, 8vw, 120px)" }}>
      <div style={{ maxWidth: 720 }}>
        <p className="small muted">Checkout / Confirmation</p>
        <h1 className="app-head__title" style={{ fontSize: "clamp(44px, 6vw, 96px)", marginTop: 12 }}>
          {title}
        </h1>
        <p className="lead" style={{ marginTop: 24 }}>
          {loading
            ? "Checking the payment and the access with Stripe."
            : verified
            ? "The payment is confirmed. Your workspace and prompt packs are open."
            : "Paid access has not been confirmed here. You can retry or check your account. Do not pay again while confirmation is pending."}
        </p>

        <div className="sheet" style={{ marginTop: 40 }} data-ui>
          <div className="sheet__head">
            <h2 className="sheet__title">Receipt</h2>
            <span className="sheet__meta">{sessionId ? `Session ${sessionId.slice(0, 12)}…` : "No session"}</span>
          </div>
          <div className="account-row"><span className="account-row__label">Status</span><span>{loading ? "Checking" : verified ? "Paid" : syncState === "pending" ? "Pending" : "Not confirmed"}</span></div>
          <div className="account-row"><span className="account-row__label">Next step</span><span>{verified ? "Return to your draft or the dashboard." : "Retry, sign in, or check the account page."}</span></div>
        </div>

        <div className="composer__actions" style={{ marginTop: 28 }}>
          {syncState === "auth" ? (
            <ButtonLink href={`/login?next=${encodeURIComponent(`/plan/success?session_id=${encodeURIComponent(sessionId ?? "")}`)}`} variant="accent">Sign in</ButtonLink>
          ) : !verified && sessionId ? (
            <Button onClick={retry}>Retry confirmation</Button>
          ) : null}
          <ButtonLink href={returnTo} variant={verified ? "accent" : "ghost"}>Return to the workspace</ButtonLink>
          <Link href="/account" className="link-arrow">Check the account</Link>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}

export default function PlanSuccessPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ paddingBlock: 64 }}><p className="body">Checking the payment.</p></div>}>
      <SuccessInner />
    </Suspense>
  );
}

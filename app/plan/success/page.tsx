"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wand2, User, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/use-translations";
import { track } from "@/lib/analytics";

type SyncState = "syncing" | "success" | "fallback";

export default function PlanSuccessPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [syncState, setSyncState] = useState<SyncState>("syncing");

  useEffect(() => {
    track("checkout_completed" as never);

    async function sync() {
      if (!sessionId) {
        setSyncState("fallback");
        window.dispatchEvent(new Event("prompt_usage_refresh"));
        return;
      }
      try {
        const res = await fetch("/api/billing/sync-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (res.ok) {
          setSyncState("success");
        } else {
          setSyncState("fallback");
        }
      } catch {
        setSyncState("fallback");
      } finally {
        // Always refresh sidebar so plan card updates
        window.dispatchEvent(new Event("prompt_usage_refresh"));
      }
    }

    sync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = syncState === "syncing";

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="size-8 text-green-600 animate-spin" />
            ) : (
              <CheckCircle className="size-8 text-green-600" />
            )}
          </div>
        </div>

        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-ink-900 mb-3">
          {isLoading
            ? "Activating your plan…"
            : syncState === "success"
            ? t("billing.successTitle")
            : "Payment received."}
        </h1>
        <p className="text-ink-500 text-[15px] mb-8 leading-relaxed">
          {isLoading
            ? "Confirming your payment with Stripe…"
            : syncState === "success"
            ? t("billing.successSubtitle")
            : "Payment received. Your plan may take a moment to activate — check your Account page."}
        </p>

        {!isLoading && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/builder">
                <Wand2 className="size-4" />
                {t("billing.goToBuilder")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account">
                <User className="size-4" />
                {t("billing.goToAccount")}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

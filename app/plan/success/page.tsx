"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Wand2, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/use-translations";
import { track } from "@/lib/analytics";

export default function PlanSuccessPage() {
  const { t } = useTranslations();

  useEffect(() => {
    // Refresh sidebar usage count
    window.dispatchEvent(new Event("prompt_usage_refresh"));
    track("checkout_completed" as never);
  }, []);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Check icon */}
        <div className="flex justify-center mb-6">
          <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="size-8 text-green-600" />
          </div>
        </div>

        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-ink-900 mb-3">
          {t("billing.successTitle")}
        </h1>
        <p className="text-ink-500 text-[15px] mb-8 leading-relaxed">
          {t("billing.successSubtitle")}
        </p>

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
      </div>
    </div>
  );
}

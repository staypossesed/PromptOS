"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

export function BillingPortalButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function openPortal() {
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok || typeof json.url !== "string" || !json.url.startsWith("https://")) throw new Error("Portal unavailable");
      track("billing_portal_opened");
      window.location.assign(json.url);
    } catch {
      setError(true);
    }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={openPortal} disabled={loading} aria-busy={loading}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
        {label}
      </Button>
      {error && <p role="alert" className="text-sm text-red-700">Could not open billing management. Please try again.</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { track } from "@/lib/analytics";

export function BillingPortalButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    track("billing_portal_opened");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={openPortal} disabled={loading}>
      <ExternalLink className="size-3.5" />
      {loading ? "…" : label}
    </Button>
  );
}

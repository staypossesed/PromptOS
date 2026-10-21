"use client";

import { useState } from "react";
import { Button } from "@/components/system/button";

export function BillingPortalButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.url) throw new Error(json.error ?? "Could not open the billing portal.");
      window.location.assign(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the billing portal.");
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <Button size="sm" variant="ghost" onClick={openPortal} disabled={pending}>
        {pending ? "Opening" : "Manage billing"}
      </Button>
      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}

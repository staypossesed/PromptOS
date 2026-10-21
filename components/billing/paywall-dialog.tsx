"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/system/dialog";
import { ButtonLink } from "@/components/system/button";

export const PAYWALL_EVENT = "ump:paywall-open";

export function dispatchPaywallOpen() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PAYWALL_EVENT));
}

export function PaywallDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(PAYWALL_EVENT, handler);
    return () => window.removeEventListener(PAYWALL_EVENT, handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        title="The free prompts are used up."
        description="Your task stays where it is. Pro removes the weekly limit and adds prompt packs, library profiles, and playbooks."
      >
        <div className="stack">
          <p className="body">
            Pro is $9.99 a month or $99.99 once. The founder price is $4.99 a month or $34.99
            once for the first 100.
          </p>
          <div className="composer__actions">
            <ButtonLink href="/plan?returnTo=/builder?resume=checkout" variant="accent">See the plans</ButtonLink>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

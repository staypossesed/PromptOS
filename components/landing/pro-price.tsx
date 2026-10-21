"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/system/button";
import { checkoutPrice } from "@/lib/checkout";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function ProPrice() {
  const [offer, setOffer] = useState<"monthly" | "lifetime">("monthly");
  const amount = checkoutPrice(offer, false);

  return (
    <div className="pro-price">
      <div className="price-toggle" role="group" aria-label="Billing period">
        <button type="button" aria-pressed={offer === "monthly"} onClick={() => setOffer("monthly")}>Monthly</button>
        <button type="button" aria-pressed={offer === "lifetime"} onClick={() => setOffer("lifetime")}>Once</button>
      </div>

      <div className="price-field__amount" key={offer}>{dollars(amount)}</div>
      <p className="small">
        {offer === "monthly"
          ? "Per month. Cancel future renewals anytime."
          : "One payment. No recurring subscription."}{" "}
        Founder price: {dollars(checkoutPrice(offer, true))} for the first 100.
      </p>
      <div style={{ marginTop: 18 }}>
        <ButtonLink href="/plan" variant="ink" size="sm">See the plans</ButtonLink>
      </div>
    </div>
  );
}

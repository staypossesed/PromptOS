"use client";

import { PaywallModal, usePaywallModal } from "./paywall-modal";

// Thin client shell — mount once inside AppShell so any component in the
// tree can open the modal via dispatchPaywallOpen() without prop drilling.
export function PaywallModalContainer() {
  const { open, onClose } = usePaywallModal();
  return <PaywallModal open={open} onClose={onClose} />;
}

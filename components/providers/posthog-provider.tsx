"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { identify } from "@/lib/analytics";

/**
 * Initializes PostHog once on the client and identifies the current user.
 * Silently skips if NEXT_PUBLIC_POSTHOG_KEY is not set.
 * Safe to include in the root layout — adds no UI.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false, // we capture page views manually via PageViewTracker
      capture_pageleave: true,
      persistence: "localStorage",
    });

    // Identify authenticated user so events are tied to an account
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        identify(data.user.id, { email: data.user.email });
      }
    });
  }, []);

  return <>{children}</>;
}

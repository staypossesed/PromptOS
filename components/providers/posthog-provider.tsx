"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { analyticsReady, identify, resetAnalytics, stripPrivateAnalytics, track } from "@/lib/analytics";

/**
 * Initializes PostHog once on the client and identifies the current user.
 * Silently skips if NEXT_PUBLIC_POSTHOG_KEY is not set.
 * Safe to include in the root layout — adds no UI.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const visitTracked = useRef(false);
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false, // we capture page views manually via PageViewTracker
      capture_pageleave: false,
      autocapture: false,
      disable_session_recording: true,
      persistence: "localStorage",
      save_referrer: false,
      save_campaign_params: false,
      before_send: (event) => {
        if (!event) return null;
        event.properties = { ...stripPrivateAnalytics(event.properties), $geoip_disable: true };
        return event;
      },
    });

    if (!visitTracked.current) { visitTracked.current = true; track("site_visited"); }

    // Identify authenticated user so events are tied to an account
    const supabase = createClient();
    let disposed = false;
    let revision = 0;
    function updateUser(id: string | null) {
      if (disposed) return;
      const previousId = posthog.get_property("$user_id");
      if (previousId && previousId !== id) resetAnalytics(false);
      if (id) identify(id);
      analyticsReady();
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      revision++;
      updateUser(session?.user.id ?? null);
    });
    const initialRevision = revision;
    void supabase.auth.getUser().then(({ data }) => {
      if (revision === initialRevision) updateUser(data.user?.id ?? null);
    }).catch(() => { if (revision === initialRevision) updateUser(null); });
    return () => { disposed = true; subscription.unsubscribe(); };
  }, []);

  return <>{children}</>;
}

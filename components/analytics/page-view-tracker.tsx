"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/**
 * Zero-render client component that fires a single analytics event on mount.
 * Drop this into Server Component pages to track page views.
 */
export function PageViewTracker({ event }: { event: AnalyticsEvent }) {
  useEffect(() => {
    track(event);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

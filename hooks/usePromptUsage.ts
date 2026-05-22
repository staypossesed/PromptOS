"use client";

import { useEffect, useState, useCallback } from "react";

export interface PromptUsage {
  planName: string;
  isPaid: boolean;
  isFounder: boolean;
  isLifetime: boolean;
  weeklyLimit: number | null;
  usedThisWeek: number;
  remainingThisWeek: number | null;
  fairUseLabel: string | null;
  // Legacy (backward compat with existing sidebar/account callers)
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  isLoading: boolean;
  refreshUsage: () => void;
}

export function usePromptUsage(): PromptUsage {
  const [data, setData] = useState<Omit<PromptUsage, "isLoading" | "refreshUsage">>({
    planName: "free",
    isPaid: false,
    isFounder: false,
    isLifetime: false,
    weeklyLimit: 7,
    usedThisWeek: 0,
    remainingThisWeek: 7,
    fairUseLabel: null,
    dailyLimit: 7,
    usedToday: 0,
    remainingToday: 7,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) return;
      const json = await res.json();
      setData({
        planName: json.plan ?? "free",
        isPaid: json.isPaid ?? false,
        isFounder: json.isFounder ?? false,
        isLifetime: json.isLifetime ?? false,
        weeklyLimit: json.weeklyLimit ?? 7,
        usedThisWeek: json.usedThisWeek ?? 0,
        remainingThisWeek: json.remainingThisWeek ?? 7,
        fairUseLabel: json.fairUseLabel ?? null,
        dailyLimit: json.dailyLimit ?? 7,
        usedToday: json.usedToday ?? 0,
        remainingToday: json.remainingToday ?? 7,
      });
    } catch {
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    window.addEventListener("prompt_usage_refresh", fetchUsage);
    return () => window.removeEventListener("prompt_usage_refresh", fetchUsage);
  }, [fetchUsage]);

  return { ...data, isLoading, refreshUsage: fetchUsage };
}

"use client";

import { useEffect, useState, useCallback } from "react";

export interface PromptUsage {
  planName: string;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  isLoading: boolean;
  refreshUsage: () => void;
}

export function usePromptUsage(): PromptUsage {
  const [planName, setPlanName] = useState("free");
  const [dailyLimit, setDailyLimit] = useState(20);
  const [usedToday, setUsedToday] = useState(0);
  const [remainingToday, setRemainingToday] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) return;
      const json = await res.json();
      setPlanName(json.plan ?? "free");
      setDailyLimit(json.dailyLimit ?? 20);
      setUsedToday(json.usedToday ?? 0);
      setRemainingToday(json.remainingToday ?? 20);
    } catch {}
    finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();

    function handleRefresh() {
      fetchUsage();
    }
    window.addEventListener("prompt_usage_refresh", handleRefresh);
    return () => window.removeEventListener("prompt_usage_refresh", handleRefresh);
  }, [fetchUsage]);

  return { planName, dailyLimit, usedToday, remainingToday, isLoading, refreshUsage: fetchUsage };
}

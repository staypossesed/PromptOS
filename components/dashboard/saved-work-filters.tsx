"use client";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/use-translations";
import type { SavedDelivery } from "@/lib/prompt-history";

export function PromptFilters({ path, query = "", delivery }: { path: "/dashboard" | "/history"; query?: string; delivery: SavedDelivery | "" }) {
  const { t } = useTranslations();
  return <nav aria-label={t("history.filterLabel")} className="daily-filters">{[
    { value: "", label: t("common.all") }, { value: "prompt", label: t("history.aiPrompt") }, { value: "answer", label: t("history.finishedResult") },
  ].map(({value,label}) => { const params = new URLSearchParams(); if(query)params.set("q",query); if(value)params.set("delivery",value); const suffix=params.toString(); return <Link key={value} href={suffix?`${path}?${suffix}`:path} aria-current={value===delivery?"page":undefined}>{label}</Link>; })}</nav>;
}

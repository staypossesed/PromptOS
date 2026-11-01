"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Clock3, Check } from "lucide-react";
import { composerCopy } from "@/lib/composer-copy";
import { useTranslations } from "@/lib/i18n/use-translations";

export type AnswerOutcome = "useful" | "not_useful" | "not_tried";

export function OutcomeFeedback({ value, onFeedback }: { value: boolean | null; onFeedback: (outcome: AnswerOutcome) => void }) {
  const { language } = useTranslations();
  const copy = composerCopy(language);
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);

  function answer(value: AnswerOutcome) {
    if (outcome && outcome !== "not_tried") return;
    setOutcome(value);
    onFeedback(value);
  }

  return <section data-outcome-feedback aria-label={copy.answer} className="mt-4 border-y border-zinc-200 py-4">
    {value !== null ? <p role="status" className="flex items-center gap-2 text-sm text-emerald-800"><Check className="size-4 shrink-0" aria-hidden="true" />{copy.thanks}</p> : outcome === "not_tried" ?
      <button type="button" onClick={() => setOutcome(null)} className="min-h-11 text-sm font-medium text-emerald-700 hover:underline">{copy.shareOutcome}</button> : <>
        <p className="text-base font-medium text-zinc-800">{copy.answer}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {([ ["useful", copy.yes, ThumbsUp], ["not_useful", copy.no, ThumbsDown], ["not_tried", copy.notTried, Clock3] ] as const).map(([value, label, Icon]) =>
            <button key={value} type="button" onClick={() => answer(value)} className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:border-emerald-600 hover:bg-emerald-50"><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</button>)}
        </div>
      </>}
  </section>;
}

"use client";

import { PenLine, WandSparkles } from "lucide-react";
import type { composerCopy } from "@/lib/composer-copy";

export function ExpansionExample({ copy, onUse }: {
  copy: ReturnType<typeof composerCopy>["expansionExample"];
  onUse?: () => void;
}) {
  return <aside aria-label={copy.label} data-expansion-example>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-medium text-zinc-900"><WandSparkles className="size-5 text-emerald-700" />{copy.title}</h2>
      <span className="text-sm font-medium text-zinc-500">{copy.badge}</span>
    </div>
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">
        <p className="mb-1 text-sm font-medium text-zinc-500">{copy.original}</p>
        <p className="text-base text-zinc-800">&quot;{copy.idea}&quot;</p>
      </div>
      <dl className="space-y-4 px-5 py-5">
        {[[copy.goalLabel, copy.goal], [copy.detailsLabel, copy.details], [copy.outputLabel, copy.output]].map(([label, value]) => <div key={label}>
          <dt className="mb-1 text-sm font-semibold text-emerald-800">{label}</dt>
          <dd className="text-base leading-relaxed text-zinc-700">{value}</dd>
        </div>)}
      </dl>
      {onUse && <div className="border-t border-zinc-100 px-5 py-2">
        <button type="button" onClick={onUse} className="motion-press flex min-h-11 items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900">
          <PenLine className="size-4" />{copy.use}
        </button>
      </div>}
    </div>
  </aside>;
}

"use client";

import { cn } from "@/lib/utils";
import { PACK_TYPES, type PackType } from "@/types/prompt-pack";

interface PackTypeSelectorProps {
  value: PackType;
  onChange: (type: PackType) => void;
}

export function PackTypeSelector({ value, onChange }: PackTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">
        Pack type
      </div>
      <div className="grid grid-cols-1 gap-2">
        {PACK_TYPES.map((pt) => (
          <button
            key={pt.id}
            type="button"
            onClick={() => onChange(pt.id)}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
              value === pt.id
                ? "border-clay-400/60 bg-clay-500/5 ring-1 ring-clay-400/30"
                : "border-ink-100/70 bg-white hover:border-ink-200 hover:bg-cream-50"
            )}
          >
            <span className="text-xl leading-none mt-0.5">{pt.emoji}</span>
            <div className="min-w-0">
              <div className={cn(
                "text-sm font-medium leading-snug",
                value === pt.id ? "text-clay-700" : "text-ink-800"
              )}>
                {pt.label}
              </div>
              <div className="text-[11px] text-ink-400 mt-0.5 leading-relaxed truncate">
                {pt.description}
              </div>
            </div>
            <span className={cn(
              "ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wider rounded-full px-2 py-0.5 self-start",
              value === pt.id
                ? "bg-clay-500/10 text-clay-600"
                : "bg-cream-100 text-ink-400"
            )}>
              {pt.steps}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

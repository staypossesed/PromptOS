"use client";

import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";

interface IdeaInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function IdeaInput({ value, onChange }: IdeaInputProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-800">
          <Sparkles className="size-3.5 text-clay-500" />
          Your idea
        </label>
        <span className="text-xs text-ink-300 font-mono">{value.length} chars</span>
      </div>
      <div className="relative group">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe what you want to build, write, or generate. Be specific about the goal — context and constraints come next."
          className="min-h-[120px] text-[15px] bg-white resize-none overflow-hidden"
          rows={5}
        />
        <div className="absolute inset-0 rounded-xl ring-1 ring-clay-300/0 group-focus-within:ring-clay-300/40 transition-shadow pointer-events-none" />
      </div>
      <p className="text-xs text-ink-400 leading-relaxed">
        The more specific your idea, the stronger the generated prompt. PromptOS handles the structure.
      </p>
    </div>
  );
}

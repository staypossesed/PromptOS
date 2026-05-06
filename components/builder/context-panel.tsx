"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const CONTEXT_FIELDS = [
  {
    key: "projectType",
    label: "Project type",
    placeholder: "e.g. Next.js 15 + Supabase SaaS",
    type: "input" as const,
  },
  {
    key: "audience",
    label: "Audience",
    placeholder: "e.g. Series A founders, junior developers",
    type: "input" as const,
  },
  {
    key: "constraints",
    label: "Constraints",
    placeholder: "Must-haves and must-nots. e.g. No external state libraries.",
    type: "textarea" as const,
  },
  {
    key: "outputFormat",
    label: "Output format",
    placeholder: "e.g. Single fenced code block, JSON array, bulleted list",
    type: "input" as const,
  },
];

export function ContextPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-ink-200/50 bg-white/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-cream-100 flex items-center justify-center">
            <Plus className={cn(
              "size-3.5 text-ink-500 transition-transform",
              expanded && "rotate-45"
            )} />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-ink-800">Add context</div>
            <div className="text-[11px] text-ink-400">Optional — improves the score</div>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-ink-400 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-ink-100/60">
              {CONTEXT_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-medium text-ink-600">
                    {field.label}
                  </label>
                  {field.type === "input" ? (
                    <Input placeholder={field.placeholder} className="bg-white" />
                  ) : (
                    <Textarea
                      placeholder={field.placeholder}
                      className="bg-white min-h-[72px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

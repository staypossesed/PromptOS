"use client";

import { ChevronDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PromptContext } from "@/types/prompt";
import { useState } from "react";
import { useTranslations } from "@/lib/i18n/use-translations";

interface ContextPanelProps {
  value: PromptContext;
  onChange: (next: PromptContext) => void;
}

type ContextFieldKey = keyof PromptContext;

const CONTEXT_FIELD_KEYS: {
  key: ContextFieldKey;
  labelKey: string;
  placeholderKey: string;
  type: "input" | "textarea";
}[] = [
  { key: "projectType", labelKey: "contextFields.projectType", placeholderKey: "contextFields.projectTypePlaceholder", type: "input" },
  { key: "audience", labelKey: "contextFields.audience", placeholderKey: "contextFields.audiencePlaceholder", type: "input" },
  { key: "constraints", labelKey: "contextFields.constraints", placeholderKey: "contextFields.constraintsPlaceholder", type: "textarea" },
  { key: "outputFormat", labelKey: "contextFields.outputFormat", placeholderKey: "contextFields.outputFormatPlaceholder", type: "input" },
  { key: "examples", labelKey: "contextFields.examples", placeholderKey: "contextFields.examplesPlaceholder", type: "textarea" },
];

export function ContextPanel({ value, onChange }: ContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslations();

  const filledCount = CONTEXT_FIELD_KEYS.filter((f) => !!value[f.key]?.trim()).length;

  const filledLabel =
    filledCount > 0
      ? t(filledCount === 1 ? "builder.fieldsFilled_one" : "builder.fieldsFilled_other", { n: filledCount })
      : t("builder.contextHelper");

  return (
    <div className="rounded-xl border border-ink-200/50 bg-white/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-cream-100 flex items-center justify-center">
            <Plus className={cn("size-3.5 text-ink-500 transition-transform", expanded && "rotate-45")} />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-ink-800">{t("builder.addContext")}</div>
            <div className="text-[11px] text-ink-400">{filledLabel}</div>
          </div>
        </div>
        <ChevronDown
          className={cn("size-4 text-ink-400 transition-transform", expanded && "rotate-180")}
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
              {CONTEXT_FIELD_KEYS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-medium text-ink-600">
                    {t(field.labelKey)}
                  </label>
                  {field.type === "input" ? (
                    <Input
                      placeholder={t(field.placeholderKey)}
                      className="bg-white"
                      value={value[field.key] ?? ""}
                      onChange={(e) =>
                        onChange({ ...value, [field.key]: e.target.value })
                      }
                    />
                  ) : (
                    <Textarea
                      placeholder={t(field.placeholderKey)}
                      className="bg-white min-h-[72px]"
                      value={value[field.key] ?? ""}
                      onChange={(e) =>
                        onChange({ ...value, [field.key]: e.target.value })
                      }
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

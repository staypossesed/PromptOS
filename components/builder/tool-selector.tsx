"use client";

import { TOOLS, ToolId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "@/lib/i18n/use-translations";

// Map tool id to the dictionary key for the description
const TOOL_DESC_KEYS: Record<ToolId, keyof { claude: string; cursor: string; chatgpt: string }> = {
  claude: "claude",
  cursor: "cursor",
  chatgpt: "chatgpt",
};

interface ToolSelectorProps {
  value: ToolId;
  onChange: (value: ToolId) => void;
}

export function ToolSelector({ value, onChange }: ToolSelectorProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-ink-800">{t("toolSelector.label")}</label>
      <div className="grid grid-cols-3 gap-2.5">
        {TOOLS.map((tool) => {
          const isActive = value === tool.id;
          const descKey = TOOL_DESC_KEYS[tool.id as ToolId];
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onChange(tool.id)}
              className={cn(
                "relative group flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                isActive
                  ? "border-clay-400/70 bg-card card-soft"
                  : "border-ink-200/50 bg-white/60 hover:border-ink-300/70 hover:bg-card"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <ToolIcon id={tool.id} active={isActive} />
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn("size-2 rounded-full", TOOL_DOT[tool.id as ToolId])}
                  />
                )}
              </div>
              <div className="space-y-0.5">
                <div className={cn(
                  "text-sm font-semibold",
                  isActive ? "text-ink-900" : "text-ink-800"
                )}>
                  {tool.name}
                </div>
                <div className="text-[11px] leading-snug text-ink-400 line-clamp-2">
                  {t(`toolSelector.${descKey}`)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TOOL_DOT: Record<ToolId, string> = {
  claude:  "bg-clay-500",
  cursor:  "bg-blue-400",
  chatgpt: "bg-emerald-500",
};

function ToolIcon({ id, active }: { id: ToolId; active: boolean }) {
  const base = "size-7 rounded-lg flex items-center justify-center transition-colors";
  const stroke = active ? "#A24A22" : "#6E685D";
  const bg = active ? "bg-clay-500/12" : "bg-cream-100";

  if (id === "claude") {
    return (
      <div className={cn(base, bg)}>
        <svg viewBox="0 0 16 16" className="size-4" fill="none">
          <path d="M3 4.5C3 3.67 3.67 3 4.5 3h7c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5H8l-3 2.5V11H4.5C3.67 11 3 10.33 3 9.5v-5z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (id === "cursor") {
    return (
      <div className={cn(base, bg)}>
        <svg viewBox="0 0 16 16" className="size-4" fill="none">
          <path d="M3 2.5L13 8L8.5 9.5L7 14L3 2.5Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className={cn(base, bg)}>
      <svg viewBox="0 0 16 16" className="size-4" fill="none">
        <circle cx="8" cy="8" r="5" stroke={stroke} strokeWidth="1.5" />
        <circle cx="8" cy="8" r="1.5" fill={stroke} />
      </svg>
    </div>
  );
}

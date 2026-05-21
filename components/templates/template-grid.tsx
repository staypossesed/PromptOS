"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { TEMPLATES, TEMPLATE_CATEGORIES, type TemplateCategory } from "@/lib/templates";
import { track } from "@/lib/analytics";
import { useTranslations } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";

const TOOL_META: Record<string, { label: string; dot: string }> = {
  claude:  { label: "Claude",  dot: "bg-clay-500" },
  cursor:  { label: "Cursor",  dot: "bg-blue-400" },
  chatgpt: { label: "ChatGPT", dot: "bg-emerald-500" },
};

// Soft accent per category for the card top strip
const CATEGORY_ACCENT: Record<TemplateCategory, string> = {
  Cursor:   "bg-blue-50 border-blue-100/60",
  Claude:   "bg-clay-50 border-clay-100/60",
  ChatGPT:  "bg-emerald-50 border-emerald-100/60",
  n8n:      "bg-amber-50 border-amber-100/60",
  Airtable: "bg-indigo-50 border-indigo-100/60",
  Sales:    "bg-rose-50 border-rose-100/60",
  Content:  "bg-purple-50 border-purple-100/60",
  Research: "bg-teal-50 border-teal-100/60",
};

const CATEGORY_LABEL_COLOR: Record<TemplateCategory, string> = {
  Cursor:   "text-blue-700",
  Claude:   "text-clay-700",
  ChatGPT:  "text-emerald-700",
  n8n:      "text-amber-700",
  Airtable: "text-indigo-700",
  Sales:    "text-rose-700",
  Content:  "text-purple-700",
  Research: "text-teal-700",
};

export function TemplateGrid() {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "All">("All");
  const { t } = useTranslations();

  const filtered =
    activeCategory === "All"
      ? TEMPLATES
      : TEMPLATES.filter((tpl) => tpl.category === activeCategory);

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5 mb-8">
        <FilterChip
          label={t("templates.categoryAll")}
          active={activeCategory === "All"}
          onClick={() => setActiveCategory("All")}
        />
        {TEMPLATE_CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
          />
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template) => {
          const tool = TOOL_META[template.target_tool] ?? { label: template.target_tool, dot: "bg-ink-300" };
          const accentClass = CATEGORY_ACCENT[template.category] ?? "bg-cream-100 border-ink-100/60";
          const labelColor = CATEGORY_LABEL_COLOR[template.category] ?? "text-ink-600";

          return (
            <Link
              key={template.id}
              href={`/builder?template=${template.id}`}
              onClick={() => track("template_used", { template_id: template.id })}
              className="group rounded-2xl border border-ink-100/70 bg-card card-soft overflow-hidden hover:border-clay-300/50 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all flex flex-col"
            >
              {/* Color accent strip */}
              <div className={cn("px-4 pt-4 pb-3 border-b", accentClass)}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-[10.5px] font-bold uppercase tracking-[0.14em]", labelColor)}>
                    {template.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", tool.dot)} />
                    <span className="text-[10.5px] font-medium text-ink-500">{tool.label}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col gap-2 p-4">
                <h3 className="font-serif text-[15.5px] font-medium text-ink-900 leading-snug group-hover:text-clay-700 transition-colors">
                  {template.title}
                </h3>
                <p className="text-[12.5px] text-ink-500 leading-relaxed flex-1">
                  {template.description}
                </p>
              </div>

              {/* CTA footer */}
              <div className="px-4 pb-4 flex items-center justify-between">
                <span className="text-[12px] font-medium text-clay-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t("templates.useTemplate")}
                  <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-ink-400">{t("templates.noTemplates")}</p>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[11.5px] font-medium rounded-full px-3 py-1.5 border transition-all",
        active
          ? "bg-clay-500 text-white border-clay-500 shadow-sm"
          : "bg-white text-ink-600 border-ink-200/70 hover:border-ink-300 hover:text-ink-800"
      )}
    >
      {label}
    </button>
  );
}

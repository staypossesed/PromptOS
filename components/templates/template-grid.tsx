"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { TEMPLATES, TEMPLATE_CATEGORIES, type TemplateCategory } from "@/lib/templates";
import { track } from "@/lib/analytics";
import { useTranslations } from "@/lib/i18n/use-translations";

const TOOL_LABEL: Record<string, string> = {
  claude: "Claude",
  cursor: "Cursor",
  chatgpt: "ChatGPT",
};

const CATEGORY_COLOR: Record<TemplateCategory, string> = {
  Cursor: "bg-cream-100 text-ink-700 border-ink-200",
  Claude: "bg-clay-50 text-clay-700 border-clay-200/60",
  ChatGPT: "bg-white text-ink-600 border-ink-200",
  n8n: "bg-cream-100 text-ink-700 border-ink-200",
  Airtable: "bg-cream-200/60 text-ink-700 border-ink-200",
  Sales: "bg-clay-50 text-clay-700 border-clay-200/60",
  Content: "bg-cream-100 text-ink-700 border-ink-200",
  Research: "bg-clay-50 text-clay-700 border-clay-200/60",
};

export function TemplateGrid() {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "All">("All");
  const { t } = useTranslations();

  const filtered =
    activeCategory === "All"
      ? TEMPLATES
      : TEMPLATES.filter((tpl) => tpl.category === activeCategory);

  const categoryAll = t("templates.categoryAll");

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-7">
        <FilterChip
          label={categoryAll}
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
        {filtered.map((template) => (
          <Link
            key={template.id}
            href={`/builder?template=${template.id}`}
            onClick={() => track("template_used", { template_id: template.id })}
            className="group rounded-2xl border border-ink-100/70 bg-card card-soft p-5 flex flex-col gap-3 hover:border-clay-300/50 hover:card-soft-lg transition-all"
          >
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${CATEGORY_COLOR[template.category]}`}>
                {template.category}
              </span>
              <span className="text-[11px] font-medium text-ink-400 border border-ink-100 bg-cream-50 rounded-full px-2.5 py-0.5">
                {TOOL_LABEL[template.target_tool]}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-serif text-base font-medium text-ink-900 leading-snug mb-1.5 group-hover:text-clay-700 transition-colors">
                {template.title}
              </h3>
              <p className="text-[13px] text-ink-500 leading-relaxed">
                {template.description}
              </p>
            </div>

            {/* CTA row */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] font-medium text-clay-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {t("templates.useTemplate")}
                <ArrowRight className="size-3" />
              </span>
              <span className="text-[11px] text-ink-300 group-hover:text-ink-400 transition-colors">
                {TOOL_LABEL[template.target_tool]}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-ink-400 text-center py-12">
          {t("templates.noTemplates")}
        </p>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-all ${
        active
          ? "bg-clay-500 text-white border-clay-500"
          : "bg-white text-ink-600 border-ink-200 hover:border-ink-300 hover:text-ink-800"
      }`}
    >
      {label}
    </button>
  );
}

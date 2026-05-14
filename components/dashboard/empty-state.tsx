import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="relative rounded-3xl border border-ink-100/70 bg-card card-soft overflow-hidden">
      {/* Decorative dot grid */}
      <div className="absolute inset-0 bg-dotgrid opacity-40 pointer-events-none" />
      {/* Soft clay glow */}
      <div className="absolute -top-32 -right-32 size-64 rounded-full bg-clay-200/40 blur-3xl pointer-events-none" />

      <div className="relative p-10 md:p-14 text-center max-w-md mx-auto">
        <div className="size-12 rounded-2xl bg-clay-500/10 mx-auto mb-5 flex items-center justify-center">
          <Sparkles className="size-5 text-clay-600" />
        </div>
        <h3 className="font-serif text-2xl font-medium text-ink-900 mb-2">
          No prompts yet
        </h3>
        <p className="text-sm text-ink-500 leading-relaxed mb-6 text-pretty">
          Describe what you want, pick your tool, and Umprompt turns it into an execution-ready prompt — scored across 6 dimensions.
        </p>
        <Button asChild size="lg">
          <Link href="/builder">
            <Plus className="size-4" />
            Create your first prompt
          </Link>
        </Button>
      </div>
    </div>
  );
}

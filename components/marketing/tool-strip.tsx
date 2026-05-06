const TOOLS = [
  "Cursor",
  "Claude",
  "ChatGPT",
  "Midjourney",
  "Veo",
  "n8n",
  "Airtable",
  "Supabase",
];

export function ToolStrip() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">
        Tuned for the tools you actually use
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {TOOLS.map((tool, i) => (
          <span
            key={tool}
            className="font-serif text-lg md:text-xl text-ink-400 tracking-tight"
          >
            {tool}
            {i < TOOLS.length - 1 && (
              <span className="hidden md:inline mx-3 text-ink-200">·</span>
            )}
          </span>
        ))}
      </div>
      <div className="text-[11px] text-ink-300">
        Launching with Cursor, Claude, ChatGPT — more soon.
      </div>
    </div>
  );
}

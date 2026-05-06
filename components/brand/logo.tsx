import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="PromptOS"
        >
          {/* Warm clay rounded-square base */}
          <rect width="28" height="28" rx="8" fill="#BD5D2E" />
          {/* Inner highlight */}
          <rect
            x="0.5"
            y="0.5"
            width="27"
            height="27"
            rx="7.5"
            stroke="white"
            strokeOpacity="0.18"
          />
          {/* Bracket-prompt glyph: > with a stacked bar — represents "prompt + structure" */}
          <path
            d="M9 9.5L13 14L9 18.5"
            stroke="#FBF1EC"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 18.5H20"
            stroke="#FBF1EC"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <span className="font-serif text-lg font-medium tracking-tight text-ink-900">
          Prompt<span className="text-clay-600">OS</span>
        </span>
      )}
    </div>
  );
}

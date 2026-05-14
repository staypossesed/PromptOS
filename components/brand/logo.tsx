import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative shrink-0">
        <svg
          width="30"
          height="30"
          viewBox="0 0 30 30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Umprompt"
        >
          <defs>
            <linearGradient id="logo-bg" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#CC7849" />
              <stop offset="100%" stopColor="#A84E26" />
            </linearGradient>
          </defs>
          {/* Base with subtle gradient */}
          <rect width="30" height="30" rx="8" fill="url(#logo-bg)" />
          {/* Top-edge highlight for depth */}
          <rect x="1" y="1" width="28" height="13" rx="7" fill="white" fillOpacity="0.1" />
          {/* Inner border */}
          <rect x="0.5" y="0.5" width="29" height="29" rx="7.5" stroke="white" strokeOpacity="0.16" />
          {/* Chevron prompt cursor */}
          <path
            d="M8.5 10L13.5 15L8.5 20"
            stroke="#FBF1EC"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Cursor underscore */}
          <rect x="16" y="18.5" width="5.5" height="2" rx="1" fill="#FBF1EC" fillOpacity="0.88" />
        </svg>
      </div>
      {showWordmark && (
        <span className="font-serif text-[17px] font-medium tracking-tight text-ink-900 leading-none">
          <span className="text-clay-600">Um</span>prompt
        </span>
      )}
    </div>
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}

export function Logo({ className, showWordmark = true, size = 32 }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/brand/umprompt-icon.png"
        alt="Umprompt"
        width={size}
        height={size}
        className="rounded-full shrink-0"
        priority
      />
      {showWordmark && (
        <span className="font-serif text-[17px] font-medium tracking-tight text-ink-900 leading-none">
          <span className="text-clay-600">Um</span>prompt
        </span>
      )}
    </div>
  );
}

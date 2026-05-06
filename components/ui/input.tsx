import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-full border border-ink-200/60 bg-white px-4 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-300 focus-visible:border-clay-400/60 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

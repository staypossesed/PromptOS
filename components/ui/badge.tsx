import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-clay-500/10 text-clay-700",
        secondary: "border-ink-200/60 bg-cream-100 text-ink-700",
        outline: "border-ink-200 text-ink-700",
        soft: "border-transparent bg-cream-200/60 text-ink-600",
        success: "border-sage-200 bg-sage-50 text-sage-700",
        warning: "border-[#D9952F]/30 bg-[#D9952F]/10 text-[#7A520E]",
        info: "border-blue-200 bg-blue-50 text-blue-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

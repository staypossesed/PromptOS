import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "ink" | "accent" | "ghost" | "light";
type Size = "md" | "sm";

function classes(variant: Variant = "ink", size: Size = "md", full = false, className?: string) {
  return cn(
    "button",
    variant === "accent" && "button--accent",
    variant === "ghost" && "button--ghost",
    variant === "light" && "button--light",
    size === "sm" && "button--small",
    full && "button--full",
    className
  );
}

export function Button({
  variant = "ink",
  size = "md",
  full = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}) {
  return (
    <button className={classes(variant, size, full, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "ink",
  size = "md",
  full = false,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={classes(variant, size, full, className)}>
      {children}
    </Link>
  );
}

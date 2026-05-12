import type { HTMLAttributes } from "react";

type Padding = "none" | "sm" | "md" | "lg" | "xl";
type Variant = "default" | "elevated" | "tinted" | "ghost";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  variant?: Variant;
  interactive?: boolean;
}

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
};

const variants: Record<Variant, string> = {
  default:
    "border border-hairline bg-surface-1 shadow-[var(--shadow-sm)]",
  elevated:
    "border border-hairline bg-surface-1 shadow-[var(--shadow-lg)]",
  tinted:
    "surface-tinted shadow-[var(--shadow-sm)]",
  ghost: "border border-hairline bg-transparent",
};

export function Card({
  padding = "md",
  variant = "default",
  interactive,
  className = "",
  children,
  ...props
}: CardProps) {
  const interactiveCls = interactive
    ? "transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-slate-300 dark:hover:border-slate-600"
    : "";

  return (
    <div
      className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${interactiveCls} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

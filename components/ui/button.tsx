import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[background,box-shadow,transform,color,border-color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:pointer-events-none disabled:opacity-40 select-none press will-change-transform";

const variants: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-slate-50 shadow-[var(--shadow-sm)] hover:bg-slate-800 hover:shadow-[var(--shadow-md)] active:bg-slate-950 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-white",
  accent:
    "bg-primary-600 text-white shadow-[var(--shadow-glow-primary)] hover:bg-primary-500 active:bg-primary-700",
  secondary:
    "bg-surface-2 text-foreground border border-hairline hover:bg-surface-3 hover:border-slate-400 dark:hover:border-slate-600",
  outline:
    "border border-hairline text-foreground hover:bg-surface-2 hover:border-slate-400 dark:hover:border-slate-600",
  ghost:
    "text-slate-600 hover:bg-surface-2 hover:text-foreground dark:text-slate-400 dark:hover:bg-surface-2",
  danger:
    "bg-danger-500 text-white shadow-[var(--shadow-sm)] hover:bg-danger-600",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] min-w-[44px]",
  md: "h-10 px-4 text-sm min-w-[44px]",
  lg: "h-12 px-6 text-[15px] min-w-[44px]",
  xl: "h-14 px-8 text-base min-w-[44px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

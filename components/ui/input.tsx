import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-foreground/90"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          className={`h-11 w-full rounded-xl border bg-surface-1 px-3.5 text-sm text-foreground transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary-500 dark:placeholder:text-slate-500 ${
            error
              ? "border-danger-500 focus-visible:outline-danger-500"
              : "border-hairline hover:border-slate-300 dark:hover:border-slate-600 focus-visible:border-primary-500"
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-[12px] leading-relaxed text-slate-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-[12px] text-danger-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

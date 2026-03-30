import { type InputHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAdornment, rightAdornment, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {leftAdornment && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {leftAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full bg-void-800/60 border border-border",
              "hover:border-border-bright focus:border-oracle-700 focus:bg-void-800",
              "rounded-xl py-2.5 text-sm text-text-primary placeholder:text-text-ghost",
              "outline-none transition-all duration-200",
              leftAdornment ? "pl-10 pr-4" : "px-4",
              rightAdornment ? "pr-10" : "",
              error && "border-hazard-600 focus:border-hazard-500",
              className
            )}
            {...props}
          />
          {rightAdornment && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              {rightAdornment}
            </div>
          )}
        </div>
        {error && <p className="text-hazard-400 text-xs">{error}</p>}
        {hint && !error && <p className="text-text-ghost text-xs">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

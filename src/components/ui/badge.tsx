import { type HTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

type BadgeVariant = "default" | "oracle" | "nebula" | "signal" | "hazard" | "outline";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-void-700/80 text-text-secondary border border-border",
  oracle: "bg-oracle-900/60 text-oracle-400 border border-oracle-800/50",
  nebula: "bg-nebula-900/60 text-nebula-300 border border-nebula-800/50",
  signal: "bg-signal-700/30 text-signal-400 border border-signal-700/40",
  hazard: "bg-hazard-700/30 text-hazard-400 border border-hazard-700/40",
  outline: "border border-border-bright text-text-secondary bg-transparent",
};

export function Badge({ variant = "default", dot, children, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            variant === "oracle" && "bg-oracle-500",
            variant === "signal" && "bg-signal-500",
            variant === "hazard" && "bg-hazard-500",
            variant === "nebula" && "bg-nebula-400",
            variant === "default" && "bg-text-muted",
          )}
        />
      )}
      {children}
    </span>
  );
}

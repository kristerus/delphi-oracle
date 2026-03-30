"use client";

import { motion } from "framer-motion";

interface CertaintyIndicatorProps {
  certainty: number;         // 0–1
  size?: number;             // px diameter
  showLabel?: boolean;
  className?: string;
}

/**
 * Renders a ring whose stroke style reflects certainty.
 *
 * High certainty  (≥0.65): solid ring, vivid oracle-gold
 * Medium certainty (0.35–0.65): semi-dashed, nebula-purple
 * Low certainty   (<0.35): heavily dashed / fading, muted
 */
export default function CertaintyIndicator({
  certainty,
  size = 36,
  showLabel = false,
  className = "",
}: CertaintyIndicatorProps) {
  const clamped = Math.max(0, Math.min(1, certainty));
  const strokeWidth = size < 28 ? 2.5 : 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillArc = clamped * circumference;

  // Visual state
  const isHigh = clamped >= 0.65;
  const isMid = clamped >= 0.35 && clamped < 0.65;

  const ringColor = isHigh
    ? "oklch(72% 0.175 76)"        // oracle-gold
    : isMid
    ? "oklch(58% 0.130 278)"        // nebula-500
    : "oklch(42% 0.080 265)";       // muted void

  // Dash pattern: solid → regularly dashed → sparse dots
  const dashArray = isHigh
    ? `${fillArc} ${circumference}`
    : isMid
    ? `${fillArc * 0.7} ${circumference * 0.07} ${fillArc * 0.3} ${circumference}`
    : `${circumference * 0.12} ${circumference * 0.10}`;

  const pct = Math.round(clamped * 100);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title={`Certainty: ${pct}%`}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(18% 0.045 268)"
          strokeWidth={strokeWidth}
        />
        {/* Certainty arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap={isHigh ? "round" : "butt"}
          strokeDasharray={dashArray}
          strokeDashoffset={0}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHigh ? 1 : isMid ? 0.75 : 0.45 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        />
      </svg>

      {showLabel && (
        <span
          className="relative text-[9px] font-bold font-mono leading-none"
          style={{ color: ringColor }}
        >
          {pct}
        </span>
      )}

      {/* Fuzzy glow for uncertain predictions */}
      {!isHigh && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${ringColor.replace(")", " / 0.08)")} 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}

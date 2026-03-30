"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import type { FutureNodeData } from "@/lib/ai/types";
import ExtendButton from "./ExtendButton";

/* ─── Probability ring ──────────────────────────────────────────────────────── */

function ProbabilityRing({ probability }: { probability: number }) {
  const size = 52;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - probability * circumference;

  const color =
    probability >= 0.5
      ? "oklch(72% 0.175 76)"
      : probability >= 0.25
      ? "oklch(68% 0.115 276)"
      : "oklch(55% 0.160 22)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(22% 0.045 268)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        />
      </svg>
      <span className="relative text-xs font-bold font-mono" style={{ color }}>
        {Math.round(probability * 100)}%
      </span>
    </div>
  );
}

/* ─── FutureNode ────────────────────────────────────────────────────────────── */

const FutureNode = memo(function FutureNode({
  data,
  selected,
  id,
}: NodeProps<FutureNodeData>) {
  const isRoot = data.isRoot ?? false;
  const probability = data.probability ?? 0;

  const borderColor =
    selected
      ? "border-oracle-500/70"
      : isRoot
      ? "border-nebula-700/60"
      : probability >= 0.5
      ? "border-oracle-800/50"
      : probability >= 0.25
      ? "border-nebula-800/50"
      : "border-hazard-700/40";

  const bgGlow = selected
    ? "shadow-[0_0_0_1px_oklch(72%_0.175_76_/_0.3),0_8px_32px_oklch(0%_0_0_/_0.4)]"
    : "shadow-[0_4px_24px_oklch(0%_0_0_/_0.35)]";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`
        relative w-[260px] rounded-2xl border
        bg-void-800/70 backdrop-blur-xl
        transition-all duration-200 cursor-pointer
        ${borderColor} ${bgGlow}
        ${selected ? "bg-oracle-950/60" : "hover:bg-void-700/70"}
      `}
      style={{ zIndex: selected ? 10 : 1 }}
    >
      {/* Connection handles */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-void-600 !border-2 !border-border !rounded-full !left-[-5px]"
        />
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-void-600 !border-2 !border-border !rounded-full !right-[-5px]"
      />

      {/* Root badge */}
      {isRoot && (
        <div className="absolute -top-3 left-4 flex items-center gap-1.5 bg-nebula-900 border border-nebula-700/60 px-2.5 py-0.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-nebula-400 animate-pulse" />
          <span className="text-xs font-medium text-nebula-300">Decision</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <ProbabilityRing probability={probability} />
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
              {data.title}
            </h3>
            {data.timeframe && (
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3 text-text-ghost" />
                <span className="text-xs text-text-ghost">{data.timeframe}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 mb-3">
          {data.description}
        </p>

        {/* Pros/Cons mini preview */}
        {data.details && (data.details.pros || data.details.cons) && (
          <div className="flex gap-3 mb-3">
            {data.details.pros && data.details.pros.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-signal-400">
                <TrendingUp className="w-3 h-3" />
                <span>{data.details.pros.length} upsides</span>
              </div>
            )}
            {data.details.cons && data.details.cons.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-hazard-400">
                <TrendingDown className="w-3 h-3" />
                <span>{data.details.cons.length} risks</span>
              </div>
            )}
          </div>
        )}

        {/* Depth indicator */}
        {data.depth > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: Math.min(data.depth, 4) }).map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full flex-1"
                style={{
                  background: `oklch(${55 + i * 8}% 0.130 280 / ${0.6 - i * 0.1})`,
                }}
              />
            ))}
          </div>
        )}

        {/* Extend button */}
        {!isRoot && <ExtendButton nodeId={id} />}
      </div>
    </motion.div>
  );
});

export default FutureNode;

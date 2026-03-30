"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import CertaintyIndicator from "./CertaintyIndicator";
import type { FutureNodeData } from "@/lib/ai/types";

/* ─── Branch color palette (by lane index) ─────────────────────────────────── */
const LANE_COLORS = [
  { border: "border-oracle-700/60",  bg: "bg-oracle-950/40",  text: "text-oracle-400",  glow: "shadow-[0_0_12px_oklch(72%_0.175_76_/_0.15)]" },
  { border: "border-nebula-700/60",  bg: "bg-nebula-950/40",  text: "text-nebula-400",  glow: "shadow-[0_0_12px_oklch(55%_0.130_280_/_0.15)]" },
  { border: "border-signal-600/50",  bg: "bg-void-900/60",    text: "text-signal-400",  glow: "shadow-[0_0_12px_oklch(56%_0.130_185_/_0.15)]" },
  { border: "border-hazard-600/50",  bg: "bg-void-900/60",    text: "text-hazard-400",  glow: "" },
  { border: "border-border",         bg: "bg-void-800/60",    text: "text-text-muted",  glow: "" },
];

function laneStyle(idx: number) {
  return LANE_COLORS[idx % LANE_COLORS.length];
}

interface TimelineNodeProps {
  node: {
    id: string;
    title: string;
    description: string;
    probability: number;
    certainty: number;
    timeframe?: string | null;
    timeframeStart?: string | null;
    timeframeEnd?: string | null;
    depth: number;
    details?: FutureNodeData["details"];
  };
  laneIndex: number;
  widthPx: number;           // calculated from duration
  onExtend?: (nodeId: string) => void;
  selected?: boolean;
  onClick?: () => void;
}

export default function TimelineNode({
  node,
  laneIndex,
  widthPx,
  onExtend,
  selected,
  onClick,
}: TimelineNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = laneStyle(laneIndex);
  const minWidth = 140;
  const w = Math.max(minWidth, widthPx);

  // Certainty-driven opacity: fuzzy future = more transparent
  const opacity = 0.3 + node.certainty * 0.7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity, y: 0 }}
      whileHover={{ opacity: 1, y: -2 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: w }}
      className={`
        relative rounded-xl border cursor-pointer
        backdrop-blur-xl transition-all duration-200
        ${colors.border} ${colors.bg} ${colors.glow}
        ${selected ? "ring-1 ring-oracle-500/60" : ""}
      `}
      onClick={onClick}
    >
      {/* Depth stripe on left edge */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-60"
        style={{
          background: `oklch(${40 + node.depth * 12}% 0.130 280)`,
        }}
      />

      <div className="pl-3 pr-2 py-2">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <CertaintyIndicator certainty={node.certainty} size={28} showLabel />

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-primary leading-snug truncate">
              {node.title}
            </p>
            <p className={`text-[10px] font-mono mt-0.5 ${colors.text}`}>
              {Math.round(node.probability * 100)}% prob · {node.timeframe ?? "?"}
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="shrink-0 text-text-ghost hover:text-text-muted transition-colors p-0.5"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-[10px] text-text-secondary leading-relaxed mt-2 line-clamp-3">
                {node.description}
              </p>

              {node.details?.keyEvents && node.details.keyEvents.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {node.details.keyEvents.slice(0, 3).map((ev, i) => (
                    <div key={i} className="flex items-start gap-1 text-[10px] text-text-ghost">
                      <span className={`${colors.text} mt-0.5 shrink-0`}>→</span>
                      {ev}
                    </div>
                  ))}
                </div>
              )}

              {onExtend && (
                <button
                  onClick={(e) => { e.stopPropagation(); onExtend(node.id); }}
                  className={`
                    mt-2 w-full flex items-center justify-center gap-1
                    py-1 rounded-lg text-[10px] font-medium border
                    ${colors.border} ${colors.bg} ${colors.text}
                    hover:brightness-125 transition-all duration-150
                  `}
                >
                  <GitBranch className="w-2.5 h-2.5" />
                  Extend
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Certainty fade overlay on right edge — more fade = more uncertain */}
      <div
        className="absolute inset-y-0 right-0 w-6 rounded-r-xl pointer-events-none"
        style={{
          background: `linear-gradient(to right, transparent, oklch(8% 0.030 270 / ${(1 - node.certainty) * 0.6}))`,
        }}
      />
    </motion.div>
  );
}

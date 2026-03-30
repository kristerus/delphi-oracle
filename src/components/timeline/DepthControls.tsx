"use client";

import { useState } from "react";
import { GitBranch, Layers, Loader2, SlidersHorizontal } from "lucide-react";
import type { Granularity } from "@/lib/ai/types";

interface DepthControlsProps {
  onExtendAll?: (depth: number, granularity: Granularity) => Promise<void>;
  onCertaintyFilter?: (threshold: number) => void;
  certaintyThreshold?: number;
  disabled?: boolean;
  className?: string;
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string; sublabel: string }[] = [
  { value: "month", label: "Month", sublabel: "0–2 yr" },
  { value: "year",  label: "Year",  sublabel: "2–10 yr" },
  { value: "decade",label: "Decade",sublabel: "10–50 yr" },
];

export default function DepthControls({
  onExtendAll,
  onCertaintyFilter,
  certaintyThreshold = 0,
  disabled = false,
  className = "",
}: DepthControlsProps) {
  const [depth, setDepth] = useState(1);
  const [granularity, setGranularity] = useState<Granularity>("year");
  const [autoExtend, setAutoExtend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localThreshold, setLocalThreshold] = useState(certaintyThreshold);

  const handleExtendAll = async () => {
    if (!onExtendAll || loading || disabled) return;
    setLoading(true);
    try {
      await onExtendAll(autoExtend ? depth : 1, granularity);
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = (v: number) => {
    setLocalThreshold(v);
    onCertaintyFilter?.(v);
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-3 py-2 glass rounded-xl border border-border ${className}`}
    >
      {/* Granularity selector */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-wider text-text-ghost font-semibold mr-1">
          Scale
        </span>
        {GRANULARITY_OPTIONS.map((g) => (
          <button
            key={g.value}
            onClick={() => setGranularity(g.value)}
            disabled={disabled}
            className={`
              flex flex-col items-center px-2.5 py-1 rounded-lg text-[10px] font-medium
              border transition-all duration-150
              ${granularity === g.value
                ? "bg-oracle-500/15 border-oracle-700/60 text-oracle-400"
                : "border-border hover:border-border-bright text-text-ghost hover:text-text-muted bg-transparent"
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            <span>{g.label}</span>
            <span className="text-[8px] opacity-60">{g.sublabel}</span>
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-border-subtle" />

      {/* Depth slider */}
      <div className="flex items-center gap-2">
        <Layers className="w-3 h-3 text-text-ghost shrink-0" />
        <span className="text-[10px] text-text-ghost">Levels</span>
        <input
          type="range"
          min={1}
          max={5}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          disabled={disabled || !autoExtend}
          className="w-20 accent-oracle-500 disabled:opacity-40 cursor-pointer"
        />
        <span className="text-[10px] font-mono text-text-muted w-3">{depth}</span>
      </div>

      {/* Auto-extend toggle */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <div
          onClick={() => setAutoExtend((v) => !v)}
          className={`
            relative w-7 h-4 rounded-full border transition-all duration-200
            ${autoExtend
              ? "bg-oracle-500/30 border-oracle-700/60"
              : "bg-void-700/50 border-border"
            }
          `}
        >
          <div
            className={`
              absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200
              ${autoExtend ? "left-3.5 bg-oracle-400" : "left-0.5 bg-void-500"}
            `}
          />
        </div>
        <span className="text-[10px] text-text-ghost">Auto</span>
      </label>

      <div className="w-px h-6 bg-border-subtle" />

      {/* Certainty threshold */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-3 h-3 text-text-ghost shrink-0" />
        <span className="text-[10px] text-text-ghost">Min certainty</span>
        <input
          type="range"
          min={0}
          max={80}
          step={5}
          value={Math.round(localThreshold * 100)}
          onChange={(e) => handleThresholdChange(Number(e.target.value) / 100)}
          className="w-16 accent-nebula-500 cursor-pointer"
        />
        <span className="text-[10px] font-mono text-text-muted w-6">
          {Math.round(localThreshold * 100)}%
        </span>
      </div>

      <div className="w-px h-6 bg-border-subtle" />

      {/* Extend All Leaves button */}
      <button
        onClick={handleExtendAll}
        disabled={disabled || loading || !onExtendAll}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          border transition-all duration-150
          ${loading
            ? "border-border text-text-ghost cursor-not-allowed"
            : "border-oracle-800/40 hover:border-oracle-700/60 bg-oracle-900/20 hover:bg-oracle-900/40 text-oracle-400 hover:text-oracle-300"
          }
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <GitBranch className="w-3 h-3" />
        )}
        {loading ? "Extending…" : autoExtend ? `Extend All (×${depth})` : "Extend All Leaves"}
      </button>
    </div>
  );
}

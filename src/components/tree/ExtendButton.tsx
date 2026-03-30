"use client";

import { useState, useRef } from "react";
import { Plus, Loader2, ChevronDown, Layers } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Granularity } from "@/lib/ai/types";

interface ExtendButtonProps {
  nodeId: string;
  nodeDepth?: number;
  onExtend?: (nodeId: string, depth?: number, granularity?: Granularity) => Promise<void>;
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  month: "Months (near-term)",
  year: "Years (mid-term)",
  decade: "Decades (long-term)",
};

export default function ExtendButton({ nodeId, nodeDepth = 1, onExtend }: ExtendButtonProps) {
  const [loading, setLoading] = useState(false);
  const [extended, setExtended] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Default granularity based on current depth
  const defaultGranularity: Granularity =
    nodeDepth <= 2 ? "month" : nodeDepth <= 4 ? "year" : "decade";

  const doExtend = async (depth: number, granularity: Granularity) => {
    if (loading || extended) return;
    setMenuOpen(false);
    setLoading(true);
    try {
      if (onExtend) {
        await onExtend(nodeId, depth, granularity);
      } else {
        await new Promise((r) => setTimeout(r, 1500));
      }
      setExtended(true);
    } finally {
      setLoading(false);
    }
  };

  if (extended) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Main button row */}
      <div className="flex gap-px">
        {/* Primary extend (single level, auto granularity) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            doExtend(1, defaultGranularity);
          }}
          disabled={loading}
          className={`
            flex-1 flex items-center justify-center gap-1.5
            py-2 rounded-l-xl text-xs font-medium
            border-r-0 border transition-all duration-200
            ${loading
              ? "border-border bg-void-800/30 text-text-ghost cursor-not-allowed"
              : "border-oracle-800/40 hover:border-oracle-700/70 bg-oracle-900/20 hover:bg-oracle-900/40 text-oracle-500 hover:text-oracle-400"
            }
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Simulating…
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              Extend branch
            </>
          )}
        </button>

        {/* Dropdown toggle */}
        {!loading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex items-center justify-center w-7 rounded-r-xl text-xs border border-l border-oracle-800/40 hover:border-oracle-700/70 bg-oracle-900/20 hover:bg-oracle-900/40 text-oracle-600 hover:text-oracle-400 transition-all duration-200"
          >
            <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Depth dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 3, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full mb-2 left-0 right-0 z-50 glass-card rounded-xl p-2 min-w-[180px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[9px] uppercase tracking-wider text-text-ghost font-semibold px-2 mb-1.5">
                Extend options
              </p>

              {/* Single extends by granularity */}
              {(["month", "year", "decade"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => doExtend(1, g)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-void-700/40 transition-all duration-100"
                >
                  <Plus className="w-3 h-3 shrink-0 text-oracle-500" />
                  {GRANULARITY_LABELS[g]}
                </button>
              ))}

              <div className="my-1.5 border-t border-border-subtle" />

              {/* Deep extend options */}
              {[2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => doExtend(d, defaultGranularity)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-void-700/40 transition-all duration-100"
                >
                  <Layers className="w-3 h-3 shrink-0 text-nebula-400" />
                  Deep Extend ×{d}{" "}
                  <span className="text-text-ghost ml-auto">
                    Level {nodeDepth + 1}–{nodeDepth + d}
                  </span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

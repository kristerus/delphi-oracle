"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, GitBranch, Sparkles, GitMerge, Network } from "lucide-react";
import TimelineView, { type TimelineNodeData } from "@/components/timeline/TimelineView";
import DepthControls from "@/components/timeline/DepthControls";
import { DEMO_SIMULATION } from "@/lib/ai/types";
import { estimateTimeframe, getGranularityForDepth } from "@/lib/ai/deep-extend";
import type { Granularity } from "@/lib/ai/types";

/* ─── Convert demo simulation nodes to timeline format ───────────────────────── */

function demoToTimelineNodes(): TimelineNodeData[] {
  return DEMO_SIMULATION.nodes.map((n) => {
    const granularity = getGranularityForDepth(n.data.depth);
    const tf = estimateTimeframe(n.data.timeframe ?? "", n.data.depth, granularity);
    return {
      id: n.id,
      parentId: DEMO_SIMULATION.edges.find((e) => e.target === n.id)?.source ?? null,
      title: n.data.title,
      description: n.data.description,
      probability: n.data.probability,
      certainty: n.data.certainty ?? (1 - n.data.depth * 0.15),
      timeframe: n.data.timeframe,
      timeframeStart: n.data.timeframeStart ?? tf.start,
      timeframeEnd: n.data.timeframeEnd ?? tf.end,
      granularity,
      depth: n.data.depth,
      details: n.data.details,
    };
  });
}

/* ─── Build lane info from demo data ─────────────────────────────────────────── */

function buildDemoLanes() {
  const root = DEMO_SIMULATION.nodes.find((n) => n.data.isRoot);
  const topBranches = DEMO_SIMULATION.nodes.filter(
    (n) => DEMO_SIMULATION.edges.find((e) => e.target === n.id)?.source === root?.id
  );
  return topBranches.map((b, i) => ({
    branchId: b.id,
    laneIndex: i,
    title: b.data.title,
  }));
}

function buildDemoLaneMap() {
  const root = DEMO_SIMULATION.nodes.find((n) => n.data.isRoot);
  const topBranches = DEMO_SIMULATION.nodes.filter(
    (n) => DEMO_SIMULATION.edges.find((e) => e.target === n.id)?.source === root?.id
  );
  const parentMap: Record<string, string | null> = {};
  for (const n of DEMO_SIMULATION.nodes) {
    parentMap[n.id] = DEMO_SIMULATION.edges.find((e) => e.target === n.id)?.source ?? null;
  }

  function getLane(nodeId: string): number {
    const idx = topBranches.findIndex((b) => b.id === nodeId);
    if (idx !== -1) return idx;
    const parent = parentMap[nodeId];
    if (!parent) return 0;
    return getLane(parent);
  }

  const map: Record<string, number> = {};
  for (const n of DEMO_SIMULATION.nodes) {
    map[n.id] = getLane(n.id);
  }
  return map;
}

/* ─── Tab switcher ───────────────────────────────────────────────────────────── */

function ViewTabs({ id }: { id: string }) {
  return (
    <div className="flex items-center gap-1 glass rounded-xl p-1 border border-border">
      {[
        { label: "Tree", icon: GitBranch, href: `/simulation/${id}` },
        { label: "Timeline", icon: GitMerge, href: `/simulation/${id}/timeline`, active: true },
        { label: "Butterfly", icon: Network, href: `/simulation/${id}`, disabled: true },
      ].map((tab) => (
        tab.disabled ? (
          <span
            key={tab.label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-ghost cursor-not-allowed opacity-40"
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.label}
            href={tab.href}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-150
              ${tab.active
                ? "bg-oracle-500/15 text-oracle-400 border border-oracle-800/40"
                : "text-text-muted hover:text-text-secondary"
              }
            `}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        )
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const simTitle = id.startsWith("demo-") ? "Change career to AI/ML" : `Simulation ${id}`;

  const [nodes, setNodes] = useState<TimelineNodeData[]>(demoToTimelineNodes);
  const [certaintyThreshold, setCertaintyThreshold] = useState(0);

  const lanes = buildDemoLanes();
  const laneMap = buildDemoLaneMap();

  const handleExtend = useCallback((nodeId: string) => {
    // In production: call /api/oracle/deep-extend
    console.log("[Delphi Timeline] Extend node:", nodeId);
  }, []);

  const handleExtendAll = useCallback(
    async (depth: number, granularity: Granularity) => {
      // In production: call /api/oracle/deep-extend for each leaf node
      console.log("[Delphi Timeline] Extend all leaves:", { depth, granularity });
      await new Promise((r) => setTimeout(r, 800));
    },
    []
  );

  return (
    <div className="h-screen bg-void-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border-subtle bg-void-950/90 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary text-sm font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div className="w-px h-4 bg-border-subtle" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-void-950" strokeWidth={2.5} />
            </div>
            <h1 className="text-sm font-semibold text-text-primary truncate">{simTitle}</h1>
          </div>

          <div className="flex-1" />

          <ViewTabs id={id} />
        </div>
      </header>

      {/* Depth controls bar */}
      <div className="shrink-0 px-4 py-2 border-b border-border-subtle bg-void-900/40 backdrop-blur-sm">
        <DepthControls
          onExtendAll={handleExtendAll}
          onCertaintyFilter={setCertaintyThreshold}
          certaintyThreshold={certaintyThreshold}
        />
      </div>

      {/* Timeline canvas */}
      <main className="flex-1 overflow-hidden p-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="h-full"
        >
          <TimelineView
            nodes={nodes}
            lanes={lanes}
            laneMap={laneMap}
            certaintyThreshold={certaintyThreshold}
            onExtend={handleExtend}
            className="h-full"
          />
        </motion.div>
      </main>
    </div>
  );
}

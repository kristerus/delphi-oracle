"use client";

import { use, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  GitBranch,
  GitMerge,
  Network,
  Key,
  Loader2,
  AlertCircle,
} from "lucide-react";
import TimelineView, { type TimelineNodeData } from "@/components/timeline/TimelineView";
import DepthControls from "@/components/timeline/DepthControls";
import { DEMO_SIMULATION } from "@/lib/ai/types";
import { estimateTimeframe, getGranularityForDepth } from "@/lib/ai/deep-extend";
import type { Granularity } from "@/lib/ai/types";

const SESSION_KEY_KEY = "delphi_api_key";
const SESSION_PROVIDER_KEY = "delphi_api_provider";

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

/* ─── Convert API deep-extend response nodes to TimelineNodeData ─────────────── */

function flowNodesToTimeline(
  flowNodes: Array<{ id: string; data: Record<string, unknown> }>,
  flowEdges: Array<{ source: string; target: string }>
): TimelineNodeData[] {
  return flowNodes.map((n) => {
    const parentEdge = flowEdges.find((e) => e.target === n.id);
    const depth = (n.data.depth as number) ?? 1;
    const granularity =
      (n.data.granularity as Granularity | undefined) ?? getGranularityForDepth(depth);
    return {
      id: n.id,
      parentId: parentEdge?.source ?? null,
      title: n.data.title as string,
      description: n.data.description as string,
      probability: n.data.probability as number,
      certainty: (n.data.certainty as number) ?? 1,
      timeframe: (n.data.timeframe as string | null) ?? null,
      timeframeStart: (n.data.timeframeStart as string | null) ?? null,
      timeframeEnd: (n.data.timeframeEnd as string | null) ?? null,
      granularity,
      depth,
      details: n.data.details as TimelineNodeData["details"],
    };
  });
}

/* ─── Tab switcher ───────────────────────────────────────────────────────────── */

function ViewTabs({ id }: { id: string }) {
  return (
    <div className="flex items-center gap-1 glass rounded-xl p-1 border border-border">
      {[
        { label: "Tree", icon: GitBranch, href: `/simulation/${id}` },
        { label: "Timeline", icon: GitMerge, href: `/simulation/${id}/timeline`, active: true },
        { label: "Butterfly", icon: Network, href: `/simulation/${id}`, disabled: true },
      ].map((tab) =>
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
              ${
                tab.active
                  ? "bg-oracle-500/15 text-oracle-400 border border-oracle-800/40"
                  : "text-text-muted hover:text-text-secondary"
              }
            `}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        )
      )}
    </div>
  );
}

/* ─── API key popover ─────────────────────────────────────────────────────────── */

function ApiKeyPopover({
  apiKey,
  provider,
  onSave,
}: {
  apiKey: string;
  provider: string;
  onSave: (key: string, provider: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(apiKey);
  const [draftProv, setDraftProv] = useState(provider);
  const hasKey = !!apiKey;

  const save = () => {
    onSave(draftKey.trim(), draftProv);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setDraftKey(apiKey);
          setDraftProv(provider);
          setOpen((v) => !v);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
          hasKey
            ? "glass border-signal-700/50 text-signal-400"
            : "glass border-hazard-700/50 text-hazard-400 animate-pulse"
        }`}
      >
        <Key className="w-3.5 h-3.5" />
        {hasKey ? `${draftProv} key set` : "Add API key"}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 glass-card rounded-xl p-4 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                AI provider key
              </p>
              <div className="flex gap-2 mb-3">
                <select
                  value={draftProv}
                  onChange={(e) => setDraftProv(e.target.value)}
                  className="bg-void-800/60 border border-border rounded-lg px-2.5 py-2 text-xs text-text-primary outline-none focus:border-oracle-700"
                >
                  <option value="claude">Claude</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">Custom</option>
                </select>
                <input
                  type="password"
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  placeholder="sk-ant-api03-…"
                  className="flex-1 bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-ghost outline-none transition-all font-mono"
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
              </div>
              <button
                onClick={save}
                disabled={!draftKey.trim()}
                className="w-full py-2 rounded-lg text-xs font-medium bg-oracle-500/15 hover:bg-oracle-500/25 border border-oracle-800/40 text-oracle-400 transition-all disabled:opacity-40"
              >
                Save for this session
              </button>
              <p className="text-[10px] text-text-ghost mt-2 text-center">
                Cleared when you close the tab. Save permanently in{" "}
                <Link href="/profile" className="text-oracle-500 hover:underline">
                  Profile → AI Keys
                </Link>
                .
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isDemo = id.startsWith("demo-");

  // ── Data state ──
  const [nodes, setNodes] = useState<TimelineNodeData[]>([]);
  const [lanes, setLanes] = useState<{ branchId: string; laneIndex: number; title: string }[]>([]);
  const [laneMap, setLaneMap] = useState<Record<string, number>>({});
  const [simTitle, setSimTitle] = useState("Loading…");
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── UI state ──
  const [certaintyThreshold, setCertaintyThreshold] = useState(0);
  const [extending, setExtending] = useState<Set<string>>(new Set());
  const [extendError, setExtendError] = useState<string | null>(null);

  // ── API key (session-scoped) ──
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(SESSION_KEY_KEY) ?? "" : ""
  );
  const [provider, setProvider] = useState<"claude" | "openai" | "custom">(() => {
    if (typeof window === "undefined") return "claude";
    return (
      (sessionStorage.getItem(SESSION_PROVIDER_KEY) as "claude" | "openai" | "custom") ?? "claude"
    );
  });

  const saveApiKey = useCallback((key: string, prov: string) => {
    setApiKey(key);
    setProvider(prov as "claude" | "openai" | "custom");
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY_KEY, key);
      sessionStorage.setItem(SESSION_PROVIDER_KEY, prov);
    }
  }, []);

  // ── Load simulation data ──
  useEffect(() => {
    if (isDemo) {
      setNodes(demoToTimelineNodes());
      setLanes(buildDemoLanes());
      setLaneMap(buildDemoLaneMap());
      setSimTitle("Change career to AI/ML");
      setLoadingTree(false);
      return;
    }

    fetch(`/api/oracle/timeline?simulationId=${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: {
        title: string;
        nodes: TimelineNodeData[];
        lanes: { branchId: string; laneIndex: number; title: string }[];
        laneMap: Record<string, number>;
      }) => {
        setNodes(data.nodes);
        setLanes(data.lanes);
        setLaneMap(data.laneMap);
        setSimTitle(data.title);
      })
      .catch((err) => {
        setLoadError(err.message ?? "Failed to load timeline");
      })
      .finally(() => setLoadingTree(false));
  }, [id, isDemo]);

  // ── Extend handler ──
  const handleExtend = useCallback(
    async (nodeId: string, depth = 1, granularity?: Granularity) => {
      if (isDemo) {
        setExtendError("Extend is only available for real simulations. Create one from the dashboard.");
        setTimeout(() => setExtendError(null), 4000);
        return;
      }
      if (!apiKey) {
        setExtendError("Add an API key to extend branches.");
        setTimeout(() => setExtendError(null), 4000);
        return;
      }

      setExtending((s) => new Set(s).add(nodeId));
      setExtendError(null);

      try {
        const profile = { name: "", skills: [], experience: [], education: [] };

        const endpoint = depth > 1 ? "/api/oracle/deep-extend" : "/api/oracle/extend";
        const body =
          depth > 1
            ? { nodeId, simulationId: id, profile, provider, apiKey, depth, granularity }
            : { nodeId, simulationId: id, profile, provider, apiKey };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const data: {
          nodes: Array<{ id: string; data: Record<string, unknown> }>;
          edges: Array<{ source: string; target: string }>;
        } = await res.json();

        const newTimeline = flowNodesToTimeline(data.nodes, data.edges);

        setNodes((prev) => [...prev, ...newTimeline]);
        setLaneMap((prev) => {
          const next = { ...prev };
          for (const n of newTimeline) {
            next[n.id] = n.parentId ? (prev[n.parentId] ?? 0) : 0;
          }
          return next;
        });
      } catch (err) {
        setExtendError(err instanceof Error ? err.message : "Extension failed");
        setTimeout(() => setExtendError(null), 5000);
      } finally {
        setExtending((s) => {
          const n = new Set(s);
          n.delete(nodeId);
          return n;
        });
      }
    },
    [id, isDemo, apiKey, provider]
  );

  const handleExtendAll = useCallback(
    async (depth: number, granularity: Granularity) => {
      if (isDemo || !apiKey) return;
      // Find all leaf nodes (nodes that are not parents of other nodes)
      const parentIds = new Set(nodes.map((n) => n.parentId).filter(Boolean));
      const leafIds = nodes
        .filter((n) => !parentIds.has(n.id) && n.depth > 0)
        .map((n) => n.id);
      for (const nodeId of leafIds.slice(0, 6)) {
        await handleExtend(nodeId, depth, granularity).catch(() => null);
      }
    },
    [nodes, isDemo, apiKey, handleExtend]
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

          <div className="flex items-center gap-2 shrink-0">
            {!isDemo && <ApiKeyPopover apiKey={apiKey} provider={provider} onSave={saveApiKey} />}
            <ViewTabs id={id} />
          </div>
        </div>
      </header>

      {/* Depth controls bar */}
      <div className="shrink-0 px-4 py-2 border-b border-border-subtle bg-void-900/40 backdrop-blur-sm">
        <DepthControls
          onExtendAll={handleExtendAll}
          onCertaintyFilter={setCertaintyThreshold}
          certaintyThreshold={certaintyThreshold}
          disabled={isDemo || !apiKey}
        />
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {extendError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-hazard-900/30 border-b border-hazard-700/40 text-hazard-400 text-xs"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {extendError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline canvas */}
      <main className="flex-1 overflow-hidden p-4 relative">
        {loadingTree ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-oracle-500 animate-spin" />
              <p className="text-text-muted text-sm">Loading timeline…</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-hazard-500 mx-auto" />
              <p className="text-text-primary text-sm font-medium">Failed to load timeline</p>
              <p className="text-text-muted text-xs">{loadError}</p>
              <Link href="/dashboard" className="text-xs text-oracle-400 hover:underline">
                Back to dashboard
              </Link>
            </div>
          </div>
        ) : (
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
        )}

        {/* Extending overlay */}
        {extending.size > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 glass-card px-4 py-2 rounded-xl text-xs text-text-secondary border border-border z-20">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-oracle-500" />
            Generating {extending.size} branch{extending.size > 1 ? "es" : ""}…
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Share2,
  Download,
  Calendar,
  X,
  Check,
  Keyboard,
  Sparkles,
  GitBranch,
  Loader2,
} from "lucide-react";
import FutureNode from "@/components/tree/FutureNode";
import BranchEdge from "@/components/tree/BranchEdge";
import { DEMO_SIMULATION } from "@/lib/ai/types";
import type { FutureTreeNode, FutureTreeEdge, FutureNodeData } from "@/lib/ai/types";

const nodeTypes = { futureNode: FutureNode } as const;
const edgeTypes = { branchEdge: BranchEdge } as const;

/* ─── Keyboard shortcuts hint ─────────────────────────────────────────────── */
function ShortcutsHint() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-border hover:border-border-bright text-text-muted hover:text-text-secondary text-xs font-medium transition-all duration-150"
      >
        <Keyboard className="w-3.5 h-3.5" />
        Shortcuts
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-full mt-2 w-56 glass-card rounded-xl p-4 z-50"
            >
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Keyboard shortcuts</p>
              <div className="space-y-2">
                {[
                  { key: "Space", action: "Fit tree to view" },
                  { key: "Ctrl+E", action: "Extend selected node" },
                  { key: "Esc", action: "Deselect node" },
                  { key: "Scroll", action: "Zoom in / out" },
                ].map(({ key, action }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">{action}</span>
                    <kbd className="text-xs font-mono px-1.5 py-0.5 rounded-md bg-void-800 border border-border text-text-ghost">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Node detail panel ───────────────────────────────────────────────────── */
function NodePanel({
  node,
  onClose,
  onExtend,
}: {
  node: FutureTreeNode;
  onClose: () => void;
  onExtend: (nodeId: string) => void;
}) {
  const d = node.data;
  const probPct = Math.round((d.probability ?? 0) * 100);

  return (
    <motion.aside
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-80 shrink-0 border-l border-border-subtle bg-void-900/80 backdrop-blur-xl overflow-y-auto"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-text-primary text-sm">Branch details</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Probability bar */}
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted uppercase tracking-wider">Probability</span>
            <span className="text-lg font-bold text-oracle-400 font-mono">{probPct}%</span>
          </div>
          <div className="h-1.5 bg-void-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${probPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, oklch(72% 0.175 76), oklch(68% 0.115 276))" }}
            />
          </div>
        </div>

        <h3 className="font-semibold text-text-primary mb-2">{d.title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">{d.description}</p>

        {/* Timeframe */}
        <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Timeframe: <span className="text-text-secondary">{d.timeframe}</span>
          </span>
        </div>

        {/* Pros / cons */}
        {d.details && (
          <div className="space-y-4 mb-5">
            {d.details.pros && (
              <div>
                <p className="text-xs font-semibold text-signal-400 uppercase tracking-wider mb-2">Upside</p>
                <ul className="space-y-1.5">
                  {d.details.pros.map((pro: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-signal-500 mt-0.5 shrink-0">+</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.details.cons && (
              <div>
                <p className="text-xs font-semibold text-hazard-400 uppercase tracking-wider mb-2">Risk</p>
                <ul className="space-y-1.5">
                  {d.details.cons.map((con: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-hazard-500 mt-0.5 shrink-0">−</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.details.keyEvents && (
              <div>
                <p className="text-xs font-semibold text-nebula-300 uppercase tracking-wider mb-2">Key events</p>
                <ul className="space-y-1.5">
                  {d.details.keyEvents.map((ev: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-nebula-400 mt-0.5 shrink-0">→</span>
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Extend button */}
        {!d.isRoot && (
          <button
            onClick={() => onExtend(node.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 hover:text-oracle-300 font-medium text-sm transition-all duration-200"
          >
            <GitBranch className="w-4 h-4" />
            Extend this branch
          </button>
        )}
      </div>
    </motion.aside>
  );
}

/* ─── Inner flow (inside ReactFlowProvider) ───────────────────────────────── */
interface FlowInnerProps {
  nodes: FutureTreeNode[];
  edges: FutureTreeEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}

function SimulationFlowInner({ nodes, edges, selectedNodeId, onNodeSelect }: FlowInnerProps) {
  const { fitView } = useReactFlow();

  // Apply selected state
  const styledNodes = nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId }));

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node: Node) => {
      onNodeSelect(node.id === selectedNodeId ? null : node.id);
    },
    [onNodeSelect, selectedNodeId]
  );

  const onPaneClick = useCallback(() => onNodeSelect(null), [onNodeSelect]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Space → fit view
      if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        fitView({ padding: 0.15, duration: 400 });
      }
      // Ctrl+E → extend selected node (handled in parent via callback)
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        if (selectedNodeId) {
          document.dispatchEvent(new CustomEvent("delphi:extend-node", { detail: { nodeId: selectedNodeId } }));
        }
      }
      // Escape → deselect
      if (e.key === "Escape") {
        onNodeSelect(null);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fitView, selectedNodeId, onNodeSelect]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.05}
        maxZoom={2}
        defaultEdgeOptions={{ type: "branchEdge", animated: false }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        elementsSelectable
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="oklch(30% 0.048 265 / 0.4)"
          className="opacity-60"
        />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Use DEMO_SIMULATION for demo IDs; in production this would fetch from /api/simulations/[id]
  const simulation = DEMO_SIMULATION;
  const simTitle = id.startsWith("demo-") ? "Change career to AI/ML" : `Simulation ${id}`;

  const selectedNode = selectedNodeId
    ? simulation.nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("input");
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    // To enable PNG export, install html-to-image:
    //   npm install html-to-image
    // Then use: toPng(document.querySelector('.react-flow') as HTMLElement)
    // For now, trigger browser print as a fallback
    await new Promise((r) => setTimeout(r, 400));
    window.print();
    setExporting(false);
  };

  const handleExtend = useCallback((nodeId: string) => {
    // TODO: call /api/simulations/[id]/extend with the node context
    console.log("[Delphi] Extending node:", nodeId);
  }, []);

  // Listen for extend events from keyboard shortcut inside ReactFlow
  useEffect(() => {
    const handler = (e: Event) => {
      const { nodeId } = (e as CustomEvent<{ nodeId: string }>).detail;
      handleExtend(nodeId);
    };
    document.addEventListener("delphi:extend-node", handler);
    return () => document.removeEventListener("delphi:extend-node", handler);
  }, [handleExtend]);

  return (
    <div className="h-screen bg-void-950 flex flex-col overflow-hidden">
      {/* ── Header bar ── */}
      <header className="shrink-0 border-b border-border-subtle bg-void-950/90 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Back */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary text-sm font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div className="w-px h-4 bg-border-subtle" />

          {/* Logo + title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-void-950" strokeWidth={2.5} />
            </div>
            <h1 className="text-sm font-semibold text-text-primary truncate">{simTitle}</h1>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <ShortcutsHint />

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-border hover:border-border-bright text-text-muted hover:text-text-secondary text-xs font-medium transition-all duration-150"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-signal-400" /><span className="text-signal-400">Copied!</span></>
              ) : (
                <><Share2 className="w-3.5 h-3.5" />Share</>
              )}
            </button>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 hover:text-oracle-300 text-xs font-medium transition-all duration-150 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Export
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Full-screen canvas */}
        <main className="flex-1 overflow-hidden">
          <ReactFlowProvider>
            <SimulationFlowInner
              nodes={simulation.nodes}
              edges={simulation.edges}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
            />
          </ReactFlowProvider>
        </main>

        {/* Node detail panel */}
        <AnimatePresence>
          {selectedNode && (
            <NodePanel
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onExtend={handleExtend}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

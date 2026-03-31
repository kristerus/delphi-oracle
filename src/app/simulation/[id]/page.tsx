"use client";

import { use, useState, useCallback, useEffect } from "react";
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
  GitMerge,
  Network,
  Loader2,
  Key,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import FutureNode from "@/components/tree/FutureNode";
import BranchEdge from "@/components/tree/BranchEdge";
import CertaintyIndicator from "@/components/timeline/CertaintyIndicator";
import DepthControls from "@/components/timeline/DepthControls";
import { DEMO_SIMULATION } from "@/lib/ai/types";
import type { FutureTreeNode, FutureTreeEdge, FutureNodeData, Granularity } from "@/lib/ai/types";
import { authClient } from "@/lib/auth-client";

const nodeTypes = { futureNode: FutureNode } as const;
const edgeTypes = { branchEdge: BranchEdge } as const;

const SESSION_KEY_KEY = "delphi_api_key";
const SESSION_PROVIDER_KEY = "delphi_api_provider";

/* ─── DB node shape from API ─────────────────────────────────────────────── */
interface DbNode {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  probability: number;
  certainty: number | null;
  timeframe: string | null;
  timeframeStart: string | null;
  timeframeEnd: string | null;
  granularity: "month" | "year" | "decade" | null;
  depth: number;
  details: FutureNodeData["details"];
  positionX: number | null;
  positionY: number | null;
}

function dbNodesToFlow(
  dbNodes: DbNode[],
  edges: { source: string; target: string }[]
): { nodes: FutureTreeNode[]; edges: FutureTreeEdge[] } {
  const nodes: FutureTreeNode[] = dbNodes.map((n) => ({
    id: n.id,
    type: "futureNode" as const,
    position: { x: n.positionX ?? 0, y: n.positionY ?? 0 },
    data: {
      title: n.title,
      description: n.description,
      probability: n.probability,
      certainty: n.certainty ?? undefined,
      timeframe: n.timeframe ?? "",
      timeframeStart: n.timeframeStart ?? undefined,
      timeframeEnd: n.timeframeEnd ?? undefined,
      granularity: n.granularity ?? undefined,
      depth: n.depth,
      isRoot: n.parentId === null,
      details: n.details,
    },
  }));

  const rfEdges: FutureTreeEdge[] = dbNodes
    .filter((n) => n.parentId !== null)
    .map((n) => ({
      id: `e-${n.parentId}-${n.id}`,
      source: n.parentId!,
      target: n.id,
      type: "branchEdge",
    }));

  return { nodes, edges: rfEdges };
}

/* ─── View tab switcher ───────────────────────────────────────────────────── */
function ViewTabs({ id }: { id: string }) {
  return (
    <div className="flex items-center gap-0.5 glass rounded-xl p-1 border border-border shrink-0">
      {[
        { label: "Tree",     icon: GitBranch, href: `/simulation/${id}`,          active: true  },
        { label: "Timeline", icon: GitMerge,  href: `/simulation/${id}/timeline`, active: false },
        { label: "Butterfly",icon: Network,   href: "#",                          active: false, disabled: true },
      ].map((tab) =>
        tab.disabled ? (
          <span
            key={tab.label}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-ghost opacity-35 cursor-not-allowed"
          >
            <tab.icon className="w-3 h-3" />
            <span className="hidden sm:inline">{tab.label}</span>
          </span>
        ) : (
          <Link
            key={tab.label}
            href={tab.href}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-150
              ${tab.active
                ? "bg-oracle-500/15 text-oracle-400 border border-oracle-800/40"
                : "text-text-muted hover:text-text-secondary"
              }
            `}
          >
            <tab.icon className="w-3 h-3" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        )
      )}
    </div>
  );
}

/* ─── API key popover ─────────────────────────────────────────────────────── */
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
        onClick={() => { setDraftKey(apiKey); setDraftProv(provider); setOpen((v) => !v); }}
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
                </Link>.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Keyboard shortcuts ──────────────────────────────────────────────────── */
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
                  { key: "Space",  action: "Fit tree to view" },
                  { key: "Ctrl+E", action: "Extend selected node" },
                  { key: "Esc",    action: "Deselect node" },
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

/* ─── Guest banner ────────────────────────────────────────────────────────── */
function GuestBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[oklch(0.2_0.05_280)] border-b border-[oklch(0.3_0.05_280)] px-4 py-2 flex items-center justify-between text-sm">
      <span className="text-[oklch(0.8_0.05_280)]">You&apos;re viewing a shared simulation</span>
      <a href="/sign-in" className="bg-[oklch(0.75_0.18_85)] text-[oklch(0.1_0.02_280)] px-3 py-1 rounded font-semibold hover:opacity-90 transition-opacity">
        Sign in to explore
      </a>
    </div>
  );
}

/* ─── Node detail panel ───────────────────────────────────────────────────── */
function NodePanel({
  node,
  onClose,
  onExtend,
  isGuest,
}: {
  node: FutureTreeNode;
  onClose: () => void;
  onExtend: (nodeId: string, depth?: number, granularity?: Granularity) => Promise<void>;
  isGuest?: boolean;
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-text-primary text-sm">Branch details</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Probability + Certainty */}
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted uppercase tracking-wider">Probability</span>
            <span className="text-lg font-bold text-oracle-400 font-mono">{probPct}%</span>
          </div>
          <div className="h-1.5 bg-void-700 rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${probPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, oklch(72% 0.175 76), oklch(68% 0.115 276))" }}
            />
          </div>
          {d.certainty !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-ghost uppercase tracking-wider">Certainty</span>
              <div className="flex items-center gap-2">
                <CertaintyIndicator certainty={d.certainty} size={20} />
                <span className="text-xs font-mono text-text-muted">
                  {Math.round(d.certainty * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <h3 className="font-semibold text-text-primary mb-2">{d.title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">{d.description}</p>

        <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
          <Calendar className="w-3.5 h-3.5" />
          <span>Timeframe: <span className="text-text-secondary">{d.timeframe}</span></span>
        </div>

        {d.details && (
          <div className="space-y-4 mb-5">
            {d.details.emotionalImpact && (
              <div className="glass rounded-xl px-4 py-3 border border-nebula-800/30">
                <p className="text-xs font-semibold text-nebula-400 uppercase tracking-wider mb-1.5">Emotional arc</p>
                <p className="text-sm text-text-secondary italic leading-relaxed">{d.details.emotionalImpact}</p>
              </div>
            )}
            {d.details.pros && (
              <div>
                <p className="text-xs font-semibold text-signal-400 uppercase tracking-wider mb-2">Upside</p>
                <ul className="space-y-1.5">
                  {d.details.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-signal-500 mt-0.5 shrink-0">+</span>{pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.details.cons && (
              <div>
                <p className="text-xs font-semibold text-hazard-400 uppercase tracking-wider mb-2">Risk</p>
                <ul className="space-y-1.5">
                  {d.details.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-hazard-500 mt-0.5 shrink-0">−</span>{con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.details.keyEvents && (
              <div>
                <p className="text-xs font-semibold text-nebula-300 uppercase tracking-wider mb-2">Key events</p>
                <ul className="space-y-1.5">
                  {d.details.keyEvents.map((ev, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-nebula-400 mt-0.5 shrink-0">→</span>{ev}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!d.isRoot && !isGuest && (
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

/* ─── Inner React Flow component ─────────────────────────────────────────── */
interface FlowInnerProps {
  nodes: FutureTreeNode[];
  edges: FutureTreeEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}

function SimulationFlowInner({ nodes, edges, selectedNodeId, onNodeSelect }: FlowInnerProps) {
  const { fitView } = useReactFlow();
  const styledNodes = nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId }));

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node: Node) => {
      onNodeSelect(node.id === selectedNodeId ? null : node.id);
    },
    [onNodeSelect, selectedNodeId]
  );

  const onPaneClick = useCallback(() => onNodeSelect(null), [onNodeSelect]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        fitView({ padding: 0.15, duration: 400 });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        if (selectedNodeId) {
          document.dispatchEvent(new CustomEvent("delphi:extend-node", { detail: { nodeId: selectedNodeId } }));
        }
      }
      if (e.key === "Escape") onNodeSelect(null);
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

  const isDemo = id.startsWith("demo-");

  // ── Auth state ──
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const isGuest = !sessionLoading && !session;

  // ── Tree state ──
  const [nodes, setNodes] = useState<FutureTreeNode[]>([]);
  const [edges, setEdges] = useState<FutureTreeEdge[]>([]);
  const [simTitle, setSimTitle] = useState("Loading…");
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { success } = useToast();

  // ── UI state ──
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [extending, setExtending] = useState<Set<string>>(new Set());
  const [extendError, setExtendError] = useState<string | null>(null);
  const [certaintyThreshold, setCertaintyThreshold] = useState(0);

  // ── API key (session-scoped) ──
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(SESSION_KEY_KEY) ?? "" : ""
  );
  const [provider, setProvider] = useState<"claude" | "openai" | "custom">(() => {
    if (typeof window === "undefined") return "claude";
    return (sessionStorage.getItem(SESSION_PROVIDER_KEY) as "claude" | "openai" | "custom") ?? "claude";
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
      setNodes(DEMO_SIMULATION.nodes);
      setEdges(DEMO_SIMULATION.edges);
      setSimTitle("Change career to AI/ML");
      setLoadingTree(false);
      return;
    }

    fetch(`/api/simulations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { title: string; nodes: DbNode[] }) => {
        const { nodes: rfNodes, edges: rfEdges } = dbNodesToFlow(data.nodes, []);
        setNodes(rfNodes);
        setEdges(rfEdges);
        setSimTitle(data.title);
      })
      .catch((err) => {
        setLoadError(err.message ?? "Failed to load simulation");
      })
      .finally(() => setLoadingTree(false));
  }, [id, isDemo]);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null;

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

        const data: { nodes: FutureTreeNode[]; edges: FutureTreeEdge[] } = await res.json();
        setNodes((prev) => [...prev, ...data.nodes]);
        setEdges((prev) => [...prev, ...data.edges]);
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
      // Find all leaf nodes and extend each
      const childIds = new Set(edges.map((e) => e.target));
      const leafIds = nodes.filter((n) => !childIds.has(n.id) && !n.data.isRoot).map((n) => n.id);
      for (const nodeId of leafIds.slice(0, 6)) {
        // cap at 6 to avoid runaway API spend
        await handleExtend(nodeId, depth, granularity).catch(() => null);
      }
    },
    [nodes, edges, isDemo, apiKey, handleExtend]
  );

  // Listen for keyboard extend event
  useEffect(() => {
    const handler = (e: Event) => {
      const { nodeId } = (e as CustomEvent<{ nodeId: string }>).detail;
      handleExtend(nodeId);
    };
    document.addEventListener("delphi:extend-node", handler);
    return () => document.removeEventListener("delphi:extend-node", handler);
  }, [handleExtend]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — show the URL for manual copy
      setExtendError(`Share URL: ${window.location.href}`);
      setTimeout(() => setExtendError(null), 8000);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 400));
    window.print();
    setExporting(false);
  };

  /* ── Render ── */
  return (
    <div className="h-screen bg-void-950 flex flex-col overflow-hidden">
      {/* Guest banner */}
      {isGuest && <GuestBanner />}

      {/* Header */}
      <header className={`shrink-0 border-b border-border-subtle bg-void-950/90 backdrop-blur-xl z-30${isGuest ? " mt-10" : ""}`}>
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

          {/* View tabs */}
          <ViewTabs id={id} />

          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
            {!isGuest && <ApiKeyPopover apiKey={apiKey} provider={provider} onSave={saveApiKey} />}
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
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Depth controls sub-bar */}
      <div className="shrink-0 px-4 py-2 border-b border-border-subtle bg-void-900/40 backdrop-blur-sm">
        <DepthControls
          onExtendAll={handleExtendAll}
          onCertaintyFilter={setCertaintyThreshold}
          certaintyThreshold={certaintyThreshold}
          disabled={isGuest || isDemo || !apiKey}
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

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden relative">
          {loadingTree ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-oracle-500 animate-spin" />
                <p className="text-text-muted text-sm">Loading simulation…</p>
              </div>
            </div>
          ) : loadError ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-hazard-500 mx-auto" />
                <p className="text-text-primary text-sm font-medium">Failed to load simulation</p>
                <p className="text-text-muted text-xs">{loadError}</p>
                <Link href="/dashboard" className="text-xs text-oracle-400 hover:underline">
                  Back to dashboard
                </Link>
              </div>
            </div>
          ) : (
            <ReactFlowProvider>
              <SimulationFlowInner
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
              />
            </ReactFlowProvider>
          )}

          {/* Extending overlay for leaf nodes */}
          {extending.size > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 glass-card px-4 py-2 rounded-xl text-xs text-text-secondary border border-border">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-oracle-500" />
              Generating {extending.size} branch{extending.size > 1 ? "es" : ""}…
            </div>
          )}
        </main>

        {/* Node detail panel */}
        <AnimatePresence>
          {selectedNode && (
            <NodePanel
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onExtend={handleExtend}
              isGuest={isGuest}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

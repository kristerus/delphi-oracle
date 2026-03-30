"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Sparkles,
  GitBranch,
  Calendar,
  ChevronRight,
  X,
  Loader2,
  Info,
  Key,
} from "lucide-react";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import { DEMO_SIMULATION } from "@/lib/ai/types";
import { authClient } from "@/lib/auth-client";
import { useOracle } from "@/hooks/useOracle";
import type { SimulationTree, FutureTreeNode, FutureTreeEdge } from "@/lib/ai/types";

const FutureTree = dynamic(() => import("@/components/tree/FutureTree"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-oracle-500 animate-spin" />
        <p className="text-text-secondary text-sm">Loading tree visualization…</p>
      </div>
    </div>
  ),
});

interface SimulationMeta {
  id: string;
  title: string;
  nodeCount: number;
  createdAt: string;
  status: "complete" | "generating" | "draft";
}

/* ── DB node shape returned by /api/simulations/[id] ── */
interface DbNode {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  probability: number;
  timeframe: string | null;
  depth: number;
  details: unknown;
  positionX: number | null;
  positionY: number | null;
}

function dbNodesToTree(nodes: DbNode[]): SimulationTree {
  const rfNodes: FutureTreeNode[] = nodes.map((n) => ({
    id: n.id,
    type: "futureNode" as const,
    position: { x: n.positionX ?? 0, y: n.positionY ?? 0 },
    data: {
      title: n.title,
      description: n.description,
      probability: n.probability,
      timeframe: n.timeframe ?? "",
      depth: n.depth,
      isRoot: n.parentId === null,
      details: n.details as FutureTreeNode["data"]["details"],
    },
  }));
  const rfEdges: FutureTreeEdge[] = nodes
    .filter((n) => n.parentId !== null)
    .map((n) => ({
      id: `e-${n.parentId}-${n.id}`,
      source: n.parentId!,
      target: n.id,
      type: "branchEdge",
    }));
  return { nodes: rfNodes, edges: rfEdges };
}

const DEMO_SIMULATIONS: SimulationMeta[] = [
  {
    id: "demo-1",
    title: "Change career to AI/ML",
    nodeCount: 11,
    createdAt: "2026-03-28",
    status: "complete",
  },
];

/* ── New Simulation Modal ── */
function NewSimulationModal({
  onClose,
  onSimulate,
}: {
  onClose: () => void;
  onSimulate: (title: string, apiKey: string, provider: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("claude");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    if (!title.trim() || !apiKey.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      await onSimulate(title.trim(), apiKey.trim(), provider);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
      setGenerating(false);
    }
  };

  const suggestions = [
    "Should I change careers to AI engineering?",
    "What if I moved to a new city?",
    "Should I start my own company?",
    "What happens if I go back to school?",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative glass-card rounded-2xl p-7 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">New simulation</h2>
            <p className="text-text-muted text-sm mt-0.5">Pose a life decision to explore</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Your decision
          </label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What if I left my corporate job to start a company in the next 12 months?"
            rows={3}
            className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200 resize-none"
          />
        </div>

        <div className="mb-4">
          <p className="text-xs text-text-muted mb-2.5">Quick suggestions</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setTitle(s)}
                className="text-xs px-3 py-1.5 rounded-lg bg-void-800/60 border border-border hover:border-oracle-800/60 hover:text-oracle-400 text-text-secondary transition-all duration-150"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* API Key section */}
        <div className="mb-4 glass rounded-xl p-4 space-y-3 border border-border-subtle">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Key className="w-3.5 h-3.5" />
            <span>AI provider &amp; key</span>
          </div>
          <div className="flex gap-2">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="bg-void-800/60 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-oracle-700 transition-colors"
            >
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
              <option value="custom">Custom</option>
            </select>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-…"
              className="flex-1 bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200 font-mono"
            />
          </div>
          <p className="text-xs text-text-ghost">
            Save your key in{" "}
            <a href="/profile" className="text-oracle-500 hover:underline">
              Profile → AI Keys
            </a>{" "}
            to reuse it across sessions.
          </p>
        </div>

        {error && (
          <p className="text-xs text-hazard-400 mb-3">{error}</p>
        )}

        <button
          onClick={handle}
          disabled={!title.trim() || !apiKey.trim() || generating}
          className="w-full flex items-center justify-center gap-2 bg-oracle-500 hover:bg-oracle-400 disabled:opacity-50 disabled:cursor-not-allowed text-void-950 font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-[0_0_24px_oklch(72%_0.175_76_/_0.5)] text-sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating futures…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate future tree
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

/* ── Dashboard ── */
export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const oracle = useOracle();

  const [activeSimId, setActiveSimId] = useState<string>("demo-1");
  const [simulations, setSimulations] = useState<SimulationMeta[]>(DEMO_SIMULATIONS);
  const [treesById, setTreesById] = useState<Record<string, SimulationTree>>({
    "demo-1": DEMO_SIMULATION,
  });
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [lastApiKey, setLastApiKey] = useState("");
  const [lastProvider, setLastProvider] = useState<"claude" | "openai" | "custom">("claude");

  // Client-side auth guard
  useEffect(() => {
    if (!sessionLoading && !session) router.push("/login");
  }, [session, sessionLoading, router]);

  // Fetch real simulations on mount
  useEffect(() => {
    if (!session) return;
    fetch("/api/simulations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SimulationMeta[]) => {
        if (data.length > 0) {
          setSimulations(data);
          setActiveSimId(data[0].id);
        }
        // else keep DEMO_SIMULATIONS
      })
      .catch(() => {}); // keep demo on error
  }, [session]);

  // Load tree for the active simulation when it changes
  useEffect(() => {
    if (!activeSimId || treesById[activeSimId]) return;
    // If oracle just created this sim, it's already in treesById via handleSimulate
    fetch(`/api/simulations/${activeSimId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { nodes: DbNode[] } | null) => {
        if (!data) return;
        setTreesById((prev) => ({
          ...prev,
          [activeSimId]: dbNodesToTree(data.nodes),
        }));
      })
      .catch(() => {});
  }, [activeSimId, treesById]);

  // Keep the active sim's tree in sync when oracle extends nodes
  useEffect(() => {
    if (!oracle.simulationId || oracle.nodes.length === 0) return;
    setTreesById((prev) => ({
      ...prev,
      [oracle.simulationId!]: { nodes: oracle.nodes, edges: oracle.edges },
    }));
  }, [oracle.simulationId, oracle.nodes, oracle.edges]);

  const handleSimulate = useCallback(
    async (title: string, apiKey: string, provider: string) => {
      setLastApiKey(apiKey);
      setLastProvider(provider as "claude" | "openai" | "custom");

      // Build a minimal profile from session
      const profile = {
        name: session?.user?.name ?? "",
        skills: [],
        experience: [],
        education: [],
      };

      const result = await oracle.simulate({
        decision: title,
        profile,
        apiKey,
        provider: provider as "claude" | "openai" | "custom",
      });

      const newSim: SimulationMeta = {
        id: result.simulationId,
        title,
        nodeCount: result.tree.nodes.length,
        createdAt: new Date().toISOString().split("T")[0],
        status: "complete",
      };

      setSimulations((prev) => {
        const filtered = prev.filter((s) => !s.id.startsWith("demo-"));
        return [newSim, ...filtered];
      });
      setTreesById((prev) => ({ ...prev, [result.simulationId]: result.tree }));
      setActiveSimId(result.simulationId);
    },
    [session, oracle]
  );

  const handleExtend = useCallback(
    async (nodeId: string) => {
      if (!lastApiKey) return;
      const profile = {
        name: session?.user?.name ?? "",
        skills: [],
        experience: [],
        education: [],
      };
      await oracle.extendNode({
        nodeId,
        profile,
        apiKey: lastApiKey,
        provider: lastProvider,
      });
    },
    [session, oracle, lastApiKey, lastProvider]
  );

  if (sessionLoading) {
    return (
      <div className="h-screen bg-void-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-oracle-500 animate-spin" />
      </div>
    );
  }
  if (!session) return null;

  const activeSim = simulations.find((s) => s.id === activeSimId);
  const activeTree = treesById[activeSimId];
  const selectedNode = selectedNodeId
    ? activeTree?.nodes.find((n) => n.id === selectedNodeId)
    : null;

  return (
    <div className="h-screen bg-void-950 flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-64 shrink-0 border-r border-border-subtle bg-void-900/50 flex flex-col">
          <div className="p-4 border-b border-border-subtle">
            <button
              onClick={() => setShowNewModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 hover:text-oracle-300 font-medium text-sm py-2.5 rounded-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              New simulation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-xs font-medium text-text-ghost uppercase tracking-wider px-2 py-1.5">
              Recent simulations
            </p>
            {simulations.map((sim) => (
              <button
                key={sim.id}
                onClick={() => {
                  setActiveSimId(sim.id);
                  setSelectedNodeId(null);
                }}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-150 group ${
                  activeSimId === sim.id
                    ? "bg-oracle-900/40 border border-oracle-800/50 text-text-primary"
                    : "hover:bg-void-800/60 text-text-secondary hover:text-text-primary"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className={`w-3.5 h-3.5 shrink-0 ${activeSimId === sim.id ? "text-oracle-500" : "text-text-muted"}`} />
                  <span className="text-sm font-medium truncate leading-tight">{sim.title}</span>
                </div>
                <div className="flex items-center gap-2 pl-5">
                  <span className="text-xs text-text-ghost">{sim.nodeCount} nodes</span>
                  {sim.status === "generating" && (
                    <span className="flex items-center gap-1 text-xs text-oracle-600">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Generating
                    </span>
                  )}
                  <span className="text-xs text-text-ghost flex items-center gap-1 ml-auto">
                    <Calendar className="w-2.5 h-2.5" />
                    {sim.createdAt}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-border-subtle">
            <div className="flex items-start gap-2 px-2 py-2 text-xs text-text-ghost">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px text-text-ghost" />
              <span>Click any node in the tree to explore details. Use &ldquo;Extend&rdquo; to go deeper.</span>
            </div>
          </div>
        </aside>

        {/* ── Main Tree Area ── */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeSim && (
            <div className="px-6 py-3.5 border-b border-border-subtle flex items-center gap-3 bg-void-900/30">
              <GitBranch className="w-4 h-4 text-oracle-500 shrink-0" />
              <h1 className="text-sm font-medium text-text-primary truncate">{activeSim.title}</h1>
              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                <span className="text-xs text-text-ghost">{activeSim.nodeCount} nodes</span>
                <ChevronRight className="w-3.5 h-3.5 text-text-ghost" />
                <span className="text-xs text-text-muted">
                  {new Date(activeSim.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {activeTree ? (
              <FutureTree
                nodes={activeTree.nodes}
                edges={activeTree.edges}
                onNodeSelect={setSelectedNodeId}
                selectedNodeId={selectedNodeId}
                onExtend={handleExtend}
              />
            ) : (
              <div className="flex-1 h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-oracle-500 animate-spin mx-auto mb-4" />
                  <p className="text-text-muted text-sm">Loading simulation…</p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── Node Detail Panel ── */}
        <AnimatePresence>
          {selectedNode && (
            <motion.aside
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-80 shrink-0 border-l border-border-subtle bg-void-900/70 backdrop-blur-md overflow-y-auto"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-text-primary text-sm">Branch details</h2>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="text-text-muted hover:text-text-primary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Probability */}
                <div className="glass rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted uppercase tracking-wider">Probability</span>
                    <span className="text-lg font-bold text-oracle-400 font-mono">
                      {Math.round((selectedNode.data.probability ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-void-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(selectedNode.data.probability ?? 0) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, oklch(72% 0.175 76), oklch(68% 0.115 276))`,
                      }}
                    />
                  </div>
                </div>

                <h3 className="font-semibold text-text-primary mb-2">{selectedNode.data.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-4">
                  {selectedNode.data.description}
                </p>

                <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Timeframe:{" "}
                    <span className="text-text-secondary">{selectedNode.data.timeframe}</span>
                  </span>
                </div>

                {selectedNode.data.details && (
                  <div className="space-y-3">
                    {selectedNode.data.details.pros && (
                      <div>
                        <p className="text-xs font-medium text-signal-400 uppercase tracking-wider mb-1.5">Upside</p>
                        <ul className="space-y-1">
                          {selectedNode.data.details.pros.map((pro: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                              <span className="text-signal-500 mt-0.5">+</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedNode.data.details.cons && (
                      <div>
                        <p className="text-xs font-medium text-hazard-400 uppercase tracking-wider mb-1.5">Risk</p>
                        <ul className="space-y-1">
                          {selectedNode.data.details.cons.map((con: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                              <span className="text-hazard-500 mt-0.5">−</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showNewModal && (
          <NewSimulationModal
            onClose={() => setShowNewModal(false)}
            onSimulate={handleSimulate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

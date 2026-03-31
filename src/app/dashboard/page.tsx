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
  Briefcase,
  Heart,
  TrendingUp,
  Activity,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import { DEMO_SIMULATION } from "@/lib/ai/types";
import { authClient } from "@/lib/auth-client";
import { useOracle } from "@/hooks/useOracle";
import type { SimulationTree, FutureTreeNode, FutureTreeEdge, Granularity, SimulationCategory } from "@/lib/ai/types";

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
  categories?: SimulationCategory[];
}

const CATEGORY_CONFIG: Record<SimulationCategory, {
  label: string;
  icon: React.ElementType;
  color: string;
  activeClass: string;
  badgeClass: string;
  suggestions: string[];
  placeholder: string;
  showPersonalContext: boolean;
}> = {
  career: {
    label: "Career",
    icon: Briefcase,
    color: "oracle",
    activeClass: "border-oracle-700/60 bg-oracle-500/10 text-oracle-400",
    badgeClass: "bg-oracle-900/50 text-oracle-400 border-oracle-800/40",
    suggestions: [
      "Should I change careers to AI engineering?",
      "What if I started my own company?",
      "Should I go back to school for a master's?",
      "What happens if I move to a new city for work?",
    ],
    placeholder: "What if I left my corporate job to start a company in the next 12 months?",
    showPersonalContext: false,
  },
  romantic: {
    label: "Romantic",
    icon: Heart,
    color: "hazard",
    activeClass: "border-hazard-700/60 bg-hazard-500/10 text-hazard-400",
    badgeClass: "bg-hazard-900/50 text-hazard-400 border-hazard-800/40",
    suggestions: [
      "Should I tell them how I feel?",
      "What if I ask them out this week?",
      "Should I end this relationship?",
      "What if I try long-distance?",
    ],
    placeholder: "I met someone at a conference and we've been texting. Should I tell them I'm interested?",
    showPersonalContext: true,
  },
  financial: {
    label: "Financial",
    icon: TrendingUp,
    color: "signal",
    activeClass: "border-signal-700/60 bg-signal-500/10 text-signal-400",
    badgeClass: "bg-signal-900/50 text-signal-400 border-signal-800/40",
    suggestions: [
      "Should I invest heavily in index funds now?",
      "What if I bought a house this year?",
      "Should I quit my job to freelance full-time?",
      "What if I moved to a lower cost-of-living city?",
    ],
    placeholder: "Should I put 50% of my savings into index funds over the next year?",
    showPersonalContext: false,
  },
  health: {
    label: "Health",
    icon: Activity,
    color: "nebula",
    activeClass: "border-nebula-700/60 bg-nebula-500/10 text-nebula-400",
    badgeClass: "bg-nebula-900/50 text-nebula-400 border-nebula-800/40",
    suggestions: [
      "What if I trained for a marathon?",
      "Should I try a 6-month diet change?",
      "What if I got therapy for burnout?",
      "Should I take a 3-month sabbatical?",
    ],
    placeholder: "What if I committed to training for a marathon over the next 6 months?",
    showPersonalContext: true,
  },
  personal: {
    label: "Personal",
    icon: User,
    color: "nebula",
    activeClass: "border-nebula-700/60 bg-nebula-500/10 text-nebula-400",
    badgeClass: "bg-nebula-900/50 text-nebula-400 border-nebula-800/40",
    suggestions: [
      "What if I moved to a different country?",
      "Should I reconnect with old friends?",
      "What if I took a gap year?",
      "Should I learn a completely new skill?",
    ],
    placeholder: "What if I took a year off to travel and figure out what I really want?",
    showPersonalContext: true,
  },
};

/* ── Combination suggestions ── */
const COMBINATION_SUGGESTIONS: Record<string, string[]> = {
  "career+romantic": [
    "Should I take the job offer across the country even if it means long-distance?",
    "What if my career ambitions are slowly pulling us apart?",
    "Should I stay in this city for my partner instead of chasing the opportunity?",
  ],
  "career+financial": [
    "Should I quit my job to start a company and burn through my savings?",
    "What if I took a 40% pay cut to pursue work I actually care about?",
    "Should I stay for the equity vesting or leave for the dream role?",
  ],
  "career+health": [
    "Should I leave my high-stress job even though it pays well?",
    "What if burnout forces me to choose between my career and my health?",
    "Should I take a sabbatical to recover or push through?",
  ],
  "career+personal": [
    "Should I take the dream job abroad even though it changes everything?",
    "What if I stopped optimizing for career success and started optimizing for meaning?",
    "Should I follow the opportunity or stay where my life is rooted?",
  ],
  "romantic+financial": [
    "Should we move in together even though our finances are incompatible?",
    "What if this relationship is costing me my financial independence?",
    "Should I invest in this relationship or my financial security first?",
  ],
  "romantic+health": [
    "Should I tell them about my mental health struggles or keep it private?",
    "What if caring for my partner is affecting my own wellbeing?",
    "Should I prioritize healing myself before pursuing this connection?",
  ],
  "romantic+personal": [
    "Should I change who I am to make this relationship work?",
    "What if I chose myself instead of the relationship?",
    "Should I confess my feelings even though the timing is terrible?",
  ],
  "financial+health": [
    "Should I take the high-paying stressful job or the low-paying fulfilling one?",
    "What if I invested in my health instead of my portfolio this year?",
    "Should I spend money on therapy or keep saving aggressively?",
  ],
  "financial+personal": [
    "Should I spend my savings on a year of travel or keep investing?",
    "What if financial security isn't actually what I want from life?",
    "Should I optimize for wealth or for freedom?",
  ],
  "health+personal": [
    "Should I leave everything to focus on healing and reset?",
    "What if prioritizing my mental health means disappointing everyone around me?",
    "Should I upend my whole life to get well, or manage within it?",
  ],
};

function getCombinationSuggestions(categories: SimulationCategory[]): string[] {
  if (categories.length === 1) return CATEGORY_CONFIG[categories[0]].suggestions;
  const key = [...categories].sort().join("+");
  return COMBINATION_SUGGESTIONS[key] ?? CATEGORY_CONFIG[categories[0]].suggestions;
}

/* ── DB node shape returned by /api/simulations/[id] ── */
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
      certainty: n.certainty ?? undefined,
      timeframe: n.timeframe ?? "",
      timeframeStart: n.timeframeStart ?? undefined,
      timeframeEnd: n.timeframeEnd ?? undefined,
      granularity: n.granularity ?? undefined,
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
  hasSavedKeys = false,
  savedProvider: initialSavedProvider = "claude",
}: {
  onClose: () => void;
  onSimulate: (title: string, apiKey: string, provider: string, categories: SimulationCategory[], personalContext?: string) => Promise<void>;
  hasSavedKeys?: boolean;
  savedProvider?: "claude" | "openai" | "custom";
}) {
  const [categories, setCategories] = useState<SimulationCategory[]>(["career"]);
  const [title, setTitle] = useState("");
  const [personalContext, setPersonalContext] = useState("");
  const [apiKey, setApiKey] = useState(hasSavedKeys ? "__profile__" : "");
  const [provider, setProvider] = useState(hasSavedKeys ? initialSavedProvider : "claude");
  const [useSavedKey, setUseSavedKey] = useState(hasSavedKeys);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCombo = categories.length > 1;
  const showPersonalContext = categories.some((c) => CATEGORY_CONFIG[c].showPersonalContext);
  const suggestions = getCombinationSuggestions(categories);
  const comboLabel = categories.map((c) => CATEGORY_CONFIG[c].label).join(" × ");
  const placeholder = isCombo
    ? `How does my ${categories.map((c) => CATEGORY_CONFIG[c].label.toLowerCase()).join(" and ")} life intersect in this decision?`
    : CATEGORY_CONFIG[categories[0]].placeholder;

  const toggleCategory = (cat: SimulationCategory) => {
    setTitle("");
    setCategories((prev) =>
      prev.includes(cat)
        ? prev.length > 1 ? prev.filter((c) => c !== cat) : prev
        : [...prev, cat]
    );
  };

  const effectiveApiKey = useSavedKey ? "__profile__" : apiKey;

  const handle = async () => {
    if (!title.trim() || !effectiveApiKey.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      await onSimulate(title.trim(), effectiveApiKey.trim(), provider, categories, personalContext.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
      setGenerating(false);
    }
  };

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
        className="relative glass-card rounded-2xl p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">New simulation</h2>
            <p className="text-text-muted text-sm mt-0.5">
              {isCombo ? `Exploring ${comboLabel}` : "Pose a life decision to explore"}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category multi-select */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Life domains</p>
            {isCombo && (
              <span className="text-xs text-oracle-400 font-medium">
                {comboLabel} combination
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(CATEGORY_CONFIG) as SimulationCategory[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const Icon = cfg.icon;
              const isActive = categories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    isActive ? cfg.activeClass : "border-border text-text-muted hover:text-text-secondary hover:border-border-bright"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                  {isActive && categories.length > 1 && (
                    <span className="w-3.5 h-3.5 rounded-full bg-current opacity-30 flex items-center justify-center text-[8px]">✓</span>
                  )}
                </button>
              );
            })}
          </div>
          {isCombo && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-text-ghost mt-2"
            >
              The Oracle will generate futures where these life areas genuinely intersect and interact.
            </motion.p>
          )}
        </div>

        {/* Decision input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">Your decision</label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200 resize-none"
          />
        </div>

        {/* Personal context */}
        {showPersonalContext && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Personal context <span className="text-text-ghost font-normal">(optional)</span>
            </label>
            <textarea
              value={personalContext}
              onChange={(e) => setPersonalContext(e.target.value)}
              placeholder={
                categories.includes("romantic")
                  ? "Share relevant context — how long you've known them, what's made you hesitate, your current situation…"
                  : "Any personal context that would help the Oracle give sharper predictions…"
              }
              rows={2}
              className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200 resize-none"
            />
          </div>
        )}

        {/* Quick suggestions */}
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-2">
            {isCombo ? `${comboLabel} scenarios` : "Quick suggestions"}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setTitle(s)}
                className="text-xs px-3 py-1.5 rounded-lg bg-void-800/60 border border-border hover:border-oracle-800/60 hover:text-oracle-400 text-text-secondary transition-all duration-150 text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* API key */}
        <div className="mb-4 glass rounded-xl p-4 space-y-3 border border-border-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Key className="w-3.5 h-3.5" />
              <span>AI provider &amp; key</span>
            </div>
            {hasSavedKeys && (
              <button
                type="button"
                onClick={() => {
                  setUseSavedKey(!useSavedKey);
                  if (!useSavedKey) {
                    setApiKey("__profile__");
                    setProvider(initialSavedProvider);
                  } else {
                    setApiKey("");
                  }
                }}
                className={`text-xs px-2 py-1 rounded-lg border transition-all duration-150 ${
                  useSavedKey
                    ? "border-oracle-700/60 bg-oracle-500/10 text-oracle-400"
                    : "border-border text-text-muted hover:text-text-secondary hover:border-border-bright"
                }`}
              >
                {useSavedKey ? `Using saved ${initialSavedProvider} key` : "Use saved key"}
              </button>
            )}
          </div>
          {useSavedKey ? (
            <p className="text-xs text-oracle-400/80 bg-oracle-900/20 border border-oracle-800/30 rounded-lg px-3 py-2">
              Your saved {initialSavedProvider} key from Profile will be used automatically.
            </p>
          ) : (
            <div className="flex gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as "claude" | "openai" | "custom")}
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
          )}
          <p className="text-xs text-text-ghost">
            Save your key in{" "}
            <a href="/profile" className="text-oracle-500 hover:underline">Profile → AI Keys</a>{" "}
            to reuse it across sessions.
          </p>
        </div>

        {error && <p className="text-xs text-hazard-400 mb-3">{error}</p>}

        <button
          onClick={handle}
          disabled={!title.trim() || (!useSavedKey && !apiKey.trim()) || generating}
          className="w-full flex items-center justify-center gap-2 bg-oracle-500 hover:bg-oracle-400 disabled:opacity-50 disabled:cursor-not-allowed text-void-950 font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-[0_0_24px_oklch(72%_0.175_76_/_0.5)] text-sm"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Generating futures…</>
          ) : isCombo ? (
            <><Sparkles className="w-4 h-4" />Generate {comboLabel} tree</>
          ) : (
            <><Sparkles className="w-4 h-4" />Generate future tree</>
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
  const [hasSavedKeys, setHasSavedKeys] = useState(false);
  const [savedProvider, setSavedProvider] = useState<"claude" | "openai" | "custom">("claude");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

    // Pre-populate provider from saved profile keys
    fetch("/api/profile/keys")
      .then((r) => (r.ok ? r.json() : []))
      .then((keys: Array<{ provider: string; maskedKey: string }>) => {
        if (keys.length > 0) {
          setHasSavedKeys(true);
          const preferred =
            keys.find((k) => k.provider === "claude") ??
            keys.find((k) => k.provider === "openai") ??
            keys[0];
          setSavedProvider(preferred.provider as "claude" | "openai" | "custom");
        }
      })
      .catch(() => {});
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
    // Keep sidebar node count in sync
    if (oracle.simulationId) {
      setSimulations((prev) =>
        prev.map((s) =>
          s.id === oracle.simulationId
            ? { ...s, nodeCount: oracle.nodes.length }
            : s
        )
      );
    }
  }, [oracle.simulationId, oracle.nodes, oracle.edges]);

  // Cmd+N / Ctrl+N keyboard shortcut to open new simulation modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setShowNewModal(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSimulate = useCallback(
    async (title: string, apiKey: string, provider: string, categories: SimulationCategory[] = ["career"], personalContext?: string) => {
      setLastApiKey(apiKey);
      setLastProvider(provider as "claude" | "openai" | "custom");

      const profile = {
        name: session?.user?.name ?? "",
        skills: [],
        experience: [],
        education: [],
        personalContext,
        categories,
      };

      const result = await oracle.simulate({
        decision: title,
        profile,
        apiKey,
        provider: provider as "claude" | "openai" | "custom",
        categories,
      });

      const newSim: SimulationMeta = {
        id: result.simulationId,
        title,
        nodeCount: result.tree.nodes.length,
        createdAt: new Date().toISOString().split("T")[0],
        status: "complete",
        categories,
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
    async (nodeId: string, depth = 1, granularity?: Granularity) => {
      if (!lastApiKey || !oracle.simulationId) return;
      const profile = {
        name: session?.user?.name ?? "",
        skills: [],
        experience: [],
        education: [],
      };
      if (depth > 1) {
        await oracle.deepExtendNode({
          nodeId,
          simulationId: oracle.simulationId,
          profile,
          apiKey: lastApiKey,
          provider: lastProvider,
          depth,
          granularity,
        });
      } else {
        await oracle.extendNode({
          nodeId,
          profile,
          apiKey: lastApiKey,
          provider: lastProvider,
        });
      }
    },
    [session, oracle, lastApiKey, lastProvider]
  );

  const commitRename = useCallback(async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    setRenamingId(null);
    setSimulations((prev) => prev.map((s) => s.id === id ? { ...s, title: renameValue.trim() } : s));
    await fetch(`/api/simulations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue.trim() }),
    }).catch(() => {});
  }, [renameValue]);

  const handleDeleteSim = useCallback(async (id: string) => {
    setDeletingId(null);
    setSimulations((prev) => prev.filter((s) => s.id !== id));
    if (activeSimId === id) {
      const remaining = simulations.filter((s) => s.id !== id);
      setActiveSimId(remaining[0]?.id ?? null);
    }
    await fetch(`/api/simulations/${id}`, { method: "DELETE" }).catch(() => {});
  }, [simulations, activeSimId]);

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
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-text-ghost border border-border rounded px-1 py-0.5 font-mono">⌘N</kbd>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-xs font-medium text-text-ghost uppercase tracking-wider px-2 py-1.5">
              Recent simulations
            </p>
            {simulations.map((sim) => {
              const cats = (sim.categories ?? ["career"]) as SimulationCategory[];
              const isCombo = cats.length > 1;
              return (
                <div
                  key={sim.id}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-150 group cursor-pointer ${
                    activeSimId === sim.id
                      ? "bg-oracle-900/40 border border-oracle-800/50 text-text-primary"
                      : "hover:bg-void-800/60 text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => {
                    if (renamingId === sim.id) return;
                    setActiveSimId(sim.id);
                    setSelectedNodeId(null);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <GitBranch className={`w-3.5 h-3.5 shrink-0 ${activeSimId === sim.id ? "text-oracle-500" : "text-text-muted"}`} />
                    <span className="text-sm font-medium truncate leading-tight flex-1">{sim.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-5 flex-wrap">
                    {isCombo ? (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border bg-oracle-900/40 text-oracle-400 border-oracle-800/40 shrink-0">
                        <Sparkles className="w-2.5 h-2.5" />
                        {cats.map((c) => CATEGORY_CONFIG[c].label).join(" × ")}
                      </span>
                    ) : (
                      (() => {
                        const cfg = CATEGORY_CONFIG[cats[0]];
                        const Icon = cfg.icon;
                        return (
                          <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border shrink-0 ${cfg.badgeClass}`}>
                            <Icon className="w-2.5 h-2.5" />
                            {cfg.label}
                          </span>
                        );
                      })()
                    )}
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
                  {/* Inline rename / delete actions */}
                  <div
                    className="pl-5 flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renamingId === sim.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(sim.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={() => commitRename(sim.id)}
                        className="text-xs bg-void-800 border border-oracle-700/60 rounded px-2 py-0.5 text-text-primary outline-none w-full"
                      />
                    ) : (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRenamingId(sim.id); setRenameValue(sim.title); }}
                          className="p-1 rounded text-text-ghost hover:text-oracle-400 transition-colors"
                          title="Rename"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingId(deletingId === sim.id ? null : sim.id); }}
                          className="p-1 rounded text-text-ghost hover:text-hazard-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                  <AnimatePresence>
                    {deletingId === sim.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-5 flex items-center gap-2 py-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-hazard-400">Delete?</span>
                        <button onClick={() => handleDeleteSim(sim.id)} className="text-xs text-hazard-400 hover:text-hazard-300 font-medium">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-xs text-text-muted hover:text-text-secondary">Cancel</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Empty state hint for new users */}
            {simulations.every((s) => s.id.startsWith("demo-")) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 mx-1 p-4 rounded-xl border border-dashed border-border text-center"
              >
                <Sparkles className="w-5 h-5 text-oracle-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-text-secondary mb-1">Your simulations appear here</p>
                <p className="text-xs text-text-ghost leading-relaxed">
                  Create your first simulation to see probability-weighted futures for your decisions.
                </p>
              </motion.div>
            )}
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
            hasSavedKeys={hasSavedKeys}
            savedProvider={savedProvider}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import type { Node, Edge } from "@xyflow/react";

/* ─── AI Provider types ─────────────────────────────────────────────────────── */

export type AIProvider = "claude" | "openai" | "custom";

export interface AIClientConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

/* ─── Simulation types ──────────────────────────────────────────────────────── */

export interface SimulationRequest {
  decision: string;
  profile: UserProfile;
  depth?: number;
  branchCount?: number;
}

export interface ExtendRequest {
  nodeId: string;
  nodeContext: FutureNodeData;
  parentChain: FutureNodeData[];
  profile: UserProfile;
  branchCount?: number;
}

export type SimulationCategory = "career" | "romantic" | "financial" | "health" | "personal";

export interface UserProfile {
  name: string;
  bio?: string;
  location?: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    years?: number;
  }>;
  education: Array<{
    institution: string;
    degree?: string;
  }>;
  riskTolerance?: "low" | "medium" | "high";
  timeHorizon?: string;
  personalContext?: string;
  category?: SimulationCategory;
}

export type Granularity = "month" | "year" | "decade";

export interface FutureNodeData extends Record<string, unknown> {
  title: string;
  description: string;
  probability: number;
  timeframe: string;
  depth: number;
  isRoot?: boolean;
  certainty?: number;
  granularity?: Granularity;
  timeframeStart?: string;
  timeframeEnd?: string;
  details?: {
    pros: string[];
    cons: string[];
    keyEvents: string[];
    skillsNeeded?: string[];
    financialImpact?: string;
    emotionalImpact?: string;
  };
  metadata?: {
    model?: string;
    generatedAt?: string;
  };
}

export type FutureTreeNode = Node<FutureNodeData>;
export type FutureTreeEdge = Edge;

export interface SimulationTree {
  nodes: FutureTreeNode[];
  edges: FutureTreeEdge[];
}

/* ─── Demo data ─────────────────────────────────────────────────────────────── */

export const DEMO_SIMULATION: SimulationTree = {
  nodes: [
    {
      id: "root",
      type: "futureNode",
      position: { x: 0, y: 0 },
      data: {
        title: "Change career to AI/ML",
        description:
          "You make the decision to transition your career from software engineering into AI/ML engineering within the next 12 months.",
        probability: 1,
        timeframe: "Now",
        depth: 0,
        isRoot: true,
      },
    },
    // ── Level 1 branches ──
    {
      id: "l1-startup",
      type: "futureNode",
      position: { x: 440, y: -480 },
      data: {
        title: "Join an AI startup",
        description:
          "You land a founding engineer role at a Series A AI startup, trading salary security for equity and high-velocity learning.",
        probability: 0.38,
        timeframe: "6–12 months",
        depth: 1,
        details: {
          pros: ["Equity upside (potential 50-200x)", "Cutting-edge work", "Direct access to founders"],
          cons: ["60% startup failure rate", "Lower base salary", "High uncertainty"],
          keyEvents: ["Pass technical screen", "Negotiate equity", "Onboard in weeks"],
        },
      },
    },
    {
      id: "l1-grad",
      type: "futureNode",
      position: { x: 440, y: 0 },
      data: {
        title: "Go back to school (MS/PhD)",
        description:
          "You enroll in a top-tier ML graduate program, gaining deep theoretical foundations and powerful research connections.",
        probability: 0.28,
        timeframe: "3–6 months to apply",
        depth: 1,
        details: {
          pros: ["Deep domain expertise", "Research pedigree", "Academic network"],
          cons: ["2–5 year investment", "Opportunity cost", "Academic lifestyle"],
          keyEvents: ["GRE prep", "SOP writing", "Admission decisions"],
        },
      },
    },
    {
      id: "l1-self",
      type: "futureNode",
      position: { x: 440, y: 480 },
      data: {
        title: "Self-taught + projects",
        description:
          "You self-study via fast.ai, papers, and build a portfolio of impressive ML projects to break in on your own terms.",
        probability: 0.34,
        timeframe: "3–9 months",
        depth: 1,
        details: {
          pros: ["Cheapest path", "Move at your pace", "Portfolio shows initiative"],
          cons: ["No formal credential", "Gaps in theory", "Harder to negotiate salary"],
          keyEvents: ["Complete fast.ai", "Publish Kaggle results", "Open source contribution"],
        },
      },
    },
    // ── Level 2: From startup ──
    {
      id: "l2-startup-win",
      type: "futureNode",
      position: { x: 880, y: -680 },
      data: {
        title: "Startup gets acquired",
        description:
          "The startup is acquired by a major tech company. Your equity vests and you receive a $400K+ liquidity event.",
        probability: 0.22,
        timeframe: "2–4 years",
        depth: 2,
        details: {
          pros: ["Financial freedom", "Big-tech credentials", "Network explosion"],
          cons: ["Cultural integration challenges", "Role may change post-acquisition"],
          keyEvents: ["Series B raise", "Acquihire offer", "Equity vesting cliff"],
        },
      },
    },
    {
      id: "l2-startup-pivot",
      type: "futureNode",
      position: { x: 880, y: -380 },
      data: {
        title: "Startup fails — pivot to big tech",
        description:
          "The startup runs out of runway. You leverage your experience and land an L5 ML engineer role at Google or Meta.",
        probability: 0.16,
        timeframe: "1–3 years",
        depth: 2,
        details: {
          pros: ["Recession-proof salary", "Strong brand", "Best-in-class infra"],
          cons: ["Culture shock", "Slower pace", "Equity is RSUs not startup options"],
          keyEvents: ["Startup shutdown", "FAANG preparation", "Offer negotiation"],
        },
      },
    },
    // ── Level 2: From grad ──
    {
      id: "l2-grad-research",
      type: "futureNode",
      position: { x: 880, y: -100 },
      data: {
        title: "Academic research career",
        description:
          "You publish impactful papers, get cited, and become a recognized voice in the ML research community.",
        probability: 0.14,
        timeframe: "4–6 years",
        depth: 2,
        details: {
          pros: ["Intellectual freedom", "Global recognition", "Shape the field"],
          cons: ["Low income during PhD", "Highly competitive publishing", "Slow career progression"],
          keyEvents: ["First paper acceptance", "Conference presentations", "Tenure track application"],
        },
      },
    },
    {
      id: "l2-grad-industry",
      type: "futureNode",
      position: { x: 880, y: 180 },
      data: {
        title: "Industry ML researcher",
        description:
          "Your MS opens doors to research scientist roles at OpenAI, Anthropic, or DeepMind — the best of both worlds.",
        probability: 0.14,
        timeframe: "2–4 years",
        depth: 2,
        details: {
          pros: ["Top-of-market comp", "Resource access", "Publish AND ship"],
          cons: ["Extremely competitive", "High-pressure environment"],
          keyEvents: ["Internship conversion", "Research publication", "Offer from frontier lab"],
        },
      },
    },
    // ── Level 2: From self-taught ──
    {
      id: "l2-self-contract",
      type: "futureNode",
      position: { x: 880, y: 400 },
      data: {
        title: "Independent AI consultant",
        description:
          "Your portfolio and blog attract enterprise clients. You go independent, charging $200–400/hr for AI strategy.",
        probability: 0.17,
        timeframe: "12–24 months",
        depth: 2,
        details: {
          pros: ["Full autonomy", "Income ceiling is yours", "Location independent"],
          cons: ["Feast/famine income", "Solo business overhead", "No benefits"],
          keyEvents: ["First paid client", "Content marketing compound", "Agency formation"],
        },
      },
    },
    {
      id: "l2-self-startup",
      type: "futureNode",
      position: { x: 880, y: 680 },
      data: {
        title: "Found your own AI company",
        description:
          "A niche ML problem you keep encountering becomes a product. You raise a seed round and build a team.",
        probability: 0.17,
        timeframe: "18–36 months",
        depth: 2,
        details: {
          pros: ["Maximum upside potential", "Full creative control", "Build your vision"],
          cons: ["90%+ failure rate", "Enormous risk", "All-consuming commitment"],
          keyEvents: ["Identify painful problem", "Build MVP", "YC/seed raise"],
        },
      },
    },
  ],
  edges: [
    { id: "e-root-l1-startup", source: "root", target: "l1-startup", type: "branchEdge" },
    { id: "e-root-l1-grad", source: "root", target: "l1-grad", type: "branchEdge" },
    { id: "e-root-l1-self", source: "root", target: "l1-self", type: "branchEdge" },
    { id: "e-l1-startup-win", source: "l1-startup", target: "l2-startup-win", type: "branchEdge" },
    { id: "e-l1-startup-pivot", source: "l1-startup", target: "l2-startup-pivot", type: "branchEdge" },
    { id: "e-l1-grad-research", source: "l1-grad", target: "l2-grad-research", type: "branchEdge" },
    { id: "e-l1-grad-industry", source: "l1-grad", target: "l2-grad-industry", type: "branchEdge" },
    { id: "e-l1-self-contract", source: "l1-self", target: "l2-self-contract", type: "branchEdge" },
    { id: "e-l1-self-startup", source: "l1-self", target: "l2-self-startup", type: "branchEdge" },
  ],
};

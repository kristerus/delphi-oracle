import type { Granularity } from "./types";

/* ─── Ancestor context ──────────────────────────────────────────────────────── */

export interface AncestorContext {
  id: string;
  title: string;
  description: string;
  timeframe: string;
  depth: number;
  probability: number;
  certainty: number;
}

/* ─── Certainty decay ───────────────────────────────────────────────────────── */

/**
 * Calculates certainty for a prediction based on depth and granularity.
 * Deeper predictions and coarser granularities decay faster.
 *
 * depth 1 = first branch from root (high certainty ~0.85)
 * depth 5 = very deep chain (low certainty ~0.15–0.30)
 */
export function calculateCertaintyDecay(
  depth: number,
  baseProbability: number,
  granularity: Granularity
): number {
  // Decay rate per level: months degrade slowest (near-term), decades fastest
  const decayRate =
    granularity === "month" ? 0.12 : granularity === "year" ? 0.18 : 0.26;

  // Start at baseProbability and decay exponentially with each level beyond 1
  const depthFactor = Math.max(0, depth - 1);
  const decayed = baseProbability * Math.pow(1 - decayRate, depthFactor);

  return Math.max(0.05, Math.min(1, decayed));
}

/* ─── Granularity selection ─────────────────────────────────────────────────── */

/**
 * Determines appropriate prediction granularity based on tree depth.
 * Shallow = months (0–2 yr horizon), mid = years (2–10 yr), deep = decades (10–50 yr).
 */
export function getGranularityForDepth(depth: number): Granularity {
  if (depth <= 2) return "month";
  if (depth <= 4) return "year";
  return "decade";
}

/* ─── Timeframe estimation ──────────────────────────────────────────────────── */

/**
 * Parses a text timeframe (e.g. "6–12 months", "2–4 years") and returns
 * ISO date strings for start and end relative to today.
 */
export function estimateTimeframe(
  timeframeText: string,
  depth: number,
  granularity: Granularity
): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  // Match patterns like "6-12 months", "2–4 years", "1-2 decades"
  const match = timeframeText.match(
    /(\d+)\s*[-–]\s*(\d+)\s*(month|year|decade)/i
  );

  if (match) {
    const lo = parseInt(match[1]);
    const hi = parseInt(match[2]);
    const unit = match[3].toLowerCase();

    if (unit.startsWith("month")) {
      start.setMonth(start.getMonth() + lo);
      end.setMonth(end.getMonth() + hi);
    } else if (unit.startsWith("year")) {
      start.setFullYear(start.getFullYear() + lo);
      end.setFullYear(end.getFullYear() + hi);
    } else {
      start.setFullYear(start.getFullYear() + lo * 10);
      end.setFullYear(end.getFullYear() + hi * 10);
    }
  } else {
    // Fallback: estimate offset from depth and granularity
    if (granularity === "month") {
      const offset = (depth - 1) * 8;
      start.setMonth(start.getMonth() + offset);
      end.setMonth(end.getMonth() + offset + 12);
    } else if (granularity === "year") {
      const offset = (depth - 1) * 3;
      start.setFullYear(start.getFullYear() + offset);
      end.setFullYear(end.getFullYear() + offset + 4);
    } else {
      const offset = (depth - 1) * 15;
      start.setFullYear(start.getFullYear() + offset);
      end.setFullYear(end.getFullYear() + offset + 20);
    }
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

/* ─── Ancestry context builder ──────────────────────────────────────────────── */

/**
 * Formats the full ancestor chain into a readable prompt string.
 * Lets the AI understand the causal path leading to this prediction point.
 */
export function buildAncestryContext(ancestors: AncestorContext[]): string {
  if (!ancestors.length) return "No prior context — this is the root decision.";

  return ancestors
    .map(
      (a, i) =>
        `${i + 1}. [Depth ${a.depth}, ${Math.round(a.certainty * 100)}% certainty] "${a.title}"\n` +
        `   Timeframe: ${a.timeframe} | Probability: ${Math.round(a.probability * 100)}%\n` +
        `   ${a.description}`
    )
    .join("\n\n");
}

/* ─── Leaf node detection ───────────────────────────────────────────────────── */

/**
 * Returns IDs of all leaf nodes (nodes with no children) in a flat node list.
 */
export function findLeafNodes(
  nodes: Array<{ id: string; parentId?: string | null }>
): string[] {
  const hasChildren = new Set(
    nodes.map((n) => n.parentId).filter(Boolean) as string[]
  );
  return nodes.filter((n) => !hasChildren.has(n.id)).map((n) => n.id);
}

/* ─── Auto-extend plan ──────────────────────────────────────────────────────── */

/**
 * Generates a list of (nodeId, depth, granularity) extension jobs for
 * auto-extending all leaves N levels deep. Returns jobs in BFS order
 * (level by level) to prevent runaway branching.
 *
 * Caps at maxLevels=3 and maxTotalNodes=50 to stay within API budget.
 */
export interface ExtendJob {
  nodeId: string;
  depth: number;
  granularity: Granularity;
}

export function planAutoExtend(
  leafIds: string[],
  leafDepths: Record<string, number>,
  targetLevels: number,
  maxTotalNodes = 50
): ExtendJob[] {
  const jobs: ExtendJob[] = [];
  const levels = Math.min(targetLevels, 3);

  // Initial batch: extend each leaf
  let currentBatch: ExtendJob[] = leafIds.map((id) => ({
    nodeId: id,
    depth: leafDepths[id] ?? 1,
    granularity: getGranularityForDepth((leafDepths[id] ?? 1) + 1),
  }));

  for (let level = 0; level < levels; level++) {
    if (jobs.length + currentBatch.length > maxTotalNodes) break;
    jobs.push(...currentBatch);

    // Next batch would be children of current batch (3 branches each)
    currentBatch = currentBatch.flatMap((job) =>
      Array.from({ length: 3 }, (_, i) => ({
        nodeId: `${job.nodeId}_child_${i}`, // placeholder; real IDs come from DB after insert
        depth: job.depth + 1,
        granularity: getGranularityForDepth(job.depth + 1),
      }))
    );
  }

  return jobs;
}

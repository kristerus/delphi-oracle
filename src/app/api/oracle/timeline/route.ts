import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { futureNodes, simulations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { estimateTimeframe, getGranularityForDepth } from "@/lib/ai/deep-extend";

/* ─── GET /api/oracle/timeline?simulationId=xxx ──────────────────────────────── */

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const simulationId = searchParams.get("simulationId");
    if (!simulationId) {
      return NextResponse.json({ error: "simulationId is required" }, { status: 400 });
    }

    // Verify simulation belongs to user
    const simulation = await db.query.simulations.findFirst({
      where: eq(simulations.id, simulationId),
    });
    if (!simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
    }
    if (simulation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nodes = await db
      .select()
      .from(futureNodes)
      .where(eq(futureNodes.simulationId, simulationId))
      .orderBy(futureNodes.depth);

    // ── Enrich nodes that lack timeframeStart/End ──
    const enriched = nodes.map((node) => {
      const granularity = node.granularity ?? getGranularityForDepth(node.depth);
      let start = node.timeframeStart;
      let end = node.timeframeEnd;

      if (!start || !end) {
        const tf = estimateTimeframe(node.timeframe ?? "", node.depth, granularity);
        start = tf.start;
        end = tf.end;
      }

      return {
        id: node.id,
        parentId: node.parentId,
        title: node.title,
        description: node.description,
        probability: node.probability,
        certainty: node.certainty,
        timeframe: node.timeframe,
        timeframeStart: start,
        timeframeEnd: end,
        granularity,
        depth: node.depth,
        details: node.details,
      };
    });

    // ── Group by time period ──
    const periods = groupByPeriod(enriched);

    // ── Build branch lane assignments ──
    // Root's direct children are the top-level branches; each gets a lane
    const root = enriched.find((n) => !n.parentId);
    const topBranches = enriched.filter((n) => n.parentId === root?.id);
    const laneMap = buildLaneMap(enriched, topBranches.map((b) => b.id));

    logger.info("Timeline built", {
      userId: session.user.id,
      simulationId,
      nodeCount: enriched.length,
      periodCount: periods.length,
    });

    return NextResponse.json({
      simulationId,
      title: simulation.title,
      nodes: enriched,
      periods,
      lanes: topBranches.map((b, i) => ({ branchId: b.id, laneIndex: i, title: b.title })),
      laneMap,
      timeRange: {
        start: enriched
          .map((n) => n.timeframeStart)
          .filter(Boolean)
          .sort()[0],
        end: enriched
          .map((n) => n.timeframeEnd)
          .filter(Boolean)
          .sort()
          .at(-1),
      },
    });
  } catch (err) {
    logger.error("Unhandled error in GET /api/oracle/timeline", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

interface EnrichedNode {
  id: string;
  parentId: string | null | undefined;
  title: string;
  timeframeStart: string | null | undefined;
  timeframeEnd: string | null | undefined;
  granularity: string;
  probability: number;
  certainty: number;
  depth: number;
}

interface TimePeriod {
  label: string;
  start: string;
  end: string;
  nodes: string[]; // node IDs
}

function groupByPeriod(nodes: EnrichedNode[]): TimePeriod[] {
  // Collect all unique year+granularity buckets
  const buckets = new Map<string, TimePeriod>();

  for (const node of nodes) {
    if (!node.timeframeStart) continue;
    const year = node.timeframeStart.slice(0, 4);
    const key = `${year}-${node.granularity}`;

    if (!buckets.has(key)) {
      const endYear = String(parseInt(year) + (node.granularity === "decade" ? 10 : node.granularity === "year" ? 1 : 0));
      buckets.set(key, {
        label: node.granularity === "month" ? node.timeframeStart.slice(0, 7) : year,
        start: node.timeframeStart,
        end: `${endYear}-12-31`,
        nodes: [],
      });
    }
    buckets.get(key)!.nodes.push(node.id);
  }

  return Array.from(buckets.values()).sort((a, b) => a.start.localeCompare(b.start));
}

function buildLaneMap(
  nodes: EnrichedNode[],
  topBranchIds: string[]
): Record<string, number> {
  // Assign each node a lane index based on which top-level branch it descends from
  const laneMap: Record<string, number> = {};
  const parentMap: Record<string, string | null | undefined> = {};
  for (const n of nodes) {
    parentMap[n.id] = n.parentId;
  }

  function getLane(nodeId: string): number {
    const idx = topBranchIds.indexOf(nodeId);
    if (idx !== -1) return idx;
    const parent = parentMap[nodeId];
    if (!parent) return 0;
    return getLane(parent);
  }

  for (const node of nodes) {
    laneMap[node.id] = getLane(node.id);
  }

  return laneMap;
}

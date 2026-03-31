import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { futureNodes, apiKeys, type FutureNode } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callAI, parseAIJson } from "@/lib/ai/client";
import {
  buildDeepContextPrompt,
  buildGranularitySystemPrompt,
} from "@/lib/ai/prompts";
import {
  buildAncestryContext,
  calculateCertaintyDecay,
  estimateTimeframe,
  findLeafNodes,
} from "@/lib/ai/deep-extend";
import type { AIClientConfig, UserProfile, Granularity } from "@/lib/ai/types";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeProfile } from "@/lib/sanitize";
import { logger, toUserError } from "@/lib/logger";
import { decrypt } from "@/lib/crypto";

interface DeepExtendRequest {
  nodeId: string;
  simulationId: string;
  profile: UserProfile;
  provider: "claude" | "openai" | "custom";
  apiKey: string;
  model?: string;
  depth?: number;           // how many auto-extend levels (1 = single extend, 2-3 = auto-extend)
  granularity?: Granularity;
  branchCount?: number;     // branches per level (default 3)
}

interface BranchResult {
  title: string;
  description: string;
  probability: number;
  certainty: number;
  timeframe: string;
  details: { pros: string[]; cons: string[]; keyEvents: string[]; skillsNeeded?: string[] };
}

/* ─── Walk the ancestor chain up to the root ─────────────────────────────────── */

async function buildAncestors(nodeId: string) {
  const ancestors: Array<{
    id: string;
    title: string;
    description: string;
    timeframe: string | null;
    depth: number;
    probability: number;
    certainty: number;
  }> = [];

  let currentId: string | null = nodeId;

  while (currentId) {
    const rows = await db.select().from(futureNodes).where(eq(futureNodes.id, currentId)).limit(1);
    const node: FutureNode | undefined = rows[0];
    if (!node) break;
    ancestors.unshift({
      id: node.id,
      title: node.title,
      description: node.description,
      timeframe: node.timeframe,
      depth: node.depth,
      probability: node.probability,
      certainty: node.certainty ?? 1,
    });
    currentId = node.parentId ?? null;
  }

  return ancestors;
}

/* ─── Insert a batch of branches for a given parent ─────────────────────────── */

async function insertBranches(
  branches: BranchResult[],
  parentNodeId: string,
  simulationId: string,
  parentDepth: number,
  granularity: Granularity,
  aiModel: string,
  parentX: number,
  parentY: number
) {
  const newNodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }> = [];
  const newEdges: Array<{ id: string; source: string; target: string; type: string }> = [];
  const nodeCount = branches.length;
  const newDepth = parentDepth + 1;

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const nodeId = crypto.randomUUID();
    const yOffset = parentY + (i - (nodeCount - 1) / 2) * 220;
    const posX = parentX + 440;

    const certainty = calculateCertaintyDecay(newDepth, branch.probability, granularity);
    const tf = estimateTimeframe(branch.timeframe ?? "", newDepth, granularity);

    await db.insert(futureNodes).values({
      id: nodeId,
      simulationId,
      parentId: parentNodeId,
      title: branch.title,
      description: branch.description,
      probability: branch.probability,
      certainty,
      granularity,
      timeframeStart: tf.start,
      timeframeEnd: tf.end,
      timeframe: branch.timeframe,
      depth: newDepth,
      details: branch.details,
      metadata: {
        model: aiModel,
        generatedAt: new Date().toISOString(),
        parentDecision: `deep-extend:${parentNodeId}`,
      },
      positionX: posX,
      positionY: yOffset,
    });

    newNodes.push({
      id: nodeId,
      type: "futureNode",
      position: { x: posX, y: yOffset },
      data: {
        title: branch.title,
        description: branch.description,
        probability: branch.probability,
        certainty,
        granularity,
        timeframeStart: tf.start,
        timeframeEnd: tf.end,
        timeframe: branch.timeframe,
        depth: newDepth,
        details: branch.details,
      },
    });

    newEdges.push({
      id: `e-${parentNodeId}-${nodeId}`,
      source: parentNodeId,
      target: nodeId,
      type: "branchEdge",
    });
  }

  return { newNodes, newEdges };
}

/* ─── POST /api/oracle/deep-extend ──────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(session.user.id, "extend");
    if (!rl.allowed) {
      const retryAfterSeconds = Math.ceil((rl.resetAt.getTime() - Date.now()) / 1_000);
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rl.resetAt.getTime() / 1_000)),
          },
        }
      );
    }

    const body: DeepExtendRequest = await req.json().catch(() => null);
    if (!body?.nodeId || !body?.simulationId || !body?.profile || !body?.apiKey) {
      return NextResponse.json(
        { error: "nodeId, simulationId, profile, and apiKey are required" },
        { status: 400 }
      );
    }

    // Allow using saved profile key instead of client-supplied key
    let resolvedApiKey = body.apiKey as string;
    let resolvedProvider = body.provider as string;
    if (resolvedApiKey === "__profile__") {
      const savedKeys = await db.query.apiKeys.findMany({
        where: eq(apiKeys.userId, session.user.id),
      });
      const preferred =
        savedKeys.find((k) => k.provider === (body.provider ?? "claude")) ??
        savedKeys.find((k) => k.provider === "claude") ??
        savedKeys.find((k) => k.provider === "openai") ??
        savedKeys[0];
      if (!preferred) {
        return NextResponse.json(
          { error: "No saved API key found. Add one in Settings \u2192 AI Providers." },
          { status: 400 }
        );
      }
      resolvedApiKey = decrypt(preferred.encryptedKey);
      resolvedProvider = preferred.provider;
    }

    let cleanProfile: UserProfile;
    try {
      cleanProfile = sanitizeProfile(body.profile as unknown as Record<string, unknown>) as unknown as UserProfile;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid input" },
        { status: 400 }
      );
    }

    const targetNode = await db.query.futureNodes.findFirst({
      where: eq(futureNodes.id, body.nodeId),
    });
    if (!targetNode) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const extendDepth = Math.min(body.depth ?? 1, 3);
    const branchCount = Math.min(body.branchCount ?? 3, 5);
    const granularity: Granularity = body.granularity ?? "year";

    const aiConfig: AIClientConfig = {
      provider: (resolvedProvider ?? "claude") as "claude" | "openai" | "custom",
      apiKey: resolvedApiKey,
      model: body.model,
    };
    const aiModel = body.model ?? resolvedProvider ?? "claude";

    // Build full ancestor chain for deep context
    const ancestors = await buildAncestors(body.nodeId);
    const ancestryContext = buildAncestryContext(
      ancestors.map((a) => ({
        ...a,
        timeframe: a.timeframe ?? "",
      }))
    );

    logger.info("Deep extending node", {
      userId: session.user.id,
      nodeId: body.nodeId,
      depth: extendDepth,
      granularity,
    });

    // ── Level 1: extend target node ──
    const systemPrompt = buildGranularitySystemPrompt(granularity);
    const userPrompt = buildDeepContextPrompt(
      ancestryContext,
      targetNode.title,
      targetNode.description,
      granularity,
      branchCount,
      cleanProfile
    );

    const aiResponse = await callAI(aiConfig, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const parsed = parseAIJson<{ branches: BranchResult[] }>(aiResponse.content);
    if (!parsed.branches || !Array.isArray(parsed.branches)) {
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    const allNodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }> = [];
    const allEdges: Array<{ id: string; source: string; target: string; type: string }> = [];

    const level1 = await insertBranches(
      parsed.branches,
      body.nodeId,
      body.simulationId,
      targetNode.depth,
      granularity,
      aiModel,
      targetNode.positionX ?? 0,
      targetNode.positionY ?? 0
    );
    allNodes.push(...level1.newNodes);
    allEdges.push(...level1.newEdges);

    // ── Levels 2..N: auto-extend each new leaf ──
    if (extendDepth > 1) {
      let leafNodes = level1.newNodes;

      for (let level = 2; level <= extendDepth; level++) {
        const nextLeaves: typeof level1.newNodes = [];

        for (const leafNode of leafNodes) {
          // Build updated ancestry for this leaf
          const leafAncestors = await buildAncestors(leafNode.id);
          const leafAncestry = buildAncestryContext(
            leafAncestors.map((a) => ({ ...a, timeframe: a.timeframe ?? "" }))
          );

          const leafPrompt = buildDeepContextPrompt(
            leafAncestry,
            leafNode.data.title as string,
            leafNode.data.description as string,
            granularity,
            branchCount,
            cleanProfile
          );

          const leafResponse = await callAI(aiConfig, [
            { role: "system", content: systemPrompt },
            { role: "user", content: leafPrompt },
          ]).catch(() => null);

          if (!leafResponse) continue;

          const leafParsed = parseAIJson<{ branches: BranchResult[] }>(leafResponse.content);
          if (!leafParsed.branches?.length) continue;

          const leafLevel = await insertBranches(
            leafParsed.branches,
            leafNode.id,
            body.simulationId,
            leafNode.data.depth as number,
            granularity,
            aiModel,
            leafNode.position.x,
            leafNode.position.y
          );
          allNodes.push(...leafLevel.newNodes);
          allEdges.push(...leafLevel.newEdges);
          nextLeaves.push(...leafLevel.newNodes);
        }

        leafNodes = nextLeaves;
        if (!leafNodes.length) break;
      }
    }

    // Return all leafIds for client-side "Extend All Leaves" follow-up
    const leafIds = findLeafNodes(
      allNodes.map((n) => ({
        id: n.id,
        parentId: allEdges.find((e) => e.target === n.id)?.source,
      }))
    );

    return NextResponse.json(
      { nodes: allNodes, edges: allEdges, leafIds },
      {
        headers: {
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt.getTime() / 1_000)),
        },
      }
    );
  } catch (err) {
    logger.error("Unhandled error in /api/oracle/deep-extend", { error: String(err) });
    return NextResponse.json({ error: toUserError(err) }, { status: 500 });
  }
}

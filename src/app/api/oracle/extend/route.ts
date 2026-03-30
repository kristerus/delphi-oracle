import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { futureNodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callAI, parseAIJson } from "@/lib/ai/client";
import { buildExtendPrompt, buildSimulationSystemPrompt } from "@/lib/ai/prompts";
import type { AIClientConfig, UserProfile } from "@/lib/ai/types";
import { nanoid } from "nanoid";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeProfile } from "@/lib/sanitize";
import { logger, toUserError } from "@/lib/logger";

interface ExtendRequest {
  nodeId: string;
  simulationId: string;
  profile: UserProfile;
  provider: "claude" | "openai" | "custom";
  apiKey: string;
  model?: string;
  branchCount?: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rl = checkRateLimit(session.user.id, "extend");
    if (!rl.allowed) {
      logger.warn("Rate limit exceeded", { userId: session.user.id, action: "extend" });
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfterSeconds),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1_000)),
          },
        }
      );
    }

    const body: ExtendRequest = await req.json().catch(() => null);
    if (!body?.nodeId || !body?.simulationId || !body?.profile || !body?.apiKey) {
      return NextResponse.json(
        { error: "nodeId, simulationId, profile, and apiKey are required" },
        { status: 400 }
      );
    }

    // Sanitize profile before AI call
    let cleanProfile: UserProfile;
    try {
      cleanProfile = sanitizeProfile(body.profile as unknown as Record<string, unknown>) as unknown as UserProfile;
    } catch (err) {
      logger.warn("Input sanitization rejected", { userId: session.user.id, error: String(err) });
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

    const parentChainTitles: string[] = [targetNode.title];

    const aiConfig: AIClientConfig = {
      provider: body.provider ?? "claude",
      apiKey: body.apiKey,
      model: body.model,
    };

    const messages = [
      { role: "system" as const, content: buildSimulationSystemPrompt() },
      {
        role: "user" as const,
        content: buildExtendPrompt(
          targetNode.title,
          targetNode.description,
          parentChainTitles,
          cleanProfile,
          body.branchCount ?? 3
        ),
      },
    ];

    logger.info("Extending node", { userId: session.user.id, nodeId: body.nodeId });

    const aiResponse = await callAI(aiConfig, messages).catch((err) => {
      logger.error("AI call failed", { userId: session.user.id, error: err.message });
      throw new Error(`AI call failed: ${err.message}`);
    });

    const parsed = parseAIJson<{
      branches: Array<{
        title: string;
        description: string;
        probability: number;
        timeframe: string;
        details: { pros: string[]; cons: string[]; keyEvents: string[] };
      }>;
    }>(aiResponse.content);

    if (!parsed.branches || !Array.isArray(parsed.branches)) {
      logger.error("Invalid AI response format", { userId: session.user.id });
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    const newDepth = (targetNode.depth ?? 0) + 1;
    const nodeCount = parsed.branches.length;
    const parentY = targetNode.positionY ?? 0;
    const parentX = targetNode.positionX ?? 0;

    const newNodes = await Promise.all(
      parsed.branches.map(async (branch, i) => {
        const nodeId = nanoid();
        const yOffset = parentY + (i - (nodeCount - 1) / 2) * 220;

        await db.insert(futureNodes).values({
          id: nodeId,
          simulationId: body.simulationId,
          parentId: body.nodeId,
          title: branch.title,
          description: branch.description,
          probability: branch.probability,
          timeframe: branch.timeframe,
          depth: newDepth,
          details: branch.details,
          metadata: {
            model: aiConfig.model ?? aiConfig.provider,
            generatedAt: new Date().toISOString(),
            parentDecision: targetNode.title,
          },
          positionX: parentX + 440,
          positionY: yOffset,
        });

        return {
          id: nodeId,
          type: "futureNode",
          position: { x: parentX + 440, y: yOffset },
          data: {
            title: branch.title,
            description: branch.description,
            probability: branch.probability,
            timeframe: branch.timeframe,
            depth: newDepth,
            details: branch.details,
          },
          branch,
        };
      })
    );

    return NextResponse.json(
      {
        nodes: newNodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
        edges: newNodes.map(({ id }) => ({
          id: `e-${body.nodeId}-${id}`,
          source: body.nodeId,
          target: id,
          type: "branchEdge",
        })),
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1_000)),
        },
      }
    );
  } catch (err) {
    logger.error("Unhandled error in /api/oracle/extend", { error: String(err) });
    return NextResponse.json(
      { error: toUserError(err) },
      { status: 500 }
    );
  }
}

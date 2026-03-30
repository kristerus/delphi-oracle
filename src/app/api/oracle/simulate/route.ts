import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { simulations, futureNodes } from "@/lib/db/schema";
import { callAI, parseAIJson } from "@/lib/ai/client";
import { buildSimulationSystemPrompt, buildSimulationUserPrompt } from "@/lib/ai/prompts";
import type { AIClientConfig, UserProfile, SimulationTree } from "@/lib/ai/types";
import { nanoid } from "nanoid";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserText, sanitizeProfile } from "@/lib/sanitize";
import { logger, toUserError } from "@/lib/logger";

interface SimulateRequest {
  decision: string;
  profile: UserProfile;
  provider: "claude" | "openai" | "custom";
  apiKey: string;
  model?: string;
  branchCount?: number;
}

interface AIBranch {
  title: string;
  description: string;
  probability: number;
  timeframe: string;
  details: {
    pros: string[];
    cons: string[];
    keyEvents: string[];
    skillsNeeded?: string[];
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rl = checkRateLimit(session.user.id, "simulate");
    if (!rl.allowed) {
      logger.warn("Rate limit exceeded", { userId: session.user.id, action: "simulate" });
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

    const body: SimulateRequest = await req.json().catch(() => null);
    if (!body?.decision || !body?.profile || !body?.apiKey) {
      return NextResponse.json(
        { error: "decision, profile, and apiKey are required" },
        { status: 400 }
      );
    }

    // Sanitize user inputs before forwarding to AI
    let cleanDecision: string;
    let cleanProfile: UserProfile;
    try {
      cleanDecision = sanitizeUserText(body.decision, "decision");
      cleanProfile = sanitizeProfile(body.profile as unknown as Record<string, unknown>) as unknown as UserProfile;
    } catch (err) {
      logger.warn("Input sanitization rejected", { userId: session.user.id, error: String(err) });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid input" },
        { status: 400 }
      );
    }

    const aiConfig: AIClientConfig = {
      provider: body.provider ?? "claude",
      apiKey: body.apiKey,
      model: body.model,
    };

    const messages = [
      { role: "system" as const, content: buildSimulationSystemPrompt() },
      {
        role: "user" as const,
        content: buildSimulationUserPrompt(
          cleanDecision,
          cleanProfile,
          body.branchCount ?? 3
        ),
      },
    ];

    logger.info("Starting simulation", { userId: session.user.id, provider: aiConfig.provider });

    const aiResponse = await callAI(aiConfig, messages).catch((err) => {
      logger.error("AI call failed", { userId: session.user.id, error: err.message });
      throw new Error(`AI call failed: ${err.message}`);
    });

    const parsed = parseAIJson<{ branches: AIBranch[] }>(aiResponse.content);
    if (!parsed.branches || !Array.isArray(parsed.branches)) {
      logger.error("Invalid AI response format", { userId: session.user.id });
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    // Persist simulation to DB
    const simId = nanoid();
    const rootId = nanoid();

    await db.insert(simulations).values({
      id: simId,
      userId: session.user.id,
      title: cleanDecision,
      rootNodeId: rootId,
      status: "complete",
      model: aiConfig.model ?? aiConfig.provider,
    });

    await db.insert(futureNodes).values({
      id: rootId,
      simulationId: simId,
      parentId: null,
      title: cleanDecision,
      description: `Simulation for: ${cleanDecision}`,
      probability: 1,
      timeframe: "Now",
      depth: 0,
      positionX: 0,
      positionY: 0,
    });

    const nodeCount = parsed.branches.length;
    const branchNodes = await Promise.all(
      parsed.branches.map(async (branch, i) => {
        const nodeId = nanoid();
        const yOffset = (i - (nodeCount - 1) / 2) * 260;

        await db.insert(futureNodes).values({
          id: nodeId,
          simulationId: simId,
          parentId: rootId,
          title: branch.title,
          description: branch.description,
          probability: branch.probability,
          timeframe: branch.timeframe,
          depth: 1,
          details: branch.details,
          metadata: {
            model: aiConfig.model ?? aiConfig.provider,
            generatedAt: new Date().toISOString(),
          },
          positionX: 440,
          positionY: yOffset,
        });

        return { id: nodeId, branch, yOffset };
      })
    );

    const tree: SimulationTree = {
      nodes: [
        {
          id: rootId,
          type: "futureNode",
          position: { x: 0, y: 0 },
          data: {
            title: cleanDecision,
            description: `Your simulation for: ${cleanDecision}`,
            probability: 1,
            timeframe: "Now",
            depth: 0,
            isRoot: true,
          },
        },
        ...branchNodes.map(({ id, branch, yOffset }) => ({
          id,
          type: "futureNode",
          position: { x: 440, y: yOffset },
          data: {
            title: branch.title,
            description: branch.description,
            probability: branch.probability,
            timeframe: branch.timeframe,
            depth: 1,
            details: branch.details,
          },
        })),
      ],
      edges: branchNodes.map(({ id }) => ({
        id: `e-${rootId}-${id}`,
        source: rootId,
        target: id,
        type: "branchEdge",
      })),
    };

    logger.info("Simulation complete", { userId: session.user.id, simulationId: simId });

    return NextResponse.json(
      { simulationId: simId, tree, usage: aiResponse.usage },
      {
        headers: {
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1_000)),
        },
      }
    );
  } catch (err) {
    logger.error("Unhandled error in /api/oracle/simulate", { error: String(err) });
    return NextResponse.json(
      { error: toUserError(err) },
      { status: 500 }
    );
  }
}

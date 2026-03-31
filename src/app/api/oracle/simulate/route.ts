import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { simulations, futureNodes, apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callAI, parseAIJson } from "@/lib/ai/client";
import { buildCombinedSystemPrompt, buildCombinedUserPrompt } from "@/lib/ai/prompts";
import type { AIClientConfig, UserProfile, SimulationTree, SimulationCategory } from "@/lib/ai/types";
import { nanoid } from "nanoid";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserText, sanitizeProfile } from "@/lib/sanitize";
import { logger, toUserError } from "@/lib/logger";
import { decrypt } from "@/lib/crypto";

interface SimulateRequest {
  decision: string;
  profile: UserProfile;
  provider: "claude" | "openai" | "custom";
  apiKey: string;
  model?: string;
  branchCount?: number;
  categories?: SimulationCategory[];
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
      provider: (resolvedProvider ?? "claude") as "claude" | "openai" | "custom",
      apiKey: resolvedApiKey,
      model: body.model,
    };

    const categories: SimulationCategory[] =
      Array.isArray(body.categories) && body.categories.length > 0
        ? body.categories
        : ["career"];
    const messages = [
      { role: "system" as const, content: buildCombinedSystemPrompt(categories) },
      {
        role: "user" as const,
        content: buildCombinedUserPrompt(
          categories,
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
      categories,
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

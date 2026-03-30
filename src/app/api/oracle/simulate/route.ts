import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { simulations, futureNodes } from "@/lib/db/schema";
import { callAI, parseAIJson } from "@/lib/ai/client";
import { buildSimulationSystemPrompt, buildSimulationUserPrompt } from "@/lib/ai/prompts";
import type { AIClientConfig, UserProfile, SimulationTree } from "@/lib/ai/types";
import { nanoid } from "nanoid";

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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: SimulateRequest = await req.json().catch(() => null);
  if (!body?.decision || !body?.profile || !body?.apiKey) {
    return NextResponse.json(
      { error: "decision, profile, and apiKey are required" },
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
        body.decision,
        body.profile,
        body.branchCount ?? 3
      ),
    },
  ];

  const aiResponse = await callAI(aiConfig, messages).catch((err) => {
    throw new Error(`AI call failed: ${err.message}`);
  });

  const parsed = parseAIJson<{ branches: AIBranch[] }>(aiResponse.content);
  if (!parsed.branches || !Array.isArray(parsed.branches)) {
    return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
  }

  // Persist simulation to DB
  const simId = nanoid();
  const rootId = nanoid();

  await db.insert(simulations).values({
    id: simId,
    userId: session.user.id,
    title: body.decision,
    rootNodeId: rootId,
    status: "complete",
    model: aiConfig.model ?? aiConfig.provider,
  });

  // Root node
  await db.insert(futureNodes).values({
    id: rootId,
    simulationId: simId,
    parentId: null,
    title: body.decision,
    description: `Simulation for: ${body.decision}`,
    probability: 1,
    timeframe: "Now",
    depth: 0,
    positionX: 0,
    positionY: 0,
  });

  // Branch nodes
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

  // Build tree response
  const tree: SimulationTree = {
    nodes: [
      {
        id: rootId,
        type: "futureNode",
        position: { x: 0, y: 0 },
        data: {
          title: body.decision,
          description: `Your simulation for: ${body.decision}`,
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

  return NextResponse.json({
    simulationId: simId,
    tree,
    usage: aiResponse.usage,
  });
}

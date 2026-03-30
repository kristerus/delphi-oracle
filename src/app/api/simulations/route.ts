import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { simulations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.query.simulations.findMany({
    where: eq(simulations.userId, session.user.id),
    orderBy: [desc(simulations.createdAt)],
    with: {
      nodes: { columns: { id: true } },
    },
  });

  return NextResponse.json(
    rows.map((sim) => ({
      id: sim.id,
      title: sim.title,
      status: sim.status,
      categories: (sim.categories as string[]) ?? ["career"],
      nodeCount: sim.nodes.length,
      createdAt: sim.createdAt.toISOString().split("T")[0],
    }))
  );
}

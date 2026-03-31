import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { simulations, futureNodes, profiles } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [userSimulations, userProfile] = await Promise.all([
      db.select().from(simulations).where(eq(simulations.userId, userId)),
      db.query.profiles.findFirst({ where: eq(profiles.userId, userId) }),
    ]);

    const simIds = userSimulations.map((s) => s.id);
    const allNodes =
      simIds.length > 0
        ? await db
            .select()
            .from(futureNodes)
            .where(inArray(futureNodes.simulationId, simIds))
        : [];

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        createdAt: session.user.createdAt,
      },
      profile: userProfile ?? null,
      simulations: userSimulations.map((sim) => ({
        ...sim,
        nodes: allNodes.filter((n) => n.simulationId === sim.id),
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="delphi-oracle-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

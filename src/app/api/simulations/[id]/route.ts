import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { simulations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const sim = await db.query.simulations.findFirst({
    where: and(
      eq(simulations.id, id),
      eq(simulations.userId, session.user.id)
    ),
    with: { nodes: true },
  });

  if (!sim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(sim);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const sim = await db.query.simulations.findFirst({
    where: and(
      eq(simulations.id, id),
      eq(simulations.userId, session.user.id)
    ),
    columns: { id: true },
  });

  if (!sim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // futureNodes are cascade-deleted via FK
  await db.delete(simulations).where(eq(simulations.id, id));

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const sim = await db.query.simulations.findFirst({
    where: and(eq(simulations.id, id), eq(simulations.userId, session.user.id)),
    columns: { id: true },
  });
  if (!sim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .update(simulations)
    .set({ title: body.title.trim(), updatedAt: new Date() })
    .where(eq(simulations.id, id));

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt, maskKey } from "@/lib/crypto";

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, session.user.id),
  });

  return NextResponse.json(
    keys.map((k) => ({
      id: k.id,
      provider: k.provider,
      label: k.label,
      maskedKey: maskKey(decrypt(k.encryptedKey)),
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.provider || !body?.key) {
    return NextResponse.json(
      { error: "provider and key are required" },
      { status: 400 }
    );
  }

  const encryptedKey = encrypt(body.key as string);

  // Upsert by provider — one key per provider per user
  const existing = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.userId, session.user.id),
      eq(apiKeys.provider, body.provider)
    ),
  });

  if (existing) {
    await db
      .update(apiKeys)
      .set({ encryptedKey, label: (body.label as string) ?? null })
      .where(eq(apiKeys.id, existing.id));
    return NextResponse.json({ id: existing.id, provider: body.provider });
  }

  const [inserted] = await db
    .insert(apiKeys)
    .values({
      userId: session.user.id,
      provider: body.provider,
      encryptedKey,
      label: (body.label as string) ?? null,
    })
    .returning();

  return NextResponse.json({ id: inserted.id, provider: body.provider });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(apiKeys).where(
    and(eq(apiKeys.id, id), eq(apiKeys.userId, session.user.id))
  );

  return NextResponse.json({ ok: true });
}

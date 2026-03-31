import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Cascade delete — FK constraints handle simulations, nodes, keys, profile
    await db.delete(user).where(eq(user.id, userId));

    logger.info("Account deleted", { userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("Failed to delete account", { error: String(err) });
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}

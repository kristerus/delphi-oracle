import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserText } from "@/lib/sanitize";
import { logger, toUserError } from "@/lib/logger";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit — scrape is the most expensive operation (5/day)
    const rl = checkRateLimit(session.user.id, "scrape");
    if (!rl.allowed) {
      logger.warn("Rate limit exceeded", { userId: session.user.id, action: "scrape" });
      return NextResponse.json(
        { error: "Daily scrape limit reached. Try again tomorrow." },
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

    const body = await req.json().catch(() => null);
    if (!body?.query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    // Sanitize user inputs
    let cleanQuery: string;
    try {
      cleanQuery = sanitizeUserText(body.query, "query");
    } catch (err) {
      logger.warn("Input sanitization rejected", { userId: session.user.id, error: String(err) });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid input" },
        { status: 400 }
      );
    }

    logger.info("Starting scrape", { userId: session.user.id });

    const response = await fetch(`${env.BACKEND_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.BACKEND_API_KEY,
      },
      body: JSON.stringify({
        query: cleanQuery,
        platforms: body.platforms,
        userId: session.user.id,
      }),
    });

    if (!response.ok) {
      logger.error("Backend scrape error", { status: response.status, userId: session.user.id });
      return NextResponse.json(
        { error: "Scraping service unavailable" },
        { status: 503 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1_000)),
      },
    });
  } catch (err) {
    logger.error("Unhandled error in /api/oracle/scrape", { error: String(err) });
    return NextResponse.json(
      { error: toUserError(err) },
      { status: 500 }
    );
  }
}

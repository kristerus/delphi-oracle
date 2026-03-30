import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeUserText } from "@/lib/sanitize";
import { logger, toUserError } from "@/lib/logger";
import { env } from "@/lib/env";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * POST /api/oracle/scrape
 *
 * Body: { query, platforms?, hints? }
 * → Starts a background scrape job on the Python backend.
 * → Returns { jobId, status: "pending" }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
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
        platforms: body.platforms ?? [],
        hints: body.hints ?? {},
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
    // Backend returns { job_id, status } — camelCase for frontend
    return NextResponse.json(
      { jobId: data.job_id ?? data.jobId, status: data.status },
      {
        headers: {
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1_000)),
        },
      }
    );
  } catch (err) {
    logger.error("Unhandled error in /api/oracle/scrape POST", { error: String(err) });
    return NextResponse.json(
      { error: toUserError(err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/oracle/scrape?jobId=xxx[&resultsOnly=true]
 *
 * Polls job status + progress, or fetches final results when done.
 * → { jobId, status, progress, resultsCount, errorCount }   (while running)
 * → ScrapeResponse with footprint                            (when complete, resultsOnly=true)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const resultsOnly = req.nextUrl.searchParams.get("resultsOnly") === "true";

  const backendHeaders = {
    "Content-Type": "application/json",
    "X-API-Key": env.BACKEND_API_KEY,
  };

  try {
    if (resultsOnly) {
      // Fetch final results
      const response = await fetch(`${env.BACKEND_URL}/scrape/results/${jobId}`, {
        headers: backendHeaders,
      });

      if (response.status === 202) {
        return NextResponse.json({ error: "Job still running" }, { status: 202 });
      }
      if (!response.ok) {
        return NextResponse.json({ error: "Results not found" }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Poll status
    const response = await fetch(`${env.BACKEND_URL}/scrape/status`, {
      method: "POST",
      headers: backendHeaders,
      body: JSON.stringify({ job_id: jobId }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Job not found" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      jobId: data.job_id,
      status: data.status,
      progress: data.progress,
      resultsCount: data.results_count,
      errorCount: data.error_count,
    });
  } catch (err) {
    logger.error("Unhandled error in /api/oracle/scrape GET", { error: String(err) });
    return NextResponse.json({ error: toUserError(err) }, { status: 503 });
  }
}

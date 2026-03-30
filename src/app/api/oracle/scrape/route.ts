import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const BACKEND_HEADERS = () => ({
  "Content-Type": "application/json",
  "X-API-Key": process.env.BACKEND_API_KEY ?? "",
});

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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/scrape`, {
      method: "POST",
      headers: BACKEND_HEADERS(),
      body: JSON.stringify({
        query: body.query,
        platforms: body.platforms ?? [],
        hints: body.hints ?? {},
        user_id: session.user.id,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[scrape] Backend error:", response.status, err);
      return NextResponse.json({ error: "Scraping service error" }, { status: response.status });
    }

    const data = await response.json();
    // Backend returns { job_id, status } — camelCase for frontend
    return NextResponse.json({ jobId: data.job_id, status: data.status });
  } catch (err) {
    console.error("[scrape] Backend unavailable:", err);
    return NextResponse.json({ error: "Scraping service unavailable" }, { status: 503 });
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

  try {
    if (resultsOnly) {
      // Fetch final results
      const response = await fetch(`${BACKEND_URL}/scrape/results/${jobId}`, {
        headers: BACKEND_HEADERS(),
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
    const response = await fetch(`${BACKEND_URL}/scrape/status`, {
      method: "POST",
      headers: BACKEND_HEADERS(),
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
    console.error("[scrape] Backend error:", err);
    return NextResponse.json({ error: "Scraping service unavailable" }, { status: 503 });
  }
}

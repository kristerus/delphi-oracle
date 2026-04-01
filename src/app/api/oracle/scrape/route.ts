import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { callAI, parseAIJson } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import type { ExtractedProfileData } from "@/lib/scraper/types";
import type { AIProvider } from "@/lib/ai/types";
import { enrichLinkedInProfile } from "@/lib/scraper/proxycurl";

/* ─── GitHub scrape (no API key needed) ─────────────────────────────────────── */

async function scrapeGitHub(username: string): Promise<ExtractedProfileData> {
  const [userRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "DelphiOracle/1.0" },
      next: { revalidate: 3600 },
    }),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12`,
      {
        headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "DelphiOracle/1.0" },
        next: { revalidate: 3600 },
      }
    ),
  ]);

  if (!userRes.ok) throw new Error(`GitHub user not found: ${username}`);

  const ghUser = (await userRes.json()) as {
    name: string | null;
    bio: string | null;
    location: string | null;
    company: string | null;
    html_url: string;
    blog: string | null;
  };
  const repos = reposRes.ok
    ? ((await reposRes.json()) as Array<{
        name: string;
        description: string | null;
        language: string | null;
        stargazers_count: number;
        fork: boolean;
      }>)
    : [];

  const topRepos = repos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6);

  const languages = [
    ...new Set(repos.filter((r) => r.language).map((r) => r.language as string)),
  ];

  return {
    name: ghUser.name ?? username,
    headline: ghUser.bio ?? undefined,
    location: ghUser.location ?? undefined,
    bio: ghUser.bio ?? undefined,
    skills: languages,
    experience: ghUser.company
      ? [
          {
            company: ghUser.company.replace(/^@/, ""),
            title: "Employee",
            duration: undefined,
            description: undefined,
          },
        ]
      : [],
    education: [],
    urls: [ghUser.html_url, ghUser.blog].filter(Boolean) as string[],
    socialHandles: { github: username },
    openSourceProjects: topRepos.map(
      (r) => `${r.name}${r.description ? ` — ${r.description}` : ""}`
    ),
  };
}

/* ─── AI-powered text / URL parse ───────────────────────────────────────────── */

async function parseWithAI(
  content: string,
  apiKey: string,
  provider: AIProvider
): Promise<ExtractedProfileData> {
  const systemPrompt = `You are a professional profile parser. Extract structured career and personal data from text.
Return ONLY valid JSON matching this exact schema:
{
  "name": string | null,
  "headline": string | null,
  "location": string | null,
  "bio": string | null,
  "skills": string[],
  "experience": [{ "company": string, "title": string, "duration": string | null, "description": string | null }],
  "education": [{ "institution": string, "degree": string | null, "years": string | null }],
  "urls": string[],
  "socialHandles": { [platform: string]: string }
}
Be thorough. Extract ALL skills mentioned. If a field is not found, use null or [].`;

  const result = await callAI(
    {
      provider,
      apiKey,
      model: provider === "claude" ? "claude-3-5-haiku-20241022" : "gpt-4o-mini",
      maxTokens: 1500,
    },
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Parse this professional profile text into the JSON schema:\n\n${content.slice(0, 8000)}`,
      },
    ]
  );

  return parseAIJson<ExtractedProfileData>(result.content);
}

async function fetchAndExtractText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DelphiOracle/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
  const html = await res.text();
  // Strip scripts, styles, HTML tags, collapse whitespace
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);
}

/* ─── Route handler ──────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(session.user.id, "scrape");
    if (!rl.allowed) {
      const retryAfterSeconds = Math.ceil((rl.resetAt.getTime() - Date.now()) / 1_000);
      return NextResponse.json(
        { error: "Daily scrape limit reached. Try again tomorrow.", remaining: 0 },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rl.resetAt.getTime() / 1_000)),
          },
        }
      );
    }

    const body = (await req.json().catch(() => null)) as {
      type?: string;
      username?: string;
      content?: string;
      url?: string;
      apiKey?: string;
      provider?: string;
    } | null;

    if (!body?.type) return NextResponse.json({ error: "type is required" }, { status: 400 });

    let profile: ExtractedProfileData;

    if (body.type === "github") {
      if (!body.username?.trim())
        return NextResponse.json({ error: "username is required" }, { status: 400 });
      profile = await scrapeGitHub(body.username.trim());
    } else if (body.type === "text") {
      if (!body.content?.trim())
        return NextResponse.json({ error: "content is required" }, { status: 400 });
      if (!body.apiKey)
        return NextResponse.json({ error: "apiKey is required for text parsing" }, { status: 400 });
      const provider = (body.provider ?? "claude") as AIProvider;
      profile = await parseWithAI(body.content, body.apiKey, provider);
    } else if (body.type === "linkedin") {
      if (!body.url?.trim())
        return NextResponse.json({ error: "LinkedIn URL is required" }, { status: 400 });
      const enriched = await enrichLinkedInProfile(body.url.trim());
      if (!enriched) {
        return NextResponse.json(
          { error: "LinkedIn enrichment unavailable. Configure PROXYCURL_API_KEY or use the URL scraper instead." },
          { status: 400 }
        );
      }
      profile = enriched;
    } else if (body.type === "url") {
      if (!body.url?.trim())
        return NextResponse.json({ error: "url is required" }, { status: 400 });
      if (!body.apiKey)
        return NextResponse.json({ error: "apiKey is required for URL parsing" }, { status: 400 });
      const provider = (body.provider ?? "claude") as AIProvider;
      // Auto-detect LinkedIn URLs and use Proxycurl if available
      if (body.url.includes("linkedin.com/in/")) {
        const enriched = await enrichLinkedInProfile(body.url.trim());
        if (enriched) {
          profile = enriched;
          logger.info("Used Proxycurl for LinkedIn URL", { userId: session.user.id });
        } else {
          const text = await fetchAndExtractText(body.url.trim());
          profile = await parseWithAI(text, body.apiKey, provider);
        }
      } else {
        const text = await fetchAndExtractText(body.url.trim());
        profile = await parseWithAI(text, body.apiKey, provider);
      }
    } else {
      return NextResponse.json(
        { error: "type must be github, text, or url" },
        { status: 400 }
      );
    }

    logger.info("Scrape complete", { userId: session.user.id, type: body.type });
    return NextResponse.json({ status: "complete", profile });
  } catch (err) {
    logger.error("Scrape error", { error: String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 500 }
    );
  }
}

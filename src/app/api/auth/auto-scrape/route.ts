import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { profiles, account } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type { ExtractedProfileData } from "@/lib/scraper/types";
import type { EducationEntry, ExperienceEntry } from "@/lib/db/schema";

/* ─── GitHub scrape (using OAuth token for higher rate limits) ────────────── */

async function scrapeGitHubAuth(
  username: string,
  accessToken: string
): Promise<ExtractedProfileData> {
  const ghHeaders = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "DelphiOracle/1.0",
    Authorization: `Bearer ${accessToken}`,
  };

  const [userRes, reposRes, orgsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: ghHeaders,
    }),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=30&type=all`,
      { headers: ghHeaders }
    ),
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}/orgs`, {
      headers: ghHeaders,
    }),
  ]);

  if (!userRes.ok) throw new Error(`GitHub API error: ${userRes.status}`);

  const ghUser = (await userRes.json()) as {
    login: string;
    name: string | null;
    bio: string | null;
    location: string | null;
    company: string | null;
    html_url: string;
    blog: string | null;
    twitter_username: string | null;
    public_repos: number;
    followers: number;
    created_at: string;
  };

  const repos = reposRes.ok
    ? ((await reposRes.json()) as Array<{
        name: string;
        description: string | null;
        language: string | null;
        stargazers_count: number;
        fork: boolean;
        topics?: string[];
      }>)
    : [];

  const orgs = orgsRes.ok
    ? ((await orgsRes.json()) as Array<{ login: string; description: string | null }>)
    : [];

  // Extract unique languages from all repos (including private ones visible to the user)
  const languageCounts = new Map<string, number>();
  for (const r of repos) {
    if (r.language) {
      languageCounts.set(r.language, (languageCounts.get(r.language) ?? 0) + 1);
    }
  }
  const languages = [...languageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  // Extract unique topics
  const topicSet = new Set<string>();
  for (const r of repos) {
    for (const t of r.topics ?? []) topicSet.add(t);
  }

  const topRepos = repos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 8);

  // Build experience from company + orgs
  const experience: ExtractedProfileData["experience"] = [];
  if (ghUser.company) {
    experience.push({
      company: ghUser.company.replace(/^@/, ""),
      title: "Software Engineer",
    });
  }
  for (const org of orgs.slice(0, 3)) {
    if (org.login !== ghUser.company?.replace(/^@/, "")) {
      experience.push({
        company: org.login,
        title: "Contributor",
        description: org.description ?? undefined,
      });
    }
  }

  // Combine languages + topics as skills
  const skills = [
    ...languages.slice(0, 10),
    ...[...topicSet].slice(0, 10),
  ];

  return {
    name: ghUser.name ?? ghUser.login,
    headline: ghUser.bio ?? undefined,
    location: ghUser.location ?? undefined,
    bio: ghUser.bio ?? undefined,
    skills,
    experience,
    education: [],
    urls: [ghUser.html_url, ghUser.blog].filter(Boolean) as string[],
    socialHandles: {
      github: ghUser.login,
      ...(ghUser.twitter_username ? { twitter: ghUser.twitter_username } : {}),
    },
    openSourceProjects: topRepos.map(
      (r) =>
        `${r.name} (${r.stargazers_count} stars)${r.description ? ` — ${r.description}` : ""}`
    ),
  };
}

/* ─── LinkedIn profile from OAuth token ───────────────────────────────────── */

async function scrapeLinkedInAuth(
  accessToken: string
): Promise<Partial<ExtractedProfileData>> {
  // LinkedIn's OpenID Connect userinfo endpoint
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    logger.warn("LinkedIn userinfo failed", { status: res.status });
    return {};
  }

  const data = (await res.json()) as {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email?: string;
    email_verified?: boolean;
    locale?: { country: string; language: string };
  };

  return {
    name: data.name ?? ([data.given_name, data.family_name].filter(Boolean).join(" ") || undefined),
    socialHandles: { linkedin: data.sub },
  };
}

/* ─── Google profile from OAuth token ─────────────────────────────────────── */

async function scrapeGoogleAuth(
  accessToken: string
): Promise<Partial<ExtractedProfileData>> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return {};

  const data = (await res.json()) as {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email?: string;
    locale?: string;
  };

  return {
    name: data.name ?? undefined,
  };
}

/* ─── Merge scraped data into profile ─────────────────────────────────────── */

function mergeIntoProfile(
  existing: Record<string, unknown> | null,
  scraped: ExtractedProfileData | Partial<ExtractedProfileData>
) {
  const experience: ExperienceEntry[] = scraped.experience?.length
    ? scraped.experience.map((e) => ({
        company: e.company,
        title: e.title,
        description: e.description,
      }))
    : (existing?.experience as ExperienceEntry[]) ?? [];

  const education: EducationEntry[] = scraped.education?.length
    ? scraped.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
      }))
    : (existing?.education as EducationEntry[]) ?? [];

  const skills: string[] = scraped.skills?.length
    ? scraped.skills
    : (existing?.skills as string[]) ?? [];

  return {
    bio: (scraped.bio as string) || (existing?.bio as string) || null,
    location: (scraped.location as string) || (existing?.location as string) || null,
    website: (scraped.urls?.[1] as string) || (existing?.website as string) || null,
    linkedinUrl: scraped.socialHandles?.linkedin
      ? `https://linkedin.com/in/${scraped.socialHandles.linkedin}`
      : (existing?.linkedinUrl as string) || null,
    githubUsername:
      scraped.socialHandles?.github || (existing?.githubUsername as string) || null,
    twitterUsername:
      scraped.socialHandles?.twitter || (existing?.twitterUsername as string) || null,
    skills,
    experience,
    education,
    rawScrapedData: scraped as Record<string, unknown>,
    scrapedAt: new Date(),
  };
}

/* ─── POST /api/auth/auto-scrape ──────────────────────────────────────────── */

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if profile already has scraped data (skip if already populated)
    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (existingProfile?.scrapedAt) {
      return NextResponse.json({ status: "already_scraped", skipped: true });
    }

    // Get OAuth accounts for this user
    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, userId));

    const oauthAccounts = accounts.filter(
      (a) => a.providerId !== "credential" && a.accessToken
    );

    if (!oauthAccounts.length) {
      return NextResponse.json({ status: "no_oauth", skipped: true });
    }

    logger.info("Auto-scraping OAuth profile", {
      userId,
      providers: oauthAccounts.map((a) => a.providerId),
    });

    let scrapedData: ExtractedProfileData | Partial<ExtractedProfileData> = {
      skills: [],
      experience: [],
      education: [],
      urls: [],
      socialHandles: {},
    };

    // Scrape each connected provider
    for (const acct of oauthAccounts) {
      try {
        if (acct.providerId === "github") {
          // accountId is the GitHub username for GitHub OAuth
          scrapedData = await scrapeGitHubAuth(
            acct.accountId,
            acct.accessToken!
          );
        } else if (acct.providerId === "linkedin") {
          const linkedinData = await scrapeLinkedInAuth(acct.accessToken!);
          scrapedData = {
            ...scrapedData,
            ...linkedinData,
            socialHandles: {
              ...scrapedData.socialHandles,
              ...linkedinData.socialHandles,
            },
          };
        } else if (acct.providerId === "google") {
          const googleData = await scrapeGoogleAuth(acct.accessToken!);
          scrapedData = { ...scrapedData, ...googleData };
        }
      } catch (err) {
        logger.warn("Auto-scrape provider failed", {
          userId,
          provider: acct.providerId,
          error: String(err),
        });
      }
    }

    // Upsert profile
    const profileData = mergeIntoProfile(existingProfile ?? null, scrapedData);

    if (existingProfile) {
      await db
        .update(profiles)
        .set({ ...profileData, updatedAt: new Date() })
        .where(eq(profiles.userId, userId));
    } else {
      await db.insert(profiles).values({
        userId,
        ...profileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    logger.info("Auto-scrape complete", {
      userId,
      skillsCount: scrapedData.skills?.length ?? 0,
      providers: oauthAccounts.map((a) => a.providerId),
    });

    return NextResponse.json({
      status: "complete",
      scraped: {
        name: scrapedData.name,
        skills: scrapedData.skills?.length ?? 0,
        experience: scrapedData.experience?.length ?? 0,
        providers: oauthAccounts.map((a) => a.providerId),
      },
    });
  } catch (err) {
    logger.error("Auto-scrape error", { error: String(err) });
    return NextResponse.json(
      { error: "Auto-scrape failed" },
      { status: 500 }
    );
  }
}

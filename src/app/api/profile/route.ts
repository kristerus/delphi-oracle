import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type {
  ExperienceEntry,
  EducationEntry,
  ProfilePreferences,
} from "@/lib/db/schema";

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, session.user.id),
  });

  if (!profile) return NextResponse.json(null, { status: 404 });

  return NextResponse.json({
    name: session.user.name ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    website: profile.website ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    githubUsername: profile.githubUsername ?? "",
    twitterUsername: profile.twitterUsername ?? "",
    skills: profile.skills ?? [],
    experience: profile.experience ?? [],
    education: profile.education ?? [],
    riskTolerance: profile.preferences?.riskTolerance ?? "medium",
    timeHorizon: profile.preferences?.timeHorizon ?? "3y",
  });
}

async function upsertProfile(userId: string, body: Record<string, unknown>) {
  const skills = Array.isArray(body.skills)
    ? (body.skills as string[])
    : typeof body.skills === "string"
    ? (body.skills as string).split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const data = {
    userId,
    bio: (body.bio as string) || null,
    location: (body.location as string) || null,
    website: (body.website as string) || null,
    linkedinUrl: (body.linkedinUrl as string) || null,
    githubUsername: (body.githubUsername as string) || null,
    twitterUsername: (body.twitterUsername as string) || null,
    experience: ((body.experience ?? []) as ExperienceEntry[]),
    education: ((body.education ?? []) as EducationEntry[]),
    skills,
    preferences: {
      riskTolerance: ((body.riskTolerance ?? "medium") as ProfilePreferences["riskTolerance"]),
      timeHorizon: ((body.timeHorizon ?? "3y") as ProfilePreferences["timeHorizon"]),
      focusAreas: ((body.focusAreas ?? []) as string[]),
    },
    updatedAt: new Date(),
  };

  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (existing) {
    await db.update(profiles).set(data).where(eq(profiles.userId, userId));
  } else {
    await db.insert(profiles).values(data);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await upsertProfile(session.user.id, body);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await upsertProfile(session.user.id, body);
  return NextResponse.json({ ok: true });
}

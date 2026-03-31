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
    notificationPrefs: profile.preferences?.notifications ?? null,
  });
}

async function upsertProfile(userId: string, body: Record<string, unknown>) {
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  // Merge skills: prefer body if present, fall back to existing
  const skills = Array.isArray(body.skills)
    ? (body.skills as string[])
    : typeof body.skills === "string"
    ? (body.skills as string).split(",").map((s) => s.trim()).filter(Boolean)
    : (existing?.skills ?? []);

  // Merge preferences: only overwrite keys that are explicitly present in body
  const existingPrefs: Partial<ProfilePreferences> = existing?.preferences ?? {};
  const preferences: ProfilePreferences = {
    riskTolerance: (body.riskTolerance as ProfilePreferences["riskTolerance"]) ?? existingPrefs.riskTolerance ?? "medium",
    timeHorizon: (body.timeHorizon as ProfilePreferences["timeHorizon"]) ?? existingPrefs.timeHorizon ?? "3y",
    focusAreas: (body.focusAreas as string[] | undefined) ?? existingPrefs.focusAreas ?? [],
    notifications: (body.notificationPrefs as Record<string, boolean> | undefined) ?? existingPrefs.notifications,
  };

  const data = {
    userId,
    bio: "bio" in body ? ((body.bio as string) || null) : (existing?.bio ?? null),
    location: "location" in body ? ((body.location as string) || null) : (existing?.location ?? null),
    website: "website" in body ? ((body.website as string) || null) : (existing?.website ?? null),
    linkedinUrl: "linkedinUrl" in body ? ((body.linkedinUrl as string) || null) : (existing?.linkedinUrl ?? null),
    githubUsername: "githubUsername" in body ? ((body.githubUsername as string) || null) : (existing?.githubUsername ?? null),
    twitterUsername: "twitterUsername" in body ? ((body.twitterUsername as string) || null) : (existing?.twitterUsername ?? null),
    experience: ("experience" in body ? (body.experience as ExperienceEntry[]) : null) ?? existing?.experience ?? [],
    education: ("education" in body ? (body.education as EducationEntry[]) : null) ?? existing?.education ?? [],
    skills,
    preferences,
    updatedAt: new Date(),
  };

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

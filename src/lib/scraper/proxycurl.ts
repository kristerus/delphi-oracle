/**
 * Proxycurl LinkedIn profile enrichment.
 *
 * Fetches full professional profile data including work history,
 * education, skills, and certifications from LinkedIn URLs.
 *
 * Pricing: ~$0.10/profile lookup
 * Docs: https://nubela.co/proxycurl/docs
 *
 * Set PROXYCURL_API_KEY in env to enable.
 */

import type { ExtractedProfileData } from "./types";

interface ProxycurlExperience {
  company?: string;
  company_linkedin_profile_url?: string;
  title?: string;
  description?: string;
  starts_at?: { day: number; month: number; year: number } | null;
  ends_at?: { day: number; month: number; year: number } | null;
  location?: string;
}

interface ProxycurlEducation {
  school?: string;
  school_linkedin_profile_url?: string;
  degree_name?: string;
  field_of_study?: string;
  starts_at?: { day: number; month: number; year: number } | null;
  ends_at?: { day: number; month: number; year: number } | null;
}

interface ProxycurlProfile {
  public_identifier?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  headline?: string;
  summary?: string;
  city?: string;
  state?: string;
  country_full_name?: string;
  occupation?: string;
  experiences?: ProxycurlExperience[];
  education?: ProxycurlEducation[];
  skills?: string[];
  certifications?: Array<{ name?: string; authority?: string }>;
  languages?: string[];
  interests?: string[];
  recommendations?: string[];
  connections?: number;
  follower_count?: number;
}

function formatDateRange(
  start?: { day: number; month: number; year: number } | null,
  end?: { day: number; month: number; year: number } | null
): string | undefined {
  if (!start) return undefined;
  const s = `${start.month ?? 1}/${start.year}`;
  const e = end ? `${end.month ?? 1}/${end.year}` : "Present";
  return `${s} – ${e}`;
}

/**
 * Enrich a LinkedIn profile URL via Proxycurl.
 * Returns null if PROXYCURL_API_KEY is not set.
 */
export async function enrichLinkedInProfile(
  linkedinUrl: string
): Promise<ExtractedProfileData | null> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) return null;

  // Normalize URL
  const cleanUrl = linkedinUrl
    .replace(/\/$/, "")
    .replace(/^https?:\/\/(www\.)?/, "https://www.");
  if (!cleanUrl.includes("linkedin.com/in/")) return null;

  const res = await fetch(
    `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(cleanUrl)}&skills=include&certifications=include&languages=include`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) {
    console.warn(`Proxycurl error: ${res.status}`);
    return null;
  }

  const data: ProxycurlProfile = await res.json();

  const location = [data.city, data.state, data.country_full_name]
    .filter(Boolean)
    .join(", ");

  return {
    name: data.full_name ?? ([data.first_name, data.last_name].filter(Boolean).join(" ") || undefined),
    headline: data.headline ?? data.occupation ?? undefined,
    location: location || undefined,
    bio: data.summary ?? undefined,
    skills: [
      ...(data.skills ?? []),
      ...((data.certifications?.map((c) => c.name).filter(Boolean) as string[]) ?? []),
    ],
    experience: (data.experiences ?? []).map((exp) => ({
      company: exp.company ?? "Unknown",
      title: exp.title ?? "Employee",
      duration: formatDateRange(exp.starts_at, exp.ends_at),
      description: exp.description ?? undefined,
    })),
    education: (data.education ?? []).map((edu) => ({
      institution: edu.school ?? "Unknown",
      degree: [edu.degree_name, edu.field_of_study].filter(Boolean).join(" in ") || undefined,
      years: formatDateRange(edu.starts_at, edu.ends_at),
    })),
    urls: [cleanUrl],
    socialHandles: {
      linkedin: data.public_identifier ?? cleanUrl.split("/in/")[1]?.replace(/\/$/, "") ?? "",
    },
  };
}

/**
 * Lookup a LinkedIn profile by email via Proxycurl.
 * Returns the LinkedIn URL if found, null otherwise.
 */
export async function findLinkedInByEmail(
  email: string
): Promise<string | null> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://nubela.co/proxycurl/api/linkedin/profile/resolve/email?lookup_depth=deep&email=${encodeURIComponent(email)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) return null;

  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

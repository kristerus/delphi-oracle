/* ─── Scraper types ─────────────────────────────────────────────────────────── */

export interface ScrapeRequest {
  query: string;
  platforms?: Platform[];
  includeContent?: boolean;
  hints?: Record<string, string>; // e.g. { location: "SF", company: "Google" }
}

export type Platform =
  | "linkedin"
  | "github"
  | "twitter"
  | "personal_site"
  | "news"
  | "academic"
  | "stackoverflow"
  | "crunchbase"
  | "medium"
  | "devto"
  | "angellist"
  | "youtube"
  | "patents"
  | "devpost"
  | "kaggle";

export interface ScrapeResult {
  platform: Platform;
  url: string;
  title: string;
  snippet: string;
  fullContent?: string;
  scrapedAt: string;
  confidence: number;
  structuredData?: Record<string, unknown>;
}

export interface DigitalFootprint {
  query: string;
  results: ScrapeResult[];
  summary?: string;
  extractedProfile?: ExtractedProfileData;
  scrapedAt: string;
  processingTimeMs: number;
}

export interface ExtractedProfileData {
  name?: string;
  headline?: string;
  location?: string;
  bio?: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree?: string;
    years?: string;
  }>;
  urls: string[];
  socialHandles: Record<string, string>;
  publications?: string[];
  openSourceProjects?: string[];
}

export interface ScrapeError {
  platform: Platform;
  error: string;
  url?: string;
}

export interface ScrapeResponse {
  footprint: DigitalFootprint | null;
  errors: ScrapeError[];
  status: "complete" | "partial" | "failed";
}

/* ─── Async job types ──────────────────────────────────────────────────────── */

export type JobStatus = "pending" | "running" | "complete" | "partial" | "failed";

export interface ScrapeJobStartResponse {
  jobId: string;
  status: "pending";
}

export interface ScrapeJobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: Record<string, "pending" | "running" | "done" | "no_result" | "error">;
  resultsCount: number;
  errorCount: number;
}

/* ─── Unified enriched profile ─────────────────────────────────────────────── */

export interface SkillWeight {
  name: string;
  weight: number;
  sources: string[];
}

export interface WorkExperience {
  company: string;
  role: string;
  start?: string;
  end?: string;
  description?: string;
  sources: string[];
}

export interface EducationEntry {
  institution: string;
  degree?: string;
  field?: string;
  years?: string;
  gpa?: string;
  sources: string[];
}

export interface UnifiedProfile {
  name?: string;
  headline?: string;
  location?: string;
  bio?: string;
  skills: SkillWeight[];
  workExperience: WorkExperience[];
  education: EducationEntry[];
  publications: Record<string, unknown>[];
  patents: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  socialConnections: string[];
  locationHistory: string[];
  interests: string[];
  awards: string[];
  socialHandles: Record<string, string>;
  urls: string[];
  dataQuality: number;
}

export interface EnrichResponse {
  profile: UnifiedProfile;
  processingTimeMs: number;
  sourcesUsed: number;
}

/* ─── Identity resolution ──────────────────────────────────────────────────── */

export interface IdentityCandidate {
  platform: Platform;
  url: string;
  title: string;
  snippet: string;
  confidence: number;
  reasoning: string;
}

export interface ResolveIdentityResponse {
  matched: IdentityCandidate[];
  rejected: IdentityCandidate[];
  processingTimeMs: number;
}

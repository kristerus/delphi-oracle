/* ─── Scraper types ─────────────────────────────────────────────────────────── */

export interface ScrapeRequest {
  query: string;         // Person's name / identifier
  platforms?: Platform[];
  includeContent?: boolean;
}

export type Platform =
  | "linkedin"
  | "github"
  | "twitter"
  | "personal_site"
  | "news"
  | "academic";

export interface ScrapeResult {
  platform: Platform;
  url: string;
  title: string;
  snippet: string;
  fullContent?: string;
  scrapedAt: string;
  confidence: number; // 0-1, how confident we are this is the right person
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

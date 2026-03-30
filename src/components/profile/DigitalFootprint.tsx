"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Search,
  Loader2,
  Github,
  Linkedin,
  Twitter,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { DigitalFootprint as FootprintType, ScrapeResult } from "@/lib/scraper/types";

const MOCK_FOOTPRINT: FootprintType = {
  query: "Alex Rivera software engineer",
  scrapedAt: new Date().toISOString(),
  processingTimeMs: 4200,
  results: [
    {
      platform: "github",
      url: "https://github.com/alexrivera",
      title: "alexrivera — GitHub",
      snippet: "Senior Software Engineer. 47 public repos, 312 followers. Mostly TypeScript, Python, and Rust. Active contributor to several open source AI projects.",
      confidence: 0.92,
      scrapedAt: new Date().toISOString(),
    },
    {
      platform: "linkedin",
      url: "https://linkedin.com/in/alexrivera",
      title: "Alex Rivera — Software Engineer at TechCorp | LinkedIn",
      snippet: "Senior Software Engineer at TechCorp. Previously at StartupXYZ. UC Berkeley CS graduate. Passionate about AI/ML, distributed systems, and developer tooling.",
      confidence: 0.88,
      scrapedAt: new Date().toISOString(),
    },
    {
      platform: "personal_site",
      url: "https://alexrivera.dev",
      title: "Alex Rivera — Software Engineer & Builder",
      snippet: "I build developer tools and AI-powered products. Writing about TypeScript, system design, and the future of software.",
      confidence: 0.95,
      scrapedAt: new Date().toISOString(),
    },
  ],
  extractedProfile: {
    name: "Alex Rivera",
    headline: "Senior Software Engineer",
    location: "San Francisco, CA",
    skills: ["TypeScript", "Python", "React", "Node.js", "Machine Learning", "Distributed Systems"],
    experience: [
      { company: "TechCorp", title: "Senior Software Engineer", duration: "2022–present" },
      { company: "StartupXYZ", title: "Software Engineer", duration: "2019–2022" },
    ],
    education: [
      { institution: "UC Berkeley", degree: "BS Computer Science", years: "2015–2019" },
    ],
    urls: ["https://github.com/alexrivera", "https://linkedin.com/in/alexrivera"],
    socialHandles: { github: "alexrivera", twitter: "alexrivera_dev" },
    openSourceProjects: ["react-ai-kit", "llm-benchmarks", "ts-type-utils"],
  },
  summary: "Found strong public presence across GitHub and LinkedIn. Profile data is consistent across sources. High confidence this is the correct person.",
};

const platformIcons: Record<string, React.ElementType> = {
  github: Github,
  linkedin: Linkedin,
  twitter: Twitter,
  personal_site: Globe,
  news: Globe,
  academic: Globe,
};

function ResultCard({ result }: { result: ScrapeResult }) {
  const Icon = platformIcons[result.platform] ?? Globe;
  const confidencePct = Math.round(result.confidence * 100);
  const confidenceColor =
    result.confidence >= 0.8
      ? "text-signal-400"
      : result.confidence >= 0.6
      ? "text-oracle-500"
      : "text-hazard-400";

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-muted shrink-0" />
          <span className="text-xs font-medium text-text-secondary capitalize">{result.platform.replace("_", " ")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-mono ${confidenceColor}`}>{confidencePct}% match</span>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-text-ghost hover:text-text-secondary transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      <p className="text-sm text-text-primary font-medium mb-1 truncate">{result.title}</p>
      <p className="text-xs text-text-secondary leading-relaxed">{result.snippet}</p>
    </div>
  );
}

export default function DigitalFootprint() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [footprint, setFootprint] = useState<FootprintType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Placeholder: in prod, this calls /api/oracle/scrape
      await new Promise((r) => setTimeout(r, 2500));
      setFootprint(MOCK_FOOTPRINT);
    } catch {
      setError("Scraping failed. Check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const profile = footprint?.extractedProfile;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Search */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Find your digital footprint</h2>
        <p className="text-xs text-text-muted mb-4">
          Enter your name and optionally your company or LinkedIn URL. The AI scrapes public sources to build your profile automatically.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              placeholder="Alex Rivera, software engineer at TechCorp"
              className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200"
            />
          </div>
          <button
            onClick={handleScrape}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 hover:text-oracle-300 font-medium text-sm px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {loading ? "Scanning…" : "Scan web"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-hazard-700/20 border border-hazard-600/30 text-hazard-400 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {footprint && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Summary */}
            <div className="flex items-start gap-3 glass rounded-xl p-4 border border-signal-700/30">
              <CheckCircle2 className="w-4 h-4 text-signal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-text-primary font-medium mb-0.5">Footprint found</p>
                <p className="text-xs text-text-secondary">{footprint.summary}</p>
                <p className="text-xs text-text-ghost mt-1">
                  Scanned in {(footprint.processingTimeMs / 1000).toFixed(1)}s · {footprint.results.length} sources
                </p>
              </div>
              <button
                onClick={() => setFootprint(null)}
                className="ml-auto text-text-ghost hover:text-text-secondary transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Extracted skills */}
            {profile?.skills && profile.skills.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Detected skills</p>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span key={skill} className="px-2.5 py-1 rounded-lg bg-nebula-900/50 border border-nebula-800/40 text-xs text-nebula-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source cards */}
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Sources</p>
              <div className="space-y-3">
                {footprint.results.map((r) => (
                  <ResultCard key={r.url} result={r} />
                ))}
              </div>
            </div>

            {/* Import button */}
            <button className="w-full flex items-center justify-center gap-2 bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 font-medium text-sm py-3 rounded-xl transition-all duration-200">
              <CheckCircle2 className="w-4 h-4" />
              Import extracted data to profile
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!footprint && !loading && (
        <div className="text-center py-12 text-text-ghost text-sm">
          Enter your name above to scan the web for your digital footprint.
          <br />
          Only public data is accessed.
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github,
  Globe,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import type { ExtractedProfileData } from "@/lib/scraper/types";

/* ─── Types ──────────────────────────────────────────────────────────────────── */

type ScrapeMode = "github" | "text" | "url";

interface SavedKey {
  id: string;
  provider: string;
  maskedKey: string;
}

/* ─── Sub-mode toggle ────────────────────────────────────────────────────────── */

const MODES: { id: ScrapeMode; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: "github",
    label: "GitHub",
    icon: Github,
    description: "Import from a public GitHub profile — no API key needed",
  },
  {
    id: "text",
    label: "Paste text",
    icon: FileText,
    description: "Paste a LinkedIn bio, resume, or any career text",
  },
  {
    id: "url",
    label: "URL",
    icon: Globe,
    description: "Import from any public URL (portfolio, blog, etc.)",
  },
];

/* ─── Extracted profile display ──────────────────────────────────────────────── */

function ProfilePreview({
  profile,
  onApply,
  applying,
}: {
  profile: ExtractedProfileData;
  onApply: () => void;
  applying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex items-start gap-3 glass rounded-xl p-4 border border-signal-700/30">
        <CheckCircle2 className="w-4 h-4 text-signal-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {profile.name ? `Found profile for ${profile.name}` : "Profile data extracted"}
          </p>
          {profile.headline && (
            <p className="text-xs text-text-secondary mt-0.5">{profile.headline}</p>
          )}
          {profile.location && (
            <p className="text-xs text-text-ghost mt-0.5">{profile.location}</p>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-text-ghost hover:text-text-secondary transition-colors shrink-0"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden space-y-3"
          >
            {/* Skills */}
            {profile.skills.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Skills detected ({profile.skills.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-nebula-900/50 border border-nebula-800/40 text-xs text-nebula-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {profile.experience.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Experience ({profile.experience.length})
                </p>
                <div className="space-y-2">
                  {profile.experience.map((exp, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-oracle-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs text-text-primary font-medium">
                          {exp.title} at {exp.company}
                        </p>
                        {exp.duration && (
                          <p className="text-xs text-text-ghost">{exp.duration}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {profile.education.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Education ({profile.education.length})
                </p>
                <div className="space-y-2">
                  {profile.education.map((edu, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-nebula-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs text-text-primary font-medium">
                          {edu.institution}
                        </p>
                        {edu.degree && (
                          <p className="text-xs text-text-ghost">{edu.degree}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open source projects */}
            {profile.openSourceProjects && profile.openSourceProjects.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Open source projects ({profile.openSourceProjects.length})
                </p>
                <div className="space-y-1">
                  {profile.openSourceProjects.map((proj, i) => (
                    <p key={i} className="text-xs text-text-secondary truncate">
                      {proj}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Bio</p>
                <p className="text-xs text-text-secondary leading-relaxed">{profile.bio}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply button */}
      <button
        onClick={onApply}
        disabled={applying}
        className="w-full flex items-center justify-center gap-2 bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 font-medium text-sm py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {applying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {applying ? "Applying to profile…" : "Apply to profile"}
      </button>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */

export default function DigitalFootprint() {
  const [scrapeMode, setScrapeMode] = useState<ScrapeMode>("github");
  const [scrapeInput, setScrapeInput] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ExtractedProfileData | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [remainingUses, setRemainingUses] = useState<number | null>(null);

  // API key state — loaded from saved keys
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [keysLoaded, setKeysLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/profile/keys")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SavedKey[]) => {
        setSavedKeys(data);
        setKeysLoaded(true);
      })
      .catch(() => setKeysLoaded(true));
  }, []);

  // When mode changes, reset results
  const handleModeChange = (mode: ScrapeMode) => {
    setScrapeMode(mode);
    setScrapeInput("");
    setScrapeResult(null);
    setScrapeError(null);
    setApplied(false);
  };

  const getApiKey = (): { apiKey: string; provider: string } | null => {
    const claudeKey = savedKeys.find((k) => k.provider === "claude");
    const openaiKey = savedKeys.find((k) => k.provider === "openai");
    const customKey = savedKeys.find((k) => k.provider === "custom");
    const key = claudeKey ?? openaiKey ?? customKey;
    if (!key) return null;
    // For text/url we need the real key — but we only have masked versions here.
    // The backend will use the stored (encrypted) key via the session, so we pass
    // the provider name and the server fetches it from the vault.
    // Actually we store the raw key encrypted server-side; the client just passes
    // provider so the server can look it up. But the current API design takes apiKey
    // directly. Return a sentinel so the UI can warn when no key is saved.
    return { apiKey: "__use_saved__", provider: key.provider };
  };

  const handleScrape = async () => {
    if (!scrapeInput.trim()) return;

    setScraping(true);
    setScrapeError(null);
    setScrapeResult(null);
    setApplied(false);

    try {
      let body: Record<string, string>;

      if (scrapeMode === "github") {
        body = { type: "github", username: scrapeInput.trim() };
      } else {
        // text or url modes need an API key
        const keyInfo = getApiKey();
        if (!keyInfo) {
          setScrapeError("No AI key saved. Add one in the AI Keys tab first.");
          setScraping(false);
          return;
        }
        if (scrapeMode === "text") {
          body = { type: "text", content: scrapeInput.trim(), apiKey: keyInfo.apiKey, provider: keyInfo.provider };
        } else {
          body = { type: "url", url: scrapeInput.trim(), apiKey: keyInfo.apiKey, provider: keyInfo.provider };
        }
      }

      const res = await fetch("/api/oracle/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Handle rate limiting before attempting to parse body
      if (res.status === 429) {
        setRemainingUses(0);
        setScrapeError("Daily import limit reached. You can import up to 5 times per day. Resets at midnight.");
        return;
      }

      // Read rate limit header from any successful response
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining !== null) setRemainingUses(parseInt(remaining, 10));

      const data = (await res.json()) as { status?: string; profile?: ExtractedProfileData; error?: string };

      if (!res.ok || !data.profile) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setScrapeResult(data.profile);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : String(err));
    } finally {
      setScraping(false);
    }
  };

  const handleApplyProfile = async () => {
    if (!scrapeResult) return;
    setApplying(true);

    try {
      // Map ExtractedProfileData to the profile API format
      const profilePayload = {
        bio: scrapeResult.bio ?? scrapeResult.headline ?? "",
        location: scrapeResult.location ?? "",
        website: scrapeResult.urls.find((u) => !u.includes("github.com")) ?? "",
        githubUsername: scrapeResult.socialHandles?.github ?? "",
        linkedinUrl: scrapeResult.socialHandles?.linkedin ?? "",
        skills: scrapeResult.skills,
        experience: scrapeResult.experience.map((e) => ({
          company: e.company,
          title: e.title,
          startDate: "",
          endDate: "",
          description: e.description ?? "",
        })),
        education: scrapeResult.education.map((e) => ({
          institution: e.institution,
          degree: e.degree ?? "",
          field: "",
          startYear: "",
          endYear: e.years ?? "",
        })),
      };

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setApplied(true);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Failed to apply profile");
    } finally {
      setApplying(false);
    }
  };

  const currentMode = MODES.find((m) => m.id === scrapeMode)!;
  const needsKey = scrapeMode !== "github";
  const hasKey = savedKeys.length > 0;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Mode selector */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Import from external source</h2>
        <p className="text-xs text-text-muted mb-4">
          Pull in your professional data automatically. GitHub works instantly — no key needed.
        </p>

        {/* Toggle buttons */}
        <div className="flex gap-1 bg-void-900/60 rounded-xl p-1 mb-4 border border-border-subtle w-fit">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                scrapeMode === mode.id
                  ? "bg-oracle-500/15 border border-oracle-800/50 text-oracle-400"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <mode.icon className="w-3.5 h-3.5" />
              {mode.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-text-ghost mb-3">{currentMode.description}</p>

        {/* Key warning for text/url modes */}
        {needsKey && keysLoaded && !hasKey && (
          <div className="flex items-center gap-2 text-xs text-oracle-400 bg-oracle-900/20 border border-oracle-800/30 rounded-lg px-3 py-2 mb-3">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Add an AI key in the &ldquo;AI Keys&rdquo; tab to use this mode.
          </div>
        )}

        {/* Input area */}
        {scrapeMode === "text" ? (
          <textarea
            value={scrapeInput}
            onChange={(e) => setScrapeInput(e.target.value)}
            placeholder="Paste your LinkedIn bio, resume text, or any professional summary…"
            rows={5}
            className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200 resize-none mb-3"
          />
        ) : (
          <input
            type={scrapeMode === "url" ? "url" : "text"}
            value={scrapeInput}
            onChange={(e) => setScrapeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !scraping && handleScrape()}
            placeholder={
              scrapeMode === "github"
                ? "GitHub username (e.g. torvalds)"
                : "https://yoursite.com/about"
            }
            className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200 mb-3"
          />
        )}

        {/* Import button */}
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleScrape}
              disabled={scraping || !scrapeInput.trim() || (needsKey && keysLoaded && !hasKey) || remainingUses === 0}
              className="flex items-center gap-2 bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 hover:text-oracle-300 font-medium text-sm px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scraping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <currentMode.icon className="w-4 h-4" />
              )}
              {scraping ? "Importing…" : "Import"}
            </button>

            {scrapeResult && (
              <button
                onClick={() => {
                  setScrapeResult(null);
                  setScrapeInput("");
                  setApplied(false);
                }}
                className="flex items-center gap-1.5 text-xs text-text-ghost hover:text-text-secondary transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {remainingUses !== null && remainingUses > 0 && (
            <p className="text-xs text-text-ghost mt-2">
              {remainingUses} of 5 imports remaining today
            </p>
          )}
          {remainingUses === 0 && (
            <p className="text-xs text-hazard-400 mt-1">Daily limit reached. Resets at midnight.</p>
          )}
        </div>
      </div>

      {/* Error */}
      {scrapeError && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 bg-hazard-700/20 border border-hazard-600/30 text-hazard-400 text-sm px-4 py-3 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{scrapeError}</span>
        </motion.div>
      )}

      {/* Applied confirmation */}
      {applied && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 bg-signal-900/20 border border-signal-700/30 text-signal-400 text-sm px-4 py-3 rounded-xl"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Profile applied. Switch to &ldquo;My Profile&rdquo; tab to review and save.
        </motion.div>
      )}

      {/* Result preview */}
      {scrapeResult && !applied && (
        <ProfilePreview
          profile={scrapeResult}
          onApply={handleApplyProfile}
          applying={applying}
        />
      )}

      {/* Empty state */}
      {!scrapeResult && !scraping && !scrapeError && (
        <div className="text-center py-10 text-text-ghost text-sm">
          {scrapeMode === "github"
            ? "Enter a GitHub username above to import public profile data instantly."
            : scrapeMode === "text"
            ? "Paste your LinkedIn bio or resume text and we'll extract your profile data."
            : "Enter a URL to any public profile page and we'll parse it for you."}
        </div>
      )}
    </div>
  );
}

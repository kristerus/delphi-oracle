"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  XCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Award,
  Briefcase,
  GraduationCap,
  Trophy,
  Code2,
  Newspaper,
  Youtube,
} from "lucide-react";
import type {
  DigitalFootprint as FootprintType,
  ScrapeResult,
  ScrapeJobStatusResponse,
  JobStatus,
} from "@/lib/scraper/types";

// ─── Platform metadata ────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { icon: React.ElementType; label: string }> = {
  github: { icon: Github, label: "GitHub" },
  linkedin: { icon: Linkedin, label: "LinkedIn" },
  twitter: { icon: Twitter, label: "Twitter / X" },
  personal_site: { icon: Globe, label: "Personal Site" },
  news: { icon: Newspaper, label: "News" },
  academic: { icon: BookOpen, label: "Academic" },
  stackoverflow: { icon: Code2, label: "Stack Overflow" },
  crunchbase: { icon: Briefcase, label: "Crunchbase" },
  medium: { icon: BookOpen, label: "Medium" },
  devto: { icon: Code2, label: "Dev.to" },
  angellist: { icon: Briefcase, label: "Wellfound" },
  youtube: { icon: Youtube, label: "YouTube" },
  patents: { icon: Award, label: "Patents" },
  devpost: { icon: Trophy, label: "Devpost" },
  kaggle: { icon: GraduationCap, label: "Kaggle" },
};

function getPlatformMeta(platform: string) {
  return PLATFORM_META[platform] ?? { icon: Globe, label: platform.replace(/_/g, " ") };
}

// ─── Progress indicator ────────────────────────────────────────────────────────

type SourceStatus = "pending" | "running" | "done" | "no_result" | "error" | "confirmed" | "rejected";

function ProgressDot({ status }: { status: SourceStatus }) {
  if (status === "running") {
    return <Loader2 className="w-3 h-3 animate-spin text-oracle-400 shrink-0" />;
  }
  if (status === "done" || status === "confirmed") {
    return <CheckCircle2 className="w-3 h-3 text-signal-400 shrink-0" />;
  }
  if (status === "error") {
    return <AlertCircle className="w-3 h-3 text-hazard-400 shrink-0" />;
  }
  if (status === "rejected") {
    return <XCircle className="w-3 h-3 text-hazard-400 shrink-0" />;
  }
  if (status === "no_result") {
    return <div className="w-3 h-3 rounded-full border border-border shrink-0" />;
  }
  // pending
  return <div className="w-3 h-3 rounded-full border border-border-bright shrink-0 animate-pulse" />;
}

function ScanProgress({ progress }: { progress: Record<string, string> }) {
  const platforms = Object.entries(progress);
  if (platforms.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Scanning sources</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {platforms.map(([platform, status]) => {
          const { icon: Icon, label } = getPlatformMeta(platform);
          return (
            <div key={platform} className="flex items-center gap-2">
              <ProgressDot status={status as SourceStatus} />
              <Icon className="w-3.5 h-3.5 text-text-ghost shrink-0" />
              <span className="text-xs text-text-secondary truncate">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({
  result,
  confirmed,
  rejected,
  onConfirm,
  onReject,
}: {
  result: ScrapeResult;
  confirmed: boolean;
  rejected: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const { icon: Icon, label } = getPlatformMeta(result.platform);
  const confidencePct = Math.round(result.confidence * 100);
  const confidenceColor =
    result.confidence >= 0.8
      ? "text-signal-400"
      : result.confidence >= 0.6
      ? "text-oracle-500"
      : "text-hazard-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl p-4 border transition-colors ${
        confirmed
          ? "border-signal-700/50 bg-signal-900/10"
          : rejected
          ? "border-hazard-700/30 opacity-50"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-muted shrink-0" />
          <span className="text-xs font-medium text-text-secondary">{label}</span>
        </div>
        <div className="flex items-center gap-2">
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
      <p className="text-xs text-text-secondary leading-relaxed mb-3">{result.snippet}</p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={confirmed}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
            confirmed
              ? "bg-signal-900/30 border-signal-700/50 text-signal-400 cursor-default"
              : "bg-void-800/60 border-border hover:border-signal-700/50 hover:bg-signal-900/20 text-text-secondary hover:text-signal-400"
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          {confirmed ? "Confirmed" : "Confirm"}
        </button>
        <button
          onClick={onReject}
          disabled={rejected}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
            rejected
              ? "bg-hazard-900/30 border-hazard-700/50 text-hazard-400 cursor-default"
              : "bg-void-800/60 border-border hover:border-hazard-700/50 hover:bg-hazard-900/20 text-text-secondary hover:text-hazard-400"
          }`}
        >
          <XCircle className="w-3 h-3" />
          {rejected ? "Rejected" : "Reject"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DigitalFootprint() {
  const [query, setQuery] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("pending");
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [footprint, setFootprint] = useState<FootprintType | null>(null);
  const [confirmedUrls, setConfirmedUrls] = useState<Set<string>>(new Set());
  const [rejectedUrls, setRejectedUrls] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling ────────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchResults = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/oracle/scrape?jobId=${id}&resultsOnly=true`);
      if (res.status === 202) return; // still running
      if (!res.ok) throw new Error(`Failed to fetch results (${res.status})`);
      const data = await res.json();
      if (data.footprint) {
        setFootprint(data.footprint);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const pollStatus = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/oracle/scrape?jobId=${id}`);
        if (!res.ok) {
          stopPolling();
          setError("Failed to check scan status.");
          setLoading(false);
          return;
        }
        const data: ScrapeJobStatusResponse = await res.json();
        setProgress(data.progress ?? {});
        setJobStatus(data.status);

        if (data.status === "complete" || data.status === "partial" || data.status === "failed") {
          stopPolling();
          if (data.status === "failed") {
            setError("Scan found no results. Try a more specific query.");
            setLoading(false);
          } else {
            await fetchResults(id);
          }
        }
      } catch {
        stopPolling();
        setError("Lost connection to scan service.");
        setLoading(false);
      }
    },
    [stopPolling, fetchResults]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ── Start scrape ───────────────────────────────────────────────────────────

  const handleScrape = async () => {
    if (!query.trim()) return;

    stopPolling();
    setLoading(true);
    setError(null);
    setFootprint(null);
    setProgress({});
    setJobId(null);
    setJobStatus("pending");
    setConfirmedUrls(new Set());
    setRejectedUrls(new Set());

    try {
      const res = await fetch("/api/oracle/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const id: string = data.jobId;
      setJobId(id);
      setJobStatus("running");

      // Start polling every 2s
      pollRef.current = setInterval(() => pollStatus(id), 2000);
    } catch (err) {
      setError(`Scan failed: ${String(err)}`);
      setLoading(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = () => {
    stopPolling();
    setJobId(null);
    setJobStatus("pending");
    setProgress({});
    setFootprint(null);
    setError(null);
    setLoading(false);
    setConfirmedUrls(new Set());
    setRejectedUrls(new Set());
  };

  // ── Confirm / Reject ───────────────────────────────────────────────────────

  const toggleConfirm = (url: string) => {
    setConfirmedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
        setRejectedUrls((r) => { const rn = new Set(r); rn.delete(url); return rn; });
      }
      return next;
    });
  };

  const toggleReject = (url: string) => {
    setRejectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
        setConfirmedUrls((c) => { const cn = new Set(c); cn.delete(url); return cn; });
      }
      return next;
    });
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const confirmedResults = footprint?.results.filter((r) => confirmedUrls.has(r.url)) ?? [];
  const allSkills = footprint?.extractedProfile?.skills ?? [];
  const isScanning = loading || jobStatus === "running";
  const hasProgress = Object.keys(progress).length > 0;
  const doneCount = Object.values(progress).filter((s) => s === "done").length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-5">
      {/* Search */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Find your digital footprint</h2>
        <p className="text-xs text-text-muted mb-4">
          Enter your name and optionally your company or location. The scanner searches{" "}
          {Object.keys(PLATFORM_META).length} public sources in parallel.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isScanning && handleScrape()}
              placeholder="Alex Rivera, software engineer at TechCorp"
              className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200"
            />
          </div>
          <button
            onClick={handleScrape}
            disabled={isScanning || !query.trim()}
            className="flex items-center gap-2 bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 hover:text-oracle-300 font-medium text-sm px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {isScanning ? "Scanning…" : "Scan"}
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

      {/* Live progress (while scanning) */}
      <AnimatePresence>
        {isScanning && hasProgress && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ScanProgress progress={progress} />
            {doneCount > 0 && (
              <p className="text-xs text-text-ghost mt-2 text-center">
                {doneCount} of {Object.keys(progress).length} sources scanned…
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium mb-0.5">Footprint found</p>
                <p className="text-xs text-text-secondary">{footprint.summary}</p>
                <p className="text-xs text-text-ghost mt-1">
                  Scanned in {(footprint.processingTimeMs / 1000).toFixed(1)}s · {footprint.results.length} sources found
                </p>
              </div>
              <button
                onClick={handleReset}
                className="text-text-ghost hover:text-text-secondary transition-colors shrink-0"
                title="Start a new scan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress summary (after scan) */}
            {hasProgress && (
              <ScanProgress progress={progress} />
            )}

            {/* Extracted skills */}
            {allSkills.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Detected skills</p>
                <div className="flex flex-wrap gap-2">
                  {allSkills.map((skill) => (
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

            {/* Source cards — confirm / reject each */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Sources ({footprint.results.length})
                </p>
                {confirmedResults.length > 0 && (
                  <span className="text-xs text-signal-400">
                    {confirmedResults.length} confirmed
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {footprint.results.map((r) => (
                  <ResultCard
                    key={r.url}
                    result={r}
                    confirmed={confirmedUrls.has(r.url)}
                    rejected={rejectedUrls.has(r.url)}
                    onConfirm={() => toggleConfirm(r.url)}
                    onReject={() => toggleReject(r.url)}
                  />
                ))}
              </div>
            </div>

            {/* Apply to profile */}
            <button
              disabled={confirmedResults.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 font-medium text-sm py-3 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmedResults.length === 0
                ? "Confirm sources above to apply"
                : `Apply ${confirmedResults.length} confirmed source${confirmedResults.length > 1 ? "s" : ""} to profile`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!footprint && !isScanning && !error && (
        <div className="text-center py-12 text-text-ghost text-sm">
          Enter your name above to scan {Object.keys(PLATFORM_META).length} public sources for your digital footprint.
          <br />
          Only publicly available data is accessed.
        </div>
      )}
    </div>
  );
}

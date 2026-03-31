import Link from "next/link";
import { Sparkles, ArrowLeft, GitCommit } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new in Delphi Oracle — features, improvements, and fixes.",
};

const releases = [
  {
    version: "1.0.0",
    date: "March 31, 2026",
    title: "Launch",
    changes: [
      "AI-powered future simulation with probability-weighted branching timelines",
      "Support for Claude, GPT-4o, GPT-4o Mini, and custom OpenAI-compatible endpoints",
      "Digital footprint import from GitHub, text paste, and URL scraping",
      "Auto-profile population from GitHub/Google/LinkedIn OAuth",
      "Deep branch expansion with multi-level auto-extend",
      "Multi-category simulations (Career, Romantic, Financial, Health, Personal)",
      "Timeline view with lane-based visualization",
      "Web search grounding for real-world predictions (real companies, professors, salaries)",
      "AES-256 encrypted API key storage",
      "Full data export and account deletion (GDPR-ready)",
      "Mobile-responsive design with dark theme",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-void-950">
      <nav className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-void-950" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-text-primary tracking-tight">Delphi Oracle</span>
        </Link>
        <Link href="/" className="text-sm text-text-muted hover:text-text-primary flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex p-3 rounded-2xl bg-nebula-900/30 mb-6">
            <GitCommit className="w-6 h-6 text-nebula-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-4">Changelog</h1>
          <p className="text-text-secondary text-lg max-w-lg mx-auto">
            What&apos;s new in Delphi Oracle.
          </p>
        </div>

        <div className="space-y-8">
          {releases.map((release) => (
            <div key={release.version} className="glass-card rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono font-bold text-oracle-400 bg-oracle-900/30 px-2.5 py-1 rounded-lg">
                  v{release.version}
                </span>
                <span className="text-xs text-text-ghost">{release.date}</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-4">{release.title}</h2>
              <ul className="space-y-2">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-signal-500 mt-1.5 shrink-0" />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { Sparkles, ArrowLeft, Rss } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights on AI-powered decision making, future simulation, and life planning.",
};

export default function BlogPage() {
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
          <div className="inline-flex p-3 rounded-2xl bg-oracle-900/30 mb-6">
            <Rss className="w-6 h-6 text-oracle-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-4">Blog</h1>
          <p className="text-text-secondary text-lg max-w-lg mx-auto">
            Insights on AI-powered decision making, future simulation, and navigating life's branches.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-text-muted text-sm mb-2">Coming soon</p>
          <p className="text-text-ghost text-sm">
            We're working on our first posts. Follow us on{" "}
            <a href="https://twitter.com/delphioracle" className="text-oracle-500 hover:text-oracle-400 transition-colors">
              Twitter
            </a>{" "}
            for updates.
          </p>
        </div>
      </main>
    </div>
  );
}

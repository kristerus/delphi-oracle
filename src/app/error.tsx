"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[Delphi Oracle] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-void-950 flex items-center justify-center p-6">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, oklch(40% 0.130 20), transparent 65%)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
          style={{
            background: "linear-gradient(135deg, oklch(28% 0.100 25 / 0.4), oklch(18% 0.042 265 / 0.6))",
            border: "1px solid oklch(40% 0.130 20 / 0.3)",
            boxShadow: "0 0 32px oklch(40% 0.130 20 / 0.15)",
          }}
        >
          <AlertTriangle className="w-7 h-7 text-hazard-400" strokeWidth={1.5} />
        </motion.div>

        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Something went wrong
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-2">
          The Oracle encountered an unexpected disturbance in the timeline.
        </p>

        {/* Error message */}
        {error.message && (
          <div className="glass rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Error</p>
            <p className="text-sm text-hazard-400 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-text-ghost mt-1">Digest: {error.digest}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-oracle-500 hover:bg-oracle-400 text-void-950 text-sm font-semibold transition-all duration-200 w-full sm:w-auto justify-center"
            style={{ boxShadow: "0 0 20px oklch(72% 0.175 76 / 0.25)" }}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-void-800/80 border border-border hover:border-border-bright text-text-secondary hover:text-text-primary text-sm font-medium transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        {/* Report link */}
        <a
          href={`https://github.com/delphi-oracle/app/issues/new?title=Error+report&body=${encodeURIComponent(`Error: ${error.message}\nDigest: ${error.digest ?? "none"}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-text-ghost hover:text-text-muted transition-colors mt-5"
        >
          <Bug className="w-3.5 h-3.5" />
          Report this issue
        </a>
      </motion.div>
    </div>
  );
}

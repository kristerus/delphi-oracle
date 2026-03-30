import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle py-8 px-6 bg-void-950">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-void-950" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-text-muted">Delphi Oracle</span>
        </div>
        <p className="text-xs text-text-ghost">
          © {new Date().getFullYear()} Delphi Oracle. The future is probabilistic.
        </p>
        <div className="flex items-center gap-5 text-xs text-text-muted">
          <Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
          <a href="https://github.com/delphi-oracle" className="hover:text-text-primary transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

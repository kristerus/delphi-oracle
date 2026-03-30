"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, User, Settings, HelpCircle, Sparkles } from "lucide-react";

const links = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/help", icon: HelpCircle, label: "Help" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border-subtle bg-void-900/50">
      <div className="px-5 py-4 border-b border-border-subtle">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-void-950" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm text-text-primary">Delphi Oracle</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-oracle-900/40 text-oracle-400 border border-oracle-800/40"
                  : "text-text-muted hover:text-text-secondary hover:bg-void-800/60"
              }`}
            >
              <link.icon className="w-4 h-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border-subtle">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xs text-text-muted mb-2">Oracle Engine</p>
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-signal-500 animate-pulse" />
            <span className="text-xs text-signal-400">Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

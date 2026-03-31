"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, User, LayoutDashboard, LogOut, ChevronDown, Menu, X, Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-void-950/80 backdrop-blur-xl">
      <nav className="flex items-center justify-between px-5 py-3 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center transition-all duration-200 group-hover:shadow-[0_0_16px_oklch(72%_0.175_76_/_0.5)]">
            <Sparkles className="w-3.5 h-3.5 text-void-950" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-text-primary text-sm tracking-tight">
            Delphi Oracle
          </span>
        </Link>

        {/* Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-oracle-900/40 text-oracle-400 border border-oracle-800/40"
                    : "text-text-muted hover:text-text-secondary hover:bg-void-800/60"
                }`}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: user menu + hamburger */}
        <div className="flex items-center gap-1">
          {/* User menu (desktop) */}
          <div className="relative" ref={dropRef}>
            {session?.user ? (
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-void-800/60 transition-all duration-150 group"
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? "avatar"}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-oracle-700 to-nebula-700 flex items-center justify-center text-white text-xs font-semibold">
                    {userInitial}
                  </div>
                )}
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors hidden sm:block">
                  {session.user.name}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-1.5">
                  Sign in
                </Link>
                <Link href="/register" className="text-sm font-medium bg-oracle-500 hover:bg-oracle-400 text-void-950 px-4 py-1.5 rounded-lg transition-all duration-150">
                  Get started
                </Link>
              </div>
            )}

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 glass-card rounded-xl overflow-hidden py-1 border border-border">
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-void-800/60 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile & settings
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-void-800/60 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <div className="h-px bg-border-subtle mx-2 my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-hazard-400 hover:bg-hazard-700/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-void-800/60 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border-subtle md:hidden"
          >
            <div className="px-5 py-3 space-y-1">
              {navLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-oracle-900/40 text-oracle-400 border border-oracle-800/40"
                        : "text-text-muted hover:text-text-secondary hover:bg-void-800/60"
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text-secondary hover:bg-void-800/60 transition-all"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <div className="h-px bg-border-subtle my-1" />
              <button
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-hazard-400 hover:bg-hazard-700/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

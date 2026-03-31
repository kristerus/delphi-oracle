"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a one-time auto-scrape after OAuth signup.
 * Calls /api/auth/auto-scrape which checks if the user has an OAuth
 * account and no scraped profile data yet — if so, scrapes GitHub/LinkedIn/Google
 * and populates the profile automatically.
 *
 * Safe to call on every page load — the server skips if already scraped.
 */
export function useAutoScrape() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch("/api/auth/auto-scrape", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "complete") {
          console.log(
            `[Delphi] Auto-scraped profile: ${data.scraped?.skills ?? 0} skills from ${data.scraped?.providers?.join(", ")}`
          );
        }
      })
      .catch(() => {
        // Silent fail — auto-scrape is best-effort
      });
  }, []);
}

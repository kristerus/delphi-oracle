"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "delphi_cookie_consent";

type ConsentState = "accepted" | "necessary" | null;

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState | "loading">("loading");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState | null;
    setConsent(stored);
  }, []);

  const accept = (type: "accepted" | "necessary") => {
    localStorage.setItem(STORAGE_KEY, type);
    setConsent(type);
  };

  const show = consent === null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50"
        >
          <div className="bg-[oklch(0.12_0.04_280)] border border-[oklch(0.22_0.06_280)] rounded-xl p-4 shadow-2xl shadow-black/50 backdrop-blur-sm">
            <div className="flex items-start gap-3 mb-3">
              <Cookie className="h-5 w-5 text-[oklch(0.75_0.18_85)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[oklch(0.9_0.05_280)] text-sm font-semibold mb-1">
                  Cookie Preferences
                </p>
                <p className="text-[oklch(0.55_0.05_280)] text-xs leading-relaxed">
                  We use cookies to keep you signed in and improve your experience.{" "}
                  <a href="/privacy" className="text-[oklch(0.65_0.12_85)] hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => accept("necessary")}
                className="flex-1 px-3 py-1.5 text-xs text-[oklch(0.65_0.05_280)] border border-[oklch(0.25_0.05_280)] rounded-lg hover:border-[oklch(0.35_0.05_280)] hover:text-[oklch(0.8_0.05_280)] transition-colors"
              >
                Necessary only
              </button>
              <button
                onClick={() => accept("accepted")}
                className="flex-1 px-3 py-1.5 text-xs font-semibold bg-[oklch(0.75_0.18_85)] text-[oklch(0.1_0.02_280)] rounded-lg hover:opacity-90 transition-opacity"
              >
                Accept all
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

interface ExtendButtonProps {
  nodeId: string;
  onExtend?: (nodeId: string) => Promise<void>;
}

export default function ExtendButton({ nodeId, onExtend }: ExtendButtonProps) {
  const [loading, setLoading] = useState(false);
  const [extended, setExtended] = useState(false);

  const handleExtend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading || extended) return;

    setLoading(true);
    try {
      if (onExtend) {
        await onExtend(nodeId);
      } else {
        // Placeholder: simulate API call
        await new Promise((r) => setTimeout(r, 1500));
      }
      setExtended(true);
    } finally {
      setLoading(false);
    }
  };

  if (extended) return null;

  return (
    <button
      onClick={handleExtend}
      disabled={loading}
      className={`
        w-full flex items-center justify-center gap-1.5
        py-2 rounded-xl text-xs font-medium
        border transition-all duration-200
        ${loading
          ? "border-border bg-void-800/30 text-text-ghost cursor-not-allowed"
          : "border-oracle-800/40 hover:border-oracle-700/70 bg-oracle-900/20 hover:bg-oracle-900/40 text-oracle-500 hover:text-oracle-400"
        }
      `}
    >
      {loading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Simulating…
        </>
      ) : (
        <>
          <Plus className="w-3 h-3" />
          Extend branch
        </>
      )}
    </button>
  );
}

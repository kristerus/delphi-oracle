"use client";

import { useRef, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import TimelineAxis from "./TimelineAxis";
import TimelineNode from "./TimelineNode";
import type { FutureNodeData, Granularity } from "@/lib/ai/types";

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface TimelineNodeData {
  id: string;
  parentId?: string | null;
  title: string;
  description: string;
  probability: number;
  certainty: number;
  timeframe?: string | null;
  timeframeStart?: string | null;
  timeframeEnd?: string | null;
  granularity?: Granularity;
  depth: number;
  details?: FutureNodeData["details"];
}

interface LaneInfo {
  branchId: string;
  laneIndex: number;
  title: string;
}

interface TimelineViewProps {
  nodes: TimelineNodeData[];
  lanes: LaneInfo[];
  laneMap: Record<string, number>;
  certaintyThreshold?: number;
  onExtend?: (nodeId: string) => void;
  className?: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

const LANE_COLORS = [
  "oklch(72% 0.175 76)",   // oracle gold
  "oklch(58% 0.130 278)",  // nebula
  "oklch(56% 0.130 185)",  // signal
  "oklch(55% 0.160 22)",   // hazard
  "oklch(48% 0.020 265)",  // muted
];

const LANE_HEIGHT = 100; // px per lane
const HEADER_HEIGHT = 52; // axis height

/* ─── Component ──────────────────────────────────────────────────────────────── */

export default function TimelineView({
  nodes,
  lanes,
  laneMap,
  certaintyThreshold = 0,
  onExtend,
  className = "",
}: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1); // multiplier on base pixels-per-day

  // ── Compute date range ──
  const { startDate, endDate } = useMemo(() => {
    const dates: Date[] = [];
    for (const n of nodes) {
      const s = parseDate(n.timeframeStart);
      const e = parseDate(n.timeframeEnd);
      if (s) dates.push(s);
      if (e) dates.push(e);
    }
    if (!dates.length) {
      const now = new Date();
      return { startDate: now, endDate: new Date(now.getFullYear() + 5, 0, 1) };
    }
    dates.sort((a, b) => a.getTime() - b.getTime());
    // pad 10%
    const span = dates.at(-1)!.getTime() - dates[0].getTime();
    const pad = span * 0.05;
    return {
      startDate: new Date(dates[0].getTime() - pad),
      endDate: new Date(dates.at(-1)!.getTime() + pad),
    };
  }, [nodes]);

  const totalDays = Math.max(1, daysBetween(startDate, endDate));

  // Base: fill 1200px for the span, then apply zoom
  const BASE_PX_PER_DAY = 1200 / totalDays;
  const pixelsPerDay = BASE_PX_PER_DAY * zoom;

  const totalWidth = totalDays * pixelsPerDay;

  // ── Filter by certainty threshold ──
  const visibleNodes = useMemo(
    () => nodes.filter((n) => n.certainty >= certaintyThreshold),
    [nodes, certaintyThreshold]
  );

  // ── Node positioning ──
  const nodePositions = useMemo(() => {
    const map: Record<string, { x: number; width: number }> = {};
    for (const n of visibleNodes) {
      const s = parseDate(n.timeframeStart);
      const e = parseDate(n.timeframeEnd);
      if (!s) continue;
      const x = daysBetween(startDate, s) * pixelsPerDay;
      const durDays = e ? daysBetween(s, e) : 180;
      const width = Math.max(140, durDays * pixelsPerDay);
      map[n.id] = { x, width };
    }
    return map;
  }, [visibleNodes, startDate, pixelsPerDay]);

  // ── Group by lane ──
  const laneNodes = useMemo(() => {
    const byLane: Record<number, TimelineNodeData[]> = {};
    for (const n of visibleNodes) {
      const lane = laneMap[n.id] ?? 0;
      if (!byLane[lane]) byLane[lane] = [];
      byLane[lane].push(n);
    }
    return byLane;
  }, [visibleNodes, laneMap]);

  // ── Wheel zoom (horizontal pinch-equivalent) ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.max(0.1, Math.min(20, z * (e.deltaY < 0 ? 1.12 : 0.9))));
    }
  }, []);

  const laneCount = Math.max(1, lanes.length);
  const totalHeight = HEADER_HEIGHT + laneCount * LANE_HEIGHT;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border-subtle bg-void-950 ${className}`}
    >
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
        {[0.5, 1, 2, 5].map((z) => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-all duration-150 ${
              Math.abs(zoom - z) < 0.05
                ? "bg-oracle-900/30 border-oracle-700/60 text-oracle-400"
                : "border-border text-text-ghost hover:text-text-muted hover:border-border-bright"
            }`}
          >
            {z}×
          </button>
        ))}
      </div>

      {/* Lane labels (fixed left) */}
      <div
        className="absolute left-0 top-0 z-10 pointer-events-none"
        style={{ width: 120, marginTop: HEADER_HEIGHT }}
      >
        {lanes.map((lane) => (
          <div
            key={lane.branchId}
            className="flex items-center px-3"
            style={{ height: LANE_HEIGHT }}
          >
            <div className="flex items-center gap-1.5 max-w-full overflow-hidden">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: LANE_COLORS[lane.laneIndex % LANE_COLORS.length] }}
              />
              <span className="text-[9px] text-text-ghost font-medium truncate">
                {lane.title}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable canvas */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden"
        style={{ marginLeft: 120, height: totalHeight }}
        onWheel={handleWheel}
      >
        <div style={{ width: totalWidth, minHeight: totalHeight, position: "relative" }}>
          {/* Axis */}
          <div style={{ position: "sticky", top: 0, zIndex: 5 }}>
            <TimelineAxis
              startDate={startDate}
              endDate={endDate}
              pixelsPerDay={pixelsPerDay}
              height={HEADER_HEIGHT}
            />
          </div>

          {/* Lane backgrounds + nodes */}
          {lanes.map((lane) => {
            const laneNodes_ = laneNodes[lane.laneIndex] ?? [];
            return (
              <div
                key={lane.branchId}
                className="absolute"
                style={{
                  top: HEADER_HEIGHT + lane.laneIndex * LANE_HEIGHT,
                  left: 0,
                  width: totalWidth,
                  height: LANE_HEIGHT,
                }}
              >
                {/* Lane stripe */}
                <div
                  className="absolute inset-0 border-b border-border-subtle"
                  style={{
                    background: `oklch(10% 0.035 268 / ${lane.laneIndex % 2 === 0 ? 0.4 : 0.2})`,
                  }}
                />

                {/* Nodes */}
                {laneNodes_.map((node) => {
                  const pos = nodePositions[node.id];
                  if (!pos) return null;
                  return (
                    <motion.div
                      key={node.id}
                      className="absolute"
                      style={{
                        left: pos.x,
                        top: 12,
                        width: pos.width,
                      }}
                      layout
                    >
                      <TimelineNode
                        node={node}
                        laneIndex={lane.laneIndex}
                        widthPx={pos.width}
                        selected={selectedId === node.id}
                        onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
                        onExtend={onExtend}
                      />
                    </motion.div>
                  );
                })}
              </div>
            );
          })}

          {/* Connector lines between parent-child nodes */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: totalWidth, height: totalHeight, top: 0, left: 0 }}
            aria-hidden
          >
            {visibleNodes.map((node) => {
              if (!node.parentId) return null;
              const from = nodePositions[node.parentId];
              const to = nodePositions[node.id];
              if (!from || !to) return null;
              const fromLane = laneMap[node.parentId] ?? 0;
              const toLane = laneMap[node.id] ?? 0;
              const fy = HEADER_HEIGHT + fromLane * LANE_HEIGHT + LANE_HEIGHT / 2;
              const ty = HEADER_HEIGHT + toLane * LANE_HEIGHT + LANE_HEIGHT / 2;
              const fx = from.x + from.width;
              const tx = to.x;
              const color = LANE_COLORS[toLane % LANE_COLORS.length];

              return (
                <path
                  key={node.id}
                  d={`M ${fx} ${fy} C ${fx + 40} ${fy}, ${tx - 40} ${ty}, ${tx} ${ty}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={node.certainty * 0.6}
                  strokeDasharray={node.certainty < 0.5 ? "4 3" : undefined}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Empty state */}
      {visibleNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-text-ghost text-sm">No predictions meet the certainty threshold.</p>
        </div>
      )}
    </div>
  );
}

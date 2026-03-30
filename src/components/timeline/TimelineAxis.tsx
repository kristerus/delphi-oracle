"use client";

import { useMemo } from "react";

interface TimelineAxisProps {
  startDate: Date;
  endDate: Date;
  pixelsPerDay: number;
  nowDate?: Date;
  height?: number;
}

type MarkerLevel = "year" | "quarter" | "month";

function addMonths(d: Date, months: number) {
  const result = new Date(d);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(d: Date, years: number) {
  const result = new Date(d);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function daysBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function TimelineAxis({
  startDate,
  endDate,
  pixelsPerDay,
  nowDate,
  height = 48,
}: TimelineAxisProps) {
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const totalPx = totalDays * pixelsPerDay;

  // Determine marker density based on zoom
  const markerLevel: MarkerLevel = useMemo(() => {
    if (pixelsPerDay >= 1.2) return "month";
    if (pixelsPerDay >= 0.2) return "quarter";
    return "year";
  }, [pixelsPerDay]);

  const markers = useMemo(() => {
    const result: Array<{ date: Date; label: string; major: boolean }> = [];

    if (markerLevel === "year") {
      let y = startDate.getFullYear();
      const endY = endDate.getFullYear() + 1;
      while (y <= endY) {
        const d = new Date(y, 0, 1);
        if (d >= startDate && d <= endDate) {
          result.push({ date: d, label: String(y), major: true });
        }
        y += 1;
      }
    } else if (markerLevel === "quarter") {
      let cur = new Date(startDate.getFullYear(), Math.floor(startDate.getMonth() / 3) * 3, 1);
      while (cur <= endDate) {
        const q = Math.floor(cur.getMonth() / 3);
        const major = q === 0;
        const label = major ? String(cur.getFullYear()) : QUARTER_LABELS[q];
        result.push({ date: new Date(cur), label, major });
        cur = addMonths(cur, 3);
      }
    } else {
      let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (cur <= endDate) {
        const major = cur.getMonth() === 0;
        const label = major ? String(cur.getFullYear()) : MONTH_LABELS[cur.getMonth()];
        result.push({ date: new Date(cur), label, major });
        cur = addMonths(cur, 1);
      }
    }

    return result;
  }, [startDate, endDate, markerLevel]);

  // "Now" marker
  const now = nowDate ?? new Date();
  const nowPx = nowDate && now >= startDate && now <= endDate
    ? daysBetween(startDate, now) * pixelsPerDay
    : null;

  return (
    <div
      className="relative shrink-0 border-b border-border"
      style={{ width: totalPx, height }}
    >
      {/* Tick marks & labels */}
      {markers.map((m, i) => {
        const x = daysBetween(startDate, m.date) * pixelsPerDay;
        return (
          <div
            key={i}
            className="absolute top-0 flex flex-col items-start"
            style={{ left: x }}
          >
            <div
              className={`w-px ${m.major ? "h-3 bg-border-bright" : "h-2 bg-border"}`}
            />
            <span
              className={`text-[10px] font-mono pl-1 select-none ${
                m.major
                  ? "text-text-muted font-semibold"
                  : "text-text-ghost"
              }`}
            >
              {m.label}
            </span>
          </div>
        );
      })}

      {/* Now marker */}
      {nowPx !== null && (
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
          style={{ left: nowPx }}
        >
          <div className="w-px h-full bg-oracle-500/80" />
          <div
            className="absolute -top-1 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-oracle-400 shadow-[0_0_6px_oklch(72%_0.175_76_/_0.7)]"
          />
          <span
            className="absolute top-4 -translate-x-1/2 text-[9px] font-semibold text-oracle-400 whitespace-nowrap"
          >
            NOW
          </span>
        </div>
      )}
    </div>
  );
}

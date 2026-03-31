"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Home, LayoutDashboard } from "lucide-react";

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NUM_STARS = 80;
    const MAX_DIST = 140;
    let animId: number;
    const stars: Star[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < NUM_STARS; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.6 + 0.3,
        opacity: Math.random() * 0.5 + 0.15,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;
      }

      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.12;
            ctx.strokeStyle = `oklch(55% 0.130 280 / ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }

      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(80% 0.020 265 / ${s.opacity})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      aria-hidden
    />
  );
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <ConstellationCanvas />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative text-center max-w-lg"
      >
        {/* Oracle eye logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-oracle-900/60 to-nebula-900/60 border border-oracle-800/30 mb-8 mx-auto animate-float"
          style={{ boxShadow: "0 0 40px oklch(45% 0.120 280 / 0.2), 0 0 80px oklch(72% 0.175 76 / 0.1)" }}
        >
          <Sparkles className="w-8 h-8 text-oracle-500" strokeWidth={1.5} />
        </motion.div>

        {/* 404 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-8xl font-bold font-mono mb-4 leading-none"
          style={{
            background: "linear-gradient(135deg, oklch(88% 0.140 84), oklch(72% 0.175 76), oklch(55% 0.130 280))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-2xl font-semibold text-text-primary mb-3"
        >
          Lost in the cosmos?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-text-secondary leading-relaxed mb-8"
        >
          Even the Oracle can&apos;t locate this branch of the timeline.
          The page you&apos;re looking for has drifted beyond the observable universe.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex items-center justify-center gap-3"
        >
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-void-800/80 border border-border hover:border-border-bright text-text-secondary hover:text-text-primary text-sm font-medium transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-oracle-500 hover:bg-oracle-400 text-void-950 text-sm font-semibold transition-all duration-200"
            style={{ boxShadow: "0 0 20px oklch(72% 0.175 76 / 0.3)" }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

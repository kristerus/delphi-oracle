"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  GitBranch,
  Globe,
  Users,
  ChevronRight,
  Zap,
  Shield,
  Brain,
  CheckCircle2,
  X,
  Check,
  Minus,
  Send,
  Twitter,
  Linkedin,
  Github,
  Quote,
} from "lucide-react";

/* ─── Constellation Canvas ──────────────────────────────────────────────────── */

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

    const NUM_STARS = 120;
    const MAX_DIST = 160;
    let animId: number;
    const stars: Star[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Seed stars
    for (let i = 0; i < NUM_STARS; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.8 + 0.4,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update positions
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;
      }

      // Draw edges
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.25;
            const gradient = ctx.createLinearGradient(
              stars[i].x, stars[i].y, stars[j].x, stars[j].y
            );
            gradient.addColorStop(0, `oklch(72% 0.175 76 / ${alpha})`);
            gradient.addColorStop(0.5, `oklch(55% 0.130 280 / ${alpha * 1.5})`);
            gradient.addColorStop(1, `oklch(72% 0.175 76 / ${alpha})`);
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // Draw stars
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(90% 0.050 272 / ${s.opacity})`;
        ctx.fill();

        // Glow for larger stars
        if (s.radius > 1.4) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 3, 0, Math.PI * 2);
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 3);
          glow.addColorStop(0, `oklch(82% 0.165 80 / ${s.opacity * 0.4})`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fill();
        }
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
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    />
  );
}

/* ─── Feature Card ──────────────────────────────────────────────────────────── */

const features = [
  {
    icon: Globe,
    title: "Digital Footprint Analysis",
    description:
      "AI scrapes and analyzes your public digital presence — professional history, skills, social signals — to build your behavioral model.",
    color: "oracle",
  },
  {
    icon: GitBranch,
    title: "Branching Future Timelines",
    description:
      "Each decision spawns multiple probability-weighted branches displayed as an interactive horizontal tree. Drill into any path.",
    color: "nebula",
  },
  {
    icon: Zap,
    title: "Deep Branch Expansion",
    description:
      "Click any future node to extend it further. The simulation goes deeper, revealing long-term consequences and hidden variables.",
    color: "signal",
  },
  {
    icon: Users,
    title: "Intersection Mapping",
    description:
      "Combine multiple people's future trees to find convergence points — great for co-founders, partners, and team planning.",
    color: "oracle",
  },
  {
    icon: Brain,
    title: "Model-Agnostic AI",
    description:
      "Bring your own Claude, GPT-4, or custom endpoint. Your data never trains any model. Full privacy by design.",
    color: "nebula",
  },
  {
    icon: Shield,
    title: "Encrypted & Private",
    description:
      "All profile data is encrypted at rest. API keys are stored encrypted. You control what the AI sees.",
    color: "signal",
  },
];

const colorMap = {
  oracle: {
    icon: "text-oracle-500",
    glow: "group-hover:shadow-[0_0_40px_oklch(72%_0.175_76_/_0.2)]",
    border: "group-hover:border-oracle-700/60",
    bg: "group-hover:bg-oracle-950/30",
  },
  nebula: {
    icon: "text-nebula-400",
    glow: "group-hover:shadow-[0_0_40px_oklch(55%_0.130_280_/_0.25)]",
    border: "group-hover:border-nebula-700/60",
    bg: "group-hover:bg-nebula-950/30",
  },
  signal: {
    icon: "text-signal-400",
    glow: "group-hover:shadow-[0_0_40px_oklch(60%_0.130_185_/_0.2)]",
    border: "group-hover:border-signal-700/60",
    bg: "group-hover:bg-signal-700/10",
  },
};

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const c = colorMap[feature.color as keyof typeof colorMap];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={`group glass-card rounded-2xl p-6 transition-all duration-300 ${c.glow} ${c.border} ${c.bg}`}
    >
      <div
        className={`inline-flex p-2.5 rounded-xl bg-void-800/80 mb-4 ${c.icon}`}
      >
        <feature.icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <h3 className="text-text-primary font-semibold text-base mb-2">
        {feature.title}
      </h3>
      <p className="text-text-secondary text-sm leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

/* ─── Stats Row ─────────────────────────────────────────────────────────────── */

const stats = [
  { value: "∞", label: "Possible futures" },
  { value: "12+", label: "AI providers" },
  { value: "100%", label: "Private by design" },
  { value: "< 30s", label: "Simulation time" },
];

/* ─── How It Works ──────────────────────────────────────────────────────────── */

const steps = [
  {
    num: "01",
    title: "Build your profile",
    description: "Enter your background or let AI scrape your digital footprint automatically.",
  },
  {
    num: "02",
    title: "Pose a decision",
    description: "\"Should I start a company?\" \"Move to Tokyo?\" Any life decision becomes a simulation seed.",
  },
  {
    num: "03",
    title: "Explore the branches",
    description: "Navigate your probability-weighted future tree. Expand any node to go deeper.",
  },
  {
    num: "04",
    title: "Combine & compare",
    description: "Merge multiple people's trees to find where futures intersect.",
  },
];

/* ─── Testimonials ─────────────────────────────────────────────────────────── */

const testimonials = [
  {
    name: "Sarah K.",
    role: "Product Manager at Figma",
    text: "I was debating between staying in product or going founder mode. Delphi showed me a branch where I joined a Series A as head of product — with specific companies and comp ranges. That branch is now my actual plan.",
    avatar: "SK",
    color: "oracle",
  },
  {
    name: "Marcus T.",
    role: "ML Engineer, ex-Google",
    text: "The predictions aren't vague fortune-telling. It named actual professors at CMU and Stanford I could work with, specific PhD timelines, and realistic funding scenarios. That level of specificity changed how I think about my career.",
    avatar: "MT",
    color: "nebula",
  },
  {
    name: "Priya R.",
    role: "Founder & CEO, Stealth Startup",
    text: "Used the multi-category simulation for Career + Financial + Personal. It showed me how a Series A fundraise would interact with my plan to relocate to London. The cross-domain tension was something no advisor had surfaced.",
    avatar: "PR",
    color: "signal",
  },
];

const testimonialColors = {
  oracle: "border-oracle-700/40 bg-oracle-950/20",
  nebula: "border-nebula-700/40 bg-nebula-950/20",
  signal: "border-signal-700/40 bg-signal-950/20",
};

const avatarColors = {
  oracle: "from-oracle-500 to-oracle-700",
  nebula: "from-nebula-400 to-nebula-600",
  signal: "from-signal-400 to-signal-600",
};

/* ─── Comparison ──────────────────────────────────────────────────────────── */

const comparisonRows = [
  { feature: "Grounded in YOUR real profile data", delphi: true, journal: false, coach: "partial", matrix: false },
  { feature: "References real companies, people, salaries", delphi: true, journal: false, coach: "partial", matrix: false },
  { feature: "Probability-weighted outcomes", delphi: true, journal: false, coach: false, matrix: "partial" },
  { feature: "Multi-level branch expansion", delphi: true, journal: false, coach: false, matrix: false },
  { feature: "Cross-domain interaction (career + romantic + financial)", delphi: true, journal: "partial", coach: "partial", matrix: false },
  { feature: "Live web search grounding", delphi: true, journal: false, coach: false, matrix: false },
  { feature: "Visual branching timeline", delphi: true, journal: false, coach: false, matrix: "partial" },
  { feature: "Privacy-first (BYOK, AES-256)", delphi: true, journal: true, coach: false, matrix: true },
];

/* ─── FAQ Item ──────────────────────────────────────────────────────────────── */

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-sm font-medium text-text-primary">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-muted ml-4 shrink-0 text-lg leading-none"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm text-text-secondary leading-relaxed border-t border-border-subtle pt-3">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.96]);

  return (
    <div className="min-h-screen bg-void-950 overflow-x-hidden">
      {/* ── Ambient background glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-25 animate-glow-pulse"
          style={{ background: "radial-gradient(circle, oklch(45% 0.120 280), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-20 animate-glow-pulse"
          style={{ background: "radial-gradient(circle, oklch(46% 0.145 68), transparent 70%)", animationDelay: "1.5s" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-15 animate-glow-pulse"
          style={{ background: "radial-gradient(circle, oklch(42% 0.110 185), transparent 70%)", animationDelay: "3s" }}
        />
      </div>

      {/* ── Navbar ── */}
      <header className="relative z-50">
        <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center glow-gold">
              <Sparkles className="w-3.5 h-3.5 text-void-950" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-text-primary tracking-tight">
              Delphi Oracle
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            <a href="#features" className="hover:text-text-primary transition-colors duration-150">Features</a>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors duration-150">How it works</a>
            <a href="#pricing" className="hover:text-text-primary transition-colors duration-150">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-oracle-500 hover:bg-oracle-400 text-void-950 px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_oklch(72%_0.175_76_/_0.5)]"
            >
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden"
      >
        <ConstellationCanvas />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-oracle-400 border border-oracle-800/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Agentic AI future simulation
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none"
          >
            <span className="text-text-primary">See every</span>
            <br />
            <span className="text-shimmer">possible future</span>
            <br />
            <span className="text-text-primary">you could have.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed"
          >
            Delphi Oracle analyzes your digital footprint and simulates branching
            futures for any life decision — displayed as a beautiful, explorable
            tree of probability-weighted timelines.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-oracle-500 hover:bg-oracle-400 text-void-950 font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:shadow-[0_0_32px_oklch(72%_0.175_76_/_0.6)] text-base"
            >
              Start your simulation
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 glass border-border text-text-primary hover:text-oracle-400 hover:border-oracle-800/60 font-medium px-7 py-3.5 rounded-xl transition-all duration-200 text-base"
            >
              View demo tree
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex items-center justify-center gap-1.5 text-sm text-text-muted"
          >
            <Shield className="w-3.5 h-3.5 text-signal-500" />
            No credit card required · Bring your own AI keys · Fully encrypted
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-text-ghost uppercase tracking-widest">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-oracle-500/50 to-transparent" />
        </motion.div>
      </motion.section>

      {/* ── Stats row ── */}
      <section className="relative z-10 py-12 border-y border-border-subtle">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-gradient-gold mb-1">{s.value}</div>
              <div className="text-sm text-text-muted">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-oracle-500 text-sm font-medium uppercase tracking-widest mb-3">
              What Delphi can do
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
              Built for serious
              <span className="text-gradient-nebula"> life decisions</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative z-10 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-20"
          >
            <p className="text-oracle-500 text-sm font-medium uppercase tracking-widest mb-3">
              The process
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
              From question to
              <span className="text-gradient-gold"> future map</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card rounded-2xl p-7 flex gap-5"
              >
                <div className="shrink-0">
                  <span className="text-3xl font-bold text-gradient-gold font-mono leading-none">
                    {step.num}
                  </span>
                </div>
                <div>
                  <h3 className="text-text-primary font-semibold mb-2">{step.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Video Demo ── */}
      <section id="demo" className="relative z-10 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-oracle-500 text-sm font-medium uppercase tracking-widest mb-3">
              See it in action
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
              Watch the
              <span className="text-gradient-gold"> Oracle work</span>
            </h2>
            <p className="text-text-secondary text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
              From profile import to branching futures in under 30 seconds.
              See how real decisions create probability-weighted timelines grounded in real companies, programs, and market data.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl overflow-hidden border border-border-subtle"
            style={{ boxShadow: "0 0 80px oklch(45% 0.120 280 / 0.15), 0 0 40px oklch(72% 0.175 76 / 0.1)" }}
          >
            {/* Video container with 16:9 aspect ratio */}
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              {/* Replace the src below with your actual demo video URL */}
              {/* Supports: YouTube embed, Vimeo embed, or direct .mp4 URL */}
              <video
                className="absolute inset-0 w-full h-full object-cover bg-void-900"
                src="/demo.mp4"
                poster="/demo-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              >
                <p className="text-text-muted text-sm p-8">
                  Your browser does not support the video tag.
                </p>
              </video>
            </div>

            {/* Bottom caption bar */}
            <div className="bg-void-900/90 backdrop-blur-sm border-t border-border-subtle px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-signal-500 animate-pulse" />
                <span className="text-xs text-text-muted">Live demo recording</span>
              </div>
              <span className="text-xs text-text-ghost">Real predictions, real companies, real data</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-oracle-500 text-sm font-medium uppercase tracking-widest mb-3">
              What people are saying
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
              Decisions, <span className="text-gradient-nebula">transformed</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`glass-card rounded-2xl p-6 border ${testimonialColors[t.color as keyof typeof testimonialColors]} flex flex-col`}
              >
                <Quote className="w-8 h-8 text-text-ghost/30 mb-4" strokeWidth={1} />
                <p className="text-sm text-text-secondary leading-relaxed flex-1 mb-5">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border-subtle">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[t.color as keyof typeof avatarColors]} flex items-center justify-center text-xs font-bold text-void-950`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-oracle-500 text-sm font-medium uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
              Simple,{" "}
              <span className="text-gradient-gold">transparent</span>
            </h2>
            <p className="text-text-secondary text-lg mt-4 max-w-xl mx-auto">
              Bring your own AI keys and pay nothing. Or go Pro for the full oracle experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Free */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="glass-card rounded-2xl p-7 flex flex-col"
            >
              <div className="mb-5">
                <p className="text-sm font-medium text-text-muted uppercase tracking-wider mb-1">Free</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text-primary">$0</span>
                  <span className="text-text-muted text-sm">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {["Unlimited simulations (BYOK)", "Up to 3 branches per node", "Tree + Timeline views", "Manual profile builder", "Community support"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-signal-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full text-center py-2.5 rounded-xl border border-border hover:border-border-bright text-text-secondary hover:text-text-primary text-sm font-medium transition-all">
                Get started free
              </Link>
            </motion.div>

            {/* Pro */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="relative glass-card rounded-2xl p-7 flex flex-col border-oracle-700/50"
              style={{ boxShadow: "0 0 40px oklch(72% 0.175 76 / 0.12)" }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-oracle-500 text-void-950 text-xs font-bold px-3 py-1 rounded-full">
                Most popular
              </div>
              <div className="mb-5">
                <p className="text-sm font-medium text-oracle-400 uppercase tracking-wider mb-1">Pro</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text-primary">$12</span>
                  <span className="text-text-muted text-sm">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {["Everything in Free", "AI-powered digital footprint scraping", "Up to 6 branches per node", "Deep prediction chains (3+ levels)", "Multi-category combination trees", "Priority AI routing", "Email support"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-oracle-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full text-center py-2.5 rounded-xl bg-oracle-500 hover:bg-oracle-400 text-void-950 text-sm font-semibold transition-all hover:shadow-[0_0_20px_oklch(72%_0.175_76_/_0.5)]">
                Start free trial
              </Link>
            </motion.div>

            {/* Team */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.19 }}
              className="glass-card rounded-2xl p-7 flex flex-col"
            >
              <div className="mb-5">
                <p className="text-sm font-medium text-nebula-400 uppercase tracking-wider mb-1">Team</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text-primary">$39</span>
                  <span className="text-text-muted text-sm">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {["Everything in Pro", "Up to 10 team members", "Shared simulation library", "Intersection mapping (compare trees)", "Team API key management", "SSO / SAML support", "Dedicated support"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-nebula-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full text-center py-2.5 rounded-xl border border-nebula-700/40 hover:border-nebula-600/60 text-nebula-400 hover:text-nebula-300 text-sm font-medium transition-all">
                Contact us
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-oracle-500 text-sm font-medium uppercase tracking-widest mb-3">
              Why Delphi
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
              Not your average decision tool
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card rounded-2xl overflow-hidden border border-border-subtle"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left text-text-muted font-medium px-5 py-4 w-2/5" />
                    <th className="text-center px-4 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <Sparkles className="w-4 h-4 text-oracle-500" />
                        <span className="text-oracle-400 font-semibold text-xs">Delphi Oracle</span>
                      </div>
                    </th>
                    <th className="text-center text-text-muted font-medium px-4 py-4 text-xs">Journaling</th>
                    <th className="text-center text-text-muted font-medium px-4 py-4 text-xs">Career Coach</th>
                    <th className="text-center text-text-muted font-medium px-4 py-4 text-xs">Decision Matrix</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className={i < comparisonRows.length - 1 ? "border-b border-border-subtle/50" : ""}>
                      <td className="text-text-secondary px-5 py-3.5 text-xs">{row.feature}</td>
                      {[row.delphi, row.journal, row.coach, row.matrix].map((val, j) => (
                        <td key={j} className="text-center px-4 py-3.5">
                          {val === true ? (
                            <Check className={`w-4 h-4 mx-auto ${j === 0 ? "text-oracle-500" : "text-signal-500"}`} />
                          ) : val === "partial" ? (
                            <Minus className="w-4 h-4 mx-auto text-text-ghost" />
                          ) : (
                            <X className="w-3.5 h-3.5 mx-auto text-text-ghost/40" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-text-primary">Frequently asked questions</h2>
          </motion.div>
          <div className="space-y-3">
            {[
              {
                q: "What AI models does it support?",
                a: "Delphi Oracle works with Claude (Anthropic), GPT-4o (OpenAI), and any OpenAI-compatible endpoint including Ollama, Together AI, and Groq. You bring your own API key.",
              },
              {
                q: "Is my data private?",
                a: "Yes. Your profile data and API keys are encrypted at rest using AES-256. Your AI keys are decrypted only in memory during simulation calls — never logged or stored in plaintext.",
              },
              {
                q: "What is a 'combination simulation'?",
                a: "You can select multiple life domains (e.g. Career + Romantic) and the Oracle generates futures where both domains genuinely intersect — showing cross-domain tension, synergies, and cascade effects.",
              },
              {
                q: "How accurate are the predictions?",
                a: "The Oracle generates probability-weighted scenarios based on your real profile data, but these are explorations of possibility — not prophecy. The value is in stress-testing decisions and surfacing consequences you might not have considered.",
              },
              {
                q: "Can I export my simulations?",
                a: "Yes. From Settings → Data & Privacy, you can download a complete JSON export of all your simulations, profile data, and tree nodes.",
              },
            ].map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="relative z-10 py-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto text-center"
        >
          <p className="text-text-secondary text-sm mb-4">
            Not ready to sign up? Get notified when we launch new features.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).querySelector("input");
              if (input?.value) {
                // TODO: Wire to email service (Resend, Mailchimp, etc.)
                input.value = "";
                alert("You're on the list!");
              }
            }}
            className="flex gap-2 max-w-md mx-auto"
          >
            <input
              type="email"
              placeholder="you@example.com"
              required
              className="flex-1 bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200"
            />
            <button
              type="submit"
              className="flex items-center gap-2 bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 font-medium text-sm px-5 py-3 rounded-xl transition-all duration-200"
            >
              <Send className="w-3.5 h-3.5" />
              Notify me
            </button>
          </form>
        </motion.div>
      </section>

      {/* ── CTA section ── */}
      <section className="relative z-10 py-28 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="glass-card rounded-3xl p-12 border-shimmer relative overflow-hidden">
            {/* Ambient glow inside card */}
            <div
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-30 pointer-events-none"
              style={{ background: "radial-gradient(circle, oklch(45% 0.120 280), transparent 70%)" }}
              aria-hidden
            />
            <div className="relative z-10">
              <div className="inline-flex p-3 rounded-2xl bg-oracle-900/50 mb-6">
                <Sparkles className="w-7 h-7 text-oracle-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-4xl font-bold text-text-primary mb-4 tracking-tight">
                Start mapping your futures
              </h2>
              <p className="text-text-secondary text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                Free to start. Bring your own API key. No futures are stored unless you choose to save them.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 bg-oracle-500 hover:bg-oracle-400 text-void-950 font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:shadow-[0_0_40px_oklch(72%_0.175_76_/_0.6)]"
              >
                <Sparkles className="w-4 h-4" />
                Create free account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border-subtle py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-void-950" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-semibold text-text-primary">Delphi Oracle</span>
              </div>
              <p className="text-xs text-text-ghost leading-relaxed mb-4">
                AI-powered future simulation.<br />
                The future is not fixed.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3">
                <a href="https://twitter.com/delphioracle" target="_blank" rel="noopener noreferrer" className="text-text-ghost hover:text-text-primary transition-colors" aria-label="Twitter">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="https://linkedin.com/company/delphi-oracle" target="_blank" rel="noopener noreferrer" className="text-text-ghost hover:text-text-primary transition-colors" aria-label="LinkedIn">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="https://github.com/kristerus/delphi-oracle" target="_blank" rel="noopener noreferrer" className="text-text-ghost hover:text-text-primary transition-colors" aria-label="GitHub">
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Product</p>
              <ul className="space-y-2 text-sm text-text-ghost">
                <li><a href="#features" className="hover:text-text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a></li>
                <li><a href="#demo" className="hover:text-text-primary transition-colors">Demo</a></li>
                <li><Link href="/register" className="hover:text-text-primary transition-colors">Get started</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Resources</p>
              <ul className="space-y-2 text-sm text-text-ghost">
                <li><a href="/blog" className="hover:text-text-primary transition-colors">Blog</a></li>
                <li><a href="https://discord.gg/delphi-oracle" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">Discord Community</a></li>
                <li><a href="/changelog" className="hover:text-text-primary transition-colors">Changelog</a></li>
                <li><a href="mailto:support@delphi-oracle.app" className="hover:text-text-primary transition-colors">Support</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Legal</p>
              <ul className="space-y-2 text-sm text-text-ghost">
                <li><Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-text-primary transition-colors">Terms of Service</Link></li>
                <li><a href="mailto:security@delphi-oracle.app" className="hover:text-text-primary transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-text-ghost">
              &copy; {new Date().getFullYear()} Delphi Oracle. All rights reserved.
            </p>
            <p className="text-xs text-text-ghost">
              Built with Next.js and the belief that every decision deserves a map.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

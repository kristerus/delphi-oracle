"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Sparkles, Github, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

type FormData = z.infer<typeof schema>;

const requirements = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /[0-9]/.test(v) },
];

const githubEnabled = process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED === "true";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch("password", "");

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        callbackURL: "/profile",
      });
      if (authError) {
        setError(authError.message ?? "Registration failed. Please try again.");
      } else {
        // Fire-and-forget welcome email
        fetch("/api/auth/welcome", { method: "POST" }).catch(() => {});
        router.push("/profile");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = async () => {
    setGithubLoading(true);
    await authClient.signIn.social({ provider: "github", callbackURL: "/profile" });
    setGithubLoading(false);
  };

  return (
    <div className="min-h-screen bg-void-950 flex items-center justify-center p-6">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute top-1/4 right-1/3 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, oklch(45% 0.120 280), transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, oklch(46% 0.145 68), transparent 70%)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center glow-gold">
              <Sparkles className="w-4.5 h-4.5 text-void-950" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-lg text-text-primary">Delphi Oracle</span>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Map your first future
          </h1>
          <p className="text-text-secondary text-sm">
            Free to start. Bring your own AI keys.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-7">
          {/* GitHub OAuth */}
          {githubEnabled ? (
            <button
              onClick={handleGithub}
              disabled={githubLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border hover:border-border-bright bg-void-800/50 hover:bg-void-700/50 text-text-primary font-medium text-sm transition-all duration-200 mb-6 disabled:opacity-50"
            >
              <Github className="w-4 h-4" />
              {githubLoading ? "Redirecting…" : "Continue with GitHub"}
            </button>
          ) : (
            <button
              disabled
              title="GitHub OAuth not configured"
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border bg-void-800/50 text-text-primary font-medium text-sm mb-6 opacity-40 cursor-not-allowed"
            >
              <Github className="w-4 h-4" />
              Continue with GitHub
              <span className="text-xs ml-1 opacity-60">(not configured)</span>
            </button>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-xs text-text-ghost">or with email</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 bg-hazard-700/20 border border-hazard-600/30 text-hazard-400 text-sm px-4 py-3 rounded-xl mb-4"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  {...register("name")}
                  type="text"
                  autoComplete="name"
                  placeholder="Alex Rivera"
                  className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 focus:bg-void-800 rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200"
                />
              </div>
              {errors.name && <p className="text-hazard-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 focus:bg-void-800 rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200"
                />
              </div>
              {errors.email && <p className="text-hazard-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 focus:bg-void-800 rounded-xl pl-10 pr-11 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-hazard-400 text-xs mt-1">{errors.password.message}</p>}

              {/* Password strength indicators */}
              {password && (
                <div className="mt-2.5 space-y-1.5">
                  {requirements.map((req) => {
                    const met = req.test(password);
                    return (
                      <div key={req.label} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-200 ${met ? "bg-signal-600" : "bg-void-700"}`}>
                          {met && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
                        </div>
                        <span className={`text-xs transition-colors duration-200 ${met ? "text-signal-400" : "text-text-ghost"}`}>
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || githubLoading}
              className="w-full flex items-center justify-center gap-2 bg-oracle-500 hover:bg-oracle-400 disabled:opacity-50 disabled:cursor-not-allowed text-void-950 font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-[0_0_24px_oklch(72%_0.175_76_/_0.5)] text-sm mt-2"
            >
              {loading ? "Creating account…" : (
                <>Create free account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-center text-xs text-text-ghost">
              By creating an account you agree to our{" "}
              <a href="#" className="text-text-muted hover:text-text-secondary underline underline-offset-2">Terms</a>
              {" "}and{" "}
              <a href="#" className="text-text-muted hover:text-text-secondary underline underline-offset-2">Privacy Policy</a>.
            </p>
          </form>
        </div>

        <p className="text-center text-text-muted text-sm mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-oracle-500 hover:text-oracle-400 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

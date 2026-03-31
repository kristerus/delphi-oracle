"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Sparkles, Github, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const githubEnabled = process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED === "true";
const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";
const linkedinEnabled = process.env.NEXT_PUBLIC_LINKEDIN_OAUTH_ENABLED === "true";
const hasAnySocial = githubEnabled || googleEnabled || linkedinEnabled;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: "/dashboard",
      });
      if (authError) {
        setError(authError.message ?? "Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider: "github" | "google" | "linkedin") => {
    setSocialLoading(provider);
    await authClient.signIn.social({ provider, callbackURL: "/dashboard" });
    setSocialLoading(null);
  };

  return (
    <div className="min-h-screen bg-void-950 flex items-center justify-center p-6">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, oklch(45% 0.120 280), transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, oklch(46% 0.145 68), transparent 70%)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center glow-gold">
              <Sparkles className="w-4.5 h-4.5 text-void-950" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-lg text-text-primary">Delphi Oracle</span>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome back</h1>
          <p className="text-text-secondary text-sm">Sign in to continue to your futures</p>
        </div>

        <div className="glass-card rounded-2xl p-7">
          {/* Social OAuth */}
          {hasAnySocial && (
            <>
              <div className="space-y-2.5 mb-6">
                {googleEnabled && (
                  <button
                    onClick={() => handleSocial("google")}
                    disabled={!!socialLoading || loading}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border hover:border-border-bright bg-void-800/50 hover:bg-void-700/50 text-text-primary font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    {socialLoading === "google" ? "Redirecting…" : "Continue with Google"}
                  </button>
                )}
                {githubEnabled && (
                  <button
                    onClick={() => handleSocial("github")}
                    disabled={!!socialLoading || loading}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border hover:border-border-bright bg-void-800/50 hover:bg-void-700/50 text-text-primary font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Github className="w-4 h-4" />
                    {socialLoading === "github" ? "Redirecting…" : "Continue with GitHub"}
                  </button>
                )}
                {linkedinEnabled && (
                  <button
                    onClick={() => handleSocial("linkedin")}
                    disabled={!!socialLoading || loading}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border hover:border-border-bright bg-void-800/50 hover:bg-void-700/50 text-text-primary font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    {socialLoading === "linkedin" ? "Redirecting…" : "Continue with LinkedIn"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-xs text-text-ghost">or with email</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
            </>
          )}

          {/* Error */}
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
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Email address
              </label>
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
              {errors.email && (
                <p className="text-hazard-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-text-secondary">Password</label>
                <Link href="/forgot-password" className="text-xs text-oracle-500 hover:text-oracle-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
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
              {errors.password && (
                <p className="text-hazard-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !!socialLoading}
              className="w-full flex items-center justify-center gap-2 bg-oracle-500 hover:bg-oracle-400 disabled:opacity-50 disabled:cursor-not-allowed text-void-950 font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-[0_0_24px_oklch(72%_0.175_76_/_0.5)] text-sm mt-2"
            >
              {loading ? "Signing in…" : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-sm mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-oracle-500 hover:text-oracle-400 font-medium transition-colors">
            Create one free
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

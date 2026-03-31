"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });
      if (authError) {
        setError(
          authError.message ?? "Failed to reset password. The link may have expired."
        );
      } else {
        setDone(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-oracle-500 to-nebula-500 flex items-center justify-center glow-gold">
              <Sparkles
                className="w-4.5 h-4.5 text-void-950"
                strokeWidth={2.5}
              />
            </div>
            <span className="font-semibold text-lg text-text-primary">
              Delphi Oracle
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Set new password
          </h1>
          <p className="text-text-secondary text-sm">
            Choose a strong password for your account
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="glass-card rounded-2xl p-7"
            >
              {!token && (
                <div className="flex items-center gap-2.5 bg-hazard-700/20 border border-hazard-600/30 text-hazard-400 text-sm px-4 py-3 rounded-xl mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Invalid reset link. Please request a new one.
                </div>
              )}
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
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      {...register("password")}
                      type={showPass ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl pl-10 pr-11 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {showPass ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-hazard-400 text-xs mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      {...register("confirm")}
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat your password"
                      className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl pl-10 pr-11 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {showConfirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p className="text-hazard-400 text-xs mt-1">
                      {errors.confirm.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full flex items-center justify-center gap-2 bg-oracle-500 hover:bg-oracle-400 disabled:opacity-50 disabled:cursor-not-allowed text-void-950 font-semibold py-3 rounded-xl transition-all text-sm mt-2"
                >
                  {loading ? "Updating…" : "Set new password"}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-2xl p-7 text-center"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(30% 0.090 185 / 0.3), oklch(18% 0.042 265 / 0.6))",
                  border: "1px solid oklch(56% 0.130 185 / 0.25)",
                  boxShadow: "0 0 24px oklch(56% 0.130 185 / 0.15)",
                }}
              >
                <CheckCircle2
                  className="w-6 h-6 text-signal-400"
                  strokeWidth={1.5}
                />
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Password updated
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                Your password has been changed. You can now sign in with your
                new password.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-oracle-500 hover:bg-oracle-400 text-void-950 font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
              >
                Sign in
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-text-muted text-sm mt-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-oracle-500 hover:text-oracle-400 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

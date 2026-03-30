"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/reset-password",
      });
      if (authError) {
        setError(authError.message ?? "Could not send reset email. Please try again.");
      } else {
        setSentEmail(data.email);
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void-950 flex items-center justify-center p-6">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, oklch(45% 0.120 280), transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-12"
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
          <h1 className="text-2xl font-bold text-text-primary mb-2">Reset your password</h1>
          <p className="text-text-secondary text-sm">
            Enter your email and we&apos;ll send a reset link
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="glass-card rounded-2xl p-7"
            >
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
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      {...register("email")}
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="you@example.com"
                      className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 focus:bg-void-800 rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-hazard-400 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-oracle-500 hover:bg-oracle-400 disabled:opacity-50 disabled:cursor-not-allowed text-void-950 font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-[0_0_24px_oklch(72%_0.175_76_/_0.5)] text-sm mt-2"
                >
                  {loading ? "Sending…" : (
                    <>Send reset link <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-2xl p-7 text-center"
            >
              {/* Success icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background: "linear-gradient(135deg, oklch(30% 0.090 185 / 0.3), oklch(18% 0.042 265 / 0.6))",
                  border: "1px solid oklch(56% 0.130 185 / 0.25)",
                  boxShadow: "0 0 24px oklch(56% 0.130 185 / 0.15)",
                }}
              >
                <CheckCircle2 className="w-6 h-6 text-signal-400" strokeWidth={1.5} />
              </div>

              <h2 className="text-lg font-semibold text-text-primary mb-2">Check your inbox</h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-1">
                We sent a password reset link to
              </p>
              <p className="text-oracle-400 text-sm font-medium mb-5">{sentEmail}</p>

              <div className="glass rounded-xl px-4 py-3 text-xs text-text-muted leading-relaxed">
                Didn&apos;t get the email? Check your spam folder, or{" "}
                <button
                  onClick={() => {
                    setSent(false);
                    setError(null);
                  }}
                  className="text-oracle-500 hover:text-oracle-400 transition-colors underline underline-offset-2"
                >
                  try again
                </button>{" "}
                with a different address.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-text-muted text-sm mt-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-oracle-500 hover:text-oracle-400 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

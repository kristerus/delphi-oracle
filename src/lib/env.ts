/**
 * Zod-validated environment variables.
 *
 * Import `env` instead of accessing `process.env` directly so that:
 *   - Missing / malformed vars are caught at startup with a clear message.
 *   - All access is fully type-safe (no `!` non-null assertions needed).
 *
 * Set SKIP_ENV_VALIDATION=true in CI build steps that don't need a real DB.
 */

import { z } from "zod";

const envSchema = z.object({
  // ── Database ────────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // ── Auth ────────────────────────────────────────────────────────────────────
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // ── AI Providers ─────────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // ── Backend ──────────────────────────────────────────────────────────────────
  // These are kept for backward compat but are no longer required by the app.
  BACKEND_URL: z.string().url().optional().default("http://localhost:8000"),
  BACKEND_API_KEY: z.string().optional(),

  // ── App ──────────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    // Return a proxy so property access works without throwing during build
    return process.env as unknown as Env;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`\n[env] Invalid environment variables:\n${issues}\n`);
  }

  return result.data;
}

export const env = validateEnv();

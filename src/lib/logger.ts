/**
 * Structured logger.
 *
 * - Development: human-readable console output.
 * - Production: JSON per-line for log aggregators (Datadog, CloudWatch, etc.).
 *
 * Never call logger.error with raw Error objects in client-facing responses;
 * use `toUserError()` to strip stack traces before returning to the client.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === "production";

const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: "[DEBUG]",
  info:  "[INFO] ",
  warn:  "[WARN] ",
  error: "[ERROR]",
};

function write(level: LogLevel, message: string, meta: LogMeta = {}): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const output = IS_PROD ? JSON.stringify(entry) : `${LEVEL_PREFIX[level]} ${message}${Object.keys(meta).length ? " " + JSON.stringify(meta) : ""}`;

  // Route to the appropriate console method
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => write("debug", message, meta),
  info:  (message: string, meta?: LogMeta) => write("info",  message, meta),
  warn:  (message: string, meta?: LogMeta) => write("warn",  message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};

/**
 * Convert an unknown thrown value to a safe message for the client.
 * In development the raw message is surfaced; in production a generic
 * message is returned so internal details are never leaked.
 */
export function toUserError(err: unknown): string {
  if (!IS_PROD && err instanceof Error) return err.message;
  return "An unexpected error occurred. Please try again.";
}

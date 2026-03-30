/**
 * Input sanitization utilities.
 *
 * - Strip / reject prompt-injection patterns before sending to AI.
 * - HTML-encode user content for safe display.
 */

// Patterns commonly used to hijack LLM system prompts
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)/gi,
  /system\s*prompt/gi,
  /you\s+are\s+now\s+(a\s+)?/gi,
  /forget\s+(everything|all|your\s+instructions)/gi,
  /disregard\s+(all\s+)?(previous|prior)/gi,
  /new\s+instructions?:/gi,
  /\[SYSTEM\]/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /<\|im_start\|>/gi,
  /act\s+as\s+(a\s+)?(?:dan|jailbreak|evil|unrestricted)/gi,
  /###\s*instruction/gi,
  /prompt\s+injection/gi,
];

const MAX_TEXT_LENGTH = 4_000;

/**
 * Sanitize a user-supplied string before it is forwarded to an AI model.
 * Throws if the content matches a known injection pattern.
 */
export function sanitizeForAI(input: string, fieldName = "input"): string {
  if (typeof input !== "string") return "";

  let sanitized = input.trim().slice(0, MAX_TEXT_LENGTH);

  for (const pattern of INJECTION_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    if (pattern.test(sanitized)) {
      throw new Error(
        `Invalid content in "${fieldName}": potential prompt injection detected`
      );
    }
  }

  return sanitized;
}

/**
 * Sanitize every string leaf in a plain-object profile.
 * Non-string values are passed through unchanged.
 */
export function sanitizeProfile(
  profile: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(profile)) {
    if (typeof value === "string") {
      out[key] = sanitizeForAI(value, key);
    } else if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        typeof item === "string" ? sanitizeForAI(item, key) : item
      );
    } else if (value !== null && typeof value === "object") {
      out[key] = sanitizeProfile(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Sanitize a free-text user input (decision, name, query, etc.).
 * Throws on injection; returns a clean string.
 */
export function sanitizeUserText(input: unknown, fieldName = "field"): string {
  if (typeof input !== "string") {
    throw new Error(`"${fieldName}" must be a string`);
  }
  return sanitizeForAI(input, fieldName);
}

/**
 * HTML-encode a string so it is safe to embed in UI markup.
 */
export function htmlEncode(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

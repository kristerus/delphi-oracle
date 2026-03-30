import {
  createCipheriv,
  createDecipheriv,
  scryptSync,
  randomBytes,
} from "crypto";

const SALT = "delphi-oracle-key-v1";

function deriveKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return scryptSync(secret, SALT, 32) as Buffer;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-joined hex string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a value produced by encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = deriveKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Returns a safely masked version of a key for display.
 * e.g. "sk-ant-api03-..." → "sk-a••••••••pi03"
 */
export function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

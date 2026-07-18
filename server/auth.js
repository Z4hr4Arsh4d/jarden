// Passwords and sessions, using only Node's crypto — no bcrypt, no jsonwebtoken.
//
// scrypt is a deliberate choice: it's memory-hard, so it resists the GPU cracking rigs
// that make plain SHA-256 password hashing useless. Every password gets its own random
// salt, and comparisons are timing-safe.

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

const SECRET = process.env.JARDEN_SECRET || "dev-secret-change-me-in-production";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const attempt = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (attempt.length !== stored.length) return false;
  return timingSafeEqual(attempt, stored);       // constant time: no leaking via timing
}

/** A minimal signed token: base64(payload).hmac — enough to prove who you are. */
export function makeToken(userId, username) {
  const payload = Buffer.from(JSON.stringify({
    id: userId, username, exp: Date.now() + 7 * 24 * 3600 * 1000,
  })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expect = createHmac("sha256", SECRET).update(payload).digest("base64url");
  // compare signatures in constant time, and only then trust the payload
  if (sig.length !== expect.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function validateCredentials(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return "Missing fields";
  if (username.length < 3 || username.length > 20) return "Username must be 3-20 characters";
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return "Username: letters, numbers, _ and - only";
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

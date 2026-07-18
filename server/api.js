// The API, as plain functions of (db, body/user) -> result.
//
// Deliberately kept free of Express: no req/res in here, so every route's real logic can
// be unit-tested in Node without starting a server or opening a socket. index.js is a
// thin HTTP shell over these.

import { hashPassword, verifyPassword, makeToken, validateCredentials } from "./auth.js";

export function register(db, { username, password }) {
  const bad = validateCredentials(username, password);
  if (bad) return { status: 400, body: { error: bad } };

  const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (exists) return { status: 409, body: { error: "That name is taken" } };

  const { hash, salt } = hashPassword(password);
  const info = db.prepare(
    "INSERT INTO users (username, pass_hash, salt) VALUES (?, ?, ?)"
  ).run(username, hash, salt);
  const id = Number(info.lastInsertRowid);
  return { status: 201, body: { token: makeToken(id, username), username } };
}

export function login(db, { username, password }) {
  if (!username || !password) return { status: 400, body: { error: "Missing fields" } };
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  // Same message either way: never reveal whether a username exists.
  const fail = { status: 401, body: { error: "Wrong username or password" } };
  if (!user) return fail;
  if (!verifyPassword(password, user.pass_hash, user.salt)) return fail;
  return { status: 200, body: { token: makeToken(user.id, user.username), username: user.username } };
}

export function saveJar(db, user, { state, day, score }) {
  if (typeof state !== "string") return { status: 400, body: { error: "Missing state" } };
  if (state.length > 500_000) return { status: 413, body: { error: "Save too large" } };
  db.prepare(`
    INSERT INTO saves (user_id, state, day, score, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      state = excluded.state, day = excluded.day,
      score = excluded.score, updated_at = datetime('now')
  `).run(user.id, state, day | 0, score | 0);
  return { status: 200, body: { ok: true } };
}

export function loadJar(db, user) {
  const row = db.prepare("SELECT state, day, score, updated_at FROM saves WHERE user_id = ?").get(user.id);
  if (!row) return { status: 404, body: { error: "No saved jar" } };
  return { status: 200, body: row };
}

export function submitScore(db, user, { score, day, status, plants, bugs, preds, gen }) {
  const s = Math.round(Number(score));
  if (!Number.isFinite(s) || s < 0 || s > 100) return { status: 400, body: { error: "Bad score" } };
  db.prepare(`
    INSERT INTO scores (user_id, score, day, status, plants, bugs, preds, gen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, s, day | 0, String(status || "alive"), plants | 0, bugs | 0, preds | 0, gen | 0);
  return { status: 201, body: { ok: true } };
}

/** M6 — the leaderboard: each player's BEST run, not every run they ever played. */
export function leaderboard(db, { limit = 20 } = {}) {
  const rows = db.prepare(`
    SELECT u.username, s.score, s.day, s.status, s.plants, s.bugs, s.preds, s.gen, s.created_at
    FROM scores s
    JOIN users u ON u.id = s.user_id
    WHERE s.score = (SELECT MAX(s2.score) FROM scores s2 WHERE s2.user_id = s.user_id)
    GROUP BY s.user_id
    ORDER BY s.score DESC, s.day DESC, s.created_at ASC
    LIMIT ?
  `).all(Math.min(100, Math.max(1, limit | 0)));
  return { status: 200, body: { entries: rows } };
}

/** Where a given player sits, even if they're off the bottom of the top-20. */
export function myRank(db, user) {
  const best = db.prepare("SELECT MAX(score) AS score FROM scores WHERE user_id = ?").get(user.id);
  if (!best || best.score == null) return { status: 200, body: { rank: null, best: null } };
  const ahead = db.prepare(`
    SELECT COUNT(*) AS n FROM (
      SELECT user_id, MAX(score) AS s FROM scores GROUP BY user_id HAVING s > ?
    )
  `).get(best.score);
  return { status: 200, body: { rank: ahead.n + 1, best: best.score } };
}

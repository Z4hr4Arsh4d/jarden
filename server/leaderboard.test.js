// Run with: node server/leaderboard.test.js
// M6 — the leaderboard's SQL is the interesting part: it must show each player's BEST run,
// not every run they've ever played, and it must rank people who aren't in the top 20.
import { openDb } from "./db.js";
import * as api from "./api.js";
import { readToken } from "./auth.js";
import assert from "node:assert";

const db = openDb(":memory:");
const mk = (name) => readToken(api.register(db, { username: name, password: "password123" }).body.token);

const zahra = mk("zahra");
const aisha = mk("aisha");
const omar = mk("omar");

// 1. an empty board doesn't explode
{
  const r = api.leaderboard(db);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.entries, []);
  console.log("empty leaderboard: [] ✓");
}

// 2. THE one that matters: one row per player, their best — not their most recent,
//    and not one row per run
{
  api.submitScore(db, zahra, { score: 40, day: 3, status: "alive", plants: 5, bugs: 2, preds: 0, gen: 1 });
  api.submitScore(db, zahra, { score: 88, day: 12, status: "thriving", plants: 14, bugs: 9, preds: 2, gen: 7 });
  api.submitScore(db, zahra, { score: 61, day: 5, status: "alive", plants: 8, bugs: 4, preds: 1, gen: 3 });
  api.submitScore(db, aisha, { score: 72, day: 9, status: "alive", plants: 11, bugs: 6, preds: 1, gen: 4 });
  api.submitScore(db, omar, { score: 55, day: 6, status: "alive", plants: 7, bugs: 3, preds: 1, gen: 2 });

  const e = api.leaderboard(db).body.entries;
  console.log("board:", e.map((r) => `${r.username}=${r.score}`).join(" "));
  assert.strictEqual(e.length, 3, "one row per player, not one per run");
  assert.strictEqual(e[0].username, "zahra");
  assert.strictEqual(e[0].score, 88, "must show zahra's BEST (88), not her latest (61)");
  assert.strictEqual(e[1].score, 72);
  assert.strictEqual(e[2].score, 55);
  assert.strictEqual(e[0].status, "thriving", "the best run's details must travel with it");
  assert.strictEqual(e[0].gen, 7);
}

// 3. it's genuinely sorted, and the limit is honoured and clamped
{
  const two = api.leaderboard(db, { limit: 2 }).body.entries;
  assert.strictEqual(two.length, 2);
  const scores = api.leaderboard(db).body.entries.map((r) => r.score);
  assert.deepStrictEqual(scores, [...scores].sort((a, b) => b - a), "must be descending");
  assert(api.leaderboard(db, { limit: 9999 }).body.entries.length <= 100, "limit is clamped");
  assert(api.leaderboard(db, { limit: -5 }).body.entries.length >= 1, "a silly limit can't break it");
  console.log("sorting, limits and clamping ✓");
}

// 4. your rank is right — even from outside the top of the board
{
  const r1 = api.myRank(db, zahra);
  const r3 = api.myRank(db, omar);
  console.log(`ranks: zahra #${r1.body.rank} (best ${r1.body.best}) | omar #${r3.body.rank} (best ${r3.body.best})`);
  assert.strictEqual(r1.body.rank, 1);
  assert.strictEqual(r1.body.best, 88);
  assert.strictEqual(r3.body.rank, 3);
  const newbie = mk("newbie");
  assert.strictEqual(api.myRank(db, newbie).body.rank, null, "no runs = no rank, not a crash");
}

// 5. a new personal best moves you up the board
{
  api.submitScore(db, omar, { score: 95, day: 20, status: "thriving", plants: 16, bugs: 10, preds: 2, gen: 11 });
  const e = api.leaderboard(db).body.entries;
  console.log("after omar's 95:", e.map((r) => `${r.username}=${r.score}`).join(" "));
  assert.strictEqual(e[0].username, "omar");
  assert.strictEqual(api.myRank(db, omar).body.rank, 1);
  assert.strictEqual(api.myRank(db, zahra).body.rank, 2, "zahra slips to second");
  // and omar's older, worse runs are still hidden
  assert.strictEqual(e.filter((r) => r.username === "omar").length, 1);
}

// 6. a deleted player leaves the board cleanly
{
  const gone = mk("leaving");
  api.submitScore(db, gone, { score: 99, day: 30, status: "thriving" });
  assert.strictEqual(api.leaderboard(db).body.entries[0].username, "leaving");
  db.prepare("DELETE FROM users WHERE id = ?").run(gone.id);
  const e = api.leaderboard(db).body.entries;
  console.log("after deleting the top player:", e.map((r) => r.username).join(" "));
  assert(!e.some((r) => r.username === "leaving"), "their scores go with them");
}

console.log("\nALL LEADERBOARD TESTS PASSED");

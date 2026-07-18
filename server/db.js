// SQLite via Node's built-in `node:sqlite` — no native build step, no dependency to
// install, no compiler toolchain. It's real SQL; it just doesn't need a C++ compiler
// to exist on your machine.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function openDb(path = "server/data/jarden.db") {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      pass_hash  TEXT    NOT NULL,
      salt       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- one live jar per user
    CREATE TABLE IF NOT EXISTS saves (
      user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state      TEXT    NOT NULL,          -- the serialised world
      day        INTEGER NOT NULL DEFAULT 1,
      score      INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- every run a player submits, kept for history (M6 reads the best of these)
    CREATE TABLE IF NOT EXISTS scores (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score     INTEGER NOT NULL,
      day       INTEGER NOT NULL,
      status    TEXT    NOT NULL,
      plants    INTEGER NOT NULL DEFAULT 0,
      bugs      INTEGER NOT NULL DEFAULT 0,
      preds     INTEGER NOT NULL DEFAULT 0,
      gen       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT   NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
    CREATE INDEX IF NOT EXISTS idx_scores_user  ON scores(user_id);
  `);
}

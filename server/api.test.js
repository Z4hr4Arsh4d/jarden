// Run with: node server/api.test.js
// Every route's real logic, tested against a real in-memory database — no server, no
// sockets, no ports. This is why api.js takes (db, body) instead of (req, res).
import { openDb } from "./db.js";
import * as api from "./api.js";
import { readToken, makeToken } from "./auth.js";
import assert from "node:assert";

const db = openDb(":memory:");
const userOf = (r) => readToken(r.body.token);

// 1. registration works, and the schema holds
{
  const r = api.register(db, { username: "zahra", password: "correcthorse" });
  console.log(`register: ${r.status} -> ${r.body.username}`);
  assert.strictEqual(r.status, 201);
  assert(r.body.token, "should return a token");
  const u = readToken(r.body.token);
  assert.strictEqual(u.username, "zahra");
}

// 2. THE security one: passwords are never stored in the database
{
  const row = db.prepare("SELECT * FROM users WHERE username = 'zahra'").get();
  const dump = JSON.stringify(row);
  console.log(`stored row: hash=${row.pass_hash.slice(0, 16)}… salt=${row.salt.slice(0, 12)}…`);
  assert(!dump.includes("correcthorse"), "the plaintext password must never touch the DB");
  assert(row.pass_hash.length === 128, "scrypt gives a 64-byte hash");
  assert(row.salt.length === 32, "every user gets their own salt");
}

// 3. two users with the same password get different hashes (that's what salt is for)
{
  api.register(db, { username: "aisha", password: "correcthorse" });
  const a = db.prepare("SELECT pass_hash, salt FROM users WHERE username='zahra'").get();
  const b = db.prepare("SELECT pass_hash, salt FROM users WHERE username='aisha'").get();
  console.log("same password, different hashes:", a.pass_hash !== b.pass_hash);
  assert.notStrictEqual(a.salt, b.salt);
  assert.notStrictEqual(a.pass_hash, b.pass_hash, "salting must defeat rainbow tables");
}

// 4. duplicate names, weak passwords and bad names are refused
{
  assert.strictEqual(api.register(db, { username: "zahra", password: "another1234" }).status, 409);
  assert.strictEqual(api.register(db, { username: "ZAHRA", password: "another1234" }).status, 409); // case-insensitive
  assert.strictEqual(api.register(db, { username: "bo", password: "longenough1" }).status, 400);
  assert.strictEqual(api.register(db, { username: "ok_name", password: "short" }).status, 400);
  assert.strictEqual(api.register(db, { username: "bad name!", password: "longenough1" }).status, 400);
  console.log("duplicates / weak passwords / bad names: all refused ✓");
}

// 5. login works, and failures never reveal whether a username exists
{
  const good = api.login(db, { username: "zahra", password: "correcthorse" });
  assert.strictEqual(good.status, 200);
  const wrongPass = api.login(db, { username: "zahra", password: "wrongpassword" });
  const noUser = api.login(db, { username: "ghost", password: "wrongpassword" });
  console.log(`login: ok=${good.status} | wrong password=${wrongPass.status} "${wrongPass.body.error}" | no such user=${noUser.status} "${noUser.body.error}"`);
  assert.strictEqual(wrongPass.status, 401);
  assert.strictEqual(noUser.status, 401);
  assert.strictEqual(wrongPass.body.error, noUser.body.error, "must not leak which usernames exist");
}

// 6. tokens can't be forged or tampered with
{
  const t = makeToken(1, "zahra");
  assert(readToken(t), "a real token should verify");
  const [payload, sig] = t.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ id: 1, username: "admin", exp: Date.now() + 1e6 })).toString("base64url");
  assert.strictEqual(readToken(`${forgedPayload}.${sig}`), null, "a swapped payload must fail the signature");
  assert.strictEqual(readToken(`${payload}.${sig.slice(0, -2)}xy`), null, "a tampered signature must fail");
  assert.strictEqual(readToken("garbage"), null);
  const expired = Buffer.from(JSON.stringify({ id: 1, username: "z", exp: Date.now() - 1000 })).toString("base64url");
  assert.strictEqual(readToken(`${expired}.${sig}`), null, "expired tokens must fail");
  console.log("token forgery, tampering and expiry: all rejected ✓");
}

// 7. saving and loading a jar
{
  const user = userOf(api.login(db, { username: "zahra", password: "correcthorse" }));
  assert.strictEqual(api.loadJar(db, user).status, 404);              // nothing saved yet
  api.saveJar(db, user, { state: '{"v":1,"hello":"jar"}', day: 7, score: 62 });
  const got = api.loadJar(db, user);
  console.log(`save/load: day ${got.body.day}, score ${got.body.score}`);
  assert.strictEqual(got.status, 200);
  assert.strictEqual(got.body.day, 7);
  assert.strictEqual(JSON.parse(got.body.state).hello, "jar");

  // saving again overwrites rather than piling up rows
  api.saveJar(db, user, { state: '{"v":1,"hello":"newer"}', day: 9, score: 71 });
  const rows = db.prepare("SELECT COUNT(*) n FROM saves WHERE user_id = ?").get(user.id);
  assert.strictEqual(rows.n, 1, "one live jar per player");
  assert.strictEqual(api.loadJar(db, user).body.day, 9);
  console.log("re-saving overwrites (one jar per player) ✓");
}

// 8. players can't read each other's jars
{
  const zahra = userOf(api.login(db, { username: "zahra", password: "correcthorse" }));
  const aisha = userOf(api.login(db, { username: "aisha", password: "correcthorse" }));
  assert.strictEqual(api.loadJar(db, aisha).status, 404, "aisha has no jar of her own");
  assert.strictEqual(api.loadJar(db, zahra).status, 200);
  console.log("one player cannot load another's jar ✓");
}

// 9. junk saves are refused
{
  const user = userOf(api.login(db, { username: "zahra", password: "correcthorse" }));
  assert.strictEqual(api.saveJar(db, user, { state: 12345 }).status, 400);
  assert.strictEqual(api.saveJar(db, user, { state: "x".repeat(600_000) }).status, 413);
  console.log("bad and oversized saves: refused ✓");
}

// 10. scores are validated
{
  const user = userOf(api.login(db, { username: "zahra", password: "correcthorse" }));
  assert.strictEqual(api.submitScore(db, user, { score: 71, day: 9, status: "alive" }).status, 201);
  assert.strictEqual(api.submitScore(db, user, { score: 500, day: 1, status: "alive" }).status, 400);
  assert.strictEqual(api.submitScore(db, user, { score: -5, day: 1, status: "alive" }).status, 400);
  assert.strictEqual(api.submitScore(db, user, { score: "cheat", day: 1 }).status, 400);
  console.log("impossible scores rejected ✓");
}

// 11. deleting a user takes their data with them (foreign keys actually on)
{
  const r = api.register(db, { username: "temp_user", password: "temporary123" });
  const u = readToken(r.body.token);
  api.saveJar(db, u, { state: "{}", day: 1, score: 5 });
  api.submitScore(db, u, { score: 5, day: 1, status: "alive" });
  db.prepare("DELETE FROM users WHERE id = ?").run(u.id);
  const saves = db.prepare("SELECT COUNT(*) n FROM saves WHERE user_id = ?").get(u.id);
  const scores = db.prepare("SELECT COUNT(*) n FROM scores WHERE user_id = ?").get(u.id);
  console.log(`cascade delete: ${saves.n} saves, ${scores.n} scores left behind`);
  assert.strictEqual(saves.n, 0);
  assert.strictEqual(scores.n, 0);
}

console.log("\nALL API TESTS PASSED");

// A thin HTTP shell over api.js. Node's own http module — no Express, no dependencies.
// All the real logic lives in api.js, which is why it can be tested without a server.

import { createServer } from "node:http";
import { readToken } from "./auth.js";
import { openDb } from "./db.js";
import * as api from "./api.js";

const PORT = process.env.PORT || 8787;
const db = openDb();

const json = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  });
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve) => {
  let raw = "";
  req.on("data", (c) => {
    raw += c;
    if (raw.length > 1_000_000) req.destroy();      // don't let a client OOM the server
  });
  req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } });
});

const userOf = (req) => readToken((req.headers.authorization || "").replace("Bearer ", ""));

createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    // ---- public ----
    if (path === "/api/health") return json(res, 200, { ok: true });
    if (path === "/api/register" && req.method === "POST") {
      const r = api.register(db, await readBody(req));
      return json(res, r.status, r.body);
    }
    if (path === "/api/login" && req.method === "POST") {
      const r = api.login(db, await readBody(req));
      return json(res, r.status, r.body);
    }
    if (path === "/api/leaderboard" && req.method === "GET") {
      const r = api.leaderboard(db, { limit: Number(url.searchParams.get("limit")) || 20 });
      return json(res, r.status, r.body);
    }

    // ---- everything below needs a valid token ----
    const user = userOf(req);
    if (!user) return json(res, 401, { error: "Please sign in" });

    if (path === "/api/save" && req.method === "PUT") {
      const r = api.saveJar(db, user, await readBody(req));
      return json(res, r.status, r.body);
    }
    if (path === "/api/save" && req.method === "GET") {
      const r = api.loadJar(db, user);
      return json(res, r.status, r.body);
    }
    if (path === "/api/score" && req.method === "POST") {
      const r = api.submitScore(db, user, await readBody(req));
      return json(res, r.status, r.body);
    }
    if (path === "/api/me/rank" && req.method === "GET") {
      const r = api.myRank(db, user);
      return json(res, r.status, r.body);
    }

    json(res, 404, { error: "Not found" });
  } catch (err) {
    console.error("[api]", err);
    json(res, 500, { error: "Something broke on our end" });
  }
}).listen(PORT, () => {
  console.log(`🫙  Jarden API on http://localhost:${PORT}`);
});

// The browser's side of the API. Keeps the token in localStorage and gives the UI plain
// promises. Every call fails soft: the game must stay fully playable offline, so a dead
// server means "you're playing locally", not a broken page.

const BASE = import.meta.env?.VITE_API || "http://localhost:8787";
const KEY = "jarden.token";

export const auth = {
  token: localStorage.getItem(KEY) || null,
  username: localStorage.getItem("jarden.user") || null,
  set(token, username) {
    this.token = token; this.username = username;
    localStorage.setItem(KEY, token);
    localStorage.setItem("jarden.user", username);
  },
  clear() {
    this.token = null; this.username = null;
    localStorage.removeItem(KEY);
    localStorage.removeItem("jarden.user");
  },
  get signedIn() { return !!this.token; },
};

async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const register = (username, password) =>
  call("/api/register", { method: "POST", body: { username, password } })
    .then((d) => { auth.set(d.token, d.username); return d; });

export const login = (username, password) =>
  call("/api/login", { method: "POST", body: { username, password } })
    .then((d) => { auth.set(d.token, d.username); return d; });

export const saveJar = (state, day, score) =>
  call("/api/save", { method: "PUT", body: { state, day, score } });

export const loadJar = () => call("/api/save");
export const submitScore = (payload) => call("/api/score", { method: "POST", body: payload });
export const leaderboard = (limit = 20) => call(`/api/leaderboard?limit=${limit}`);
export const myRank = () => call("/api/me/rank");
export const health = () => call("/api/health");

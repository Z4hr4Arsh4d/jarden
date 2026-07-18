import React, { useState } from "react";
import { auth, register, login } from "../net/api.js";

// Sign-in that never blocks play. There's no wall here: you can ignore this entirely and
// the jar works. Accounts exist to save your jar and enter the leaderboard, not to gate it.
export default function Account({ onAuth, onSave, onLoad, saving, note }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setErr(""); setBusy(true);
    try {
      await (mode === "login" ? login(u, p) : register(u, p));
      setOpen(false); setU(""); setP("");
      onAuth?.();
    } catch (e) {
      setErr(e.message.includes("fetch") ? "Can't reach the server — is it running?" : e.message);
    } finally { setBusy(false); }
  }

  if (auth.signedIn) {
    return (
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>🫙 {auth.username}</span>
          <button onClick={() => { auth.clear(); onAuth?.(); }} style={linkBtn}>sign out</button>
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
          <button onClick={onSave} disabled={saving} style={{ ...miniBtn, flex: 1 }}>
            {saving ? "saving…" : "💾 Save jar"}
          </button>
          <button onClick={onLoad} style={{ ...miniBtn, flex: 1 }}>📂 Load</button>
        </div>
        {note && <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 5 }}>{note}</div>}
      </div>
    );
  }

  if (!open) {
    return (
      <div style={card}>
        <button onClick={() => setOpen(true)} style={{ ...miniBtn, width: "100%" }}>
          Sign in to save
        </button>
        <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 5, lineHeight: 1.5 }}>
          Optional — the jar plays fine without it.
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 4, marginBottom: 7 }}>
        {["login", "register"].map((m) => (
          <button key={m} onClick={() => { setMode(m); setErr(""); }}
            style={{ ...miniBtn, flex: 1, background: mode === m ? "rgba(63,154,90,0.10)" : "#fff",
                     borderColor: mode === m ? "var(--accent)" : "var(--line)" }}>
            {m === "login" ? "Sign in" : "New"}
          </button>
        ))}
      </div>
      <input value={u} onChange={(e) => setU(e.target.value)} placeholder="username" style={input} />
      <input value={p} onChange={(e) => setP(e.target.value)} type="password" placeholder="password"
             style={input} onKeyDown={(e) => e.key === "Enter" && go()} />
      {err && <div style={{ fontSize: 9.5, color: "#c0504d", margin: "3px 0", lineHeight: 1.4 }}>{err}</div>}
      <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
        <button onClick={go} disabled={busy || !u || !p}
          style={{ ...miniBtn, flex: 1, background: "var(--accent)", color: "#fff", borderColor: "var(--accent)",
                   opacity: busy || !u || !p ? 0.5 : 1 }}>
          {busy ? "…" : mode === "login" ? "Sign in" : "Create"}
        </button>
        <button onClick={() => setOpen(false)} style={miniBtn}>✕</button>
      </div>
      {mode === "register" && (
        <div style={{ fontSize: 8.5, color: "var(--muted)", marginTop: 5, lineHeight: 1.5 }}>
          3–20 characters · password 8+
        </div>
      )}
    </div>
  );
}

const card = { border: "1px solid var(--line)", borderRadius: 10, padding: "9px 10px", background: "#fff" };
const miniBtn = {
  padding: "5px 8px", fontFamily: "inherit", fontSize: 10, cursor: "pointer",
  borderRadius: 7, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)",
};
const linkBtn = { ...miniBtn, border: "none", padding: 0, color: "var(--muted)", fontSize: 9 };
const input = {
  width: "100%", padding: "5px 7px", marginBottom: 4, fontFamily: "inherit", fontSize: 10.5,
  borderRadius: 7, border: "1px solid var(--line)", outline: "none", boxSizing: "border-box",
};

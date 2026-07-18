import React, { useState, useEffect } from "react";
import { leaderboard, myRank, auth } from "../net/api.js";

const MEDAL = ["🥇", "🥈", "🥉"];

// M6 — the leaderboard. Reads each player's BEST run (the SQL does that work), and always
// shows you where you stand, even if you're nowhere near the top.
export default function Leaderboard({ open, onClose }) {
  const [rows, setRows] = useState(null);
  const [mine, setMine] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr(""); setRows(null);
    leaderboard(20)
      .then((d) => setRows(d.entries))
      .catch((e) => setErr(e.message.includes("fetch") ? "Server offline — start it with `npm run server`" : e.message));
    if (auth.signedIn) myRank().then((d) => setMine(d)).catch(() => {});
  }, [open]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,30,45,0.28)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
      backdropFilter: "blur(3px)", animation: "fade .18s",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 470, maxHeight: "78vh", overflow: "auto", background: "#fff",
        borderRadius: 16, padding: "18px 20px", fontFamily: "inherit",
        boxShadow: "0 20px 60px rgba(20,35,55,0.22)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: 1.5 }}>🏆 BEST JARS</h2>
          <button onClick={onClose} style={{
            border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "var(--muted)",
          }}>✕</button>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 10, color: "var(--muted)" }}>
          Each keeper's finest jar — scored on life, variety, balance and decay.
        </p>

        {err && <div style={{ fontSize: 11, color: "#b5722f", padding: "10px 0" }}>{err}</div>}
        {!rows && !err && <div style={{ fontSize: 11, color: "var(--muted)", padding: "14px 0" }}>Loading…</div>}
        {rows?.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--muted)", padding: "14px 0", lineHeight: 1.6 }}>
            No jars yet. Save yours and you'll be the first one here.
          </div>
        )}

        {rows?.map((r, i) => {
          const me = auth.username && r.username.toLowerCase() === auth.username.toLowerCase();
          return (
            <div key={r.username} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 9px",
              borderRadius: 9, marginBottom: 3,
              background: me ? "rgba(63,154,90,0.09)" : i % 2 ? "#fafbfc" : "transparent",
              border: me ? "1px solid rgba(63,154,90,0.3)" : "1px solid transparent",
            }}>
              <span style={{ width: 26, fontSize: i < 3 ? 15 : 11, color: "var(--muted)", textAlign: "center" }}>
                {MEDAL[i] || i + 1}
              </span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: me ? 700 : 500 }}>
                {r.username}{me && <span style={{ fontSize: 9, color: "var(--accent)" }}> · you</span>}
              </span>
              <span style={{ fontSize: 9.5, color: "var(--muted)", width: 132, lineHeight: 1.4 }}>
                🌱{r.plants} 🐛{r.bugs} 🕷️{r.preds}
                {r.gen > 0 && <span title="generations of evolution"> · gen {r.gen}</span>}
              </span>
              <span style={{ fontSize: 9.5, color: "var(--muted)", width: 46 }}>day {r.day}</span>
              {r.status === "thriving" && <span title="reached thriving" style={{ fontSize: 11 }}>✨</span>}
              <span style={{ fontSize: 15, fontWeight: 800, width: 30, textAlign: "right",
                             color: r.status === "thriving" ? "var(--accent)" : "var(--ink)" }}>
                {r.score}
              </span>
            </div>
          );
        })}

        {mine?.rank && (
          <div style={{ marginTop: 11, paddingTop: 10, borderTop: "1px solid var(--line)",
                        fontSize: 10.5, color: "var(--muted)" }}>
            Your best jar scored <b style={{ color: "var(--ink)" }}>{mine.best}</b> — rank #{mine.rank}
          </div>
        )}
        {!auth.signedIn && !err && (
          <div style={{ marginTop: 11, paddingTop: 10, borderTop: "1px solid var(--line)",
                        fontSize: 10, color: "var(--muted)" }}>
            Sign in and save a jar to appear here.
          </div>
        )}
      </div>
    </div>
  );
}

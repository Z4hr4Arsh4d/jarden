import React, { useRef, useState, useEffect } from "react";
import JarCanvas from "./render/JarCanvas.jsx";
import Sidebar from "./render/Sidebar.jsx";
import Inspector from "./render/Inspector.jsx";
import Account from "./render/Account.jsx";
import Leaderboard from "./render/Leaderboard.jsx";
import Tutorial, { STEPS } from "./render/Tutorial.jsx";
import { World } from "./sim/engine.js";
import { CONFIG } from "./sim/config.js";
import { serialize, deserialize } from "./sim/serialize.js";
import { audio } from "./render/audio.js";
import { downloadCard } from "./render/share.js";
import { auth, saveJar, loadJar, submitScore } from "./net/api.js";

// The page's ambient colour, lerped from the jar's own sun. Dawn warms the room.
const pill = (active) => ({
  padding: "5px 12px", fontFamily: "inherit", fontSize: 10, cursor: "pointer",
  borderRadius: 20, border: "1px solid var(--line)", background: "#fff",
  color: active ? "var(--ink)" : "var(--muted)",
});

const NIGHT = [232, 236, 246], DAY = [255, 253, 245];
const amb = (sun) => `rgb(${NIGHT.map((n, i) => Math.round(n + (DAY[i] - n) * sun)).join(",")})`;

export default function App() {
  const worldRef = useRef(null);
  if (!worldRef.current) worldRef.current = new World(CONFIG);

  const [tool, setTool] = useState("seed");
  const [seedType, setSeedType] = useState("fern");
  const [speed, setSpeed] = useState(1);
  const [subject, setSubject] = useState(null);
  const [step, setStep] = useState(0);
  const [guiding, setGuiding] = useState(true);
  const [sound, setSound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [board, setBoard] = useState(false);
  const [, force] = useState(0);

  // the page background follows the jar's day
  useEffect(() => {
    const id = setInterval(() => {
      document.body.style.setProperty("--amb", amb(worldRef.current.sun));
      audio.update(worldRef.current, 0.25);
    }, 250);
    return () => clearInterval(id);
  }, []);

  // tutorial steps complete themselves when you actually do the thing
  useEffect(() => {
    if (!guiding) return;
    const id = setInterval(() => {
      const s = STEPS[step];
      if (s && !s.manual && s.done(worldRef.current, speed)) setStep((n) => n + 1);
    }, 300);
    return () => clearInterval(id);
  }, [step, guiding, speed]);

  // a little fanfare the moment the jar starts thriving
  const thriveRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      const t = worldRef.current.status === "thriving";
      if (t && !thriveRef.current) audio.sfx("thrive");
      thriveRef.current = t;
    }, 500);
    return () => clearInterval(id);
  }, []);

  async function doSave() {
    setSaving(true); setNote("");
    try {
      const w = worldRef.current;
      await saveJar(serialize(w), w.day, w.score);
      await submitScore({
        score: w.score, day: w.day, status: w.status,
        plants: w.entities.length, bugs: w.bugs.length, preds: w.preds.length,
        gen: Math.max(0, ...w.entities.map((p) => p.gen || 0)),
      });
      setNote("Saved ✓");
    } catch (e) {
      setNote(e.message.includes("fetch") ? "Server offline — jar kept locally" : e.message);
    } finally { setSaving(false); }
  }

  async function doLoad() {
    setNote("");
    try {
      const { state } = await loadJar();
      worldRef.current = deserialize(state);
      setGuiding(false);
      force((n) => n + 1);
      setNote("Loaded ✓");
    } catch (e) {
      setNote(e.message.includes("No saved") ? "No saved jar yet" : e.message);
    }
  }

  const highlight = guiding ? STEPS[step]?.highlight : null;

  return (
    <>
      {/* ---- centred header ---- */}
      <header style={{ textAlign: "center", padding: "26px 0 14px", zIndex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 26, letterSpacing: 5, fontWeight: 800 }}>JARDEN</h1>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)", letterSpacing: 0.4 }}>
          a sealed jar that lives, evolves and balances itself
        </p>
        <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 10 }}>
          <button onClick={() => setSound(audio.toggle())} style={pill(sound)}>
            {sound ? "🔊 sound on" : "🔈 sound off"}
          </button>
          <button onClick={() => setBoard(true)} style={pill(false)}>🏆 leaderboard</button>
          <button onClick={() => downloadCard(worldRef.current, auth.username)} style={pill(false)}>
            📸 share card
          </button>
        </div>
      </header>

      <main style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "0 22px 40px", zIndex: 1 }}>
        <Sidebar
          world={worldRef.current}
          tool={tool} setTool={setTool}
          seedType={seedType} setSeedType={setSeedType}
          speed={speed} setSpeed={setSpeed}
          highlight={highlight}
        />
        <JarCanvas
          key={worldRef.current.time === 0 ? "fresh" : "loaded"}
          world={worldRef.current}
          tool={tool} seedType={seedType} speed={speed}
          onHover={setSubject}
        />
        <div style={{ width: 176 }}>
          <Account onAuth={() => force((n) => n + 1)} onSave={doSave} onLoad={doLoad}
                   saving={saving} note={note} />
          <div style={{ fontSize: 9.5, color: "var(--muted)", letterSpacing: 1.2, fontWeight: 700, marginTop: 13 }}>
            INSPECT
          </div>
          <Inspector subject={subject} />
          {!guiding && (
            <button onClick={() => { setStep(0); setGuiding(true); }}
              style={{
                marginTop: 10, width: "100%", padding: "6px 0", cursor: "pointer",
                fontFamily: "inherit", fontSize: 10, color: "var(--muted)",
                background: "#fff", border: "1px solid var(--line)", borderRadius: 8,
              }}>
              ↻ replay guide
            </button>
          )}
        </div>
      </main>

      <Leaderboard open={board} onClose={() => setBoard(false)} />

      {guiding && step < STEPS.length && (
        <Tutorial
          step={step}
          onNext={() => (step === STEPS.length - 1 ? setGuiding(false) : setStep(step + 1))}
          onSkip={() => setGuiding(false)}
        />
      )}
    </>
  );
}

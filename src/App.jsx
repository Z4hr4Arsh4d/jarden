import React, { useRef, useState, useEffect } from "react";
import JarCanvas from "./render/JarCanvas.jsx";
import Sidebar from "./render/Sidebar.jsx";
import Inspector from "./render/Inspector.jsx";
import Tutorial, { STEPS } from "./render/Tutorial.jsx";
import { World } from "./sim/engine.js";
import { CONFIG } from "./sim/config.js";

export default function App() {
  const worldRef = useRef(null);
  if (!worldRef.current) worldRef.current = new World(CONFIG);

  const [tool, setTool] = useState("seed");
  const [seedType, setSeedType] = useState("fern");
  const [speed, setSpeed] = useState(1);
  const [subject, setSubject] = useState(null);
  const [step, setStep] = useState(0);
  const [guiding, setGuiding] = useState(true);

  // Each tutorial step watches the world and completes itself once you actually do the
  // thing — no clicking "Next" through a wall of text you didn't read.
  useEffect(() => {
    if (!guiding) return;
    const id = setInterval(() => {
      const s = STEPS[step];
      if (s && !s.manual && s.done(worldRef.current, speed)) setStep((n) => n + 1);
    }, 300);
    return () => clearInterval(id);
  }, [step, guiding, speed]);

  const highlight = guiding ? STEPS[step]?.highlight : null;

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: 22 }}>
      <Sidebar
        world={worldRef.current}
        tool={tool} setTool={setTool}
        seedType={seedType} setSeedType={setSeedType}
        speed={speed} setSpeed={setSpeed}
        highlight={highlight}
      />
      <div>
        <h1 style={{ margin: "0 0 1px", fontSize: 19, letterSpacing: 1.6, fontWeight: 800 }}>JARDEN</h1>
        <p style={{ margin: "0 0 9px", fontSize: 10.5, color: "var(--muted)" }}>
          a sealed jar that lives, evolves and balances itself
        </p>
        <JarCanvas
          world={worldRef.current}
          tool={tool} seedType={seedType} speed={speed}
          onHover={setSubject}
        />
      </div>
      <div style={{ width: 176, paddingTop: 30 }}>
        <div style={{ fontSize: 9.5, color: "var(--muted)", letterSpacing: 1.2, fontWeight: 700 }}>
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

      {guiding && step < STEPS.length && (
        <Tutorial
          step={step}
          onNext={() => (step === STEPS.length - 1 ? setGuiding(false) : setStep(step + 1))}
          onSkip={() => setGuiding(false)}
        />
      )}
    </div>
  );
}

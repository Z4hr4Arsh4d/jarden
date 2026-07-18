import React from "react";

// A short, self-dismissing guide. Each step watches the world and completes itself when
// the player actually does the thing — no "Next" button to mash through without learning.
export const STEPS = [
  {
    title: "Welcome to your jar",
    body: "This is a sealed ecosystem. Nothing gets in or out — not even water. Your job is to keep it alive and balanced.",
    hint: "Click Next to start.",
    done: () => false,
    manual: true,
  },
  {
    title: "Plant something",
    body: "Pick a seed on the left, then click the soil inside the jar.",
    hint: "🌿 Fern is the hardiest — start there.",
    done: (w) => w.entities.length > 0,
    highlight: "seeds",
  },
  {
    title: "Give it water",
    body: "Seeds need damp soil to sprout. Choose 💧 Water and click near your seed.",
    hint: "Watch the soil darken as it gets wet.",
    done: (w) => w.cells.some((c) => c.water > 0.75),
    highlight: "tools",
  },
  {
    title: "Speed up time",
    body: "Plants take days to grow. One day is 60 seconds — press 4× to watch it happen.",
    hint: "The sim runs identically at any speed.",
    done: (w, speed) => speed >= 2,
    highlight: "speed",
  },
  {
    title: "Add some life",
    body: "🐛 Bugs graze on plants — they nibble but never kill. They also breed fast.",
    hint: "Variety raises your score.",
    done: (w) => w.bugs.length > 0,
    highlight: "tools",
  },
  {
    title: "Keep them in check",
    body: "🕷️ Predators hunt bugs. Without them, bugs overrun the jar. With them, the whole web balances itself.",
    hint: "Plants → bugs → predators → mould → soil. A full loop.",
    done: (w) => w.preds.length > 0,
    highlight: "tools",
  },
  {
    title: "That's it",
    body: "Your score rewards a jar that's alive, varied, balanced, and recycling. Reach 60 and hold it for 5 days to thrive.",
    hint: "Tending costs ⚡ energy, so you can't force it — the jar has to work on its own.",
    done: () => false,
    manual: true,
  },
];

export default function Tutorial({ step, onNext, onSkip }) {
  const s = STEPS[step];
  if (!s) return null;
  const last = step === STEPS.length - 1;

  return (
    <div style={{
      position: "fixed", left: 20, bottom: 20, width: 300, zIndex: 50,
      background: "#fff", border: "1px solid var(--line)", borderRadius: 12,
      padding: "13px 15px", boxShadow: "0 8px 28px rgba(20,30,50,0.13)",
      fontFamily: "inherit",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</span>
        <span style={{ fontSize: 9.5, color: "var(--muted)" }}>{step + 1}/{STEPS.length}</span>
      </div>
      <p style={{ margin: "0 0 6px", fontSize: 11.5, lineHeight: 1.55, color: "#40505f" }}>{s.body}</p>
      <p style={{ margin: "0 0 10px", fontSize: 10.5, color: "var(--muted)", fontStyle: "italic" }}>{s.hint}</p>
      <div style={{ display: "flex", gap: 7 }}>
        {(s.manual || last) && (
          <button onClick={onNext} style={btn(true)}>{last ? "Let me play" : "Next"}</button>
        )}
        {!last && <button onClick={onSkip} style={btn(false)}>Skip guide</button>}
      </div>
    </div>
  );
}

const btn = (primary) => ({
  flex: primary ? 1 : "0 0 auto",
  padding: "6px 12px", fontFamily: "inherit", fontSize: 11, cursor: "pointer",
  borderRadius: 7, border: `1px solid ${primary ? "var(--accent)" : "var(--line)"}`,
  background: primary ? "var(--accent)" : "#fff",
  color: primary ? "#fff" : "var(--muted)",
});

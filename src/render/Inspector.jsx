import React from "react";
import { PLANT_TYPES } from "../sim/config.js";
import { GENE_KEYS, GENE_INFO } from "../sim/genetics.js";

// Hover anything in the jar and it explains itself. The single biggest cure for
// "what am I even looking at" — the numbers stop being abstract.
export default function Inspector({ subject }) {
  if (!subject) {
    return (
      <div style={box}>
        <div style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.6 }}>
          Hover anything in the jar to inspect it.
        </div>
      </div>
    );
  }

  if (subject.kind === "plant") {
    const t = PLANT_TYPES[subject.type];
    const stage = { seed: "a seed", sprout: "sprouting", grow: "growing", mature: "fully grown", wither: "withering" }[subject.stage];
    return (
      <div style={box}>
        <div style={title}>{t.label} · <span style={{ color: "var(--muted)" }}>{stage}</span></div>
        <Row k="Health" v={`${Math.round(subject.health * 100)}%`} warn={subject.health < 0.4} />
        <Row k="Age" v={`${(subject.age / 60).toFixed(1)} / ${t.lifeDays} days`} />
        <Row k="Generation" v={subject.gen || 0} />
        <div style={{ ...sub, marginTop: 5 }}>Its genes</div>
        {GENE_KEYS.map((g) => (
          <Row key={g} k={GENE_INFO[g].label} v={subject.genes[g].toFixed(2)}
               good={subject.genes[g] > 1.1} />
        ))}
      </div>
    );
  }

  if (subject.kind === "bug") {
    return (
      <div style={box}>
        <div style={title}>Bug · <span style={{ color: "var(--muted)" }}>
          {subject.fleeing ? "fleeing!" : subject.eating ? "munching" : "wandering"}
        </span></div>
        <Row k="Energy" v={`${Math.round(subject.energy * 100)}%`} warn={subject.energy < 0.25} />
        <Row k="Age" v={`${subject.age.toFixed(0)}s`} />
        <div style={sub}>Grazes plants but never kills them. Breeds when well fed.</div>
      </div>
    );
  }

  if (subject.kind === "pred") {
    return (
      <div style={box}>
        <div style={title}>Predator · <span style={{ color: "var(--muted)" }}>
          {subject.hunting ? "hunting" : "resting"}
        </span></div>
        <Row k="Energy" v={`${Math.round(subject.energy * 100)}%`} warn={subject.energy < 0.25} />
        <Row k="Age" v={`${subject.age.toFixed(0)}s`} />
        <div style={sub}>Hunts bugs — but only when hungry. Rests when full.</div>
      </div>
    );
  }

  // a soil cell
  return (
    <div style={box}>
      <div style={title}>Soil</div>
      <Row k="Water" v={`${Math.round(subject.water * 100)}%`} warn={subject.water < 0.12} />
      <Row k="Nutrients" v={`${Math.round(subject.nutrients * 100)}%`} />
      {subject.detritus > 0.02 && <Row k="Dead matter" v={subject.detritus.toFixed(2)} />}
      {subject.mould > 0.02 && <Row k="Mould" v={`${Math.round(subject.mould * 100)}%`} good />}
    </div>
  );
}

const box = {
  border: "1px solid var(--line)", borderRadius: 10, padding: "9px 11px",
  marginTop: 8, background: "#fff", minHeight: 58,
};
const title = { fontSize: 12, fontWeight: 700, marginBottom: 4 };
const sub = { fontSize: 9.5, color: "var(--muted)", lineHeight: 1.5, marginTop: 4 };

function Row({ k, v, warn, good }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, lineHeight: 1.7 }}>
      <span style={{ color: "var(--muted)" }}>{k}</span>
      <span style={{ color: warn ? "#c0504d" : good ? "#3f9a5a" : "var(--ink)" }}>{v}</span>
    </div>
  );
}

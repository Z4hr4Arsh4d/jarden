import React, { useEffect, useState } from "react";
import { PLANT_TYPES, CONFIG } from "../sim/config.js";

const SEED_ICON = { sprout: "🌱", fern: "🌿", bloom: "🌸" };

function Btn({ active, onClick, icon, label, hint }) {
  return (
    <button onClick={onClick} title={hint}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        padding: "8px 10px", marginBottom: 6, cursor: "pointer",
        fontFamily: "inherit", fontSize: 12, textAlign: "left",
        borderRadius: 8, border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active ? "rgba(63,154,90,0.10)" : "#fff",
        color: "var(--ink)",
      }}>
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function Sidebar({ world, tool, setTool, seedType, setSeedType }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250);   // poll the world for the readout
    return () => clearInterval(id);
  }, []);

  const label = { fontSize: 10, color: "var(--muted)", letterSpacing: 1, margin: "14px 0 6px" };
  const mould = world.cells.reduce((t, c) => t + c.mould, 0);

  return (
    <aside style={{ width: 150, paddingTop: 42 }}>
      <div style={label}>SEEDS</div>
      {Object.values(PLANT_TYPES).map((t) => (
        <Btn key={t.key}
          active={tool === "seed" && seedType === t.key}
          onClick={() => { setTool("seed"); setSeedType(t.key); }}
          icon={SEED_ICON[t.key]} label={t.label}
          hint={`light ${t.lightNeed} · water ${t.waterUse} · lives ${t.lifeDays} days`} />
      ))}

      <div style={label}>TOOLS</div>
      <Btn active={tool === "water"} onClick={() => setTool("water")}
           icon="💧" label="Water" hint="click the soil to pour" />
      <Btn active={tool === "bug"} onClick={() => setTool("bug")}
           icon="🐛" label="Add bug" hint="bugs graze on plants, breed, and feed the mould when they die" />
      <Btn active={false} onClick={() => world.sunlamp()}
           icon="☀️" label="Sunlamp" hint={`${CONFIG.LAMP_SECONDS}s of extra light`} />

      <div style={label}>JAR</div>
      <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
        <div>🗓 day {world.day}</div>
        <div>🌱 plants {world.entities.length}/{CONFIG.MAX_PLANTS}</div>
        <div>🐛 bugs {world.bugs.length}/{CONFIG.MAX_BUGS}</div>
        <div>🍄 mould {mould.toFixed(1)}</div>
        <div>💧 humidity {world.humidity.toFixed(1)}</div>
        <div>{world.lampT > 0 ? `☀️ lamp ${world.lampT.toFixed(0)}s` : "🌙 lamp off"}</div>
      </div>

      <p style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.6, marginTop: 16 }}>
        Pick a seed, click the soil to plant it. Water keeps things alive; the lamp works at night.
        Bugs graze without killing, breed when fed, and feed the mould when they go — mould turns
        the dead back into food for the soil.
      </p>
    </aside>
  );
}

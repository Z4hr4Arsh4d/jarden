import React, { useEffect, useState } from "react";
import { PLANT_TYPES, CONFIG } from "../sim/config.js";
import { averageGenes, GENE_KEYS, GENE_INFO } from "../sim/genetics.js";

const SEED_ICON = { sprout: "🌱", fern: "🌿", bloom: "🌸" };

function Tool({ active, disabled, onClick, icon, label, cost, hint, glow }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} title={hint} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 7, width: "100%",
        padding: "8px 9px", marginBottom: 5,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1,
        fontFamily: "inherit", fontSize: 11.5, textAlign: "left",
        borderRadius: 10,
        border: `1.5px solid ${active ? "var(--accent)" : glow ? "#ffd97a" : "var(--line)"}`,
        background: active ? "rgba(63,154,90,0.10)" : "#fff",
        color: "var(--ink)",
        transform: hover && !disabled ? "translateX(2px) scale(1.02)" : "none",
        boxShadow: glow ? "0 0 0 3px rgba(255,217,122,0.30)" : hover && !disabled
          ? "0 3px 10px rgba(30,50,70,0.09)" : "none",
        transition: "all .16s cubic-bezier(.2,.8,.3,1)",
      }}>
      <span style={{ fontSize: 15, lineHeight: 1, transform: hover ? "scale(1.15) rotate(-6deg)" : "none",
                     transition: "transform .2s" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {cost != null && <span style={{ fontSize: 9.5, color: "var(--muted)" }}>{cost}⚡</span>}
    </button>
  );
}

/** Numbers that ease toward their target instead of snapping — cheap, big polish win. */
function useEased(target, speed = 0.18) {
  const [v, setV] = useState(target);
  useEffect(() => {
    let raf;
    const step = () => {
      setV((cur) => (Math.abs(target - cur) < 0.4 ? target : cur + (target - cur) * speed));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);
  return v;
}

export default function Sidebar({ world, tool, setTool, seedType, setSeedType, speed, setSpeed, highlight }) {
  const [, force] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);

  const easedScore = useEased(world.score);
  const label = { fontSize: 9.5, color: "var(--muted)", letterSpacing: 1.2, margin: "13px 0 5px", fontWeight: 700 };
  const genes = averageGenes(world.entities);
  const hasPlants = world.entities.some((p) => p.kind === "plant");
  const thriving = world.status === "thriving";
  const statusColor = thriving ? "#3f9a5a" : world.status === "dead" ? "#c0504d" : "#5b6b7c";
  const pct = Math.min(100, (world.score / 100) * 100);
  const energyPct = (world.energy / CONFIG.ENERGY_MAX) * 100;

  return (
    <aside style={{ width: 172 }}>
      {/* ---- the score: one big number, a ring, and the goal spelled out ---- */}
      <div style={{
        border: `1.5px solid ${thriving ? "var(--accent)" : "var(--line)"}`, borderRadius: 14,
        padding: "11px 12px", background: thriving ? "rgba(63,154,90,0.06)" : "#fff",
        boxShadow: thriving ? "0 0 0 4px rgba(63,154,90,0.10)" : "0 2px 10px rgba(30,50,70,0.05)",
        transition: "all .4s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: `conic-gradient(${statusColor} ${pct * 3.6}deg, #eef1f4 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background .4s",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 800, color: statusColor,
            }}>{Math.round(easedScore)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>
              {thriving ? "✨ Thriving" : world.status === "dead" ? "💀 Jar died" : "Balance"}
            </div>
            <div style={{ fontSize: 9.5, color: "var(--muted)", lineHeight: 1.4 }}>
              {thriving ? "you did it!" : `reach ${CONFIG.THRIVE_SCORE} & hold 5 days`}
            </div>
          </div>
        </div>
        {world.status === "alive" && world.thriveT > 0 && (
          <div style={{ fontSize: 9, color: "var(--accent)", marginTop: 6 }}>
            ✓ thriving in {Math.ceil((CONFIG.THRIVE_DAYS * CONFIG.DAY_LENGTH - world.thriveT) / CONFIG.DAY_LENGTH)} more days…
          </div>
        )}
      </div>

      {/* ---- energy ---- */}
      <div style={{ marginTop: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--muted)", marginBottom: 3 }}>
          <span>⚡ energy</span><span>{Math.round(world.energy)}/{CONFIG.ENERGY_MAX}</span>
        </div>
        <div style={{ height: 7, background: "#eef1f4", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            width: `${energyPct}%`, height: "100%", borderRadius: 4,
            background: "linear-gradient(90deg,#ffd97a,#f2c14e)",
            transition: "width .3s cubic-bezier(.2,.8,.3,1)",
          }} />
        </div>
      </div>

      {/* ---- what the jar needs right now: the one thing to read ---- */}
      <div style={{
        marginTop: 9, padding: "7px 9px", borderRadius: 10, minHeight: 34,
        background: world.warnings.length ? "rgba(255,200,120,0.16)" : "rgba(63,154,90,0.08)",
        border: `1px solid ${world.warnings.length ? "#ffdca8" : "rgba(63,154,90,0.20)"}`,
        fontSize: 10, lineHeight: 1.6, color: world.warnings.length ? "#a5641f" : "#3f7a52",
        transition: "all .3s",
      }}>
        {world.warnings.length
          ? world.warnings.slice(0, 2).map((w, i) => <div key={i}>{w.icon} {w.text}</div>)
          : <div>🌤️ {world.weather.icon} {world.weather.label} · day {world.day} · all is well</div>}
      </div>

      {/* ---- tools ---- */}
      <div style={label}>PLANT</div>
      {Object.values(PLANT_TYPES).map((t) => (
        <Tool key={t.key}
          active={tool === "seed" && seedType === t.key}
          disabled={world.energy < CONFIG.COST_SEED}
          glow={highlight === "seeds"}
          onClick={() => { setTool("seed"); setSeedType(t.key); }}
          icon={SEED_ICON[t.key]} label={t.label} cost={CONFIG.COST_SEED}
          hint={`${t.label}: needs ${t.lightNeed < 0.1 ? "little" : t.lightNeed > 0.2 ? "lots of" : "some"} light · lives ${t.lifeDays} days`} />
      ))}

      <div style={label}>ADD</div>
      <Tool active={tool === "water"} disabled={world.energy < CONFIG.COST_WATER}
            glow={highlight === "tools"}
            onClick={() => setTool("water")} icon="💧" label="Water" cost={CONFIG.COST_WATER}
            hint="Click the soil to pour" />
      <Tool active={tool === "bug"} disabled={world.energy < CONFIG.COST_BUG}
            glow={highlight === "tools"}
            onClick={() => setTool("bug")} icon="🐛" label="Bug" cost={CONFIG.COST_BUG}
            hint="Grazes plants without killing them. Breeds fast." />
      <Tool active={tool === "pred"} disabled={world.energy < CONFIG.COST_BUG}
            glow={highlight === "tools"}
            onClick={() => setTool("pred")} icon="🕷️" label="Predator" cost={CONFIG.COST_BUG}
            hint="Hunts bugs when hungry. Keeps the jar in balance." />
      <Tool active={false} disabled={world.energy < CONFIG.COST_LAMP}
            onClick={() => world.sunlamp()} icon="☀️" label="Sunlamp" cost={CONFIG.COST_LAMP}
            hint={`${CONFIG.LAMP_SECONDS}s of extra light — works at night`} />

      {/* ---- speed ---- */}
      <div style={label}>SPEED</div>
      <div style={{ display: "flex", gap: 4, boxShadow: highlight === "speed" ? "0 0 0 3px rgba(255,217,122,0.35)" : "none",
                    borderRadius: 8, transition: "box-shadow .2s" }}>
        {[0, 1, 2, 4].map((s) => (
          <button key={s} onClick={() => setSpeed(s)}
            style={{
              flex: 1, padding: "6px 0", fontFamily: "inherit", fontSize: 10.5, cursor: "pointer",
              borderRadius: 8, border: `1.5px solid ${speed === s ? "var(--accent)" : "var(--line)"}`,
              background: speed === s ? "rgba(63,154,90,0.10)" : "#fff", color: "var(--ink)",
              fontWeight: speed === s ? 700 : 400, transition: "all .15s",
            }}>
            {s === 0 ? "⏸" : `${s}×`}
          </button>
        ))}
      </div>

      {/* ---- everything else lives behind one toggle ---- */}
      <button onClick={() => setShowDetails((d) => !d)}
        style={{
          width: "100%", marginTop: 13, padding: "6px 0", cursor: "pointer",
          fontFamily: "inherit", fontSize: 9.5, color: "var(--muted)",
          background: "none", border: "none", borderTop: "1px solid var(--line)",
        }}>
        {showDetails ? "▲ hide details" : "▼ show details"}
      </button>

      {showDetails && (
        <div style={{ animation: "fade .2s" }}>
          <div style={label}>JAR</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.75 }}>
            <div>🌱 plants {world.entities.length}/{CONFIG.MAX_PLANTS}</div>
            <div>🐛 bugs {world.bugs.length}/{CONFIG.MAX_BUGS}</div>
            <div>🕷️ predators {world.preds.length}/{CONFIG.MAX_PREDS}</div>
            <div>🍄 mould {world.cells.reduce((t, c) => t + c.mould, 0).toFixed(1)}</div>
            <div>💧 humidity {world.humidity.toFixed(1)}</div>
          </div>
          {hasPlants && (
            <>
              <div style={label}>EVOLUTION</div>
              <div style={{ fontSize: 9.5, color: "var(--muted)", lineHeight: 1.7 }}>
                {GENE_KEYS.map((g) => (
                  <div key={g} title={GENE_INFO[g].hint} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{GENE_INFO[g].label}</span>
                    <span style={{ color: genes[g] > 1.08 ? "#3f9a5a" : genes[g] < 0.92 ? "#c07a3f" : "var(--muted)" }}>
                      {genes[g].toFixed(2)}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 4, fontStyle: "italic", lineHeight: 1.5 }}>
                  gen {Math.max(0, ...world.entities.map((p) => p.gen || 0))} · these drift as the
                  jar selects for what survives
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

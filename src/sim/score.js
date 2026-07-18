// M4 — what turns a sandbox into a game: a goal, a budget, and consequences.
//
// The score rewards a jar that is ALIVE and BALANCED, not a jar that's merely full.
// A monoculture of 16 ferns scores badly; plants + bugs + predators + working decay
// scores well. You can't brute-force it, because tending costs energy that refills slowly.

import { CONFIG } from "./config.js";

export function initScore(world) {
  world.energy = CONFIG.ENERGY_MAX;
  world.score = 0;
  world.thriveT = 0;
  world.status = "alive";          // "alive" | "thriving" | "dead"
  world.peakScore = 0;
  world.warnings = [];
}

/** Try to spend tending energy. Returns false (and does nothing) if you can't afford it. */
export function spend(world, cost) {
  if (world.energy < cost) return false;
  world.energy -= cost;
  return true;
}

/** 0-100. Life, variety and balance — each capped so no single thing can carry the jar. */
export function computeScore(world) {
  const plants = world.entities.filter((p) => p.kind === "plant" && p.stage !== "wither");
  if (!plants.length && !world.bugs.length) return 0;          // a dead jar scores nothing

  // 1. life (max 30): a healthy population, with diminishing returns
  const health = plants.reduce((t, p) => t + p.health, 0);
  const life = Math.min(30, health * 3);

  // 2. variety (max 25): distinct species present, across every tier
  const types = new Set(plants.map((p) => p.type));
  let variety = types.size * 5;
  if (world.bugs.length) variety += 5;
  if (world.preds.length) variety += 5;
  variety = Math.min(25, variety);

  // 3. balance (max 25): a full food chain, none of it running away
  let balance = 0;
  if (plants.length && world.bugs.length) balance += 10;       // producers + grazers
  if (world.bugs.length && world.preds.length) balance += 10;  // ...and something hunting them
  const ratio = world.bugs.length / Math.max(1, plants.length);
  if (ratio > 0.15 && ratio < 1.2) balance += 5;               // neither side overwhelming
  balance = Math.min(25, balance);

  // 4. decay (max 20): is the recycling loop actually turning?
  let mould = 0, detritus = 0, nutrients = 0;
  for (const c of world.cells) { mould += c.mould; detritus += c.detritus; nutrients += c.nutrients; }
  const decay = Math.min(10, mould * 4) +
                Math.min(10, (nutrients / world.cells.length) * 12);

  return Math.round(Math.min(100, life + variety + balance + decay));
}

/** Human-readable nudges — the "consequences you can read" part of M4. */
export function computeWarnings(world) {
  const out = [];
  const soil = [];
  const y0 = world.rows - world.cfg.SOIL_ROWS;
  for (let x = 0; x < world.cols; x++) soil.push(world.cellAt(x, y0).water);
  const avgWater = soil.reduce((a, b) => a + b, 0) / soil.length;
  const plants = world.entities.filter((p) => p.kind === "plant" && p.stage !== "wither");

  if (avgWater < 0.12) out.push({ icon: "🏜️", text: "The soil is parched" });
  if (!plants.length) out.push({ icon: "🥀", text: "Nothing is growing" });
  else if (plants.every((p) => p.health < 0.4)) out.push({ icon: "😟", text: "Your plants are struggling" });
  if (world.bugs.length > plants.length * 1.5 && world.bugs.length > 2) {
    out.push({ icon: "🐛", text: "Bugs are overrunning the jar" });
  }
  let detritus = 0;
  for (const c of world.cells) detritus += c.detritus;
  if (detritus > 3) out.push({ icon: "🍄", text: "Dead matter is piling up" });
  if (world.energy < 2) out.push({ icon: "😴", text: "You need a moment to rest" });
  return out;
}

export function tickScore(world, dt) {
  world.energy = Math.min(CONFIG.ENERGY_MAX, world.energy + CONFIG.ENERGY_REGEN * dt);
  world.score = computeScore(world);
  world.peakScore = Math.max(world.peakScore, world.score);
  world.warnings = computeWarnings(world);

  const empty = !world.entities.some((p) => p.kind === "plant") && !world.bugs.length;
  if (empty && world.time > 5) {
    world.status = "dead";
    world.thriveT = 0;
    return;
  }

  // sustain a good score long enough and the jar is genuinely thriving
  if (world.score >= CONFIG.THRIVE_SCORE) {
    world.thriveT += dt;
    if (world.thriveT >= CONFIG.THRIVE_DAYS * CONFIG.DAY_LENGTH) world.status = "thriving";
  } else {
    world.thriveT = Math.max(0, world.thriveT - dt * 2);   // slipping loses ground fast
    if (world.status === "thriving") world.status = "alive";
  }
}

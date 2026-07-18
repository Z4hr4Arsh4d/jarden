// Turning a live jar into text and back.
//
// The catch: the world's RNG has *position*. Save the seed alone and a reloaded jar
// would replay the same "random" numbers it already used, so weather and mutations
// would repeat. We store the RNG's call count and fast-forward it on load, so a
// restored jar continues its story instead of stuttering back through it.

import { World } from "./engine.js";
import { CONFIG, WEATHER } from "./config.js";

export const SAVE_VERSION = 1;

export function serialize(world) {
  return JSON.stringify({
    v: SAVE_VERSION,
    time: world.time,
    humidity: world.humidity,
    lampT: world.lampT,
    energy: world.energy,
    score: world.score,
    peakScore: world.peakScore,
    thriveT: world.thriveT,
    status: world.status,
    weather: world.weather.key,
    weatherT: world.weatherT,
    randCalls: world.randCalls,
    // Nothing here is rounded, and that's deliberate.
    //
    // This sim is deterministic but CHAOTIC: shave 1e-7 off a cell's water and it tips a
    // threshold like `water > 0.08`, which changes whether a seed germinates, which
    // changes everything downstream. Rounding to 6dp made restored jars visibly diverge
    // within three days, and it quietly leaked ~0.005 of water into a supposedly sealed
    // system on every load. Full doubles cost ~12KB. A jar that reloads exactly as you
    // left it is worth 12KB.
    cells: {
      water: world.cells.map((c) => c.water),
      nutrients: world.cells.map((c) => c.nutrients),
      detritus: world.cells.map((c) => c.detritus),
      mould: world.cells.map((c) => c.mould),
    },
    plants: world.entities.map((p) => ({
      i: p.id, t: p.type, c: p.col, s: p.stage, a: p.age,
      p: p.progress, h: p.health, st: p.starve,
      w: p.witherT, sd: p.seedT, n: p.consumedN,
      b: p.bitten, g: p.genes, gn: p.gen || 0,
    })),
    bugs: world.bugs.map((b) => ({
      i: b.id, c: b.col, e: b.energy, a: b.age, d: b.dir, bt: b.breedT || 0,
    })),
    preds: world.preds.map((p) => ({
      i: p.id, c: p.col, e: p.energy, a: p.age, d: p.dir, bt: p.breedT || 0,
    })),
  });
}

export function deserialize(text) {
  const d = typeof text === "string" ? JSON.parse(text) : text;
  if (d.v !== SAVE_VERSION) throw new Error(`Save is version ${d.v}, this build reads ${SAVE_VERSION}`);

  const w = new World(CONFIG);
  w.time = d.time;
  w.humidity = d.humidity;
  w.lampT = d.lampT || 0;
  w.energy = d.energy ?? CONFIG.ENERGY_MAX;
  w.score = d.score || 0;
  w.peakScore = d.peakScore || 0;
  w.thriveT = d.thriveT || 0;
  w.status = d.status || "alive";
  w.weather = WEATHER[d.weather] || WEATHER.clear;
  w.weatherT = d.weatherT ?? 30;

  // fast-forward the RNG to exactly where it was, so the jar's future stays unwritten
  w.randCalls = 0;
  for (let i = 0; i < (d.randCalls || 0); i++) w.rand();

  for (let i = 0; i < w.cells.length; i++) {
    w.cells[i].water = d.cells.water[i];
    w.cells[i].nutrients = d.cells.nutrients[i];
    w.cells[i].detritus = d.cells.detritus[i] || 0;
    w.cells[i].mould = d.cells.mould[i] || 0;
  }

  w.entities = d.plants.map((p) => ({
    id: p.i, kind: "plant", type: p.t, col: p.c, stage: p.s, age: p.a,
    progress: p.p, health: p.h, starve: p.st, witherT: p.w, seedT: p.sd,
    consumedN: p.n, bitten: p.b, genes: p.g, gen: p.gn,
  }));
  w.bugs = d.bugs.map((b) => ({
    id: b.i, kind: "bug", col: b.c, energy: b.e, age: b.a, dir: b.d,
    eating: false, fleeing: false, blink: 0, breedT: b.bt, hearts: 0,
  }));
  w.preds = (d.preds || []).map((p) => ({
    id: p.i, kind: "pred", col: p.c, energy: p.e, age: p.a, dir: p.d,
    hunting: false, blink: 0, breedT: p.bt, hearts: 0, pounce: 0,
  }));
  return w;
}

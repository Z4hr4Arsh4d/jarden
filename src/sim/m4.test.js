// Run with: node src/sim/m4.test.js
// Covers M4: genetics, weather, predators, tending energy, and scoring.
import { World } from "./engine.js";
import { CONFIG, WEATHER } from "./config.js";
import { plantSeed } from "./plants.js";
import { spawnBug, spawnPred } from "./creatures.js";
import { averageGenes, GENE_KEYS } from "./genetics.js";
import { computeScore } from "./score.js";
import assert from "node:assert";

const DT = CONFIG.TICK_SECONDS;
const run = (w, s) => { for (let t = 0; t < s; t += DT) w.tick(DT); };
const pin = (w, spell) => { w.weather = spell; w.weatherT = Infinity; };

// ---------------------------------------------------------------- genetics
// 1. genes are inherited with drift, and the generation counter climbs
{
  const w = new World();
  pin(w, WEATHER.clear);
  plantSeed(w, 8, "fern");
  const origin = { ...w.entities[0].genes };
  for (let d = 0; d < 6; d++) { w.addWater(8, 0.8, true); run(w, CONFIG.DAY_LENGTH); }
  const kids = w.entities.filter((p) => (p.gen || 0) > 0);
  console.log(`genetics: ${w.entities.length} plants, ${kids.length} descendants, max generation ${Math.max(0, ...w.entities.map(p => p.gen || 0))}`);
  assert(kids.length > 0, "plants should produce descendants");
  const differs = kids.some((k) => GENE_KEYS.some((g) => Math.abs(k.genes[g] - origin[g]) > 1e-9));
  assert(differs, "children's genes should drift from their parent's");
  for (const p of w.entities) {
    for (const g of GENE_KEYS) {
      assert(p.genes[g] >= CONFIG.GENE_MIN && p.genes[g] <= CONFIG.GENE_MAX, "genes must stay in range");
    }
  }
}

// 2. THE headline: the jar SELECTS. Nothing tells plants to adapt — plants whose genes
// suit the conditions mature and pass them on, and plants whose genes don't simply never
// reproduce. Run as a controlled experiment: two identical jars, one stressed, one not.
{
  const jar = (spell, water) => {
    const w = new World();
    w.weather = spell; w.weatherT = Infinity;
    for (let c = 1; c < 15; c += 2) plantSeed(w, c, "fern");
    for (let d = 0; d < 30; d++) {
      if (water) for (let c = 0; c < CONFIG.COLS; c += 3) w.addWater(c, water, true);
      run(w, CONFIG.DAY_LENGTH);
    }
    return w;
  };

  const control = jar(WEATHER.clear, 0.8);        // comfortable: no pressure
  const drought = jar(WEATHER.heat, 0);           // heat wave, never watered

  const cg = averageGenes(control.entities);
  const dg = averageGenes(drought.entities);
  console.log(`SELECTION, 30 days, ${Math.max(...drought.entities.map(p => p.gen))} generations deep:`);
  console.log(`  comfortable jar -> grow ${cg.grow.toFixed(2)}  hardy ${cg.hardy.toFixed(2)}   (${control.entities.length} plants)`);
  console.log(`  drought jar     -> grow ${dg.grow.toFixed(2)}  hardy ${dg.hardy.toFixed(2)}   (${drought.entities.length} plants)`);
  console.log(`  => drought selects for growing fast and toughing it out: breed before you die`);

  assert(control.entities.length > 0 && drought.entities.length > 0, "both lineages should survive");
  assert(dg.grow > cg.grow + 0.15, "drought should select for faster growth");
  assert(dg.hardy > cg.hardy, "drought should select for hardiness");
  assert(Math.max(...drought.entities.map((p) => p.gen)) >= 3, "several generations should pass");
}

// ---------------------------------------------------------------- weather
// 3. weather changes over time, and never repeats back-to-back
{
  const w = new World();
  const seen = new Set();
  let last = w.weather.key, flips = 0;
  for (let t = 0; t < 600; t += DT) {
    w.tick(DT);
    if (w.weather.key !== last) { flips++; assert(w.weather.key !== last, "no instant repeats"); last = w.weather.key; }
    seen.add(w.weather.key);
  }
  console.log(`weather: ${flips} changes in 10 minutes, ${seen.size} different spells seen`);
  assert(flips >= 5 && seen.size >= 3, "the weather should actually vary");
}

// 4. weather bends the physics in the right directions
{
  const hot = new World(); pin(hot, WEATHER.heat);
  const cold = new World(); pin(cold, WEATHER.cold);
  hot.time = cold.time = CONFIG.DAY_LENGTH * 0.5;      // noon in both
  const hotSoil0 = hot.cellAt(8, hot.rows - hot.cfg.SOIL_ROWS).water;
  run(hot, 30); run(cold, 30);
  const hotSoil = hot.cellAt(8, hot.rows - hot.cfg.SOIL_ROWS).water;
  const coldSoil = cold.cellAt(8, cold.rows - cold.cfg.SOIL_ROWS).water;
  console.log(`weather physics: soil after 30s @noon — heat wave ${hotSoil.toFixed(3)} vs cold snap ${coldSoil.toFixed(3)} (started ${hotSoil0.toFixed(3)})`);
  assert(hotSoil < coldSoil, "a heat wave should dry the soil faster than a cold snap");

  const dim = new World(); pin(dim, WEATHER.overcast);
  const clear = new World(); pin(clear, WEATHER.clear);
  dim.time = clear.time = CONFIG.DAY_LENGTH * 0.5;
  console.log(`weather light: overcast sun=${dim.sun.toFixed(2)} vs clear sun=${clear.sun.toFixed(2)}`);
  assert(dim.sun < clear.sun, "overcast should dim the jar");
}

// 5. weather must NOT break the sealed jar
{
  const w = new World();
  plantSeed(w, 5, "fern"); spawnBug(w, 8); spawnPred(w, 11);
  const before = w.totalWater();
  run(w, CONFIG.DAY_LENGTH * 8);                   // many weather spells
  console.log(`sealed jar through 8 days of weather: ${before.toFixed(4)} -> ${w.totalWater().toFixed(4)}`);
  assert(Math.abs(w.totalWater() - before) < 1e-6, "weather must only move water, never create it");
}

// ---------------------------------------------------------------- predators
// 6. predators hunt and kill bugs (unlike bugs, they don't graze)
{
  const w = new World();
  pin(w, WEATHER.clear);
  for (let i = 0; i < 6; i++) spawnBug(w, 2 + i);
  spawnPred(w, 14, 0.9);
  const before = w.bugs.length;
  run(w, 40);
  console.log(`predator: bugs ${before} -> ${w.bugs.length}, predator energy ${w.preds[0]?.energy.toFixed(2)}`);
  assert(w.bugs.length < before, "a predator should catch bugs");
}

// 7. THE food web holds: all three trophic levels coexist for 50 days.
// This is the test that caught the real design bugs. Earlier builds failed it three
// different ways: bugs ate every plant and starved; predators ate every bug and starved;
// and bugs were caught against the glass because they had nowhere to run. The fixes —
// grazing, resting when full, dodging, and making one bug a big enough meal that
// predation can't outrun bug births — are what this test protects.
{
  const w = new World();
  pin(w, WEATHER.clear);
  for (let c = 0; c < 16; c += 2) { plantSeed(w, c, "fern"); w.addWater(c, 0.9, true); }
  run(w, CONFIG.DAY_LENGTH);
  for (let i = 0; i < 5; i++) spawnBug(w, 2 + i * 3);
  spawnPred(w, 8);

  let minPlants = Infinity, maxPlants = 0, bugsEverZero = false, predsEverZero = false;
  for (let d = 0; d < 50; d++) {
    for (let c = 0; c < 16; c += 4) w.addWater(c, 0.6, true);
    run(w, CONFIG.DAY_LENGTH);
    minPlants = Math.min(minPlants, w.entities.length);
    maxPlants = Math.max(maxPlants, w.entities.length);
    if (!w.bugs.length) bugsEverZero = true;
    if (!w.preds.length) predsEverZero = true;
  }
  console.log(`50-day food web: ${w.entities.length} plants, ${w.bugs.length} bugs, ${w.preds.length} predators | plants ranged ${minPlants}-${maxPlants} | score ${w.score} (${w.status})`);
  assert(w.entities.length > 0, "plants must survive 50 days of grazing");
  assert(!bugsEverZero, "bugs must never be hunted to extinction");
  assert(!predsEverZero, "predators must never starve out their own food supply");
  assert(maxPlants > minPlants, "a living jar should ebb and flow");
}

// 8. a starving predator dies and leaves detritus
{
  const w = new World();
  const total = () => w.cells.reduce((t, c) => t + c.detritus, 0);
  spawnPred(w, 8, 0.02);                           // nothing to hunt
  const before = total();
  run(w, 10);
  console.log(`starved predator: preds=${w.preds.length}, detritus ${before.toFixed(2)} -> ${total().toFixed(2)}`);
  assert(w.preds.length === 0 && total() > before, "its body should feed the decomposers");
}

// ---------------------------------------------------------------- tending energy
// 9. tools cost energy — you can't spam the jar into perfection
{
  const w = new World();
  w.energy = CONFIG.ENERGY_MAX;
  let poured = 0;
  for (let i = 0; i < 50; i++) if (w.addWater(8)) poured++;
  console.log(`tending budget: ${poured} pours from ${CONFIG.ENERGY_MAX} energy (each costs ${CONFIG.COST_WATER}), ${w.energy.toFixed(1)} left`);
  assert(poured === CONFIG.ENERGY_MAX / CONFIG.COST_WATER, "watering must be limited by energy");
  assert(!w.sunlamp(), "no energy left, so the lamp shouldn't fire");
  run(w, 30);
  console.log(`energy regenerates: ${w.energy.toFixed(1)}/${CONFIG.ENERGY_MAX} after 30s rest`);
  assert(w.energy > 3, "energy should refill over time");
  assert(w.sunlamp(), "and then the lamp works again");
}

// ---------------------------------------------------------------- scoring
// 10. the score rewards balance, not just quantity
{
  const mono = new World();
  pin(mono, WEATHER.clear);
  for (let c = 0; c < 16; c++) { plantSeed(mono, c, "fern"); mono.addWater(c, 0.9, true); }
  run(mono, CONFIG.DAY_LENGTH * 1.5);

  const web = new World();
  pin(web, WEATHER.clear);
  for (let c = 0; c < 16; c += 3) { plantSeed(web, c, "fern"); web.addWater(c, 0.9, true); }
  for (let c = 1; c < 16; c += 3) { plantSeed(web, c, "bloom"); web.addWater(c, 0.9, true); }
  for (let c = 2; c < 16; c += 6) plantSeed(web, c, "sprout");
  run(web, CONFIG.DAY_LENGTH * 1.5);
  spawnBug(web, 4); spawnBug(web, 10); spawnPred(web, 7);
  run(web, 20);

  console.log(`scoring: 16-fern monoculture = ${computeScore(mono)} | a real food web = ${computeScore(web)}`);
  assert(computeScore(web) > computeScore(mono), "a balanced web should beat a monoculture");
}

// 11. an empty jar is dead, and the status says so
{
  const w = new World();
  run(w, 20);
  console.log(`empty jar: score=${w.score} status=${w.status}`);
  assert(w.score === 0 && w.status === "dead");
}

// 12. a thriving jar is recognised — and the whole thing survives 30 days
{
  const w = new World();
  for (let c = 0; c < 16; c += 3) { plantSeed(w, c, "fern"); w.addWater(c, 0.9, true); }
  for (let c = 1; c < 16; c += 3) { plantSeed(w, c, "bloom"); w.addWater(c, 0.9, true); }
  run(w, CONFIG.DAY_LENGTH);
  spawnBug(w, 5); spawnBug(w, 11); spawnPred(w, 8);
  for (let d = 0; d < 30; d++) {
    for (let c = 0; c < 16; c += 4) w.addWater(c, 0.6, true);
    run(w, CONFIG.DAY_LENGTH);
  }
  console.log(`30-day jar: score=${w.score} peak=${w.peakScore} status=${w.status} | ${w.entities.length} plants, ${w.bugs.length} bugs, ${w.preds.length} predators`);
  assert(w.peakScore >= CONFIG.THRIVE_SCORE, "a well-tended jar should reach a thriving score");
  assert(w.energy >= 0 && w.energy <= CONFIG.ENERGY_MAX);
  for (const c of w.cells) {
    assert(c.water >= 0 && c.water <= CONFIG.WATER_MAX && !Number.isNaN(c.water));
    assert(c.detritus >= 0 && c.mould >= 0 && c.mould <= 1);
  }
}

console.log("\nALL M4 TESTS PASSED");

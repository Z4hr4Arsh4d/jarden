// Run with: node src/sim/creatures.test.js
import { World } from "./engine.js";
import { CONFIG } from "./config.js";
import { plantSeed, rootCell } from "./plants.js";
import { spawnBug, addDetritus } from "./creatures.js";
import assert from "node:assert";

const DT = CONFIG.TICK_SECONDS;
const run = (w, s) => { for (let t = 0; t < s; t += DT) w.tick(DT); };

// 1. bugs walk to plants and eat them
{
  const w = new World();
  plantSeed(w, 12, "fern");
  w.addWater(12, 0.6);
  run(w, CONFIG.DAY_LENGTH * 0.6);              // let it sprout
  spawnBug(w, 2);
  const start = w.bugs[0].col;
  const healthBefore = w.entities[0].health;
  run(w, 15);
  const b = w.bugs[0];
  const plant = w.entities[0];
  console.log(`bug walked ${start.toFixed(1)} -> ${b.col.toFixed(1)} (plant at 12) | plant health ${healthBefore.toFixed(2)} -> ${plant.health.toFixed(2)} | bug energy ${b.energy.toFixed(2)}`);
  assert(b.col > start + 3, "the bug should walk toward food");
  assert(plant.health < healthBefore, "the bug should eat the plant");
  assert(plant.stage !== "wither", "but not devour it in seconds");
}

// 2. a fed bug breeds; the population is capped
{
  const w = new World();
  for (let c = 1; c < 15; c += 2) { plantSeed(w, c, "fern"); w.addWater(c, 0.8); }
  run(w, CONFIG.DAY_LENGTH * 0.7);
  spawnBug(w, 7, 0.9);
  run(w, CONFIG.DAY_LENGTH * 3);
  console.log(`bugs after 3 days in a planted jar: ${w.bugs.length} (cap ${CONFIG.MAX_BUGS}), plants still alive: ${w.entities.length}`);
  assert(w.bugs.length > 1, "well-fed bugs should breed");
  assert(w.bugs.length <= CONFIG.MAX_BUGS, "population must stay capped");
  assert(w.entities.length > 0, "grazers must not eat the jar to extinction");
}

// 3. a bug with no food starves and its body becomes detritus
// (it wanders while starving, so check the whole jar, not the column it spawned in)
{
  const w = new World();
  const totalDetritus = () => w.cells.reduce((t, c) => t + c.detritus, 0);
  spawnBug(w, 8, 0.05);                         // nearly empty, nothing to eat
  const before = totalDetritus();
  run(w, 12);
  const after = totalDetritus();
  console.log(`starved bug: bugs=${w.bugs.length}, detritus in jar ${before.toFixed(2)} -> ${after.toFixed(2)}`);
  assert(w.bugs.length === 0, "a starving bug should die");
  assert(after > before, "its body should feed the decomposers");
}

// 4. mould grows on damp dead matter and turns it into nutrients
{
  const w = new World();
  const soil = rootCell(w, 8);
  soil.water = 0.9;
  addDetritus(w, 8, 1.5);
  const d0 = soil.detritus, n0 = soil.nutrients;
  run(w, 60);
  console.log(`mould: detritus ${d0.toFixed(2)} -> ${soil.detritus.toFixed(2)} | nutrients ${n0.toFixed(2)} -> ${soil.nutrients.toFixed(2)} | mould ${soil.mould.toFixed(2)}`);
  assert(soil.mould > 0, "mould should take hold on damp dead matter");
  assert(soil.detritus < d0, "mould should consume the dead matter");
  assert(soil.nutrients > n0, "decay should return nutrients to the soil");
}

// 5. mould needs damp: in a bone-dry jar, dead matter barely rots.
// (Drying ONE cell wouldn't work — soil diffusion refills it from its neighbours
//  within a tick, which is the water physics behaving exactly as it should.)
{
  const w = new World();
  for (const c of w.cells) c.water = 0;
  const dry = rootCell(w, 3);
  addDetritus(w, 3, 1.0);
  run(w, 40);
  console.log(`bone-dry jar: mould=${dry.mould.toFixed(2)} detritus=${dry.detritus.toFixed(2)} (should barely rot)`);
  assert(dry.mould === 0, "mould shouldn't grow in dry soil");
  assert(dry.detritus > 0.8, "without mould, decay is slow");
}

// 6. THE invariant still holds with a whole food web running
{
  const w = new World();
  plantSeed(w, 4, "fern"); plantSeed(w, 9, "bloom"); plantSeed(w, 13, "sprout");
  spawnBug(w, 2); spawnBug(w, 11);
  const before = w.totalWater();
  run(w, CONFIG.DAY_LENGTH * 4);
  const after = w.totalWater();
  console.log(`water conservation with plants + bugs + mould: ${before.toFixed(4)} -> ${after.toFixed(4)}`);
  assert(Math.abs(after - before) < 1e-6, "creatures must not leak water");
}

// 7. the whole loop runs for 30 days without blowing up
{
  const w = new World();
  for (let c = 2; c < 15; c += 3) { plantSeed(w, c, "fern"); w.addWater(c, 0.7); }
  spawnBug(w, 5); spawnBug(w, 10);
  run(w, CONFIG.DAY_LENGTH * 30);
  console.log(`after 30 days: ${w.entities.length} plants, ${w.bugs.length} bugs`);
  assert(w.entities.length <= CONFIG.MAX_PLANTS && w.bugs.length <= CONFIG.MAX_BUGS);
  for (const c of w.cells) {
    assert(c.water >= 0 && c.water <= CONFIG.WATER_MAX && !Number.isNaN(c.water));
    assert(c.nutrients >= 0 && c.nutrients <= CONFIG.NUTRIENT_MAX);
    assert(c.detritus >= 0 && c.detritus <= CONFIG.DETRITUS_MAX);
    assert(c.mould >= 0 && c.mould <= 1);
  }
}

// 8. predator and prey COEXIST — the jar oscillates instead of collapsing.
// (An earlier build had bugs eat every plant to death by day 2, then starve: a dead
//  jar forever. Grazing — leaving a plant at BUG_LEAVE_HEALTH — is what fixed it.)
{
  const w = new World();
  for (let c = 1; c < 15; c += 2) { plantSeed(w, c, "fern"); w.addWater(c, 0.8); }
  run(w, CONFIG.DAY_LENGTH * 0.7);
  spawnBug(w, 7, 0.9);
  let minPlants = Infinity, maxPlants = 0;
  for (let d = 0; d < 12; d++) {
    run(w, CONFIG.DAY_LENGTH);
    minPlants = Math.min(minPlants, w.entities.length);
    maxPlants = Math.max(maxPlants, w.entities.length);
  }
  console.log(`12-day coexistence: plants ranged ${minPlants}-${maxPlants}, ended with ${w.entities.length} plants and ${w.bugs.length} bugs`);
  assert(w.entities.length > 0, "plants should survive 12 days of grazing");
  assert(w.bugs.length > 0, "bugs should survive 12 days of eating");
  assert(maxPlants > minPlants, "a living jar should ebb and flow, not sit still");
}

console.log("\nALL CREATURE TESTS PASSED");

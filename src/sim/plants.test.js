// Run with: node src/sim/plants.test.js
import { World } from "./engine.js";
import { CONFIG, PLANT_TYPES, WEATHER } from "./config.js";
import { plantSeed, rootCell } from "./plants.js";
import assert from "node:assert";

const DT = CONFIG.TICK_SECONDS;
const run = (w, seconds) => { for (let t = 0; t < seconds; t += DT) w.tick(DT); };
/** Pin the weather so a test isolates biology from the weather system. */
const pinClear = (w) => { w.weather = WEATHER.clear; w.weatherT = Infinity; };

// 1. a watered seed grows through its stages to maturity, then dies of old age
{
  const w = new World();
  pinClear(w);
  assert(plantSeed(w, 8, "sprout"));
  w.addWater(8, 0.6, true);
  run(w, CONFIG.DAY_LENGTH * 1.6);                   // mid-life: grown, not yet old
  const p = w.entities[0];
  console.log(`growth: stage=${p.stage} at 1.6 days (lifespan ${PLANT_TYPES.sprout.lifeDays} days)`);
  assert(p && p.stage === "mature", "a watered sprout should reach maturity");

  run(w, CONFIG.DAY_LENGTH * 0.5);                   // past its 2-day lifespan
  const old = w.entities.find((e) => e.col === 8);
  console.log(`old age: stage=${old ? old.stage : "gone"} past lifespan`);
  assert(!old || old.stage === "wither", "plants should die of old age");
}

// 2. THE invariant survives life: transpiration keeps the sealed jar sealed
{
  const w = new World();
  plantSeed(w, 5, "fern");
  const before = w.totalWater();
  run(w, CONFIG.DAY_LENGTH * 2);
  const after = w.totalWater();
  console.log(`water conservation with a living plant: ${before.toFixed(4)} -> ${after.toFixed(4)}`);
  assert(Math.abs(after - before) < 1e-6);
}

// 3. darkness stalls growth (a sprout can't photosynthesise at night)
{
  const w = new World();
  pinClear(w);
  plantSeed(w, 8, "sprout");
  w.addWater(8, 0.6, true);
  run(w, CONFIG.DAY_LENGTH * 0.20);                 // pre-dawn only: still dark
  const nightStage = w.entities[0].stage;
  run(w, CONFIG.DAY_LENGTH * 0.35);                 // through the morning sun
  const dayStage = w.entities[0].stage;
  console.log(`night stage=${nightStage} -> day stage=${dayStage}`);
  assert(nightStage === "seed" || nightStage === "sprout");
  assert(dayStage !== "seed", "sunlight should move growth along");
}

// 4. mature plants spread: one seed becomes a patch
// (weather pinned + kept watered, so this tests spreading and nothing else)
{
  const w = new World();
  pinClear(w);
  plantSeed(w, 8, "bloom");
  for (let d = 0; d < 4; d++) {
    w.addWater(8, 0.8, true);
    run(w, CONFIG.DAY_LENGTH);
  }
  console.log(`spread: ${w.entities.length} plants from 1 seed`);
  assert(w.entities.length >= 2, "a mature bloom should have dropped a seed by now");
}

// 5. death recycles: a withered plant returns its nutrients to the soil.
// (Track the original plant by id — by the time it dies it may have had children.)
{
  const w = new World();
  pinClear(w);
  plantSeed(w, 8, "sprout");                        // short-lived on purpose
  w.addWater(8, 0.6, true);
  const id = w.entities[0].id;
  let recycled = false;
  for (let t = 0; t < CONFIG.DAY_LENGTH * PLANT_TYPES.sprout.lifeDays * 2; t += DT) {
    const alive = w.entities.some((e) => e.id === id);
    w.tick(DT);
    if (alive && !w.entities.some((e) => e.id === id)) {
      const d = rootCell(w, 8).detritus;
      console.log(`recycling: death left ${d.toFixed(3)} detritus for the decomposers`);
      assert(d > 0, "death should leave dead matter behind");
      recycled = true;
      break;
    }
  }
  assert(recycled, "the original plant should have lived, died, and been recycled");
}

// 6. the jar never overflows: population and values stay bounded over 15 days
{
  const w = new World();
  plantSeed(w, 4, "fern"); plantSeed(w, 8, "sprout"); plantSeed(w, 12, "bloom");
  w.addWater(4, 0.6, true); w.addWater(8, 0.6, true); w.addWater(12, 0.6, true);
  run(w, CONFIG.DAY_LENGTH * 15);
  console.log(`after 15 days: ${w.entities.length} plants (cap ${CONFIG.MAX_PLANTS})`);
  assert(w.entities.length <= CONFIG.MAX_PLANTS);
  for (const c of w.cells) {
    assert(c.water >= 0 && c.water <= CONFIG.WATER_MAX && !Number.isNaN(c.water));
    assert(c.nutrients >= 0 && c.nutrients <= CONFIG.NUTRIENT_MAX && !Number.isNaN(c.nutrients));
  }
}

// 7. tools behave: sunlamp lights the night, watering fills the soil
{
  const w = new World();                             // t=0 is midnight
  assert(w.sun === 0);
  w.sunlamp();
  assert(w.sun > 0.5, "the lamp should light the night");
  const soil = rootCell(w, 8);
  const before = soil.water;
  w.addWater(8, CONFIG.WATER_POUR, true);
  console.log(`tools: lamp night-light=${w.sun.toFixed(2)}, pour ${before.toFixed(2)} -> ${soil.water.toFixed(2)}`);
  assert(soil.water > before);
}

console.log("\nALL PLANT TESTS PASSED");

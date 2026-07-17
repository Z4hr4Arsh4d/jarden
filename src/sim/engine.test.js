// Run with: node src/sim/engine.test.js
import { World } from "./engine.js";
import { CONFIG } from "./config.js";
import assert from "node:assert";

const DT = CONFIG.TICK_SECONDS;

// 1. grid shape and cell access
{
  const w = new World();
  assert(w.cells.length === CONFIG.COLS * CONFIG.ROWS);
  assert(w.cellAt(0, 0).x === 0 && w.cellAt(5, 3).y === 3);
  assert(w.isSoil(CONFIG.ROWS - 1) && !w.isSoil(0));
  console.log(`grid: ${CONFIG.COLS}x${CONFIG.ROWS}, soil rows detected ✓`);
}

// 2. the clock: day counts up, time-of-day wraps
{
  const w = new World();
  for (let t = 0; t < CONFIG.DAY_LENGTH * 2.5; t += DT) w.tick(DT);
  console.log(`after 2.5 day-lengths: day=${w.day} timeOfDay=${w.timeOfDay.toFixed(2)}`);
  assert(w.day === 3);
  assert(w.timeOfDay > 0.45 && w.timeOfDay < 0.55);
}

// 3. sunlight: bright at noon, dark at midnight, fades with depth, zero in soil
{
  const w = new World();
  w.time = CONFIG.DAY_LENGTH * 0.5;              // noon
  const noon = w.sun;
  const top = w.lightAt(0, 0);
  const low = w.lightAt(0, CONFIG.ROWS - CONFIG.SOIL_ROWS - 1);
  const soil = w.lightAt(0, CONFIG.ROWS - 1);
  w.time = 0;                                     // midnight
  const midnight = w.sun;
  console.log(`sun: noon=${noon.toFixed(2)} midnight=${midnight.toFixed(2)} | light top=${top.toFixed(2)} deep=${low.toFixed(2)} soil=${soil}`);
  assert(noon > 0.99 && midnight === 0);
  assert(top > low && soil === 0);
}

// 4. THE closed-jar invariant: water is never created or destroyed, only moved
{
  const w = new World();
  const before = w.totalWater();
  for (let t = 0; t < CONFIG.DAY_LENGTH * 3; t += DT) w.tick(DT);   // three full days
  const after = w.totalWater();
  console.log(`water conservation over 3 days: ${before.toFixed(4)} -> ${after.toFixed(4)}`);
  assert(Math.abs(after - before) < 1e-6, "the jar is sealed — water must be conserved");
}

// 5. the water CYCLE actually cycles: cells dry out by dusk, recover overnight
{
  const w = new World();
  const cell = w.cellAt(5, 5);
  for (let t = 0; t < CONFIG.DAY_LENGTH * 0.75; t += DT) w.tick(DT); // run to sunset
  const atDusk = cell.water;
  for (let t = 0; t < CONFIG.DAY_LENGTH * 0.25; t += DT) w.tick(DT); // run through night
  const atDawn = cell.water;
  console.log(`cell water: start=${CONFIG.WATER_START} dusk=${atDusk.toFixed(3)} dawn=${atDawn.toFixed(3)}`);
  assert(atDusk < CONFIG.WATER_START, "day should evaporate water");
  assert(atDawn > atDusk, "night dew should bring it back");
}

// 6. bounds hold over a long run
{
  const w = new World();
  for (let t = 0; t < CONFIG.DAY_LENGTH * 10; t += DT) w.tick(DT);
  for (const c of w.cells) {
    assert(c.water >= 0 && c.water <= CONFIG.WATER_MAX);
    assert(c.nutrients >= 0 && c.nutrients <= CONFIG.NUTRIENT_MAX);
  }
  assert(w.humidity >= 0);
  console.log("bounds after 10 days: all cells within limits ✓");
}

// 7. determinism: same seed, same history, identical state
{
  const a = new World(), b = new World();
  for (let i = 0; i < 1000; i++) { a.tick(DT); b.tick(DT); a.rand(); b.rand(); }
  assert(a.totalWater() === b.totalWater());
  assert(a.rand() === b.rand());
  assert(JSON.stringify(a.cellAt(3, 3)) === JSON.stringify(b.cellAt(3, 3)));
  console.log("determinism: two same-seed worlds stay identical ✓");
}

console.log("\nALL ENGINE TESTS PASSED");

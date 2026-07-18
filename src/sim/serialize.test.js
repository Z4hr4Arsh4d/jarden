// Run with: node src/sim/serialize.test.js
import { World } from "./engine.js";
import { CONFIG, WEATHER } from "./config.js";
import { plantSeed } from "./plants.js";
import { spawnBug, spawnPred } from "./creatures.js";
import { serialize, deserialize } from "./serialize.js";
import assert from "node:assert";

const DT = CONFIG.TICK_SECONDS;
const run = (w, s) => { for (let t = 0; t < s; t += DT) w.tick(DT); };

function busyJar() {
  const w = new World();
  for (let c = 0; c < 16; c += 3) { plantSeed(w, c, "fern"); w.addWater(c, 0.8, true); }
  plantSeed(w, 5, "bloom"); plantSeed(w, 11, "sprout");
  run(w, CONFIG.DAY_LENGTH * 2);
  spawnBug(w, 4); spawnBug(w, 9); spawnPred(w, 7);
  run(w, CONFIG.DAY_LENGTH * 3);
  return w;
}

// 1. a saved jar comes back exactly as it was
{
  const w = busyJar();
  const back = deserialize(serialize(w));
  console.log(`round trip: ${w.entities.length} plants, ${w.bugs.length} bugs, ${w.preds.length} preds, day ${w.day}`);
  assert.strictEqual(back.time, w.time);
  assert.strictEqual(back.entities.length, w.entities.length);
  assert.strictEqual(back.bugs.length, w.bugs.length);
  assert.strictEqual(back.preds.length, w.preds.length);
  assert.strictEqual(back.weather.key, w.weather.key);
  assert.strictEqual(back.status, w.status);
  assert(Math.abs(back.totalWater() - w.totalWater()) < 1e-3, "water must survive the round trip");
  for (const g of Object.keys(w.entities[0].genes)) {
    assert.strictEqual(back.entities[0].genes[g], w.entities[0].genes[g], "genes must survive intact");
  }
  console.log(`  water ${w.totalWater().toFixed(3)} -> ${back.totalWater().toFixed(3)} ✓  genes intact ✓`);
}

// 2. THE subtle one: a restored jar's FUTURE matches too.
// Saving the seed alone isn't enough — the RNG has a position. Without restoring it,
// a loaded jar would replay weather and mutations it had already used.
{
  const w = busyJar();
  const back = deserialize(serialize(w));
  run(w, CONFIG.DAY_LENGTH * 3);
  run(back, CONFIG.DAY_LENGTH * 3);
  console.log(`futures after 3 more days: original ${w.entities.length}p/${w.bugs.length}b weather=${w.weather.key} | restored ${back.entities.length}p/${back.bugs.length}b weather=${back.weather.key}`);
  assert.strictEqual(back.entities.length, w.entities.length, "the restored jar must live the same future");
  assert.strictEqual(back.weather.key, w.weather.key, "restored weather must follow the same script");
  assert(Math.abs(back.totalWater() - w.totalWater()) < 1e-2);
}

// 3. saves are a sane size
{
  const w = busyJar();
  const s = serialize(w);
  console.log(`save size: ${(s.length / 1024).toFixed(1)} KB`);
  assert(s.length < 200_000, "a save should comfortably fit in a database row");
}

// 4. a corrupt or future save is refused, not silently mangled
{
  assert.throws(() => deserialize(JSON.stringify({ v: 999 })), /version/);
  assert.throws(() => deserialize("{ not json"));
  console.log("bad saves are rejected ✓");
}

console.log("\nALL SERIALIZE TESTS PASSED");

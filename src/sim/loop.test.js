// Run with: node src/sim/loop.test.js
import { makeStepper, startLoop } from "./loop.js";
import assert from "node:assert";

// 1. ~60fps frames at a 10Hz tick: one simulated second yields ~10 ticks
{
  const step = makeStepper(0.1);
  let ticks = 0;
  for (let i = 0; i < 60; i++) ticks += step(1 / 60);
  console.log(`1s of 60fps frames -> ${ticks} ticks (expect ~10)`);
  assert(ticks >= 9 && ticks <= 11);
}

// 2. long run stays locked to the tick rate (no drift explosion)
{
  const step = makeStepper(0.1);
  let ticks = 0;
  for (let i = 0; i < 6000; i++) ticks += step(1 / 60);   // 100 simulated seconds
  console.log(`100s -> ${ticks} ticks (expect ~1000)`);
  assert(ticks >= 995 && ticks <= 1005);
}

// 3. a huge stutter is clamped — no death spiral
{
  const step = makeStepper(0.1, 5);
  const ticks = step(10.0);                                // a 10-second freeze
  console.log(`10s stutter -> ${ticks} ticks (clamped to 5)`);
  assert(ticks <= 5);
}

// 4. startLoop drives onTick/onRender through injected raf/now, and stop() stops it
{
  let fakeTime = 0;
  const queue = [];
  const raf = (fn) => queue.push(fn);
  const now = () => fakeTime;
  let ticked = 0, rendered = 0;
  const stop = startLoop({
    tickSeconds: 0.1,
    onTick: () => ticked++,
    onRender: () => rendered++,
    raf, now,
  });
  for (let i = 0; i < 30; i++) {          // 30 frames at 1/60s
    fakeTime += 1000 / 60;
    queue.shift()();
  }
  console.log(`30 fake frames -> ticks=${ticked} renders=${rendered}`);
  assert(rendered === 30 && ticked >= 4 && ticked <= 6);   // 0.5s at 10Hz ≈ 5 ticks
  stop();
  const before = rendered;
  fakeTime += 100; if (queue.length) queue.shift()();
  assert(rendered === before, "stop() should halt the loop");
}

console.log("\nALL LOOP TESTS PASSED");

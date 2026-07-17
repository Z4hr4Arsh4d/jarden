// Fixed-timestep game loop.
//
// The sim advances in constant-size ticks no matter the display's frame rate, so the
// ecosystem runs at the same speed on a 30fps laptop and a 144fps monitor. Rendering
// happens every frame; simulation happens in whole ticks pulled from an accumulator.

/** Pure accumulator: feed it frame durations, it tells you how many ticks to run. */
export function makeStepper(tickSeconds, maxTicksPerFrame = 5) {
  let acc = 0;
  return function step(frameDt) {
    // Clamp so a stutter (tab switch, breakpoint) can't cause a runaway tick burst.
    acc = Math.min(acc + frameDt, tickSeconds * maxTicksPerFrame);
    let ticks = 0;
    while (acc >= tickSeconds) {
      acc -= tickSeconds;
      ticks++;
    }
    return ticks;
  };
}

/** Browser loop: rAF-driven, with injectable raf/now so it can be tested in Node. */
export function startLoop({
  tickSeconds,
  onTick,
  onRender,
  raf = (fn) => requestAnimationFrame(fn),
  now = () => performance.now(),
}) {
  const step = makeStepper(tickSeconds);
  let last = now();
  let running = true;

  function frame() {
    if (!running) return;
    const t = now();
    const dt = (t - last) / 1000;
    last = t;
    const ticks = step(dt);
    for (let i = 0; i < ticks; i++) onTick(tickSeconds);
    if (onRender) onRender(dt);
    raf(frame);
  }
  raf(frame);
  return () => { running = false; };
}

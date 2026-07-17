import React, { useEffect, useRef } from "react";
import { startLoop } from "../sim/loop.js";
import { World } from "../sim/engine.js";
import { CONFIG } from "../sim/config.js";
import { drawJar, CANVAS_W, CANVAS_H } from "./drawJar.js";

export default function JarCanvas() {
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  if (!worldRef.current) worldRef.current = new World(CONFIG);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    const world = worldRef.current;
    let fps = 0;

    const stop = startLoop({
      tickSeconds: CONFIG.TICK_SECONDS,
      onTick: (dt) => world.tick(dt),
      onRender: (dt) => {
        if (dt > 0) fps = 0.9 * fps + 0.1 / dt;
        drawJar(ctx, {
          fps,
          sun: world.sun,
          day: world.day,
          timeOfDay: world.timeOfDay,
          humidity: world.humidity,
        });
      },
    });
    return stop;
  }, []);

  return <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />;
}

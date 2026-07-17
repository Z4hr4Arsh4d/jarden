import React, { useEffect, useRef, useState } from "react";
import { startLoop } from "../sim/loop.js";
import { CONFIG } from "../sim/config.js";
import { plantSeed } from "../sim/plants.js";
import { drawJar, colAt, PIX_W, PIX_H, SCALE } from "./drawJar.js";

export default function JarCanvas({ world, tool, seedType }) {
  const canvasRef = useRef(null);
  const hoverRef = useRef(-1);
  const [cursor, setCursor] = useState("default");

  // Refs mirror the current tool/seed so the render loop can read them without
  // being torn down and restarted every time the selection changes.
  const toolRef = useRef(tool);
  const seedRef = useRef(seedType);
  toolRef.current = tool;
  seedRef.current = seedType;

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const stop = startLoop({
      tickSeconds: CONFIG.TICK_SECONDS,
      onTick: (dt) => world.tick(dt),
      onRender: () =>
        drawJar(ctx, {
          world,
          sun: world.sun,
          hoverCol: hoverRef.current,
          tool: toolRef.current,
        }),
    });
    return stop;
  }, [world]);

  function colFromEvent(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return colAt(e.clientX - r.left, e.clientY - r.top);
  }

  return (
    <canvas
      ref={canvasRef}
      width={PIX_W}
      height={PIX_H}
      style={{
        width: PIX_W * SCALE,
        height: PIX_H * SCALE,
        border: "1px solid var(--line)",
        borderRadius: 6,
        cursor,
      }}
      onMouseMove={(e) => {
        const c = colFromEvent(e);
        hoverRef.current = c;
        setCursor(c >= 0 ? "pointer" : "default");
      }}
      onMouseLeave={() => {
        hoverRef.current = -1;
      }}
      onClick={(e) => {
        const c = colFromEvent(e);
        if (c < 0) return;
        if (toolRef.current === "water") world.addWater(c);
        else plantSeed(world, c, seedRef.current);
      }}
    />
  );
}

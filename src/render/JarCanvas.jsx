import React, { useEffect, useRef, useState } from "react";
import { startLoop } from "../sim/loop.js";
import { CONFIG } from "../sim/config.js";
import { plantSeed } from "../sim/plants.js";
import { spawnBug, spawnPred } from "../sim/creatures.js";
import { spend } from "../sim/score.js";
import { drawJar, colAt, pickAt, PIX_W, PIX_H, SCALE, JAR_X, JAR_Y, CELL } from "./drawJar.js";

export default function JarCanvas({ world, tool, seedType, speed, onHover }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const hoverRef = useRef(-1);
  const subjectRef = useRef(null);
  const ripplesRef = useRef([]);
  const [cursor, setCursor] = useState("default");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const toolRef = useRef(tool);
  const seedRef = useRef(seedType);
  const speedRef = useRef(speed);
  toolRef.current = tool;
  seedRef.current = seedType;
  speedRef.current = speed;

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const stop = startLoop({
      tickSeconds: CONFIG.TICK_SECONDS,
      onTick: (dt) => {
        // Time controls: the sim is a pure fixed-step function, so 4x is simply calling
        // it four times — the physics are identical at every speed. 0 = paused.
        for (let i = 0; i < speedRef.current; i++) world.tick(dt);
      },
      onRender: () => {
        const t = performance.now() / 1000;
        ripplesRef.current = ripplesRef.current.filter((r) => t - r.t < 0.6);
        drawJar(ctx, {
          world,
          sun: world.sun,
          hoverCol: hoverRef.current,
          hoverSubject: subjectRef.current,
          tool: toolRef.current,
          ripples: ripplesRef.current,
          t,
        });
      },
    });
    return stop;
  }, [world]);

  function local(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, r };
  }

  return (
    <div ref={wrapRef} style={{ perspective: 900, perspectiveOrigin: "50% 45%" }}>
      <canvas
        ref={canvasRef}
        width={PIX_W}
        height={PIX_H}
        style={{
          width: PIX_W * SCALE,
          height: PIX_H * SCALE,
          borderRadius: 10,
          cursor,
          // a real 3D lean that follows the cursor — subtle enough to feel like glass,
          // not a gimmick. The pixel grid still lands crisp because we only rotate.
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          transition: "transform .25s cubic-bezier(.2,.8,.3,1)",
          filter: "drop-shadow(0 14px 22px rgba(40,60,80,0.14))",
        }}
        onMouseMove={(e) => {
          const { x, y, r } = local(e);
          const c = colAt(x, y);
          hoverRef.current = c;
          const subj = pickAt(world, x, y);
          subjectRef.current = subj;
          onHover?.(subj);
          setCursor(c >= 0 ? "pointer" : "default");
          setTilt({
            x: ((x / r.width) - 0.5) * 9,          // lean toward the cursor
            y: -((y / r.height) - 0.5) * 6,
          });
        }}
        onMouseLeave={() => {
          hoverRef.current = -1;
          subjectRef.current = null;
          onHover?.(null);
          setTilt({ x: 0, y: 0 });
        }}
        onClick={(e) => {
          const { x, y } = local(e);
          const c = colAt(x, y);
          if (c < 0) return;
          const t = toolRef.current;
          let ok = false;
          if (t === "water") ok = world.addWater(c);
          else if (t === "bug") ok = spend(world, CONFIG.COST_BUG) && spawnBug(world, c);
          else if (t === "pred") ok = spend(world, CONFIG.COST_BUG) && spawnPred(world, c);
          else ok = spend(world, CONFIG.COST_SEED) && plantSeed(world, c, seedRef.current);

          // a ripple where you clicked, so every tool *feels* like it did something
          ripplesRef.current.push({
            x: JAR_X + c * CELL + 2,
            y: y / SCALE,
            t: performance.now() / 1000,
            c: ok
              ? (t === "water" ? "120,190,240" : t === "pred" ? "179,157,219"
                 : t === "bug" ? "255,178,107" : "124,196,106")
              : "200,90,80",                        // red ripple = you couldn't afford it
          });
        }}
      />
    </div>
  );
}

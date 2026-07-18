// M6 — share cards. Draws the jar's story to an offscreen canvas and hands back a PNG.
// Everything is drawn here rather than screenshotted, so the card looks composed instead
// of like a cropped browser window.

import { drawJar, PIX_W, PIX_H } from "./drawJar.js";
import { averageGenes } from "../sim/genetics.js";

export function makeShareCard(world, username) {
  const W = 800, H = 500, S = 3;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // backdrop that echoes the jar's own sky
  const sun = world.sun;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, sun > 0.4 ? "#fdfcf7" : "#eef1f8");
  g.addColorStop(1, "#e7ecf1");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // the jar itself, drawn at 3x on the left
  const jar = document.createElement("canvas");
  jar.width = PIX_W; jar.height = PIX_H;
  const jctx = jar.getContext("2d");
  jctx.imageSmoothingEnabled = false;
  drawJar(jctx, { world, sun, hoverCol: -1, t: performance.now() / 1000 });
  ctx.drawImage(jar, 38, (H - PIX_H * S) / 2, PIX_W * S, PIX_H * S);

  // ---- the story, on the right ----
  const x = 38 + PIX_W * S + 44;
  ctx.fillStyle = "#1d2530";
  ctx.font = "800 34px ui-monospace, Menlo, monospace";
  ctx.fillText("JARDEN", x, 92);

  ctx.fillStyle = "#7c8794";
  ctx.font = "13px ui-monospace, Menlo, monospace";
  ctx.fillText(username ? `${username}'s jar` : "a sealed ecosystem", x, 114);

  // the score, big
  const thriving = world.status === "thriving";
  ctx.fillStyle = thriving ? "#3f9a5a" : "#1d2530";
  ctx.font = "800 76px ui-monospace, Menlo, monospace";
  ctx.fillText(String(world.score), x, 196);
  ctx.font = "13px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "#7c8794";
  ctx.fillText("/100", x + ctx.measureText(String(world.score)).width + 84, 196);

  if (thriving) {
    ctx.fillStyle = "#3f9a5a";
    ctx.font = "700 15px ui-monospace, Menlo, monospace";
    ctx.fillText("✨ THRIVING", x, 224);
  }

  // the facts
  const gen = Math.max(0, ...world.entities.map((p) => p.gen || 0));
  const rows = [
    ["🗓", `day ${world.day}`],
    ["🌱", `${world.entities.length} plants`],
    ["🐛", `${world.bugs.length} bugs`],
    ["🕷️", `${world.preds.length} predators`],
    ["🧬", `${gen} generations`],
  ];
  ctx.font = "14px ui-monospace, Menlo, monospace";
  rows.forEach(([icon, text], i) => {
    const yy = 262 + i * 26;
    ctx.fillStyle = "#5b6b7c";
    ctx.fillText(`${icon}  ${text}`, x, yy);
  });

  // the evolution line — the bit nobody else's screenshot has
  if (world.entities.length) {
    const gs = averageGenes(world.entities);
    ctx.fillStyle = "#9aa5b1";
    ctx.font = "11px ui-monospace, Menlo, monospace";
    ctx.fillText(
      `evolved · grow ${gs.grow.toFixed(2)} · thirst ${gs.thirst.toFixed(2)} · hardy ${gs.hardy.toFixed(2)}`,
      x, H - 46
    );
  }
  ctx.fillStyle = "#b6c0ca";
  ctx.font = "11px ui-monospace, Menlo, monospace";
  ctx.fillText("a jar that lives, evolves and balances itself", x, H - 26);

  return c.toDataURL("image/png");
}

export function downloadCard(world, username) {
  const url = makeShareCard(world, username);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jarden-day${world.day}-${world.score}.png`;
  a.click();
}

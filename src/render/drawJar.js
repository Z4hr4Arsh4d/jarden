// Pixel-art renderer. Everything is drawn on a tiny 96x120 canvas and scaled up with
// image-rendering:pixelated, so every shape lands on a real pixel grid — no blur, no
// half-pixel edges. Pure function of (ctx, view): no state, no React.

import { CONFIG } from "../sim/config.js";

export const CELL = 4;                                   // one sim cell = 4x4 screen pixels
export const JAR_X = 16;                                 // interior left, in pixels
export const JAR_Y = 24;                                 // interior top
export const JAR_W = CONFIG.COLS * CELL;                 // 16 cols -> 64px
export const JAR_H = CONFIG.ROWS * CELL;                 // 18 rows -> 72px
export const PIX_W = JAR_X * 2 + JAR_W;                  // 96
export const PIX_H = JAR_Y + JAR_H + 24;                 // 120
export const SCALE = 5;                                  // CSS upscale factor

const SOIL_Y = JAR_Y + (CONFIG.ROWS - CONFIG.SOIL_ROWS) * CELL;   // soil surface, in pixels

const C = {
  glass: "#9fb6c8", glassLit: "#cfe0ec", rim: "#6d8296", rimLit: "#93a9bc",
  skyDay: [176, 214, 238], skyNight: [38, 48, 74],
  soil: "#6b4b2f", soilDark: "#523823", soilWet: "#3f2b1b", soilTop: "#7d5937",
  sun: "#ffd45e", sunCore: "#fff0b8", moon: "#dfe6f2",
  stem: "#4e8f3f", stemDark: "#37692c", leaf: "#63b04d", leafDark: "#43823a",
  bloom: "#e0679a", bloomCore: "#ffd6e6", seed: "#8a6b3f",
  dead: "#8a7449", deadDark: "#6b5936",
  shadow: "#e8ecef",
};

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
function lerp(a, b, t) { return a + (b - a) * t; }
function skyColor(sun) {
  const n = C.skyNight, d = C.skyDay;
  return `rgb(${Math.round(lerp(n[0], d[0], sun))},${Math.round(lerp(n[1], d[1], sun))},${Math.round(lerp(n[2], d[2], sun))})`;
}

// --- plant sprites: each string is one pixel row, drawn bottom-up from the soil ---
// . = transparent, s = stem, S = stem shadow, l = leaf, L = leaf shadow, f = flower,
// F = flower core, d = dead, D = dead shadow, o = seed
const SPRITES = {
  seed:            ["..o.", "..o."],
  sprout:          [".ls.", "..s.", "..s."],
  sprout_grow:     [".lsl", ".Ls.", "..s.", "..s."],
  sprout_mature:   ["llsl", ".lsl", "lLs.", "..s.", "..s.", "..S."],
  fern:            ["..s.", "..s."],
  fern_grow:       ["l.s.", ".Lsl", "..s.", "..s.", "..s."],
  fern_mature:     ["l.sl", "lLs.", ".lsl", "lLs.", ".lsl", "..s.", "..s.", "..S."],
  bloom:           ["..s.", "..s."],
  bloom_grow:      [".fs.", "..s.", ".ls.", "..s."],
  bloom_mature:    [".fF.", "fFfs", ".ff.", "..s.", ".ls.", "..s.", "l.s.", "..S."],
  wither:          [".dd.", "..d.", "..D."],
  wither_tall:     ["d.d.", ".Dd.", "..d.", "..D."],
};

const PAL = {
  s: C.stem, S: C.stemDark, l: C.leaf, L: C.leafDark,
  f: C.bloom, F: C.bloomCore, d: C.dead, D: C.deadDark, o: C.seed,
};

function spriteFor(p) {
  if (p.stage === "wither") return SPRITES[p.age > 60 ? "wither_tall" : "wither"];
  if (p.stage === "seed") return SPRITES.seed;
  if (p.stage === "sprout") return SPRITES[p.type] || SPRITES.sprout;
  if (p.stage === "grow") return SPRITES[`${p.type}_grow`];
  return SPRITES[`${p.type}_mature`];
}

function drawSprite(ctx, sprite, baseX, baseY) {
  // sprite[0] is the TOP row; the last row sits on the soil line
  const h = sprite.length;
  for (let r = 0; r < h; r++) {
    const row = sprite[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === "." || !PAL[ch]) continue;
      px(ctx, baseX + c, baseY - (h - r), 1, 1, PAL[ch]);
    }
  }
}

export function drawJar(ctx, view = {}) {
  const { world, sun = 1, hoverCol = -1, tool = "seed" } = view;

  // white page
  px(ctx, 0, 0, PIX_W, PIX_H, "#ffffff");

  // --- interior sky (the jar holds its own little day) ---
  px(ctx, JAR_X, JAR_Y, JAR_W, JAR_H, skyColor(sun));

  // sun arcs across the jar's sky by day; a moon hangs at night
  const t = world ? world.timeOfDay : 0.5;
  const arc = (t - 0.25) / 0.5;
  if (sun > 0.02 && arc >= 0 && arc <= 1) {
    const sx = Math.round(JAR_X + 6 + arc * (JAR_W - 14));
    const sy = Math.round(JAR_Y + 22 - Math.sin(Math.PI * arc) * 14);
    px(ctx, sx, sy - 1, 4, 6, C.sun);
    px(ctx, sx - 1, sy, 6, 4, C.sun);
    px(ctx, sx + 1, sy + 1, 2, 2, C.sunCore);
  } else {
    const mx = JAR_X + JAR_W - 14, my = JAR_Y + 8;
    px(ctx, mx, my, 5, 5, C.moon);
    px(ctx, mx + 3, my - 1, 3, 4, skyColor(sun));      // crescent bite
  }

  // --- soil, shaded by how wet each cell is ---
  for (let cy = CONFIG.ROWS - CONFIG.SOIL_ROWS; cy < CONFIG.ROWS; cy++) {
    for (let cx = 0; cx < CONFIG.COLS; cx++) {
      const cell = world ? world.cellAt(cx, cy) : null;
      const wet = cell ? cell.water : 0.5;
      const base = wet > 0.66 ? C.soilWet : wet > 0.33 ? C.soilDark : C.soil;
      px(ctx, JAR_X + cx * CELL, JAR_Y + cy * CELL, CELL, CELL, base);
      // a dithered speckle so the soil reads as pixel art, not a flat block
      if ((cx + cy) % 3 === 0) px(ctx, JAR_X + cx * CELL + 1, JAR_Y + cy * CELL + 1, 1, 1, C.soilDark);
      if ((cx * 2 + cy) % 5 === 0) px(ctx, JAR_X + cx * CELL + 2, JAR_Y + cy * CELL + 2, 1, 1, C.soil);
    }
  }
  px(ctx, JAR_X, SOIL_Y, JAR_W, 1, C.soilTop);          // lit soil surface line

  // --- plants ---
  if (world) {
    for (const p of world.entities) {
      if (p.kind !== "plant") continue;
      drawSprite(ctx, spriteFor(p), JAR_X + p.col * CELL, SOIL_Y);
    }
  }

  // --- hover highlight on the column you're about to act on ---
  if (hoverCol >= 0 && hoverCol < CONFIG.COLS) {
    const hx = JAR_X + hoverCol * CELL;
    ctx.fillStyle = tool === "water" ? "rgba(90,170,230,0.30)" : "rgba(63,154,90,0.30)";
    ctx.fillRect(hx, JAR_Y, CELL, JAR_H);
  }

  // --- glass: drawn last so it sits over the world ---
  px(ctx, JAR_X - 2, JAR_Y, 2, JAR_H, C.glass);              // left wall
  px(ctx, JAR_X + JAR_W, JAR_Y, 2, JAR_H, C.glass);          // right wall
  px(ctx, JAR_X - 2, JAR_Y + JAR_H, JAR_W + 4, 2, C.glass);  // base
  px(ctx, JAR_X - 1, JAR_Y + 2, 1, JAR_H - 8, C.glassLit);   // highlight streak
  // rim
  px(ctx, JAR_X - 4, JAR_Y - 4, JAR_W + 8, 4, C.rim);
  px(ctx, JAR_X - 4, JAR_Y - 4, JAR_W + 8, 1, C.rimLit);
  // condensation on the glass when the air is humid
  if (world && world.humidity > 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.20, world.humidity / 400)})`;
    ctx.fillRect(JAR_X, JAR_Y, JAR_W, JAR_H);
  }
  // a soft shadow under the jar
  px(ctx, JAR_X - 4, JAR_Y + JAR_H + 2, JAR_W + 8, 2, C.shadow);
}

/** Screen (CSS) coords -> sim column, or -1 if outside the jar. */
export function colAt(cssX, cssY) {
  const x = cssX / SCALE, y = cssY / SCALE;
  if (x < JAR_X || x >= JAR_X + JAR_W || y < JAR_Y || y >= JAR_Y + JAR_H) return -1;
  return Math.floor((x - JAR_X) / CELL);
}

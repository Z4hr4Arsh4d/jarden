// Pixel-art renderer — cute edition.
//
// Everything is drawn on a tiny 96x120 canvas and scaled up with image-rendering:pixelated,
// so every shape lands on a real pixel grid. Pure function of (ctx, view): no state, no React.
// The cuteness is deliberate: pastel palette, round shapes, blinking eyes, wobbling plants,
// hearts when bugs breed, sparkles on happy blooms.

import { CONFIG } from "../sim/config.js";

export const CELL = 4;
export const JAR_X = 16;
export const JAR_Y = 24;
export const JAR_W = CONFIG.COLS * CELL;                 // 64
export const JAR_H = CONFIG.ROWS * CELL;                 // 72
export const PIX_W = JAR_X * 2 + JAR_W;                  // 96
export const PIX_H = JAR_Y + JAR_H + 24;                 // 120
export const SCALE = 5;

const SOIL_Y = JAR_Y + (CONFIG.ROWS - CONFIG.SOIL_ROWS) * CELL;

// A soft pastel palette — this is what makes it read as cute rather than clinical.
const C = {
  page: "#fffdfa",
  glass: "#cfe3ef", glassLit: "#ffffff", rim: "#a8c4d6", rimLit: "#e6f2f9",
  skyDay: [186, 230, 245], skyNight: [92, 104, 158],
  soilDry: "#c9a274", soilMid: "#a9825a", soilWet: "#856444", soilTop: "#dcb98c",
  sun: "#ffd97a", sunCore: "#fff6d0", sunRay: "#ffe9a8",
  moon: "#f4f2ff", moonCore: "#ffffff",
  stem: "#7cc46a", stemDark: "#57a04c", leaf: "#a5e08c", leafDark: "#6fbb63",
  bloom: "#ff9ec4", bloomCore: "#fff0f6", bud: "#ffc2dc",
  seed: "#c9a06a",
  dead: "#c4ab7e", deadDark: "#9b8460",
  bug: "#ffb26b", bugDark: "#e08a45", bugEye: "#3c2f2a", bugShine: "#fff3e2",
  mould: "#d9c7f0", mouldLit: "#f2e9ff",
  heart: "#ff8fb1", sparkle: "#fff6a8",
  shadow: "#f0e9e2",
  cheek: "#ffc9d4",
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

// --- plant sprites (bottom row sits on the soil) -------------------------------
// . transparent · s stem · S stem shadow · l leaf · L leaf shadow
// f flower · F flower core · b bud · d dead · D dead shadow · o seed
const SPRITES = {
  seed:          ["..o.", "..o."],
  sprout:        [".ls.", "..s.", "..s."],
  sprout_grow:   [".lsl", ".Ls.", "..s.", "..s."],
  sprout_mature: ["llsl", ".lsl", "lLs.", "..s.", "..s.", "..S."],
  fern:          ["..s.", "..s."],
  fern_grow:     ["l.s.", ".Lsl", "..s.", "..s.", "..s."],
  fern_mature:   ["l.sl", "lLs.", ".lsl", "lLs.", ".lsl", "..s.", "..s.", "..S."],
  bloom:         ["..s.", "..s."],
  bloom_grow:    [".bs.", "..s.", ".ls.", "..s."],
  bloom_mature:  [".fF.", "fFfs", ".ff.", "..s.", ".ls.", "..s.", "l.s.", "..S."],
  wither:        [".dd.", "..d.", "..D."],
  wither_tall:   ["d.d.", ".Dd.", "..d.", "..D."],
};

const PAL = {
  s: C.stem, S: C.stemDark, l: C.leaf, L: C.leafDark,
  f: C.bloom, F: C.bloomCore, b: C.bud, d: C.dead, D: C.deadDark, o: C.seed,
};

function spriteFor(p) {
  if (p.stage === "wither") return SPRITES[p.age > 60 ? "wither_tall" : "wither"];
  if (p.stage === "seed") return SPRITES.seed;
  if (p.stage === "sprout") return SPRITES[p.type] || SPRITES.sprout;
  if (p.stage === "grow") return SPRITES[`${p.type}_grow`];
  return SPRITES[`${p.type}_mature`];
}

function drawSprite(ctx, sprite, baseX, baseY, sway) {
  const h = sprite.length;
  for (let r = 0; r < h; r++) {
    const row = sprite[r];
    // taller pixels lean further — a gentle wobble, like a breeze in the jar
    const lean = Math.round(sway * ((h - r) / h) * 1.4);
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === "." || !PAL[ch]) continue;
      px(ctx, baseX + c + lean, baseY - (h - r), 1, 1, PAL[ch]);
    }
  }
}

function drawBug(ctx, b, t) {
  const x = Math.round(JAR_X + b.col * CELL + 1);
  const bob = Math.round(Math.sin(t * 6 + b.col) * 0.5);   // a happy little bounce
  const y = SOIL_Y - 4 + bob;

  // antennae
  px(ctx, x, y - 2, 1, 1, C.bugDark);
  px(ctx, x + 3, y - 2, 1, 1, C.bugDark);
  // round body
  px(ctx, x, y, 4, 3, C.bug);
  px(ctx, x + 1, y - 1, 2, 1, C.bug);
  px(ctx, x + 1, y + 3, 2, 1, C.bugDark);
  px(ctx, x, y + 2, 4, 1, C.bugDark);
  // shine
  px(ctx, x + 1, y, 1, 1, C.bugShine);
  // eyes — big, and they blink
  const blink = (b.blink % 4) < 0.14;
  if (!blink) {
    px(ctx, x + (b.dir > 0 ? 2 : 1), y + 1, 1, 1, C.bugEye);
    px(ctx, x + (b.dir > 0 ? 3 : 0), y + 1, 1, 1, C.bugEye);
  } else {
    px(ctx, x + 1, y + 1, 3, 1, C.bugDark);
  }
  // munching cue
  if (b.eating && Math.floor(t * 8) % 2 === 0) {
    px(ctx, x + (b.dir > 0 ? 4 : -1), y + 1, 1, 1, C.leaf);
  }
  // hearts when a bug has just bred
  if (b.hearts > 0) {
    const hy = y - 5 - Math.round((1.2 - b.hearts) * 3);
    px(ctx, x + 1, hy, 1, 1, C.heart);
    px(ctx, x + 3, hy, 1, 1, C.heart);
    px(ctx, x + 1, hy + 1, 3, 1, C.heart);
    px(ctx, x + 2, hy + 2, 1, 1, C.heart);
  }
}

export function drawJar(ctx, view = {}) {
  const { world, sun = 1, hoverCol = -1, tool = "seed", t = 0 } = view;

  px(ctx, 0, 0, PIX_W, PIX_H, C.page);
  px(ctx, JAR_X, JAR_Y, JAR_W, JAR_H, skyColor(sun));

  // --- sun / moon, with a friendly little face on the sun ---
  const tod = world ? world.timeOfDay : 0.5;
  const arc = (tod - 0.25) / 0.5;
  if (sun > 0.02 && arc >= 0 && arc <= 1) {
    const sx = Math.round(JAR_X + 7 + arc * (JAR_W - 16));
    const sy = Math.round(JAR_Y + 20 - Math.sin(Math.PI * arc) * 13);
    const pulse = Math.sin(t * 2) > 0 ? 1 : 0;
    px(ctx, sx - 1 - pulse, sy + 2, 1, 1, C.sunRay);      // little rays
    px(ctx, sx + 5 + pulse, sy + 2, 1, 1, C.sunRay);
    px(ctx, sx + 2, sy - 2 - pulse, 1, 1, C.sunRay);
    px(ctx, sx, sy, 5, 5, C.sun);                          // round body
    px(ctx, sx + 1, sy - 1, 3, 7, C.sun);
    px(ctx, sx - 1, sy + 1, 7, 3, C.sun);
    px(ctx, sx + 1, sy + 1, 2, 2, C.sunCore);
    px(ctx, sx + 1, sy + 2, 1, 1, C.bugEye);               // eyes + smile
    px(ctx, sx + 3, sy + 2, 1, 1, C.bugEye);
    px(ctx, sx + 2, sy + 3, 1, 1, C.bugEye);
  } else {
    const mx = JAR_X + JAR_W - 15, my = JAR_Y + 7;
    px(ctx, mx, my, 6, 6, C.moon);
    px(ctx, mx + 1, my + 1, 2, 2, C.moonCore);
    px(ctx, mx + 3, my - 1, 4, 5, skyColor(sun));          // crescent bite
    px(ctx, mx + 1, my + 3, 1, 1, C.bugEye);              // sleepy face
    px(ctx, mx + 3, my + 3, 1, 1, C.bugEye);
  }

  // --- soil, shaded by moisture, with mould fuzz on top ---
  for (let cy = CONFIG.ROWS - CONFIG.SOIL_ROWS; cy < CONFIG.ROWS; cy++) {
    for (let cx = 0; cx < CONFIG.COLS; cx++) {
      const cell = world ? world.cellAt(cx, cy) : null;
      const wet = cell ? cell.water : 0.5;
      const base = wet > 0.66 ? C.soilWet : wet > 0.33 ? C.soilMid : C.soilDry;
      const X = JAR_X + cx * CELL, Y = JAR_Y + cy * CELL;
      px(ctx, X, Y, CELL, CELL, base);
      if ((cx + cy) % 3 === 0) px(ctx, X + 1, Y + 1, 1, 1, C.soilWet);
      if ((cx * 2 + cy) % 5 === 0) px(ctx, X + 2, Y + 2, 1, 1, C.soilDry);

      // mould: soft lilac fuzz that thickens as it feeds
      if (cell && cell.mould > 0.05) {
        const m = cell.mould;
        px(ctx, X + 1, Y + 1, 1, 1, C.mould);
        if (m > 0.3) px(ctx, X + 2, Y, 1, 1, C.mouldLit);
        if (m > 0.55) px(ctx, X, Y + 2, 1, 1, C.mould);
        if (m > 0.8) px(ctx, X + 3, Y + 2, 1, 1, C.mouldLit);
      }
    }
  }
  px(ctx, JAR_X, SOIL_Y, JAR_W, 1, C.soilTop);

  // --- plants ---
  if (world) {
    for (const p of world.entities) {
      if (p.kind !== "plant") continue;
      const sway = p.stage === "wither" ? 0 : Math.sin(t * 1.6 + p.col * 0.7) * 0.9;
      drawSprite(ctx, spriteFor(p), JAR_X + p.col * CELL, SOIL_Y, sway);

      // a happy sparkle over healthy mature plants
      if (p.stage === "mature" && p.health > 0.9 && Math.floor(t * 2 + p.col) % 5 === 0) {
        px(ctx, JAR_X + p.col * CELL + 3, SOIL_Y - 10, 1, 1, C.sparkle);
      }
      // a "nibbled" blush when a bug is chewing on it
      if (p.bitten > 0) {
        px(ctx, JAR_X + p.col * CELL, SOIL_Y - 3, 1, 1, C.cheek);
      }
    }
    // --- bugs ---
    for (const b of world.bugs) drawBug(ctx, b, t);
  }

  // --- hover highlight ---
  if (hoverCol >= 0 && hoverCol < CONFIG.COLS) {
    ctx.fillStyle = tool === "water" ? "rgba(120,190,240,0.30)" : "rgba(124,196,106,0.30)";
    ctx.fillRect(JAR_X + hoverCol * CELL, JAR_Y, CELL, JAR_H);
  }

  // --- glass, drawn last so it sits over the world ---
  px(ctx, JAR_X - 2, JAR_Y, 2, JAR_H, C.glass);
  px(ctx, JAR_X + JAR_W, JAR_Y, 2, JAR_H, C.glass);
  px(ctx, JAR_X - 2, JAR_Y + JAR_H, JAR_W + 4, 2, C.glass);
  px(ctx, JAR_X - 1, JAR_Y + 3, 1, JAR_H - 10, C.glassLit);
  px(ctx, JAR_X - 4, JAR_Y - 4, JAR_W + 8, 4, C.rim);
  px(ctx, JAR_X - 4, JAR_Y - 4, JAR_W + 8, 1, C.rimLit);
  if (world && world.humidity > 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.20, world.humidity / 400)})`;
    ctx.fillRect(JAR_X, JAR_Y, JAR_W, JAR_H);
  }
  px(ctx, JAR_X - 3, JAR_Y + JAR_H + 2, JAR_W + 6, 2, C.shadow);
}

/** Screen (CSS) coords -> sim column, or -1 if outside the jar. */
export function colAt(cssX, cssY) {
  const x = cssX / SCALE, y = cssY / SCALE;
  if (x < JAR_X || x >= JAR_X + JAR_W || y < JAR_Y || y >= JAR_Y + JAR_H) return -1;
  return Math.floor((x - JAR_X) / CELL);
}

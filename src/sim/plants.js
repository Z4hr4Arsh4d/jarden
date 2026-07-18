// Plant lifecycle: seed -> sprout -> grow -> mature -> wither -> recycled.
// Pure logic — no rendering. Plants root in the top soil cell of their column,
// drink its water (transpiring it back into the air, so the sealed jar stays sealed),
// eat its nutrients, need light to grow, spread seeds when mature, and return their
// nutrients to the soil when they die.

import { CONFIG, PLANT_TYPES } from "./config.js";

let nextId = 1;

export function plantSeed(world, col, typeKey) {
  const type = PLANT_TYPES[typeKey];
  if (!type) return false;
  if (col < 0 || col >= world.cols) return false;
  if (world.entities.length >= CONFIG.MAX_PLANTS) return false;
  if (world.entities.some((p) => p.col === col && p.stage !== "wither")) return false;
  world.entities.push({
    id: nextId++, kind: "plant", type: typeKey, col,
    stage: "seed", age: 0, progress: 0, health: 1,
    starve: 0, witherT: 0, seedT: 0, consumedN: 0, bitten: 0,
  });
  return true;
}

/** The soil cell a plant in `col` is rooted in (the surface soil row). */
export function rootCell(world, col) {
  return world.cellAt(col, world.rows - world.cfg.SOIL_ROWS);
}

/** Every soil cell in a column — a plant's roots reach the whole depth, not one cell. */
export function rootColumn(world, col) {
  const cells = [];
  for (let y = world.rows - world.cfg.SOIL_ROWS; y < world.rows; y++) {
    cells.push(world.cellAt(col, y));
  }
  return cells;
}

/** Total water available to a plant's roots. */
function columnWater(cells) {
  let t = 0;
  for (const c of cells) t += c.water;
  return t;
}

/** Take `want` water from the column, deepest-first (surface dries first in the sun). */
function drinkColumn(cells, want) {
  let taken = 0;
  for (let i = cells.length - 1; i >= 0 && taken < want; i--) {
    const take = Math.min(cells[i].water, want - taken);
    cells[i].water -= take;
    taken += take;
  }
  return taken;
}

export function tickPlants(world, dt) {
  const cfg = world.cfg;
  const spawn = [];

  for (const p of world.entities) {
    if (p.kind !== "plant") continue;
    const type = PLANT_TYPES[p.type];
    const soil = rootCell(world, p.col);
    const roots = rootColumn(world, p.col);
    const light = world.lightAt(p.col, world.rows - cfg.SOIL_ROWS - 1);
    p.age += dt;
    if (p.bitten > 0) p.bitten -= dt;

    if (p.stage === "wither") {
      p.witherT += dt;
      continue;
    }

    // old age catches everyone eventually
    if (p.age > type.lifeDays * cfg.DAY_LENGTH) {
      p.stage = "wither";
      continue;
    }

    if (p.stage === "seed") {
      // germination needs moist surface soil, not light
      if (soil.water > 0.08) {
        p.progress += dt / cfg.SEED_TIME;
        if (p.progress >= 1) { p.stage = "sprout"; p.progress = 0; }
      }
      continue;
    }

    // Night = dormancy, not danger. A plant only starves when it WANTS to grow
    // (there's light) but finds no water — daytime drought. Darkness just pauses it.
    const wantsLight = light >= type.lightNeed;
    const hasWater = columnWater(roots) > 0.02;
    if (!wantsLight) {
      // dormant: no growth, no drinking, no starving
    } else if (!hasWater) {
      p.starve += dt;
      if (p.starve > cfg.STARVE_TIME) p.stage = "wither";
    } else {
      p.starve = Math.max(0, p.starve - dt);

      // drink from the whole root column -> the air (transpiration keeps the jar sealed)
      const drink = drinkColumn(roots, type.waterUse * dt);
      world.humidity += drink;

      // eat nutrients (remembered, and returned to the soil on death)
      const eat = Math.min(soil.nutrients, cfg.NUTRIENT_USE * dt);
      soil.nutrients -= eat;
      p.consumedN += eat;

      // heal from bug damage while it's fed and left alone
      if (p.bitten <= 0 && p.health < 1) {
        p.health = Math.min(1, p.health + cfg.PLANT_REGEN * dt);
      }

      if (p.stage !== "mature") {
        p.progress += dt / (type.growDays * cfg.DAY_LENGTH * 0.5);   // half a growDay per stage
        if (p.progress >= 1) {
          p.progress = 0;
          p.stage = p.stage === "sprout" ? "grow" : "mature";
        }
      }
    }

    // mature plants drop seeds nearby
    if (p.stage === "mature") {
      p.seedT += dt;
      if (p.seedT >= cfg.SPREAD_INTERVAL) {
        p.seedT = 0;
        if (world.rand() < type.spreadChance) {
          const off = world.rand() < 0.5 ? -1 : 1;
          const target = p.col + off * (1 + Math.floor(world.rand() * 2));
          spawn.push([target, p.type]);
        }
      }
    }
  }

  // withered plants get recycled: nutrients go home to the soil
  for (let i = world.entities.length - 1; i >= 0; i--) {
    const p = world.entities[i];
    if (p.kind === "plant" && p.stage === "wither" && p.witherT >= cfg.WITHER_TIME) {
      // the body doesn't become food instantly — it becomes detritus for the
      // decomposers to work on (M3). Mould turns this back into nutrients.
      const soil = rootCell(world, p.col);
      soil.detritus = Math.min(cfg.DETRITUS_MAX, soil.detritus + p.consumedN + 0.25);
      world.entities.splice(i, 1);
    }
  }

  for (const [col, type] of spawn) plantSeed(world, col, type);
}

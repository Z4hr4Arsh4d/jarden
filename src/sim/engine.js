// The heart of Jarden: a pure-JavaScript world. No React, no DOM, no Canvas —
// just state and a tick() that advances it. Everything here runs (and is tested) in Node.

import { CONFIG } from "./config.js";

/** Small, fast, seedable RNG (mulberry32) so runs are reproducible. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class World {
  constructor(cfg = CONFIG) {
    this.cfg = cfg;
    this.cols = cfg.COLS;
    this.rows = cfg.ROWS;
    this.time = 0;                       // sim seconds since the jar began
    this.humidity = 0;                   // water currently in the air (evaporated)
    this._rand = mulberry32(cfg.SEED);
    this.entities = [];                  // plants (M2) and creatures (M3) live here

    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.cells.push({
          x, y,
          water: cfg.WATER_START,
          nutrients: cfg.NUTRIENT_START,
        });
      }
    }
  }

  // ---- clock ----
  get day() { return Math.floor(this.time / this.cfg.DAY_LENGTH) + 1; }
  get timeOfDay() { return (this.time % this.cfg.DAY_LENGTH) / this.cfg.DAY_LENGTH; }

  /** Sunlight 0..1: rises at 0.25, peaks at 0.5 (noon), sets at 0.75, dark otherwise. */
  get sun() {
    const t = this.timeOfDay;
    return Math.max(0, Math.sin(Math.PI * (t - 0.25) / 0.5));
  }

  // ---- grid ----
  cellAt(x, y) { return this.cells[y * this.cols + x]; }
  isSoil(y) { return y >= this.rows - this.cfg.SOIL_ROWS; }

  /** Light reaching a cell: full sun up top, fading with depth, none inside the soil. */
  lightAt(x, y) {
    if (this.isSoil(y)) return 0;
    const airRows = this.rows - this.cfg.SOIL_ROWS;
    const depth = y / Math.max(1, airRows - 1);
    return this.sun * (1 - 0.35 * depth);
  }

  rand() { return this._rand(); }

  /** Total water in the system — cells + air. In a sealed jar this is conserved. */
  totalWater() {
    let t = this.humidity;
    for (const c of this.cells) t += c.water;
    return t;
  }

  /** Advance the world by dt sim-seconds. */
  tick(dt) {
    this.time += dt;
    const cfg = this.cfg;
    const sun = this.sun;

    // Daytime: sunlight evaporates water out of the cells into the air.
    let evaporated = 0;
    for (const cell of this.cells) {
      const e = Math.min(cell.water, cfg.EVAP_RATE * sun * dt);
      cell.water -= e;
      evaporated += e;

      // Nutrients drift gently back toward the baseline (real recycling comes at M3).
      cell.nutrients += (cfg.NUTRIENT_START - cell.nutrients) * cfg.NUTRIENT_RELAX * dt;
      if (cell.nutrients < 0) cell.nutrients = 0;
      if (cell.nutrients > cfg.NUTRIENT_MAX) cell.nutrients = cfg.NUTRIENT_MAX;
    }
    this.humidity += evaporated;

    // Night: the air is cool, humidity condenses back onto every surface as dew.
    if (sun < 0.05 && this.humidity > 0) {
      const per = Math.min(
        cfg.DEW_RATE * dt,
        this.humidity / this.cells.length
      );
      let condensed = 0;
      for (const cell of this.cells) {
        const room = cfg.WATER_MAX - cell.water;
        const add = Math.min(per, room);
        cell.water += add;
        condensed += add;
      }
      this.humidity -= condensed;         // only what actually landed leaves the air
    }
  }
}

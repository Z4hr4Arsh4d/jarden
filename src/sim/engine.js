// The heart of Jarden: a pure-JavaScript world. No React, no DOM, no Canvas —
// just state and a tick() that advances it. Everything here runs (and is tested) in Node.

import { CONFIG } from "./config.js";
import { tickPlants } from "./plants.js";

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
    this.lampT = 0;                      // sunlamp seconds remaining
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
  get baseSun() {
    const t = this.timeOfDay;
    return Math.max(0, Math.sin(Math.PI * (t - 0.25) / 0.5));
  }

  /** Effective light: the sun, plus the sunlamp if it's on (works at night too). */
  get sun() {
    const boost = this.lampT > 0 ? this.cfg.LAMP_ADD : 0;
    return Math.min(1, this.baseSun + boost);
  }

  // ---- player tools: the hand reaching into the jar (external inputs) ----
  sunlamp() { this.lampT = this.cfg.LAMP_SECONDS; }

  /** Pour water onto a column's surface soil (spills a little onto the neighbours). */
  addWater(col, amount = this.cfg.WATER_POUR) {
    const y = this.rows - this.cfg.SOIL_ROWS;
    for (const [c, share] of [[col, 0.6], [col - 1, 0.2], [col + 1, 0.2]]) {
      if (c < 0 || c >= this.cols) continue;
      const cell = this.cellAt(c, y);
      cell.water = Math.min(this.cfg.WATER_MAX, cell.water + amount * share);
    }
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

  /** How exposed a cell is to evaporation: 1 in open air, falling to ~0 in deep soil. */
  exposureAt(y) {
    if (!this.isSoil(y)) return 1;
    const depth = y - (this.rows - this.cfg.SOIL_ROWS);       // 0 = surface soil
    return Math.max(0, 0.5 - 0.16 * depth);
  }

  /** Soil moisture spreads: wet cells feed dry neighbours. Moves water, never creates it. */
  diffuseSoil(dt) {
    const y0 = this.rows - this.cfg.SOIL_ROWS;
    const k = Math.min(0.25, this.cfg.SOIL_DIFFUSE * dt);      // clamped: stays stable
    const delta = new Float64Array(this.cells.length);
    for (let y = y0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = y * this.cols + x;
        const here = this.cells[i].water;
        for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {     // each pair once
          if (nx >= this.cols || ny >= this.rows) continue;
          const j = ny * this.cols + nx;
          const flow = (here - this.cells[j].water) * k * 0.5;
          delta[i] -= flow;
          delta[j] += flow;
        }
      }
    }
    for (let i = 0; i < this.cells.length; i++) {
      if (delta[i] !== 0) this.cells[i].water += delta[i];
    }
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
    if (this.lampT > 0) this.lampT = Math.max(0, this.lampT - dt);
    const cfg = this.cfg;
    const sun = this.sun;

    // Daytime: sunlight evaporates water into the air — but only from exposed surfaces.
    // Deep soil is sheltered: it holds its moisture, which is what keeps roots alive.
    let evaporated = 0;
    for (const cell of this.cells) {
      const e = Math.min(cell.water, cfg.EVAP_RATE * sun * this.exposureAt(cell.y) * dt);
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

    // soil moisture evens out, feeding dry roots from wetter neighbours
    this.diffuseSoil(dt);

    // life takes its turn
    tickPlants(this, dt);
  }
}

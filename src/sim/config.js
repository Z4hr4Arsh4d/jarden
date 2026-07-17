// Every tunable in one place. Balancing Jarden = editing these numbers.

export const CONFIG = {
  // grid (16 columns -> each column is a clean 4px-wide pixel slot in the renderer)
  COLS: 16,
  ROWS: 18,
  SOIL_ROWS: 4,              // bottom rows are soil (no light, holds water)

  // time
  TICK_SECONDS: 0.1,         // 10 sim ticks per real second
  DAY_LENGTH: 60,            // one full day-night cycle, in sim seconds

  // water cycle (the jar is a CLOSED system: water only moves, never vanishes)
  WATER_START: 0.5,
  WATER_MAX: 1.0,
  EVAP_RATE: 0.02,           // per cell per second, scaled by sunlight AND exposure
  DEW_RATE: 0.015,           // per cell per second, humidity condensing back at night
  SOIL_DIFFUSE: 0.35,        // how fast soil moisture spreads between neighbouring cells

  // nutrients
  NUTRIENT_START: 0.6,
  NUTRIENT_MAX: 1.0,
  NUTRIENT_RELAX: 0.01,

  // tools (the player reaching into the jar)
  WATER_POUR: 0.35,          // how much a click of the watering can adds
  LAMP_SECONDS: 10,          // how long the sunlamp stays on
  LAMP_ADD: 0.55,            // extra light the lamp adds (works at night too)

  // plants
  MAX_PLANTS: 16,            // one per column at most
  SEED_TIME: 2.0,            // seconds before a watered seed sprouts
  STARVE_TIME: 15.0,          // seconds without light/water before a plant withers
  WITHER_TIME: 5.0,          // how long a withered plant stands before it's recycled
  NUTRIENT_USE: 0.010,       // nutrients consumed per second while growing
  SPREAD_INTERVAL: 6.0,      // how often a mature plant tries to drop a seed

  SEED: 20260718,
};

// Three seed types with genuinely different personalities.
export const PLANT_TYPES = {
  sprout: { key: "sprout", label: "Sprout", growDays: 0.5, lifeDays: 2.0,
            waterUse: 0.030, lightNeed: 0.15, spreadChance: 0.55 },
  fern:   { key: "fern",   label: "Fern",   growDays: 1.1, lifeDays: 5.0,
            waterUse: 0.020, lightNeed: 0.08, spreadChance: 0.25 },
  bloom:  { key: "bloom",  label: "Bloom",  growDays: 0.9, lifeDays: 3.0,
            waterUse: 0.040, lightNeed: 0.30, spreadChance: 0.65 },
};

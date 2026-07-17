// Every tunable in one place. Balancing Jarden = editing these numbers.

export const CONFIG = {
  // grid
  COLS: 24,
  ROWS: 18,
  SOIL_ROWS: 4,              // bottom rows are soil (no light, holds water)

  // time
  TICK_SECONDS: 0.1,         // 10 sim ticks per real second
  DAY_LENGTH: 60,            // one full day-night cycle, in sim seconds

  // water cycle (the jar is a CLOSED system: water only moves, never vanishes)
  WATER_START: 0.5,
  WATER_MAX: 1.0,
  EVAP_RATE: 0.02,           // per cell per second, scaled by sunlight
  DEW_RATE: 0.015,           // per cell per second, humidity condensing back at night

  // nutrients (decomposition arrives at M3; for now they relax toward a baseline)
  NUTRIENT_START: 0.6,
  NUTRIENT_MAX: 1.0,
  NUTRIENT_RELAX: 0.01,      // per second, drift back toward the baseline

  SEED: 20260718,
};

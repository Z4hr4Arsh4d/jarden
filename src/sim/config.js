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

  // decay — dead things become detritus, which mould turns back into nutrients
  DETRITUS_MAX: 2.0,
  DECAY_SLOW: 0.004,         // detritus -> nutrients on its own, very slowly (no mould)
  MOULD_EAT: 0.030,          // detritus -> nutrients per second, per unit of mould
  MOULD_GROW: 0.20,          // how fast mould thickens where there's food
  MOULD_SPREAD: 0.06,        // chance/sec a mouldy cell seeds a damp neighbour
  MOULD_DECAY: 0.06,         // mould starves without detritus
  MOULD_DAMP: 0.25,          // soil this wet or wetter can host mould

  // bugs
  MAX_BUGS: 10,
  BUG_SPEED: 1.4,            // columns per second
  BUG_METABOLISM: 0.022,     // energy burned per second
  BUG_BITE: 0.045,           // plant health eaten per second (~22s to fell a healthy plant)
  BUG_FEED: 0.100,           // energy gained per second while eating (net +0.078)
  BUG_LEAVE_HEALTH: 0.30,    // bugs graze and move on — they never eat a plant to death
  BUG_LIFE: 240,             // seconds
  BUG_MATURITY: 25,          // seconds before it can breed
  BUG_BREED_ENERGY: 0.85,    // energy needed to breed
  BUG_BREED_COOLDOWN: 40,    // seconds between broods (stops instant population booms)
  BUG_BREED_COST: 0.45,      // energy spent breeding
  BUG_DETRITUS: 0.35,        // dead bug -> this much detritus

  // plants
  PLANT_REGEN: 0.045,        // health recovered per second when fed and unbitten
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

// Weather — spells that bend the jar's physics.
//
// Important: nothing here creates or destroys water. A heat wave makes evaporation fiercer
// (soil -> air); a cold snap makes condensation heavy (air -> soil); overcast dims the light.
// The jar stays sealed — weather just decides how violently the water moves inside it.

import { CONFIG, WEATHER } from "./config.js";

const SPELLS = Object.values(WEATHER);
const TOTAL_WEIGHT = SPELLS.reduce((t, s) => t + s.weight, 0);

function pick(rand) {
  let r = rand() * TOTAL_WEIGHT;
  for (const s of SPELLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return WEATHER.clear;
}

export function initWeather(world) {
  world.weather = WEATHER.clear;
  world.weatherT = CONFIG.WEATHER_MIN;
  world.weatherWas = WEATHER.clear;
}

export function tickWeather(world, dt) {
  world.weatherT -= dt;
  if (world.weatherT > 0) return;

  // don't repeat the same spell twice in a row — the jar should feel like it's changing
  let next = pick(world.rand);
  if (next.key === world.weather.key) next = pick(world.rand);
  world.weatherWas = world.weather;
  world.weather = next;
  world.weatherT = CONFIG.WEATHER_MIN +
    world.rand() * (CONFIG.WEATHER_MAX - CONFIG.WEATHER_MIN);
}

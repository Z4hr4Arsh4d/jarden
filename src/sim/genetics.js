// Genetics — the reason two jars never play out the same way.
//
// Every plant carries genes that are *multipliers* on its species baseline. Seeds inherit
// their parent's genes with a little drift. Nothing here decides who wins: plants whose
// genes suit the jar grow, mature and spread, and plants whose genes don't simply never
// reproduce. Selection is emergent — it falls out of the rules that were already there.

import { CONFIG } from "./config.js";

export const GENE_KEYS = ["grow", "thirst", "shade", "hardy"];

export const GENE_INFO = {
  grow:   { label: "Growth",    hint: "how fast it matures" },
  thirst: { label: "Thirst",    hint: "how much water it drinks" },
  shade:  { label: "Shade",     hint: "lower = happy in the dark" },
  hardy:  { label: "Hardiness", hint: "resists drought and bugs" },
};

const clamp = (v) => Math.max(CONFIG.GENE_MIN, Math.min(CONFIG.GENE_MAX, v));

/** A fresh genome, scattered around the species baseline.
 *
 * The spread matters: a founder population with near-identical genes has no variation
 * for selection to work on, so a stressed jar simply dies out instead of adapting.
 * Real seed stock varies, and so does this.
 */
export function baseGenes(rand, spread = CONFIG.FOUNDER_SPREAD) {
  const g = {};
  for (const k of GENE_KEYS) g[k] = clamp(1 + (rand() * 2 - 1) * spread);
  return g;
}

/** A child's genome: the parent's, nudged. This is the whole engine of evolution. */
export function inherit(parentGenes, rand) {
  const g = {};
  for (const k of GENE_KEYS) {
    const drift = (rand() * 2 - 1) * CONFIG.MUTATION;
    g[k] = clamp(parentGenes[k] * (1 + drift));
  }
  return g;
}

/** Average a genome trait across a population — used by the UI and the tests. */
export function averageGenes(plants) {
  const out = {};
  for (const k of GENE_KEYS) out[k] = 0;
  const live = plants.filter((p) => p.kind === "plant" && p.genes);
  if (!live.length) return out;
  for (const p of live) for (const k of GENE_KEYS) out[k] += p.genes[k];
  for (const k of GENE_KEYS) out[k] /= live.length;
  return out;
}

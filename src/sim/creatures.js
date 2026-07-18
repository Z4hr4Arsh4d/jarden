// M3 — the food web.
//
//   plants grow  ->  bugs eat plants  ->  bugs die  ->  mould eats the dead
//        ^                                                     |
//        +--------------- nutrients feed the soil <------------+
//
// Nothing here touches water, so the sealed jar's water budget stays exact.
// Dead things become `detritus` in the soil; mould converts detritus into nutrients
// (slowly on its own, much faster where mould takes hold).

import { CONFIG } from "./config.js";
import { rootCell } from "./plants.js";

let nextId = 10000;

/** Drop dead matter into the soil under a column. */
export function addDetritus(world, col, amount) {
  const c = rootCell(world, Math.max(0, Math.min(world.cols - 1, Math.round(col))));
  c.detritus = Math.min(CONFIG.DETRITUS_MAX, c.detritus + amount);
}

export function spawnBug(world, col, energy = 0.6) {
  if (world.bugs.length >= CONFIG.MAX_BUGS) return false;
  world.bugs.push({
    id: nextId++, kind: "bug",
    col: Math.max(0, Math.min(world.cols - 1, col)),
    energy, age: 0, dir: world.rand() < 0.5 ? -1 : 1,
    eating: false, fleeing: false, blink: world.rand() * 4, breedT: 0, hearts: 0,
  });
  return true;
}

/** The plant a bug wants: healthy and close.
 *
 * Bugs graze — they leave a plant once it's chewed down to BUG_LEAVE_HEALTH and go find
 * a better one. Real herbivores do this, and it's also what keeps the jar alive: eating
 * every plant to death collapses the whole web and nothing ever grows back.
 */
function nearestFood(world, col) {
  let best = null, bestScore = -Infinity;
  for (const p of world.entities) {
    if (p.kind !== "plant" || p.stage === "seed" || p.stage === "wither") continue;
    if (p.health < CONFIG.BUG_LEAVE_HEALTH) continue;      // spare it, let it recover
    const score = p.health * 2 - Math.abs(p.col - col) * 0.15;
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best;
}

function tickBugs(world, dt) {
  const cfg = world.cfg;
  const born = [];

  for (const b of world.bugs) {
    b.age += dt;
    b.blink += dt;
    b.energy -= cfg.BUG_METABOLISM * dt;
    b.eating = false;

    // a predator nearby overrides everything: run.
    // Only a *hunting* predator is a threat. A resting one gives bugs the window they
    // need to eat and breed — without that window predation always outruns birth.
    let threat = null, threatD = Infinity;
    for (const p of world.preds) {
      if (!p.hunting) continue;
      const d = Math.abs(p.col - b.col);
      if (d < threatD) { threatD = d; threat = p; }
    }
    if (threat && threatD < cfg.BUG_FLEE_RANGE) {
      b.fleeing = true;
      let away = Math.sign(b.col - threat.col) || (world.rand() < 0.5 ? -1 : 1);
      // Cornered against the glass? Dodge PAST the predator instead of squashing into
      // the wall. Without this, every chase ends at a wall and bugs go extinct on day 1.
      const cornered = (away < 0 && b.col < 1.2) || (away > 0 && b.col > world.cols - 2.2);
      if (cornered) away = -away;
      b.dir = away;
      b.col = Math.max(0, Math.min(world.cols - 1, b.col + away * cfg.BUG_FLEE_SPEED * dt));
      continue;                                       // no eating, no breeding while running
    }
    b.fleeing = false;

    const food = nearestFood(world, b.col);
    if (food) {
      const gap = food.col - b.col;
      if (Math.abs(gap) > 0.35) {
        b.dir = Math.sign(gap);
        b.col += b.dir * cfg.BUG_SPEED * dt;          // walk toward dinner
      } else {
        b.eating = true;
        food.health = Math.max(0, food.health - cfg.BUG_BITE * dt);   // predation pressure
        food.bitten = 0.6;
        b.energy = Math.min(1, b.energy + cfg.BUG_FEED * dt);
      }
    } else {
      b.col += b.dir * cfg.BUG_SPEED * 0.4 * dt;      // no food: wander
      if (b.col < 0.5 || b.col > world.cols - 1.5) b.dir *= -1;
    }
    b.col = Math.max(0, Math.min(world.cols - 1, b.col));

    // breeding: well-fed adults make more bugs, but not every tick
    if (b.breedT > 0) b.breedT -= dt;
    if (b.age > cfg.BUG_MATURITY && b.energy >= cfg.BUG_BREED_ENERGY && b.breedT <= 0 &&
        world.bugs.length + born.length < cfg.MAX_BUGS) {
      b.energy -= cfg.BUG_BREED_COST;
      b.breedT = cfg.BUG_BREED_COOLDOWN;
      born.push(b.col + (world.rand() < 0.5 ? -1 : 1));
      b.hearts = 1.2;                                  // a cue for the renderer
    }
    if (b.hearts > 0) b.hearts -= dt;
  }

  // death: starvation or old age, and the body feeds the soil
  for (let i = world.bugs.length - 1; i >= 0; i--) {
    const b = world.bugs[i];
    if (b.energy <= 0 || b.age > cfg.BUG_LIFE) {
      addDetritus(world, b.col, cfg.BUG_DETRITUS);
      world.bugs.splice(i, 1);
    }
  }
  for (const col of born) spawnBug(world, col, 0.5);
}

function tickMould(world, dt) {
  const cfg = world.cfg;
  const y0 = world.rows - cfg.SOIL_ROWS;
  const spread = [];

  for (let y = y0; y < world.rows; y++) {
    for (let x = 0; x < world.cols; x++) {
      const c = world.cellAt(x, y);

      // detritus rots away on its own, very slowly, even with no mould present
      if (c.detritus > 0) {
        const slow = Math.min(c.detritus, cfg.DECAY_SLOW * dt);
        c.detritus -= slow;
        c.nutrients = Math.min(cfg.NUTRIENT_MAX, c.nutrients + slow);
      }

      const damp = c.water >= cfg.MOULD_DAMP;
      if (c.mould > 0 && c.detritus > 0 && damp) {
        // mould feasts: detritus -> nutrients, far faster than rotting alone
        const eaten = Math.min(c.detritus, cfg.MOULD_EAT * c.mould * dt);
        c.detritus -= eaten;
        c.nutrients = Math.min(cfg.NUTRIENT_MAX, c.nutrients + eaten);
        c.mould = Math.min(1, c.mould + cfg.MOULD_GROW * dt);

        if (world.rand() < cfg.MOULD_SPREAD * dt * 60 * 0.016) {
          for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
            if (nx < 0 || nx >= world.cols || ny < y0 || ny >= world.rows) continue;
            const n = world.cellAt(nx, ny);
            if (n.detritus > 0 && n.water >= cfg.MOULD_DAMP) spread.push(n);
          }
        }
      } else if (c.mould > 0) {
        c.mould = Math.max(0, c.mould - cfg.MOULD_DECAY * dt);   // no food: starve back
      } else if (c.detritus > 0.05 && damp && world.rand() < 0.02 * dt * 10) {
        c.mould = 0.15;                                          // spores find damp dead matter
      }
    }
  }
  for (const n of spread) n.mould = Math.max(n.mould, 0.2);
}

// ---------------------------------------------------------------- predators (M4)
// The third trophic level. Unlike bugs, predators DO kill what they eat — that's the
// point of them: they're the pressure that stops a bug boom from stripping the jar.

export function spawnPred(world, col, energy = 0.7) {
  if (world.preds.length >= CONFIG.MAX_PREDS) return false;
  world.preds.push({
    id: nextId++, kind: "pred",
    col: Math.max(0, Math.min(world.cols - 1, col)),
    energy, age: 0, dir: world.rand() < 0.5 ? -1 : 1,
    hunting: false, blink: world.rand() * 4, breedT: 0, hearts: 0, pounce: 0,
  });
  return true;
}

function nearestBug(world, col) {
  let best = null, bestD = Infinity;
  for (const b of world.bugs) {
    const d = Math.abs(b.col - col);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

function tickPreds(world, dt) {
  const cfg = world.cfg;
  const born = [];

  for (const p of world.preds) {
    p.age += dt;
    p.blink += dt;
    p.energy -= cfg.PRED_METABOLISM * dt;
    p.hunting = false;
    if (p.pounce > 0) p.pounce -= dt;
    if (p.hearts > 0) p.hearts -= dt;
    if (p.breedT > 0) p.breedT -= dt;

    // A full predator doesn't hunt. Without this they eat every last bug and then
    // starve — the same collapse the grazing rule fixed one level down.
    const hungry = p.energy < cfg.PRED_HUNT_BELOW;
    const prey = hungry ? nearestBug(world, p.col) : null;
    if (prey) {
      p.hunting = true;
      const gap = prey.col - p.col;
      if (Math.abs(gap) > cfg.PRED_CATCH) {
        p.dir = Math.sign(gap);
        p.col += p.dir * cfg.PRED_SPEED * dt;
      } else if (world.rand() < cfg.PRED_CATCH_RATE * dt) {
        // caught it. Predators kill — this is the pressure that balances the jar.
        // The catch is a roll, not a certainty: guaranteed kills wipe the bugs out.
        const i = world.bugs.indexOf(prey);
        if (i >= 0) {
          world.bugs.splice(i, 1);
          addDetritus(world, prey.col, cfg.BUG_DETRITUS * 0.5);   // leftovers rot
          p.energy = Math.min(1, p.energy + cfg.PRED_FEED);
          p.pounce = 0.4;
        }
      }
    } else {
      p.col += p.dir * cfg.PRED_SPEED * 0.3 * dt;
      if (p.col < 0.5 || p.col > world.cols - 1.5) p.dir *= -1;
    }
    p.col = Math.max(0, Math.min(world.cols - 1, p.col));

    if (p.age > cfg.PRED_MATURITY && p.energy >= cfg.PRED_BREED_ENERGY && p.breedT <= 0 &&
        world.bugs.length >= cfg.PRED_PREY_TO_BREED &&        // don't breed onto a dwindling food supply
        world.preds.length + born.length < cfg.MAX_PREDS) {
      p.energy -= cfg.PRED_BREED_COST;
      p.breedT = cfg.PRED_BREED_COOLDOWN;
      p.hearts = 1.2;
      born.push(p.col + (world.rand() < 0.5 ? -1 : 1));
    }
  }

  for (let i = world.preds.length - 1; i >= 0; i--) {
    const p = world.preds[i];
    if (p.energy <= 0 || p.age > cfg.PRED_LIFE) {
      addDetritus(world, p.col, cfg.PRED_DETRITUS);
      world.preds.splice(i, 1);
    }
  }
  for (const col of born) spawnPred(world, col, 0.5);
}

export function tickCreatures(world, dt) {
  tickBugs(world, dt);
  tickPreds(world, dt);
  tickMould(world, dt);
}

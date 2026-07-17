# Jarden 🫙🌱

A living **ecosystem in a jar** you tend in real time — plants sprout and spread, bugs eat and
breed, mold recycles, day turns to night. Built with React + a pure-JavaScript simulation engine
rendered on Canvas, with a Node/SQL backend for accounts, persistence, and a leaderboard.

> **Status: M2** — plants live here now. Seeds germinate in moist soil, grow toward the light,
> drink from their root column (transpiring water back into the sealed jar), spread seeds when
> mature, and return their nutrients to the soil when they die. Rendered as pixel art, with a
> toolbar for planting, watering, and a sunlamp.

## Run

```bash
npm install
npm run dev        # opens the dev server, usually http://localhost:5173
```

## Test (no browser needed)

```bash
npm test
```

The simulation side of Jarden is deliberately **pure JavaScript** (no React, no DOM) so the
ecosystem logic can be tested headlessly in Node — the loop's fixed-timestep accumulator already
is. The renderer just draws whatever state the sim hands it.

## Roadmap

- [x] **M0** canvas + fixed-timestep loop (sim speed independent of frame rate)
- [x] **M1** sim engine core — resource cells, day/night clock, sealed water cycle, seeded RNG
- [x] **M2** plants — seed → grow → spread → wither, pixel-art renderer, tending toolbar
- [ ] **M3** creatures & decay — bugs, mold, a real food web
- [ ] **M4** tending — water, light, seeds (MVP)
- [ ] **M5** accounts & persistence (Node/Express + SQL)
- [ ] **M6** leaderboard & sharing
- [ ] **M7** polish & deploy

# Jarden 🫙🌱

A living **ecosystem in a jar** you tend in real time — plants sprout and spread, bugs eat and
breed, mold recycles, day turns to night. Built with React + a pure-JavaScript simulation engine
rendered on Canvas, with a Node/SQL backend for accounts, persistence, and a leaderboard.

> **Status: M1** — the world breathes: a pure-JS sim engine with a day/night cycle and a
> closed-system water cycle (evaporation by day, dew by night — total water is conserved
> exactly, and the tests prove it). The sky and jar respond to the sun in real time.

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
- [ ] **M2** plants — seed → grow → spread → wither
- [ ] **M3** creatures & decay — bugs, mold, a real food web
- [ ] **M4** tending — water, light, seeds (MVP)
- [ ] **M5** accounts & persistence (Node/Express + SQL)
- [ ] **M6** leaderboard & sharing
- [ ] **M7** polish & deploy

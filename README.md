# Jarden 🫙🌱

A living **ecosystem in a jar** you tend in real time — plants sprout and spread, bugs eat and
breed, mold recycles, day turns to night. Built with React + a pure-JavaScript simulation engine
rendered on Canvas, with a Node/SQL backend for accounts, persistence, and a leaderboard.

> **Status: M4 — the MVP.** A tiny ecosystem that lives, evolves and balances itself. Plants
> carry **genes** that mutate across generations, so the jar **selects** for what survives —
> a drought jar breeds fast-growing, hardy plants all on its own. **Weather** bends the
> physics, **predators** hold the bugs in check, and tending costs **energy**, so you can't
> brute-force it. Score the jar on life, variety, balance and decay; keep it high and it
> reaches **thriving**. Comes with a hands-on guide, a hover inspector, and a jar rendered
> as real glass.

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
- [x] **M3** creatures & decay — grazing bugs, mould decomposers, a self-balancing food web
- [x] **M4** the game — genetics & selection, weather, predators, tending energy, scoring, time controls **(MVP)**
- [x] **UX pass** — a guide that teaches by doing, hover inspector, progressive disclosure, 3D glass
- [ ] **M5** accounts & persistence (Node/Express + SQL)
- [ ] **M6** leaderboard & sharing
- [ ] **M7** polish & deploy

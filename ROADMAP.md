# Jarden — Build Roadmap

A living **ecosystem in a jar** you tend in real time. Plants sprout, grow, and spread; bugs crawl,
eat, and breed; mold creeps in and breaks things down; day turns to night. You nudge it — light, water,
seeds — and watch a little world find its balance. It **saves across sessions** (accounts) and ranks
your jars on a **leaderboard**.

Stack: **React** (UI) · a plain-JS **simulation engine** (the heart) · **Canvas** pixel rendering ·
**Node/Express + SQL** backend (accounts, persistence, leaderboard).

The heart is the simulation. Build it **first, on its own, testable** — before React, before any backend.

---

## Architecture (the mental model)

- **Sim engine** (`engine.js`, `plants.js`, `creatures.js`) — pure JavaScript, no React, no DOM. It holds
  the world state and advances it one **tick** at a time. This is the part that must be correct and fun.
- **Renderer** — a Canvas that *draws* the current world state each frame (pixel art). Reads the sim; never owns logic.
- **React** — the shell around it: the jar view, the tend-tools (water/light/seed), menus, stats, auth screens.
- **Backend** — Node/Express + a SQL database: user accounts, saving/loading a jar, and the leaderboard.

Keeping the engine separate from React means you can **unit-test the ecosystem** and reuse it anywhere.

---

## Scope discipline

**MVP = M0–M4:** a living, interactive jar you can play with. That alone is a lovely, demoable project.
**M5–M6** add the accounts + persistence + leaderboard — this is the **full-stack/SQL range** that makes
Jarden valuable for your portfolio, so don't skip it, but only after the jar is genuinely fun.
**M7** is polish. Resist adding a tenth species before the first three feel alive.

---

## Milestone 0 — Canvas + game loop

**Goal:** a React app drawing a jar on a Canvas, ticking at a fixed rate.

**Build:** Vite + React scaffold. A Canvas component. A **fixed-timestep loop** (accumulate real time, step the sim at a constant rate, render with `requestAnimationFrame`) — so the sim runs the same speed on every machine. Draw the empty jar (glass outline, soil at the bottom). Pixel-crisp rendering (disable image smoothing, integer scale).

**Deliverable:** an empty jar on screen, loop running, steady FPS.

**Gotchas:** decouple **tick rate** (sim) from **frame rate** (render) — this is the classic mistake; do it now and everything later is easier.

---

## Milestone 1 — Sim engine core (start here)

**Goal:** the world model and the tick, as pure JS.

**Build:** `engine.js` — a `World` holding a grid (or cells) with **resources per cell**: light, water, nutrients. A `tick()` that advances everything one step. A **day/night cycle** (a clock that modulates light). Entities as data (`{type, x, y, energy, age, ...}`). No rendering here — just state in, state out.

**Deliverable:** call `tick()` in a loop (even in Node) and log that resources cycle with day/night. Write a couple of **tests** (`engine.test.js`) — resource bounds stay sane, the clock wraps.

**Gotchas:** decide grid vs. continuous space now (grid is simpler — start there). Keep all tunables (growth rates, capacities) as named constants in one config.

---

## Milestone 2 — Plants (life begins)

**Goal:** seeds that grow, mature, spread, and die.

**Build:** `plants.js` — a plant lifecycle: **seed → sprout → grow → mature → reproduce → wither**. Growth consumes water + nutrients and needs light (so it slows at night). Mature plants **drop seeds** to nearby cells (spread). Death returns nutrients to the soil. Render plants as simple pixel sprites that change with growth stage.

**Deliverable:** drop a seed, watch it grow, spread to neighbours, and eventually a little patch of green lives and dies on its own.

**Gotchas:** balance reproduction vs. resources or the jar either dies instantly or chokes solid — tune the rates. Cap population per cell.

---

## Milestone 3 — Creatures & decay (an ecosystem)

**Goal:** the jar becomes a food web that self-balances.

**Build:** `creatures.js` — **bugs** that wander, eat plants for energy, reproduce when fed, and starve when not. **Mold/decomposers** that spread on dead matter and recycle it into nutrients. Now you have producers (plants), consumers (bugs), decomposers (mold) — a real cycle. Optionally a second creature (predator) for herbivore/predator dynamics.

**Deliverable:** leave it running and watch populations rise and fall — plants boom, bugs multiply and crash, mold cleans up — an emergent balance you didn't script.

**Gotchas:** emergent balance is finicky; expect to tune a lot. Add a tiny debug overlay showing population counts so you can *see* the dynamics while tuning.

---

## Milestone 4 — Tend the jar (interaction) → **MVP complete**

**Goal:** the player affects the world.

**Build:** tools in the React UI — **plant a seed** (click), **water** (raise moisture in an area), **add light / sunlamp**, **remove a pest or mold**. Clicking/dragging on the Canvas maps to cells and applies the effect. Show live **stats** (population, biodiversity, jar age, "health").

**Deliverable:** a jar you actively keep alive and shape — the full toy loop. This is a great standalone demo.

**Gotchas:** map mouse/touch coords to sim cells correctly (account for canvas scaling). Give feedback for every action so it feels responsive.

---

## Milestone 5 — Accounts & persistence (the full-stack leap)

**Goal:** your jar is saved and comes back when you log in.

**Build:** a **Node/Express** backend with a **SQL** database (Postgres or SQLite). **User accounts** (register/login, hashed passwords, JWT sessions). Endpoints to **save** the jar state (serialize the world to JSON) and **load** it on login. Auto-save periodically. The React app calls these; store the token client-side.

**Deliverable:** log in on another day (or another device) and your jar is exactly where you left it — with its age and history intact.

**Gotchas:** never store plain passwords (hash with bcrypt); keep secrets in the host's env vars, not in git. Decide what to persist — full world snapshot vs. a compact seed+age you re-simulate. Snapshot is simplest to start.

---

## Milestone 6 — Leaderboard & sharing

**Goal:** compare jars; a reason to keep one thriving.

**Build:** define a **score** — biodiversity, jar age survived, peak population, or a blend. A `scores` table and a **leaderboard endpoint** (SQL query: top N, with the owner). A leaderboard screen in React. Optionally, **share a snapshot** image of your jar (`canvas.toDataURL`) for social posts.

**Deliverable:** a global top-jars board, and a shareable snapshot of yours.

**Gotchas:** decide the score server-side or make it verifiable — otherwise it's trivially faked. For a portfolio, a simple honest score is fine; just don't trust the client blindly.

---

## Milestone 7 — Polish & deploy

**Goal:** make it feel like a finished little world, and ship it.

**Build:** pixel-art pass (nicer sprites, day/night colour grading, glass reflections on the jar), ambient sound (soft loop, bug chirps), a short first-time tutorial, and UI cleanup. **Deploy**: React front-end to **Vercel**; Node/SQL backend to **Render** (persistent server + managed Postgres). Point the front-end at the deployed API; enable CORS.

**Deliverable:** a live link anyone can play, jars that persist, a leaderboard — done.

**Gotchas:** same as any full-stack deploy — env vars in the dashboard (never committed), update the front-end's API URL for production, and expect the free Render backend to cold-start after inactivity.

---

## Suggested structure
```
jarden/
├── src/
│   ├── sim/          engine.js, plants.js, creatures.js, config.js, *.test.js
│   ├── render/       canvas drawing
│   ├── ui/           React components (jar view, tools, stats, auth, leaderboard)
│   └── api.js        calls to the backend
├── server/           Express app, routes, db, auth
└── README.md
```

## Build order & pacing
`M1 → M2 → M3 → M4` is the soul of the game — get a self-balancing, tend-able jar working and *fun* first.
`M5 → M6` add the accounts/SQL/leaderboard that give it real full-stack weight. `M7` ships it.
Tune constantly — most of Jarden's magic is in balancing the numbers, not adding features.

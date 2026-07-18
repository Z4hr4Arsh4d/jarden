# Jarden 🫙🌱

**A sealed jar that lives, evolves, and balances itself.**

Plant seeds, add bugs, add predators — then watch an ecosystem take over. Plants grow toward the
light and drink from the soil; bugs graze on them and breed; predators hunt the bugs; mould
recycles the dead back into the soil. It runs on its own, day and night, and it **evolves** —
plants carry genes that mutate across generations, so the jar quietly selects for whatever
survives its conditions.

**▶️ Play it live: https://jarden.vercel.app/**


<img width="1622" height="905" alt="image" src="https://github.com/user-attachments/assets/a0c1dd14-8c38-44f3-8fc1-351a48c91e82" />

---

## What makes it interesting

Most "ecosystem" toys are scripted — things spawn and despawn on timers. Jarden is a real
**simulation**: every outcome falls out of a few simple rules interacting, and the whole thing is
built as a **pure-JavaScript engine with no rendering or DOM**, so the ecology can be — and is —
tested headlessly in Node.

Three things it does that were genuinely hard to get right:

- **It's sealed.** The jar is a closed water system — evaporation by day, dew by night — and total
  water is conserved *exactly*, to the last decimal, through plants drinking, weather raging, and
  saves reloading. Every test suite re-checks this invariant.
- **It self-balances.** Predator, prey and plants coexist for 50+ simulated days, oscillating
  instead of collapsing. Getting there meant fixing three separate extinction bugs — bugs that ate
  every plant, predators that ate every bug, and prey with nowhere to flee.
- **It evolves.** Nothing tells plants to adapt. Plants whose genes suit the jar mature and pass
  them on; plants whose genes don't never reproduce. Run two identical jars for 30 days — one
  comfortable, one in permanent drought — and the drought jar breeds measurably faster-growing,
  hardier plants, all on its own.

## The stack

- **Pure-JS sim engine** — `src/sim/`, no React, no DOM, fully unit-tested in Node
- **Canvas pixel-art renderer** — `src/render/`, faux-3D glass, day/night, weather effects
- **React** — the UI shell, tools, tutorial, inspector
- **Procedural Web Audio** — ambient music synthesised live, reacting to the jar's own day
- **Node + SQLite backend** — accounts, saves, leaderboard, with zero dependencies
- **Vite** — dev server and build

## Running it locally

```bash
npm install

npm run dev        # the game   -> http://localhost:5173
npm run server     # the API     -> http://localhost:8787   (optional — only for saving)
npm test           # 8 test suites, all headless
```

The game is **fully playable without the server.** Accounts exist to save your jar and enter the
leaderboard — they never gate play.

## How to play

Follow the built-in guide (it teaches by doing, not by walls of text): plant a seed, water it,
speed up time, add a bug, add a predator — then watch the jar take over. **Hover anything** to
inspect it. Your score rewards a jar that's alive, varied, balanced, and recycling; reach 60 and
hold it for five days to reach **thriving**. Tending costs energy, so you can't brute-force it —
the jar has to do the work.

---

## How it's built, milestone by milestone

- [x] **M0** canvas + fixed-timestep loop (sim speed independent of frame rate)
- [x] **M1** sim engine core — resource cells, day/night clock, sealed water cycle, seeded RNG
- [x] **M2** plants — seed → grow → spread → wither, soil physics, pixel renderer, tending toolbar
- [x] **M3** creatures & decay — grazing bugs, mould decomposers, a self-balancing food web
- [x] **M4** the game — genetics & selection, weather, predators, tending energy, scoring, time controls **(MVP)**
- [x] **UX pass** — a guide that teaches by doing, hover inspector, progressive disclosure, 3D glass, music
- [x] **M5** accounts & persistence — SQL schema, scrypt auth, exact save/restore
- [x] **M6** leaderboard & sharing — best-run ranking in SQL, PNG share cards
- [x] **M7** deployed

### Evolution (M4)

Every plant carries genes — `grow`, `thirst`, `shade`, `hardy` — that are multipliers on its
species baseline. Seeds inherit their parent's genes with a little drift. Selection is emergent,
and the tests prove it — two identical jars, run 30 days:

```
comfortable jar -> grow 0.90  hardy 0.91
drought jar     -> grow 1.34  hardy 1.21   (8 generations deep)
```

The drought jar bred plants that grow fast and tough it out — breed before you die — without a
single line of code telling them to. One thing that took a real bug to learn: founder plants
originally had near-identical genes, so a stressed jar simply went extinct. **A population with no
variation cannot evolve.**

### Weather (M4)

Spells (clear, overcast, heat wave, cold snap, muggy) bend the existing physics — heat drives
evaporation, cold drives condensation, overcast dims the light. Crucially, **weather never adds or
removes water**: the jar stays sealed, and there's a test for it.

### The food web (M3)

```
plants grow  ->  bugs graze  ->  bugs die  ->  mould eats the dead
     ^                                                |
     +------------- nutrients feed the soil <---------+
```

Dead plants and bugs don't turn into nutrients directly — they become **detritus**, which **mould**
(which needs damp soil) converts back. Bugs **graze rather than kill**: they leave a plant once it's
chewed down and move on. That single rule is what keeps the jar alive — an earlier build had bugs
eat every plant to death by day 2 and then starve, leaving a dead jar forever. There's a regression
test for it.

### The backend (M5)

- **Zero dependencies.** SQLite comes from Node's built-in `node:sqlite`; the server is `node:http`;
  passwords use `node:crypto`. No Express, no bcrypt, no native build step.
- **Passwords** are hashed with **scrypt** (memory-hard, resists GPU cracking) and a per-user random
  salt; comparisons are timing-safe. A test asserts the plaintext never reaches the database.
- **Tokens** are HMAC-signed. Tests cover forgery, tampering and expiry.
- **`api.js` takes `(db, body)`, not `(req, res)`** — so every route's logic is unit-tested against a
  real in-memory database, with no server and no sockets.

### Saving is exact, and that took work

The sim is deterministic but **chaotic**. Two things had to be right:

1. **The RNG has a position.** Saving just the seed would make a reloaded jar replay random numbers
   it had already used — the same weather, the same mutations. So the save records how many times the
   RNG has been called and fast-forwards it on load.
2. **No rounding.** At six decimal places the error tips thresholds like `water > 0.08`, and a
   restored jar visibly diverged within three days — and quietly gained ~0.005 water on every load,
   in a jar whose whole premise is being sealed. Full doubles cost 12KB. Worth it.

A restored jar now lives an **identical future**, and there's a test that runs both three days
forward to prove it.

### The leaderboard (M6)

One row per keeper — their **best** jar, not their most recent and not one row per run. Done in SQL
with a correlated subquery:

```sql
SELECT u.username, s.score, s.day, s.status, s.plants, s.bugs, s.preds, s.gen
FROM scores s
JOIN users u ON u.id = s.user_id
WHERE s.score = (SELECT MAX(s2.score) FROM scores s2 WHERE s2.user_id = s.user_id)
GROUP BY s.user_id
ORDER BY s.score DESC, s.day DESC
```

`/api/me/rank` counts how many players have a better best, so you always know where you stand even
when you're outside the top 20. **Share cards** are drawn to a canvas — jar, score, populations, and
how many generations it's evolved through — and downloaded as a PNG.

## Deployment (M7)

The **frontend** (the whole game — it runs entirely in the browser) is deployed on **Vercel**: it
builds with `npm run build` and serves the `dist/` output. The game is fully playable there on its
own.

The **backend** (accounts, saves, leaderboard) is optional and runs separately — the frontend fails
soft when it's unreachable, so a missing server just means "you're playing locally," never a broken
page. To host the backend too, deploy `server/` to a platform that keeps a running process and a
persistent database (Render, Railway, Fly), and point the frontend at it with the `VITE_API`
environment variable.

## Project layout

```
jarden/
├── src/
│   ├── sim/          the pure-JS engine — engine, plants, creatures, genetics,
│   │                 weather, score, serialize (+ a .test.js beside each)
│   ├── render/       canvas renderer, React components, audio, share cards
│   └── net/          the browser's API client
├── server/           node:sqlite + node:http backend (+ api.test, leaderboard.test)
├── index.html
└── package.json
```

## Tests

Eight suites, all headless (`npm test`): the game loop, the engine and its sealed water cycle, plant
biology, the food web's 50-day coexistence, genetics and selection, exact save/restore, the auth &
save API, and the leaderboard SQL. The sim is pure functions, so all of this runs in Node with no
browser and no server.

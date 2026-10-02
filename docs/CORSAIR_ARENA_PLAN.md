# Corsair Arena: Final Stack and Build Plan (for Antigravity)

Browser-based, first-person naval PvP. **3 ships per match, 3 players per ship (9 players per room).**
Roles are stations (Helm, Cannons, Repair/Boarding) that any player can take at any time.

---

## 1. Final stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript (strict)** everywhere | One language across client, server and shared sim |
| Monorepo | **pnpm workspaces** | Shared code with no publishing step |
| Client engine | **Babylon.js** (latest stable, pin the version) | Game-focused, inspector, GUI, glTF loading |
| Bundler | **Vite** | Fast on Mac, simple config |
| Server | **Node.js 22 LTS + Colyseus** (check the current stable) | Rooms, matchmaking, binary state sync |
| Transport | **WebSocket** (Colyseus default) | Fine for slow ships. Revisit only if latency hurts |
| Simulation | **Custom code in `/shared`**, no physics engine | Must run identically on server and client. Ships are simple 2D rigid bodies plus a buoyancy illusion |
| Player movement | Custom kinematic controller in **ship-local space** | Avoids physics-engine sync problems on moving decks |
| Water | **Gerstner waves** in `/shared`, same formula on GPU and CPU | Deterministic from time, nothing to network |
| Tests | **Vitest** (unit), **Playwright** (smoke/e2e) | Lets agents verify their own work |
| Lint/format | ESLint + Prettier, `tsc --noEmit` in CI | Catches agent mistakes early |
| Hosting (later) | Fly.io or Hetzner VPS, client on Cloudflare Pages | Cheap, simple |
| Desktop wrapper (optional) | Tauri | Only if you want Steam later |

Note on a change from earlier: I previously suggested Havok. For this design I'm dropping it from the gameplay-critical path. The server must own ship motion and the client must predict it identically, and a hand-written sim in `/shared` is easier to keep deterministic. Havok can still be used on the client for cosmetic debris if wanted.

Mac setup: Homebrew, `brew install node pnpm git`, VS Code or Antigravity, Blender. Test in Chrome and Safari (Safari's WebGL/audio quirks are the main cross-browser risk).

---

## 2. Repo layout

```
corsair-arena/
  AGENTS.md                 # rules for the AI agent (section 9)
  package.json, pnpm-workspace.yaml, tsconfig.base.json
  packages/
    shared/                 # NO DOM, NO Babylon, NO Node-only APIs
      src/
        constants.ts        # tick rate, ship stats, damage values
        waves.ts            # Gerstner height/normal(x, z, t)
        shipPhysics.ts      # stepShip(state, input, dt)
        projectile.ts       # stepBall(state, dt) + swept hit test
        damage.ts           # damage slots, leak and flooding math
        zones.ts            # storm radius(t), spawn points
        schema.ts           # Colyseus Schema classes + message types
        math.ts             # vec2/vec3 helpers, seeded RNG
    server/
      src/index.ts, rooms/MatchRoom.ts, systems/*.ts
    client/
      index.html
      src/
        main.ts, game/*, render/*, input/*, net/*, ui/*, audio/*
      public/assets/        # glb, ktx2, audio
  tools/
    asset-pipeline/         # gltf-transform scripts
  docs/
    DESIGN.md, NETCODE.md, ASSETS.md
```

**Hard rule:** anything that affects gameplay results lives in `shared` and is called by both server and client.

---

## 3. Core technical design

### 3.1 Server loop
- Fixed tick **30 Hz** simulation, **15-20 Hz** state broadcast. Use a fixed timestep accumulator, never variable dt.
- Server order each tick: apply inputs, step ships, step players-on-ships, step cannonballs, resolve hits, update leaks and flooding, update loot, update storm, check win condition.

### 3.2 Coordinate spaces
- **Ship state (world):** `x, z, heading, speed, angularVel, pitch, roll, waterLevel`.
- **Player state:** `shipId | null`, `localPos (x,y,z)` when on a ship, `worldPos` when swimming.
- World pos of a player on a ship = `shipTransform * localPos`. Players on a ship are never simulated in world space, so ship motion costs nothing.
- Jumping overboard: convert local to world, set `shipId = null`, switch to swim mode.
- Boarding an enemy ship: world to that ship's local space on contact.

### 3.3 Ship physics (2D plus cosmetic tilt)
- State: position, heading, linear speed along heading, yaw rate.
- Inputs: `sail` (0, 0.5, 1 as three notches), `rudder` (-1..1).
- Speed approaches `targetSpeed` slowly (high inertia). Yaw rate is proportional to rudder times speed, with damping. Add lateral drag so ships slide a little in turns.
- Wind: one global wind direction affects max speed per heading. Optional for MVP; leave a stub.
- Pitch/roll and heave are **derived** by sampling `waves.ts` at 4 hull points. They are cosmetic and also used for the camera. Server and client compute the same values.
- Collision: ship-ship and ship-island as simple oriented rectangles or capsules vs circles. Resolve with a push-out and speed loss.

### 3.4 Water
- 3-4 summed Gerstner waves, parameters in `constants.ts`, time from the server clock offset.
- `waves.ts` exports `heightAt(x, z, t)` and `normalAt(...)`. Client shader implements the same parameters. Add a unit test that compares CPU height values against known fixtures.

### 3.5 Cannons and projectiles
- Each ship has N cannon slots per side, defined in a ship config in `shared`.
- Cannon station: player aims yaw (limited arc) and pitch (limited range). Fire requires a loaded cannon. Reload time about 6-8 s (tune).
- Server spawns a ball with `velocity = muzzleDir * muzzleSpeed + shipVelocity`, gravity applied each tick, fuse not needed at first.
- Hit detection: **swept segment vs ship oriented box** each tick (prevents tunneling). Water hit if `y < waveHeight`.
- Hit produces: damage event to clients (for VFX/audio), and a **damage slot** activation.

### 3.6 Hull damage, leaks, sinking
- Each ship has `SLOTS_PER_SIDE = 10` damage slots with fixed local positions.
- Hit maps to the nearest inactive slot within a radius. If none is free, apply bonus structural damage instead.
- Per slot: `active: boolean`, `severity: 1..3` (bigger hit means bigger leak).
- `inflowRate = sum(severity * K)`. `waterLevel += inflowRate*dt - bailRate*dt`.
- Buoyancy offset = function of `waterLevel` (ship sits lower; speed and turn rate also drop at high water).
- `waterLevel >= SINK_THRESHOLD` starts sinking (about 10 s animation), then the ship is eliminated and drops its plunder.
- **Patch:** station interaction at a slot, consumes 1 plank, takes about 2 s, sets `active=false`.
- **Bail:** interaction at the bilge or bucket, reduces `waterLevel`. Always available, but slow.

### 3.7 Roles as stations
- `Station` entities in ship config: `helm`, `cannon_L1..n`, `cannon_R1..n`, `sail_control` (optional), `bilge`.
- Player state includes `stationId | null`. Interact key claims a free station, same key or movement leaves. A station is occupied by at most one player.
- No class lock. Any of the 3 players can use any station.

### 3.8 Economy (MVP)
- **Planks:** per-ship counter. Sources: flotsam, wrecks.
- **Cannonballs:** per-ship ammo pool (cap e.g. 30). Loading a cannon takes one from the pool.
- **Plunder:** per-ship counter. Spawns at the center island cache and from sunk ships (floating chests).
- **Flotsam:** floating pickups at random seeded positions, respawn on a timer, drift gently. Collected by ship proximity (auto) or by swimmer touch.
- Server owns all counters. Clients display them.

### 3.9 Arena and storm
- Circular map radius R0 (start about 1200 m for 3 ships, tune). Storm radius shrinks in phases over time. Outside the storm: hull damage per second plus visual fog.
- 3 spawn points around the rim at 120 degree spacing.
- Win condition: last ship afloat. Optional timed fallback: most plunder when time runs out.

### 3.10 Netcode
- **Authoritative server.** Clients send only inputs: `{seq, throttle, rudder, moveDir, lookYaw, lookPitch, jump, interact, fire, ...}` at 30 Hz.
- Colyseus Schema state: `ships`, `players`, `balls`, `pickups`, `zone`, `matchPhase`.
- **Own player prediction:** client runs the same `stepPlayerLocal` and reconciles to the server's last acked `seq`. Since movement is in ship-local space, corrections are small.
- **Ship and others:** interpolate between the last 2 snapshots with a 100-150 ms delay. Helm player gets no special treatment; ships are slow and forgiving.
- **Cannonballs:** server authoritative. Client spawns a visual ball at fire time (cosmetic prediction) and snaps to server data.
- Use binary schema (Colyseus default) and send only changed fields.

### 3.11 First-person comfort
- Camera attached to player head in ship space. Ship roll applied at about 30-50% to the camera, not 100%.
- Setting to disable camera sway. Always render a stable horizon cue (e.g. mast and rigging in view).

---

## 4. Assets (MVP list)

Style: stylized low-poly. Budget: first load under 40 MB, all models compressed.

| Asset | Source | Notes |
|---|---|---|
| Ship hull, deck, mast, sails, wheel, cannons, barrels, crates | Kenney Pirate Kit (CC0), Quaternius (CC0), Blender kitbash | Make 1 ship model, recolor per team (3 sails/flags) |
| Damage hole overlays + splintered hull pieces | Blender, 10 slot meshes per side | Toggle visibility per slot |
| Characters (3 variants) + animations | Quaternius + Mixamo | Idle, walk, run, jump, swim, cannon-load, hammer |
| Island and rocks | Kenney/Quaternius, Blender | 1 center island, 3-4 rocks |
| Skybox / HDRI | Poly Haven (CC0) | 1 daytime, 1 stormy |
| Water | Custom shader | Foam via depth or wave-height threshold |
| VFX | Babylon particle systems | Cannon smoke, splash, wood splinters, fire (later) |
| Audio | Freesound, Kenney, Sonniss | Cannon, hit, splash, creak, ocean loop, wind, UI |
| Music | Incompetech / OpenGameArt | 1-2 loops |

Pipeline: Blender export GLB, then `gltf-transform optimize` (Draco or meshopt, KTX2 textures), output to `client/public/assets`. Record every asset's source and license in `docs/ASSETS.md`.

---

## 5. Milestones

Each milestone has an acceptance test. Do not start the next milestone until the previous one passes.

### M0: Scaffolding (0.5 day)
Tasks:
- Create the pnpm monorepo with `shared`, `server`, `client`.
- Configure tsconfig project references, ESLint, Prettier, Vitest.
- Client: Vite plus Babylon, renders an empty scene and a spinning cube.
- Server: Colyseus `MatchRoom` that accepts joins.
- Scripts: `pnpm dev` runs client and server together, `pnpm test`, `pnpm typecheck`.

Accept: `pnpm dev` opens a page, joining shows a console log of the server join. `pnpm typecheck` and `pnpm test` pass.

### M1: Ocean and one ship, offline (3-4 days)
Tasks:
- `waves.ts` plus unit tests. Water shader matching the same parameters.
- One placeholder ship (box hull) with 4-point buoyancy from `waves.ts`.
- `shipPhysics.ts`: sail notches and rudder with inertia.
- First-person player walking on the deck in ship-local space, jumping, camera sway.
- Helm station: claim the wheel, steer with A/D, sail with W/S.
- Debug HUD: speed, heading, FPS.

Accept: ship turns with visible momentum, player can walk while ship rocks without sliding, 60 FPS on a Mac laptop in Chrome and Safari.

### M2: Cannons and damage, offline vs dummy (4-5 days)
Tasks:
- Cannon stations (3 per side), aim limits, fire, reload.
- `projectile.ts` ballistic sim plus swept hit vs ship box. Splash on water hit.
- Static dummy enemy ship (then a simple AI that sails in circles).
- `damage.ts`: slots, leaks, waterLevel, buoyancy offset, sinking.
- Plank repair and bailing. HUD for planks, ammo, water level.

Accept: scripted test in Vitest: a hit activates a slot, `waterLevel` rises, patching stops inflow, an unpatched ship sinks in the expected time. Manual: leading a shot on the moving dummy is possible and feels skill-based.

### M3: Multiplayer core (5-7 days)
Tasks:
- Move sim calls into the server tick. Define Schema and input messages.
- Join flow: room fills to 9 players, auto-assign 3 per ship.
- Client prediction and reconciliation for own player. Interpolation for ships, others and balls.
- Stations synced (occupancy). Cannon fire, hits and damage synced.
- Disconnect and reconnect handling (Colyseus `allowReconnection`).
- Simple lobby screen (name, ready, countdown).
- Bots: a headless bot client for load tests and solo testing (see section 7).

Accept: 3 browser tabs (or bots) in one match behave consistently, ship positions match within a small tolerance on all clients, 9 bot clients run for 10 minutes without desync or memory growth.

### M4: Economy and arena (4-5 days)
Tasks:
- Flotsam spawner (seeded), pickup by proximity, swim and jump overboard.
- Plank, ammo and plunder counters. Center island with plunder cache.
- Sinking drops a plunder chest. Storm shrink with damage and fog.
- Spawn points, round start countdown, win condition, results screen.
- Ship-to-ship and ship-to-island collisions.

Accept: a full match from start to winner on a 3-ship map, with all resources moving as designed.

### M5: Polish and playtest build (1-2 weeks)
Tasks:
- Replace placeholder art with real assets. Audio pass. VFX.
- Settings (sensitivity, volume, sway toggle, keybinds). Mobile is out of scope.
- Loading screen and asset streaming. Performance pass (instancing, LODs, draw calls).
- Deploy: server on Fly.io/VPS, client on Cloudflare Pages. Closed playtest with friends.

Accept: friends can join via a link and finish a match with no crashes. Load under 15 s on a normal connection.

### M6+ (later, do not build yet)
Boarding via cannon launch, sea events (kraken, ghost ships, maelstrom), island looting, cosmetics, matchmaking and accounts.
Design hooks to leave now: an `Entity` list on the server with a `type` field, a generic `forces` array on ships (maelstrom later), and an event scheduler stub.

---

## 6. Default tunables (starting values, expect to change)
- Tick 30 Hz, broadcast 15-20 Hz, interpolation delay 120 ms.
- Ship max speed about 9 m/s, time to full speed about 12 s, turn rate at full speed about 12 deg/s.
- Muzzle speed about 70 m/s, gravity 9.8 (use a stronger value if shots feel floaty), reload 7 s.
- Slots per side 10, flood threshold for sinking 100%, one big leak about 3%/s, bail about 2%/s per player.
- Start resources: 12 cannonballs (cap 30), 6 planks, 0 plunder.
- Storm: 3 phases over about 12 minutes.

Keep all of these in `constants.ts` only, so tuning never touches logic.

---

## 7. Testing strategy
- **Unit (Vitest):** waves fixtures, ship step, projectile sweep, damage and flooding math. Deterministic via seeded RNG.
- **Sim tests:** run the server room headlessly for N ticks with scripted inputs and assert outcomes.
- **Bot clients:** a Node script using the Colyseus client to join, take stations and sail or fire randomly. Use for load and desync checks.
- **E2E (Playwright):** open the client, join a room, assert canvas renders and the HUD shows. Run in Chromium and WebKit (Safari engine).
- **Perf budget:** 60 FPS on a mid Mac laptop, under 300 draw calls, server tick under 5 ms with 9 players.

---

## 8. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Walking on moving ships feels wrong | Local-space simulation from day one (M1). Never try to fix it with world-space physics |
| Water mismatch between client and server | Single `waves.ts`, fixture tests, shader constants generated from the same file |
| Safari quirks | Test WebKit in CI from M0. Avoid WebGPU for now, use WebGL2 |
| Scope creep | Anything not in a milestone goes in `docs/BACKLOG.md`, not code |
| AI agent drift | Strict `AGENTS.md`, small tasks, acceptance tests, review diffs |
| Legal | Original names, art and ship designs. Check "Corsair Arena" trademark availability |

---

## 9. AGENTS.md (paste this at the repo root; also add as Antigravity rules)

```md
# Project rules
- Stack: TypeScript strict, pnpm workspaces, Babylon.js (client), Colyseus on Node (server), Vitest.
- Gameplay logic lives ONLY in packages/shared. Client and server import it. Never duplicate sim logic.
- packages/shared must not import Babylon, DOM, or Node-only APIs.
- The server is authoritative. Clients send inputs, never state.
- All tunable numbers go in packages/shared/src/constants.ts.
- Use a fixed timestep. No Date.now() or Math.random() in sim code. Use the seeded RNG and tick counters.
- Do not add dependencies without stating why in the PR/summary.
- Every task must: pass `pnpm typecheck`, `pnpm lint`, `pnpm test`; add tests for new sim logic.
- Work on one milestone task at a time. Do not implement features from later milestones.
- Do not use localStorage for anything gameplay-related.
- After each task, summarize: files changed, how to run, how it was verified, open questions.
```

---

## 10. Prompts to give Antigravity (one at a time)

**Prompt 0: scaffold (M0)**
> Read AGENTS.md and docs/CORSAIR_ARENA_PLAN.md. Complete milestone M0 only. Create the pnpm monorepo with packages shared, server, client, as specified. Client uses Vite and Babylon.js with a basic scene. Server uses Colyseus with an empty MatchRoom. Add scripts dev, test, typecheck, lint. Verify by running them and show me the output.

**Prompt 1: ocean (M1 part 1)**
> Implement packages/shared/src/waves.ts (Gerstner, 4 waves, params in constants.ts) with `heightAt` and `normalAt`, and Vitest fixtures. Then implement the client water shader using the same parameters, and show a large water plane. Do not add ships yet.

**Prompt 2: ship and deck (M1 part 2)**
> Implement shipPhysics.ts (sail notches, rudder, inertia) and a placeholder box-hull ship with 4-point buoyancy from waves.ts. Add a first-person player that walks in ship-local space, jumps, and can claim the helm station to steer. Add a debug HUD. Add unit tests for stepShip.

**Prompt 3: cannons (M2 part 1)**
> Implement cannon stations, aiming limits, reload, and server-style ballistic projectiles in shared/projectile.ts with swept collision against an oriented box. Add a dummy target ship. Add tests that verify a shot at a stationary target hits and that tunneling does not occur at max speed.

**Prompt 4: damage (M2 part 2)**
> Implement damage.ts: 10 slots per side, leaks, waterLevel, buoyancy offset, sinking, plank patching and bailing. Add HUD elements. Add the scripted test described in M2's acceptance.

**Prompts 5+:** one task per prompt from M3 onward (schema and room, then prediction, then stations sync, then bots, and so on). Paste the matching "Tasks" and "Accept" lines each time.

**Tips for working with the agent:** keep each task to one prompt, ask it to run the tests itself, review diffs for any logic that leaked outside `shared`, and commit after each passing task so you can roll back.

# Plan 003 — /mar as a water planet: always-on tickets, readable dialogues, round minimap, game-like achievements

Status: draft
Created: 2026-09-29
Base branch: main
Goal: Hernán's improvements to the 3D view `/mar` (commit 23890e5): a «Entradas» button that is always on screen and sails the ship in turbo to the event island before opening the checkout; dialogues that stay readable (min 3 s, longer for long text) with a close button; the world redesigned as a small water planet with no grass or sand edges, where you sail around forever between islands, the sphere turns a little, and sky and stars show at the horizon; a round, transparent minimap that shows that planet turning and opens the big map on tap; and achievements that work like a game (counter, progress, «te queda…», «Reclamar» with a reward that depends on the achievement), the same in `/mar` and `/juego`. Everything stays browser-only (D-20) and `muestra` until Álvaro approves.
Test command: pnpm test
Worktree setup: pnpm install
Max parallel agents: 2

Agent notes: do not invoke the project skills `encargo` or `orquestador`; follow this prompt. Each task adds its own section at the top of ESTADO.md (`## <date> — plan 003 Txx: <title>`, what exists, commands, deviations, untested); on a merge conflict there keep every section, newest on top. Spanish copy uses "Boia" (D-18). Hernán may run a dev server of the main checkout on port 3000: never kill it and never use port 3000 (use 3100+). Several agents share this machine: run e2e with `--workers=2` and a free E2E_PORT. `/juego` (2D, Pixi) must keep working exactly as today unless a task says otherwise; anything shared (packages/engine runtime, packages/store) changes behind an option whose default keeps `/juego` as it is. three.js loads only on `/mar`. Every task touching the UI saves a phone-size screenshot (390×844) in docs/informes/img/ named `p003-txx-*.png` and gives the path in its final message: Hernán checks the look himself. Start this plan only after plan 002 T30 is done.

## Tasks

## T32 — Decision D-22 and the achievements catalog draft
- Status: pending
- Depends on: none
- Goal: Record Hernán's decisions of 2026-09-29 as D-22 in docs/DECISIONES.md (existing format, author Hernán, Álvaro pending): (1) `/mar` is a 3D view of the shared map next to `/juego` (as shipped in 23890e5; three.js only on `/mar`), amending D-05 for that route; (2) in `/mar` the world is a water planet: no coasts, the castle and the Explanada become islands, sailing wraps around, sky and stars visible; `/juego` keeps its coasts; (3) the «Entradas» button is always on screen in `/mar`: the ship sails in turbo to the event island (`allday` or whatever island the current event points to) and the checkout opens on arrival, skippable; (4) dialogues last at least 3 s, longer for long text, and always have a close button; (5) achievements are claimed: completing one makes it «listo para reclamar», the reward is granted only on «Reclamar», same flow in `/mar` and `/juego`; rewards depend on the achievement: coins and points by default, a Carnet badge for buying a ticket, a specific ship for complex ones, ship cosmetics for some. Update the affected REQ lines in docs/spec/ (same IDs and format). Then draft the catalog in docs/propuestas/logros-catalogo.md: about 20 achievements, game-like (tiers such as 1/3/6 where it makes sense, hidden ones, one per main activity: exploring islands, boies, Fiestera, circuit, minigames, bottles, Carnet, time played, tickets, worlds), each row with id, name, description, the condition and goal number («te queda» text), which signal of the runtime/store counts it (name the existing signals from apps/web/app/juego/achievements.ts; mark NEW where a signal does not exist yet), and the reward (type + amount or item). Keep the 10 current ids (packages/store/src/sample/progress.ts) or map each one to its replacement. Mark the file `borrador — pendiente de Hernán`.
- Context: docs/DECISIONES.md (D-05, D-20, D-21 format); docs/spec/03-mundo-y-motor.md, 04-aventura.md, 05-identidad-y-comunidad.md, 06-comercial.md; tools/spec/check.py; packages/store/src/sample/progress.ts, apps/web/app/juego/achievements.ts (signals, achievementFacts/achievementGoal); art/barco (the 8 style ships, candidates for ship rewards); plan 002 Proposals («Seis boies» unreachable: the map has one boia).
- Scope: may touch ESTADO.md (own top section), docs/DECISIONES.md, docs/spec/**, docs/propuestas/logros-catalogo.md (new) / must not touch code, art/**, plans/**.
- Done when:
  - `python3 tools/spec/check.py` → exit 0 and `python3 tools/spec/test_check.py` → exit 0
  - `grep -n "D-22" docs/DECISIONES.md` → the decision with its five points
  - docs/propuestas/logros-catalogo.md exists with the table and the mapping of the 10 current ids
- Outcome:
- Note for the orchestrator: after T32, send Hernán the catalog path and wait for his approval (or edits) before launching T36. T35 and T33 do not wait.

## T35 — Always-on «Entradas» with a turbo sail, and readable dialogues
- Status: pending
- Depends on: none
- Goal: In `/mar`, a «Entradas» button fixed in the HUD (visible at every zoom, in map mode and on phones, never covered by the sheet, bubble or joystick). Tapping it: the autopilot sets course to the island the current event points to (`eventOfPlace` / the `ticket` behaviour of `allday`, re-pointed by apps/web/lib/admin/world.ts), the ship sails in turbo with a visible wake and camera follow, and on arrival the SandboxCheckout opens for that event; a «Saltar» control (and any tap on the button again) jumps straight to the checkout; reduced motion opens the checkout directly. If there is no current event, the button opens the `/#tickets` section. Dialogues: speech-bubble lines and notices stay on screen at least 3 s, plus ~60 ms per character beyond 50 characters, capped at 8 s; each shows a close (×) button with an accessible label; tapping the text still advances the bubble. The timing lives in the shared runtime/notice queue behind a readable-duration option that `/mar` turns on (and that `/juego` also turns on unless Hernán said otherwise when approving this plan).
- Context: apps/web/app/mar/mar-client.tsx (HUD, bubble at ~838, notices at ~717, checkout at ~861–887), apps/web/app/mar/sheet.tsx (`eventOfPlace`, `mar-comprar`), apps/web/app/mar/engine/mar3d.ts (autopilot, turbo); packages/engine/src/world/runtime.ts (dialogue, ~813–866), packages/world/src/behaviors.ts (DIALOGUE_INTERVAL 1.5 s, allowed 0.5–5), packages/engine/src/ui/notifications.ts (NOTICE_DURATION_MS 4000); apps/web/lib/ticketing/checkout; apps/web/e2e/mar-3d.spec.ts.
- Scope: may touch ESTADO.md (own top section), apps/web/app/mar/**, apps/web/app/juego/notices.tsx and the /juego bubble (close button only), packages/engine/src/world/runtime.ts (dialogue timing only), packages/engine/src/ui/notifications.ts, packages/world/src/behaviors.ts (dialogue interval bounds only), apps/web/e2e/** / must not touch packages/store/**, apps/web/lib/ticketing/** (use it as is), art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds unit tests: duration = max(3 s, text rule) capped at 8 s; close dismisses immediately; the next notice waits its gap
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; mar-3d.spec.ts adds: the button is visible at deck zoom and in map mode; tapping it and «Saltar» opens the checkout for the current event; a dialogue has a close button and is still visible after 2.5 s
  - Screenshots p003-t35-entradas.png (button + turbo wake) and p003-t35-dialogo.png (bubble with ×)
- Outcome:

## T33 — /mar as a water planet with sky and stars
- Status: pending
- Depends on: T35
- Goal: Redesign the `/mar` world as a small water planet. Remove the grass/clay cliffs, sand and town coasts (engine/coast.ts); the castle on its hill and the Explanada become islands on the sea (decor-only, /mar-only, placed where they read well without overlapping shared-map places). The ship never meets an edge: sailing past a side comes back from the opposite one (wrap the map in `/mar` only, e.g. toroidal positions with the islands drawn on the wrapped copy nearest the ship), and the surface curves away from the camera so the horizon bends and you see sky above it (a curved-world vertex bend on water, islands, ships and props is the suggested way; the agent may choose another if it reads as a round world at 60 fps on a phone). The planet turns a little on its own (slow, subtle drift of the globe/sky, never moving the ship off its course), there is a sky dome with gradient following the day/dusk/night moods of palette.ts, stars (denser at night, faint by day) and a few sky details (clouds or shooting stars, cheap). Wrap must work with tap-to-sail, the autopilot (shortest way around), turbo, pins, rewards and triggers, which stay keyed by place id (REQ-AVE-011). The shared ship clamp (packages/engine/src/ship/controller.ts, runtime.ts ~453) gets a wrap option off by default, so `/juego` still has its coasts and bounds.
- Context: apps/web/app/mar/engine/** (mar3d.ts: camera ~182, fog ~290 and ~1344/1400, bounds ~267, clampPan ~1205; coast.ts; water.ts flat plane ~147; islands.ts; palette.ts `sky` colour unused), packages/world/src/worlds/arcilla/map.ts (ARCILLA_BOUNDS ~102), packages/engine/src/ship/controller.ts (~119–135), packages/engine/src/world/runtime.ts; D-22 (T32) if already merged.
- Scope: may touch ESTADO.md (own top section), apps/web/app/mar/**, packages/engine/src/ship/controller.ts and packages/engine/src/world/runtime.ts (wrap option only, default off), apps/web/e2e/mar-3d.spec.ts / must not touch apps/web/app/juego/**, packages/world/src/worlds/** (positions stay shared), packages/store/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds unit tests: with wrap on, sailing past each side comes back from the opposite one; the autopilot picks the shorter way around; with wrap off (the /juego default) the clamp is unchanged
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0 (existing /juego specs unchanged; mar-3d.spec.ts still passes)
  - Screenshots p003-t33-horizonte-dia.png and p003-t33-horizonte-noche.png (curved horizon, sky, stars) and a frame-time number measured on a 4× CPU-throttled Chromium in the final message
- Outcome:

## T34 — Round, transparent minimap of the turning planet
- Status: pending
- Depends on: T33
- Goal: Replace the «Mapa» button in `/mar` with a round, semi-transparent minimap in a corner: a small render of the whole planet turning (same slow drift as T33), with the ship and the island pins (event island highlighted), readable at 360 px wide and not covering the «Entradas» button. Tapping it opens the big map (today's map mode, adapted to the planet: the whole globe in view, pins tappable, set course from there); tapping it again or «Cerrar» returns to the deck. The M key keeps working. Reuse the shared projection/gesture helpers (packages/engine/src/ui/minimap.ts) where they fit; the minimap must cost little (low-res render target or a 2D canvas, updated at a reduced rate).
- Context: apps/web/app/mar/engine/mar3d.ts (toggleMap, MAP_ZOOM 0.55, mapMode ~127, ~372–383, ~1562), apps/web/app/mar/mar-client.tsx, mar.css; apps/web/app/juego/minimap.tsx (Minimap, ExpandedMap) and packages/engine/src/ui/minimap.ts as reference; T33 Outcome.
- Scope: may touch ESTADO.md (own top section), apps/web/app/mar/**, apps/web/e2e/mar-3d.spec.ts / must not touch apps/web/app/juego/**, packages/engine/src/ui/minimap.ts (use as is), packages/store/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; mar-3d.spec.ts: the minimap is visible and round, tapping it opens the big map, tapping the `allday` pin sets a course (the existing test, now through the minimap)
  - Screenshot p003-t34-minimapa.png (deck with minimap) and p003-t34-mapa-grande.png
- Outcome:

## T36 — Achievements you claim: store, catalog and signals
- Status: pending
- Depends on: T32 (catalog approved by Hernán)
- Goal: Implement the approved catalog (docs/propuestas/logros-catalogo.md) and the claim flow in the shared store. States per achievement: in progress (have/need) → listo para reclamar → reclamado. The ledger entry and the reward are written only on claim, idempotent by id (claiming twice grants once). Reward types: coins and points (existing balances, still derived from the ledger), Carnet badge (visible in Mi Carnet), ship unlock (a style ship that stays locked in the ship picker until claimed) and ship cosmetic (flag/wake/colour, stored as an owned cosmetic). Schema version bump with a migration: achievements already granted before this plan count as claimed and keep their balances. Wire the NEW signals the catalog lists into the shared runtime/achievements code so `/juego` and `/mar` both count them. Replace the 10 sample achievements per the catalog mapping. No UI beyond what `/juego` needs to keep compiling (T37 does the panels).
- Context: docs/propuestas/logros-catalogo.md (approved), D-22; packages/store/src/repository.ts (~214 ProgressApi), local.ts (~727–775 grantAchievement), schema.ts (~259), sample/progress.ts; packages/contracts/src/progress.ts; apps/web/app/juego/achievements.ts (recordSignal, achievementFacts, achievementGoal), mission.ts, circuit-hud.tsx, apps/web/lib/ticketing/sandbox.ts; supabase/migrations/20260928100500_progress.sql (shape reference only).
- Scope: may touch ESTADO.md (own top section), packages/store/**, packages/contracts/**, apps/web/app/juego/achievements.ts, mission.ts, circuit-hud.tsx, apps/web/lib/ticketing/sandbox.ts, apps/web/e2e/** (achievement expectations only) / must not touch apps/web/app/mar/**, supabase/** (note the needed migration in Proposals), art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: completing makes it claimable without granting; claim grants once; each reward type lands where it should; an old v-N store with granted achievements migrates to claimed with the same balances; progress have/need for every tiered achievement
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0
- Outcome:

## T37 — Achievements panel with counters and «Reclamar» in /mar and /juego
- Status: pending
- Depends on: T36, T34
- Goal: One achievements panel shared by `/mar` and `/juego`: header «X de Y logros», a list with progress bar and «te queda…» per achievement, hidden ones as «???» until found, and a «Reclamar» button on completed ones that plays a short reward animation (coins/points counting up, the badge flying to the Carnet, the ship unlocking) and updates balances. On completion a notice says «¡Logro completado! Reclamá tu premio» and the HUD achievements icon shows a count badge while something is waiting to be claimed. In `/mar` the panel opens from a HUD icon; in `/juego` it replaces the current «Logros» menu section; Mi Carnet shows claimed badges; the ship picker shows locked reward ships with the achievement that unlocks them.
- Context: T36 Outcome; apps/web/app/juego/menu/sections/logros.tsx, carnet/carnet-card.tsx, the /juego ship picker; apps/web/app/mar/mar-client.tsx (HUD, T34 and T35 layout); packages/engine/src/ui/notifications.ts (readable durations from T35).
- Scope: may touch ESTADO.md (own top section), apps/web/app/mar/** (HUD and panel only), apps/web/app/juego/menu/**, apps/web/app/juego/carnet/**, the /juego ship picker, a shared component folder under apps/web/lib/logros/ (new), apps/web/e2e/** / must not touch packages/store/** (use T36's API; a missing method goes to Proposals or a minimal addition with a test), apps/web/app/mar/engine/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; adds specs in both /mar and /juego: complete an achievement, the badge count appears, «Reclamar» raises the balance once, reload keeps it claimed
  - Screenshots p003-t37-logros-mar.png, p003-t37-logros-juego.png and p003-t37-reclamar.png
- Outcome:

## Decisions
- 2026-09-29: «Entradas» always on screen in /mar: the ship sails in turbo to the event island and the checkout opens on arrival, skippable (Hernán)
- 2026-09-29: dialogues at least 3 s, longer by text length, with a close button (Hernán)
- 2026-09-29: water planet only in /mar; the castle and the Explanada become islands; /juego keeps its coasts (Hernán)
- 2026-09-29: achievements are claimed, in /mar and /juego alike; rewards by type: coins and points by default, a Carnet badge for buying a ticket, a specific ship for complex ones, ship cosmetics (Hernán)
- 2026-09-29: the catalog is drafted first (T32) and Hernán approves it before T36 (Hernán)
- 2026-09-29: order T32 ∥ T35 → T33 → T34; T36 after the catalog is approved (can run next to T33/T34, no shared files); T37 last. Stop for Hernán after T35+T33 to look at the planet before the minimap (orchestrator)

## Proposals (new scope)

## Log

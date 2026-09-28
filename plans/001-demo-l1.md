# Plan 001 — Playable demo of BOIA.PLANET (phase 1 + phase 2 foundations)

Status: active
Created: 2026-09-28
Base branch: main
Goal: Reach the first milestone Álvaro can open on his phone: cinematic entry (planet → sea → landing), HTML landing with tickets, and a navigable world with the real ship sprites, a tutorial buoy and one event island by proximity; plus the data layer, auth and the essential Admin so that events, home blocks and the world are data, not code. Scope, stack and every product decision are fixed in docs/DECISIONES.md (D-01…D-18); the consolidated spec is docs/spec/ (REQ-* ids). Nothing here goes beyond Launch 1 (D-02).
Test command: pnpm test
Worktree setup: pnpm install
Max parallel agents: 3

Agent notes: do not invoke the project skills `encargo` or `orquestador` (the encargo skill cds into the main checkout); follow this prompt instead. Each task adds its own section at the top of ESTADO.md in the existing format (`## <date> — plan 001 T0x: <title>`, what exists, commands, deviations, untested); on a merge conflict there, keep every section, newest on top. Spanish copy and docs use the name "Boia" (D-18, from T00).

## Tasks

## T00 — Rename "boya" to "boia" across the repo
- Status: done
- Depends on: none
- Goal: Hernán decided the Valencian spelling everywhere: the in-game buoy word and the character become "boia" ("Boia Fiestera", "boia tutorial"), plural "boies"; the local folder path `boya.planet` becomes `boia.planet` in every reference. Replace in all tracked text files: Boya→Boia, boya→boia, BOYA→BOIA, boyas→boies, Boyas→Boies, BOYAS→BOIES (keep surrounding Spanish grammar correct: articles stay feminine; adapt any other derived form by hand and list it). Leave `docs/fuente/v14-maestro.md` verbatim (historic source) and never touch `plans/`. Add decision D-18 to docs/DECISIONES.md in its existing format: the name is "Boia"/"boies"; v14 keeps the old spelling as a historic text; the folder /Users/heralc/Desktop/boya.planet will be renamed by Hernán after plan 001 ends (so the path references now point to /Users/heralc/Desktop/boia.planet ahead of that rename). Unrelated words that merely contain "boy" (e.g. the artist "Bdboy") stay untouched.
- Context: `git grep -I -i -n boya -- ':!docs/fuente/v14-maestro.md'` (~61 hits: docs/spec/**, docs/DECISIONES.md, docs/PLAN.md, docs/prompts/01*, docs/informes/**, CLAUDE.md, .claude/skills/encargo/SKILL.md line 15 path, tools/blender/ship.py lines 4 and 429); docs/DECISIONES.md format; tools/spec/check.py (spec consistency check).
- Scope: may touch any tracked text file that contains the forms above, docs/DECISIONES.md, ESTADO.md / must not touch docs/fuente/**, plans/**, binary files, anything outside the repo (do not rename the folder itself).
- Done when:
  - `git grep -I -i -n -E "boya|boyas" -- ':!docs/fuente/v14-maestro.md' ':!plans/'` → no output (exit 1)
  - `python3 tools/spec/check.py` → exit 0 (and `python3 -m pytest tools/spec -q` → exit 0 if pytest is available)
  - `python3 tools/blender/check.py` → exit 0 (re-render with render.py only if ship.py's change affects output)
  - `pnpm test` → exit 0
  - docs/DECISIONES.md contains D-18; ESTADO.md has the new top section
- Outcome: 17 files renamed to boia/boies, D-18 added, v14 untouched → f6ebab0

## T06 — Supabase schema, migrations, RLS
- Status: done
- Depends on: T00
- Goal: The data layer of docs/spec/08-arquitectura-y-datos.md for Launch 1: users and carnets (5 public questions, member-since date), events with the seven states of §49.4 and island separated from event, islands, world objects and versioned world snapshots (draft/published), home blocks, achievements with trigger conditions, points and coins ledger (idempotent transactions with stable ids), bottles, audit log. No Docker on this Mac (D-17): migrations are plain SQL in supabase/migrations/ and are tested against the local Homebrew PostgreSQL 17 (port 5432, database `boia_planet_test`, created and dropped by the test harness) with a Supabase-compatible shim (roles anon/authenticated/service_role, schema auth with auth.uid() reading request.jwt.claims). Migrations cumulative; seed data labeled `muestra`; RLS so that no client can write balances, roles, stamps or purchase states.
- Context: docs/DECISIONES.md (D-04, D-09, D-10, D-17); docs/spec/08-arquitectura-y-datos.md, docs/spec/06-comercial.md (event states table), docs/spec/07-admin.md; skills `supabase` and `supabase-postgres-best-practices` (load them before writing SQL).
- Scope: may touch ESTADO.md (own top section), supabase/**, packages/db/** (new), root package.json (scripts only) / must not touch apps/web/app/**, packages/engine/**, packages/world/**. Never touch other databases on the local server.
- Done when:
  - `pnpm db:test` (added by this task) → exit 0: applies every migration to an empty `boia_planet_test`, then re-applies the new ones on top of seeded data without a destructive reset
  - `pnpm test --filter db` → exit 0: RLS tests prove an anonymous or member role cannot insert into ledger, stamps, roles or event state; a second identical reward transaction id is rejected
  - `pnpm typecheck` → exit 0 with generated types committed
- Outcome: 7 migrations + seeds, Supabase shim on local PG17, RLS/ledger tests, generated types; enums aligned with @boia/contracts → 6af3a0c

## T02 — Landing by blocks, tickets panel, analytics
- Status: done
- Depends on: T00
- Goal: The HTML landing of v14 §4.2/§4.4 driven by a typed block list with sample data: hero (title, positioning line, EXPLORAR EL UNIVERSO as dominant CTA per D-07, Tickets always visible), priority event, upcoming events, three artists rotating every 5 s without duplicates, philosophy, photos, store as external link, contact, footer with legal links. Tickets panel in HTML that works without WebGL. PostHog (EU) with the funnel events of D-04. Spanish only (D-03), i18n keys from the start.
- Context: docs/DECISIONES.md (D-02, D-03, D-04, D-07); docs/spec/02-entrada-y-landing.md, docs/spec/06-comercial.md, docs/spec/10-filosofia.md (copy is `muestra` until Álvaro approves); v14 §18.1 for the 26 artists (verbatim, neutral avatars); apps/web/**.
- Scope: may touch ESTADO.md (own top section), apps/web/** (except app/juego/**), packages/contracts/** / must not touch packages/engine/**, packages/world/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests for the block renderer (hidden blocks render nothing; artist rotation never repeats within a trio)
  - `pnpm build` → landing critical path ≤ 1 MB gzip (report the number)
  - `pnpm e2e` (added by this task: Playwright, Chromium, mobile and desktop projects) → exit 0: opens `/`, sees the CTA and Tickets above the fold at 360×640, opens the tickets panel with the game bundle blocked
  - axe-core on `/` → 0 serious or critical violations
- Outcome: block-driven landing, HTML tickets panel (/#tickets), PostHog EU via capture API, Playwright e2e + axe; 155 kB gzip → e680599

## T01 — World art batch v0 from the Blender pipeline
- Status: done
- Depends on: T00
- Goal: Produce, with the same headless Blender pipeline, camera (30°, D-13) and style parameter as the ship, the first swappable world assets the demo needs: one large event island, one small secondary island, the tutorial buoy (idle loop), two rocks, a coastline set for the left and right world edges, and the intro planet as 2D layers (globe, sea band, clouds, a recognisable island shape for continuity, v14 §4.4). Every resource gets its own manifest (id, version, files, frames, scale, anchors, pivot, footprint/hitbox hint, license `muestra`) per v14 §49.17, validated by the existing check. Style: the current `muestra` style of art/barco, selectable so a later style change is a re-render (tools/blender/styles/).
- Context: docs/DECISIONES.md (D-05, D-13, D-16); docs/informes/2026-09-28-01-arte-barco-blender.md (pipeline, manifest contract, styles); tools/blender/** (rig.py, ship.py, render.py, check.py, styles/); v14 §4.4, §9, §34, §49.17 in docs/fuente/v14-maestro.md.
- Scope: may touch ESTADO.md (own top section), tools/blender/**, art/** (new folders only; art/barco/** only if a shared manifest field is added, re-rendered and re-checked) / must not touch apps/**, packages/**, docs/spec/**.
- Done when:
  - `/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all` → exit 0, twice, outputs byte-identical (report the diff command)
  - `python3 tools/blender/check.py` → exit 0 and reports every manifest valid (ship plus the new resources, with counts)
  - `python3 tools/blender/calibrate.py` (or its Blender invocation) → ratio 2.0 ± 0.04
  - A contact sheet of all new assets over water at game scale saved in docs/informes/img/ (path in the final message)
- Outcome: 8 manifests / 78 PNG (islands, boia tutorial, rocks, coasts, planet layers), style param in tools/blender/styles/muestra.py, contact sheet docs/informes/img/p001-t01-hoja-mundo.png → 948a52c

## T07 — Public auth (OTP + magic link), guest session, idempotent merge
- Status: skipped (Hernán: visual demo first; WIP kept on branch worktree-agent-a208530713932c80c)
- Depends on: T00, T06, T02
- Goal: D-10: sign in by email with a 6-digit code and a magic link in the same mail; guest identity stored locally with a server-side anonymous id; on sign-in, merge guest progress by ids (union of discoveries, rewards synced once per id, never importing local balances as truth); return to the same panel after verification; "Continuar sin registrarme" always available.
- Context: docs/DECISIONES.md (D-09, D-10, D-17); docs/spec/05-identidad-y-comunidad.md (REQ-IDE-* for §49.10), docs/spec/08-arquitectura-y-datos.md; supabase/**, packages/db/**, apps/web/**. Auth runs against the cloud dev project `boia-planet-dev` (D-17). Build and unit-test everything first against the local PostgreSQL shim from T06; only the e2e needs the cloud project. When you reach it, read the keys from the main checkout's `/Users/heralc/Desktop/boya.planet/.env.local` (Hernán may add them after your worktree was created; never copy them into the repo). If they are still missing, commit your work and stop with STATUS: blocked asking Hernán to create the project and load the keys with the `pedir-token` skill; never create accounts or paste secrets.
- Scope: may touch ESTADO.md (own top section), apps/web/app/(auth)/** (new), apps/web/lib/auth/** (new), packages/db/**, supabase/** (new migrations only) / must not touch packages/engine/**, apps/web/app/juego/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: merging the same guest twice grants each reward once; a tampered local balance is ignored; OTP and link both create the same session
  - `pnpm e2e` → exit 0 against the dev project: request a code, read it through the Supabase admin API in the test (service key from .env.local, never logged), sign in, land on the originating panel
- Outcome:

## T04 — World objects and behavior catalog v1, tutorial buoy, test island
- Status: done
- Depends on: T00, T01
- Goal: Implement v14 §48 in the engine: a WorldObject is asset + geometry + behaviors from a catalog + params. Catalog v1: collision (block, bounce, brake, slow, boost), proximity, dialogue (speech bubbles, 1.5 s per line, tap to advance or skip, playful reaction when the ship leaves), collectible, reward, content (open an HTML panel), ticket, checkpoint, teleport, spawn, achievement-trigger, decorative, and an empty INICIAR_MINIJUEGO extension point. Sample world built from the T01 assets: spawn point, tutorial buoy that pulses the menu anchor and minimap placeholders, one event island with a wide proximity radius that opens a sample event panel, rocks as obstacles, coastline at both edges. Also: ship length on screen to ~48 px (D-15), the ship's idle bob loop and the passenger slot from the manifest (passenger hidden until the Fiestera mission).
- Context: docs/DECISIONES.md (D-12, D-13, D-15, D-16); docs/spec/03-mundo-y-motor.md, docs/spec/04-aventura.md (REQ-MUN-*, REQ-AVE-* for §7 and §9), docs/spec/07-admin.md (§48.2–48.3); docs/informes/2026-09-28-03-monorepo-y-motor-base.md; packages/world/**, packages/engine/**; the art/ manifests from T01.
- Scope: may touch ESTADO.md (own top section), packages/world/**, packages/engine/**, apps/web/app/juego/** / must not touch apps/web/app/(landing)/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests per behavior (a slow obstacle reduces speed by its param for its duration; proximity fires enter/exit once; dialogue advances at 1.5 s and skips; a collectible grants its reward exactly once per configured policy)
  - A swap test: the same behavior config with a different asset id renders differently and behaves identically (snapshot of simulation trace)
  - `pnpm typecheck && pnpm lint` → exit 0
- Outcome: WorldObject = asset + geometry + behaviors catalog v1; SAMPLE_WORLD in packages/world (boia tutorial, event island panel, rocks, coasts); ship 48 px with bob; 179 tests → bf8ef99

## T03 — Cinematic entry: planet → sea → landing
- Status: done
- Depends on: T00, T01, T02
- Goal: The automatic entry of v14 §4.4 and §47-B: planet illustrated in 2D layers, continuous approach, reveal of the isometric sea with islands and the ship, landing content appears over the same scene. No click, no language or login screen. Skip control (idempotent), reduced-motion variant (static scene + short fade), lightweight fallback when assets or the renderer fail, no replay on deep links or return visits. Target ~3 s, measured. Acceptance ENT 01–06 as far as they can be automated; the rest listed for Hernán to check on real phones.
- Context: docs/DECISIONES.md; docs/spec/02-entrada-y-landing.md (REQ-ENT-*); apps/web/app/**; packages/engine/** (camera and scene handoff); planet layers and islands produced by T01 under art/ (read their manifests); the Outcome lines of T01 and T02.
- Scope: may touch ESTADO.md (own top section), apps/web/**, packages/engine/src/intro/** (new) / must not touch packages/world/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds a state-machine test: skip twice, back, route change and tab hide never duplicate the world or start a game
  - `pnpm e2e` → exit 0: first visit ends on an interactive landing without a click; with `prefers-reduced-motion` no camera movement; with the engine bundle blocked the landing still shows the island illustration and working Tickets
  - Recordings of desktop and mobile viewport saved under docs/informes/img/ (paths listed in the final message)
- Outcome: ~3 s planet → sea → landing with skip, reduced motion, 2 s fallback, seen flag boia.intro.v1 (/?intro=1 replays); engine exports ./intro, ./intro/scene; recordings p001-t03-*.webm/png; landing 161.9 kB gzip → 2e80904

## T08 — Admin base: login with TOTP, roles, audit, events and home blocks
- Status: skipped (Hernán: visual demo first; depends on T07)
- Depends on: T00, T07
- Goal: docs/spec/07-admin.md for Launch 1: admin login with password + TOTP, roles owner/admin/editor enforced in routes, services and RLS, audit log of every change, recoverable trash with double confirmation; Events CRUD with the seven states, automatic date transitions via pg_cron plus manual override with audit, event↔island separation (an island keeps history and can receive a new event); Home blocks editor (order, show/hide, schedule, priority event) with desktop/mobile preview; artists and photo albums CRUD. First-owner bootstrap generates a random temporary password shown once (never in repo).
- Context: docs/DECISIONES.md; docs/spec/07-admin.md, docs/spec/06-comercial.md; apps/web/**, packages/db/**, supabase/**.
- Scope: may touch ESTADO.md (own top section), apps/web/app/admin/** (new), apps/web/lib/admin/** (new), packages/db/**, supabase/** (new migrations only) / must not touch packages/engine/**, packages/world/**, apps/web/app/juego/**.
- Done when:
  - `pnpm test` → exit 0; adds permission tests per role (editor cannot publish; member cannot reach admin; no route lets a member escalate), and the event lifecycle test: publish → appears in home query; finish → leaves sale, island keeps memories; link a new event → back in home
  - `pnpm e2e` → exit 0: owner bootstrap, TOTP enrolment, create event, edit home blocks, preview, publish
  - `grep -r` for secrets in repo and client bundle → none (report the command)
- Outcome:

## T05 — Minimap, compass, on-board menu shell, settings, notification queue
- Status: done
- Depends on: T00, T04, T02
- Goal: v14 §10, §19, §20, §14: minimap 96 px on mobile (D-07), tap to expand with island names, 500 ms long-press to drag with snap to safe zones and persisted position, compass to the next undiscovered target; on-board menu with the seven icons of §19 (sections can be stubs), settings with language, music and SFX separately, and the keyboard mode of D-14 (screen-direction by default, tank control as an option, persisted); notification queue (one at a time, 4 s, top, navy/orange, short sound).
- Context: docs/DECISIONES.md (D-07, D-14); docs/spec/03-mundo-y-motor.md, docs/spec/05-identidad-y-comunidad.md (menu, settings, notifications); packages/engine/** (KeyboardControls already exists), apps/web/app/juego/**.
- Scope: may touch ESTADO.md (own top section), packages/engine/src/ui/** (new), packages/engine/src/input/** (keyboard mode only), apps/web/app/juego/** / must not touch packages/world/**, apps/web/app/(landing)/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests for minimap snap zones, persisted position, the notification queue never showing two at once, and both keyboard modes
  - `pnpm e2e` → exit 0: on a 360×640 viewport the minimap occupies ≤ 22 % of the width and no HUD element overlaps the joystick zone
- Outcome: minimap (4 safe zones, persisted), compass, on-board menu with one module per section in apps/web/app/juego/menu/sections/ (T11 selector moved into «Mi Barco»), settings incl. keyboard modes, notice queue; @boia/engine/ui subpath; 235 tests, e2e 18 → e2dc04c

## T09 — Visual world editor
- Status: skipped (Hernán: visual demo first; depends on T07)
- Depends on: T00, T04, T08
- Goal: The Admin world editor of v14 §48.4 and §23.1 sharing packages/world and the engine renderer so that what is placed appears in the same spot in the game: isometric canvas, asset library (upload PNG/WebP with validation), inspector for identity/appearance/position/geometry/behaviors/params/content/state/reward, templates (save and duplicate), layers, snap, undo/redo, validation (an island must not block navigation, a teleport cannot land on land, referenced ids must exist), draft → preview (real engine, no rewards) → atomic publish → restore previous version.
- Context: docs/DECISIONES.md; docs/spec/07-admin.md, docs/spec/03-mundo-y-motor.md; packages/world/**, packages/engine/**, apps/web/app/admin/**.
- Scope: may touch ESTADO.md (own top section), apps/web/app/admin/world/** (new), packages/world/**, packages/engine/src/editor/** (new), supabase/** (new migrations only) / must not touch apps/web/app/(landing)/**, apps/web/app/juego/**, art/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: validation rules above; publish is atomic (a failing validation leaves the published version untouched); restore does not revert ledger or profiles
  - `pnpm e2e` → exit 0: create an island with a test asset, add proximity + content behaviors, preview, publish, swap the obstacle asset keeping its slow behavior, restore
- Outcome:

## T11 — Ship in the 8 exploration styles, selectable in the game
- Status: done
- Depends on: T00, T01
- Goal: Turn the 8 style studies in tools/blender/styles/ (01_boceto_lapiz … 08_pixel_art, today exploration only, not feeding art/) into ship sprite sets rendered by the same pipeline and camera (30°, D-13): per style, the `base` skin with the same frames as today's ship (8 directions × with/without passenger, plus the idle bob frames); fiesta/noche stay only in the current style. They live in art/barco/ under a style dimension, with manifest entries validated by check.py and labelled `muestra`. The game lets you switch the ship's style (a small test selector in /juego plus `?estilo=<id>`, persisted locally); the default stays the current style. Purpose: compare the 8 styles with Álvaro in-game.
- Context: docs/DECISIONES.md (D-13, D-15, D-16); docs/informes/2026-09-28-01-arte-barco-blender.md (pipeline, manifest contract, the 8-style exploration and its sheets docs/informes/img/01-estilo-*.png); tools/blender/** (render.py, ship.py, check.py, styles/); art/barco/manifest.json; the ship sprite loader in packages/engine (encargo 03 serves art/ through /api/art/..., see docs/informes/2026-09-28-03-monorepo-y-motor-base.md); apps/web/app/juego/**; T01's Outcome line (its manifest and style changes). Ship registry docs/barcos/barcos.json (B01–B08 = styles 01–08: `estilo` display name, `aspecto` description, `paleta` refs to script constants, `notas_render` with style×skin limits) and its checker `python3 tools/barcos/guia_colores.py --check`, which must stay at 0 broken refs.
- Scope: may touch ESTADO.md (own top section), tools/blender/**, art/barco/**, the ship sprite loading code in packages/engine/** (only what picking a style needs), apps/web/app/juego/** (style selector only) / must not touch art/ outside barco, apps/web/app/(landing)/**, packages/world/**, docs/spec/**.
- Done when:
  - `/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all` → exit 0, twice, outputs byte-identical (report the diff command)
  - `python3 tools/blender/check.py` → exit 0 and reports every style's ship manifest valid, with counts
  - `pnpm test` → exit 0; adds tests: every style id in the manifest resolves all 8 directions; an unknown `?estilo=` falls back to the default
  - `pnpm typecheck && pnpm lint` → exit 0
  - A contact sheet of the ship in all 8 styles at game scale over water saved in docs/informes/img/ (path in the final message)
- Outcome: 8 styles × 24 sprites in art/barco/estilos/<id>/ (labels from barcos.json), style_label/style_variants in manifest, /juego selector + ?estilo= persisted in localStorage boia:estilo-barco; sheet docs/informes/img/p001-t11-barco-estilos.png → 2ce57f2

## T12 — Demo pass: see it working end to end
- Status: running (attempt 1)
- Depends on: T00, T03, T04, T05, T11
- Goal: Hernán wants to see a working visual demo before any mail, auth or admin work. Glue what T01–T05 and T11 produced into one flow that runs with sample data only: `/` plays the entry (planet → sea → landing), EXPLORAR EL UNIVERSO enters /juego with the ship, the tutorial boia, rocks, coasts and the event island whose proximity opens the sample event panel; minimap, compass, menu and the ship-style selector work; Tickets opens the sample panel. No Supabase, no mail. Fix any gap between the pieces (loaders, routes, missing wiring) without redesigning them. This includes REQ-ENT-012, left open by T03: EXPLORAR moves from the entry scene into /juego without restarting the world (same sea and ship, no second intro). One command runs it locally and reachable from a phone on the same Wi-Fi (Next dev on 0.0.0.0, the LAN URL printed). Two additions Hernán asked for: (1) extend the «Mi Barco» section that T05 already created in apps/web/app/juego/menu/sections/ (it holds T11's style selector today) into the «Barco» section listing the 8 ship styles from T11 and the skins base/fiesta/noche (a skin shows only for the styles that have it), with a preview of each, applying the choice to the ship at once and persisting it locally; it replaces T11's test selector as the main way to switch (keep `?estilo=` working). (2) On the landing, «Ver todos los artistas» opens the full list of the 26 artists of v14 §18.1 (names verbatim, genres as in the spec, neutral avatars), as a panel or page that works without JS and without WebGL, reachable by a deep link.
- Context: the Outcome lines of T01–T05 and T11 in this plan; ESTADO.md sections of plan 001; apps/web/**, packages/engine/**, packages/world/**, art/**. For the «Barco» section use docs/barcos/barcos.json: `estilo` as the display name (`nombre` is null until Álvaro names them), `aspecto` as the description, swatches from `paleta` (resolved like tools/barcos/guia_colores.py does), and respect `notas_render` (B01 has no colour skins, no fiesta for B06, B05 needs remodelling for themed skins).
- Scope: may touch ESTADO.md (own top section), apps/web/**, packages/engine/**, packages/world/**, root package.json (scripts only) / must not touch supabase/**, packages/db/**, tools/blender/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: the «Barco» section lists exactly the styles and skins present in art/barco/manifest.json; the artist list renders every artist from its data source
  - `pnpm e2e` → exit 0, including a new end-to-end demo spec on mobile 360×640 and desktop: first visit ends on the landing without a click; EXPLORAR reaches /juego; driving the ship toward the event island opens its panel; choosing another style and skin in the menu's «Barco» section changes the ship and survives a reload; «Ver todos los artistas» shows all 26 artists
  - `pnpm demo` (added by this task) starts the app and prints a localhost and a LAN URL; stopping it leaves nothing running
  - Screenshots or a short recording of the flow on desktop and mobile saved in docs/informes/img/ (paths in the final message); ESTADO.md top section says in 3 lines how to open the demo on a computer and on a phone
- Outcome:

## T10 — Wire the public app to published data and the ticketing adapter
- Status: skipped (Hernán: visual demo first; depends on T07)
- Depends on: T00, T03, T05, T08, T09
- Goal: The landing, tickets and the game read only published data: home blocks and events from Supabase queries by state, the world from the published snapshot, guest and member progress through the ledger. Ticketing adapter interface with a sandbox implementation and a Fourvenues-shaped webhook (`payment.success` with `metadata.internal_id`) that adds a purchase stamp once per confirmation (D-06); external checkout still needs an explicit action. Deep links open Tickets/Fotos with the island visible and the panel open, without replaying the intro.
- Context: docs/DECISIONES.md (D-06); docs/spec/06-comercial.md, docs/spec/02-entrada-y-landing.md (§49.6), docs/spec/08-arquitectura-y-datos.md; everything T02–T09 produced (read their Outcome lines and the informes).
- Scope: may touch ESTADO.md (own top section), apps/web/**, packages/db/**, packages/contracts/**, supabase/functions/** (new) / must not touch packages/engine/src/** core systems (only its data loaders), art/**, tools/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: duplicate webhook delivery creates one stamp; a finished event never appears in a tickets CTA; a draft world is never served to the public route
  - `pnpm e2e` → exit 0: admin publishes an event and it appears on the landing and on its island without redeploy; sandbox checkout returns and the stamp appears in Mi Carnet
  - `pnpm build` → landing ≤ 1 MB gzip, /juego first sector ≤ 5 MB gzip
- Outcome:

## Decisions
- 2026-09-28 draft: task order inverts the v14 prompts (world and entry before Admin); see docs/PLAN.md and docs/DECISIONES.md D-02 (orquestador)
- 2026-09-28 draft: the original T01 (ship sprites in the engine) was dropped because encargo 03 already loads the real sprites; T01 is now the world art batch (orquestador)
- 2026-09-28 draft: keyboard with both modes (D-14) and smaller ship (D-15) (Hernán); local Postgres without Docker plus a cloud dev project for auth (D-17) (orquestador)
- 2026-09-28 T00: rename boya→boia everywhere incl. the in-game buoy ("Boia Fiestera", plural "boies"); v14 source left verbatim; folder renamed by Hernán after the plan (Hernán)
- 2026-09-28: every task depends on T00 so the rename never conflicts with parallel work (orchestrator)
- 2026-09-28: each task updates ESTADO.md itself (no per-task informe required); conflicts there are resolved keeping all sections (Hernán)
- 2026-09-28: draft preconditions checked: encargos 01 and 02 committed, every Context path exists, `pnpm test` green on main, fresh worktree probe ok at c8c63a9 (orchestrator)
- 2026-09-28: plan changed on Hernán's request: new T11 renders the ship in the 8 exploration styles and makes them selectable in /juego (Hernán); only the `base` skin per style to keep art/ size and render time bounded (orchestrator)
- 2026-09-28: up to 3 agents run at once instead of 2 (Hernán)
- 2026-09-28: tasks reordered by critical path (T06 → T07 → T08 → T09 → T10 first); ready tasks launch in this order (orchestrator)
- 2026-09-28 T00: D-18 and ESTADO describe the old spelling as "la grafía con y" so the Done-when grep stays empty; docs/PLAN.md slug now `objetos-y-boia-tutorial` (agent)
- 2026-09-28 T02: PostHog via its EU capture API without SDK (posthog-js pulls core-js, whose build script pnpm 11 blocks); in-memory id, no cookies, nothing sent without NEXT_PUBLIC_POSTHOG_KEY (agent)
- 2026-09-28 T02: tickets panel at /#tickets opens with CSS :target without JS; sample links to example.com; positioning line = §37.11 working phrase; artist order shuffled with a fixed seed (agent)
- 2026-09-28 T02: touched outside scope: vitest.config.ts (jsx automatic), root package.json e2e script, old apps/web/app/page.tsx moved to app/(landing)/page.tsx (agent)
- 2026-09-28 T06: event states and home block types as English enums aligned with @boia/contracts (a test keeps them equal); clients never write state/publish columns; ledger ids chosen by the server, balances derived by trigger; admin needs aal2 (agent)
- 2026-09-28 T06: root `test` script maps `--filter X` to a vitest path filter; seeds in supabase/seeds/, removable with supabase/sample/remove-sample.sql; each test file uses its own throwaway database (agent)
- 2026-09-28 T07: context changed so the agent builds everything locally first and blocks only at the e2e if the cloud keys are missing (orchestrator)
- 2026-09-28: Hernán: only what is needed to see a visual demo now, no mails or auth. T07 stopped (WIP kept), T08/T09/T10 skipped until he reopens them; new T12 glues the demo end to end (Hernán / orchestrator)
- 2026-09-28 T01: ship look in tools/blender/styles/muestra.py via `render.py --style`; `--out` is now a root folder, `--only <id>` renders one resource; all world art at the ship's pixels per unit (agent)
- 2026-09-28 T12: Hernán added two items: a «Barco» section in the on-board menu (8 styles + base/fiesta/noche skins, persisted) and the full list of the 26 artists behind «Ver todos los artistas» (Hernán)
- 2026-09-28: Hernán's ship registry (docs/barcos/, tools/barcos/) committed to main and added to T11 and T12 context (Hernán / orchestrator)
- 2026-09-28 T04: behavior ids in English matching T06 seeds, unknown types rejected; swap test compares traces, not .snap; SAMPLE_WORLD as data in packages/world; ship collision radius 13.5; /juego test flags ?pasajera=1 and ?arte=marcadores; space/enter advance bubbles, escape skips (agent)
- 2026-09-28: Hernán's other session finished; its docs/barcos and tools/barcos changes committed to main as dd156a7 to unblock integration (Hernán)
- 2026-09-28: Hernán stopped the watchdog timer; no new watchdogs are started for the rest of this plan (orchestrator)
- 2026-09-28 T11: style ids are slugs (boceto-lapiz … pixel-art); ?estilo= wins over the saved choice; canonical_order() sorts mesh elements for byte-identical renders; style ships use the default ship's scale so they show 49–57 px (agent)
- 2026-09-28 T05: joystick zone = bottom 45 % (muestra), HUD never enters it; discovery on entering the proximity radius; tank mode per D-14; English shown disabled (D-03); discoveries in memory only; T11's selector moved into «Mi Barco» because it sat in the joystick zone; small edits outside scope in packages/engine/src/game.ts and package.json (agent)
- 2026-09-28 T03: hero fills the screen with content at the bottom; seen flag in localStorage boia.intro.v1, replay via /?intro=1 or «Ver la introducción»; lightweight landing if the scene is not ready in 2 s; /api/art cached 1 h in production; T02 landing tests now run as return visits (agent)

## Proposals (new scope)
- 2026-09-28 T03: real-phone checks (ENT 04/05, REQ-ENT-018/021/022, Instagram in-app browser, screen reader) and the 2 s budget on real 4G are for Hernán; art direction pending Álvaro
- 2026-09-28 T11: the 7 world manifests carry a stale sources_sha256 (PNGs identical); the next committed `render.py --all` refreshes them
- 2026-09-28 T04: /juego copy lives in the component, not apps/web/lib/i18n; rewards/achievements emitted but not stored or shown; bottom coast drawn by code; drawRock in packages/engine/src/views.ts unused
- 2026-09-28 T01: coast corners, bottom coast and a separate flag sprite are missing
- 2026-09-28 T06: tables for discounts, discoveries, cosmetics catalogue, races and the common event location (REQ-COM-010) are not in the schema yet
- 2026-09-28 T06: migrations not yet applied to the real boia-planet-dev project; no supabase/config.toml or .env.example entry for BOIA_PG_URL
- 2026-09-28 T02: create the PostHog EU project and load NEXT_PUBLIC_POSTHOG_KEY (pedir-token); real sends untested
- 2026-09-28 T02: legal texts, official links, contact email, store and ticketing URLs pending from Álvaro
- 2026-09-28 T02: ESTADO.md and plans/ fail `prettier --check` (pre-existing); decide whether to exclude them or format

## Log
- 2026-09-28 19:50 T00 launched · attempt 1 · agent a01f4f1d6cbbc33b0
- 2026-09-28 19:55 T00 done · branch worktree-agent-a01f4f1d6cbbc33b0 → f6ebab0
- 2026-09-28 19:58 T06 launched · attempt 1 · agent a5a08a5e7cb452cb5
- 2026-09-28 19:58 T02 launched · attempt 1 · agent a7e2f22a4a0f6d626
- 2026-09-28 19:58 T01 launched · attempt 1 · agent af5e76d10c58b5de8
- 2026-09-28 20:08 T02 done · branch worktree-agent-a7e2f22a4a0f6d626 → e680599
- 2026-09-28 20:12 T06 done · branch worktree-agent-a5a08a5e7cb452cb5 (1 conflict round) → 6af3a0c
- 2026-09-28 20:13 T07 launched · attempt 1 · agent a208530713932c80c
- 2026-09-28 20:22 T01 done · branch worktree-agent-af5e76d10c58b5de8 (1 conflict round) → 948a52c
- 2026-09-28 20:22 T07 stopped by Hernán's change of focus · WIP a4c68d3 on worktree-agent-a208530713932c80c · worktree .claude/worktrees/agent-a208530713932c80c kept
- 2026-09-28 20:25 T04 launched · attempt 1 · agent a97cca5e60498bba8
- 2026-09-28 20:25 T03 launched · attempt 1 · agent adb4fa92632f4004f
- 2026-09-28 20:25 T11 launched · attempt 1 · agent a8b7248d022f3bd2d
- 2026-09-28 20:47 T04 done · branch worktree-agent-a97cca5e60498bba8 → bf8ef99
- 2026-09-28 20:49 T05 launched · attempt 1 · agent ab0317b3ea5c0aa70
- 2026-09-28 20:59 T11 done · branch worktree-agent-a8b7248d022f3bd2d (1 conflict round) → 2ce57f2
- 2026-09-28 21:13 T05 done · branch worktree-agent-ab0317b3ea5c0aa70 → e2dc04c
- 2026-09-28 21:17 T03 done · branch worktree-agent-adb4fa92632f4004f (1 conflict round) → 2e80904

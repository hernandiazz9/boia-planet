# Plan 001 — Playable demo of BOIA.PLANET (phase 1 + phase 2 foundations)

Status: active
Created: 2026-09-28
Base branch: main
Goal: Reach the first milestone Álvaro can open on his phone: cinematic entry (planet → sea → landing), HTML landing with tickets, and a navigable world with the real ship sprites, a tutorial buoy and one event island by proximity; plus the data layer, auth and the essential Admin so that events, home blocks and the world are data, not code. Scope, stack and every product decision are fixed in docs/DECISIONES.md (D-01…D-18); the consolidated spec is docs/spec/ (REQ-* ids). Nothing here goes beyond Launch 1 (D-02).
Test command: pnpm test
Worktree setup: pnpm install

Agent notes: do not invoke the project skills `encargo` or `orquestador` (the encargo skill cds into the main checkout); follow this prompt instead. Each task adds its own section at the top of ESTADO.md in the existing format (`## <date> — plan 001 T0x: <title>`, what exists, commands, deviations, untested); on a merge conflict there, keep every section, newest on top. Spanish copy and docs use the name "Boia" (D-18, from T00).

## Tasks

## T00 — Rename "boya" to "boia" across the repo
- Status: pending
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
- Outcome:

## T01 — World art batch v0 from the Blender pipeline
- Status: pending
- Depends on: T00
- Goal: Produce, with the same headless Blender pipeline, camera (30°, D-13) and style parameter as the ship, the first swappable world assets the demo needs: one large event island, one small secondary island, the tutorial buoy (idle loop), two rocks, a coastline set for the left and right world edges, and the intro planet as 2D layers (globe, sea band, clouds, a recognisable island shape for continuity, v14 §4.4). Every resource gets its own manifest (id, version, files, frames, scale, anchors, pivot, footprint/hitbox hint, license `muestra`) per v14 §49.17, validated by the existing check. Style: the current `muestra` style of art/barco, selectable so a later style change is a re-render (tools/blender/styles/).
- Context: docs/DECISIONES.md (D-05, D-13, D-16); docs/informes/2026-09-28-01-arte-barco-blender.md (pipeline, manifest contract, styles); tools/blender/** (rig.py, ship.py, render.py, check.py, styles/); v14 §4.4, §9, §34, §49.17 in docs/fuente/v14-maestro.md.
- Scope: may touch ESTADO.md (own top section), tools/blender/**, art/** (new folders only; art/barco/** only if a shared manifest field is added, re-rendered and re-checked) / must not touch apps/**, packages/**, docs/spec/**.
- Done when:
  - `/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all` → exit 0, twice, outputs byte-identical (report the diff command)
  - `python3 tools/blender/check.py` → exit 0 and reports every manifest valid (ship plus the new resources, with counts)
  - `python3 tools/blender/calibrate.py` (or its Blender invocation) → ratio 2.0 ± 0.04
  - A contact sheet of all new assets over water at game scale saved in docs/informes/img/ (path in the final message)
- Outcome:

## T02 — Landing by blocks, tickets panel, analytics
- Status: pending
- Depends on: T00
- Goal: The HTML landing of v14 §4.2/§4.4 driven by a typed block list with sample data: hero (title, positioning line, EXPLORAR EL UNIVERSO as dominant CTA per D-07, Tickets always visible), priority event, upcoming events, three artists rotating every 5 s without duplicates, philosophy, photos, store as external link, contact, footer with legal links. Tickets panel in HTML that works without WebGL. PostHog (EU) with the funnel events of D-04. Spanish only (D-03), i18n keys from the start.
- Context: docs/DECISIONES.md (D-02, D-03, D-04, D-07); docs/spec/02-entrada-y-landing.md, docs/spec/06-comercial.md, docs/spec/10-filosofia.md (copy is `muestra` until Álvaro approves); v14 §18.1 for the 26 artists (verbatim, neutral avatars); apps/web/**.
- Scope: may touch ESTADO.md (own top section), apps/web/** (except app/juego/**), packages/contracts/** / must not touch packages/engine/**, packages/world/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests for the block renderer (hidden blocks render nothing; artist rotation never repeats within a trio)
  - `pnpm build` → landing critical path ≤ 1 MB gzip (report the number)
  - `pnpm e2e` (added by this task: Playwright, Chromium, mobile and desktop projects) → exit 0: opens `/`, sees the CTA and Tickets above the fold at 360×640, opens the tickets panel with the game bundle blocked
  - axe-core on `/` → 0 serious or critical violations
- Outcome:

## T03 — Cinematic entry: planet → sea → landing
- Status: pending
- Depends on: T00, T01, T02
- Goal: The automatic entry of v14 §4.4 and §47-B: planet illustrated in 2D layers, continuous approach, reveal of the isometric sea with islands and the ship, landing content appears over the same scene. No click, no language or login screen. Skip control (idempotent), reduced-motion variant (static scene + short fade), lightweight fallback when assets or the renderer fail, no replay on deep links or return visits. Target ~3 s, measured. Acceptance ENT 01–06 as far as they can be automated; the rest listed for Hernán to check on real phones.
- Context: docs/DECISIONES.md; docs/spec/02-entrada-y-landing.md (REQ-ENT-*); apps/web/app/**; packages/engine/** (camera and scene handoff); planet layers and islands produced by T01 under art/ (read their manifests); the Outcome lines of T01 and T02.
- Scope: may touch ESTADO.md (own top section), apps/web/**, packages/engine/src/intro/** (new) / must not touch packages/world/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds a state-machine test: skip twice, back, route change and tab hide never duplicate the world or start a game
  - `pnpm e2e` → exit 0: first visit ends on an interactive landing without a click; with `prefers-reduced-motion` no camera movement; with the engine bundle blocked the landing still shows the island illustration and working Tickets
  - Recordings of desktop and mobile viewport saved under docs/informes/img/ (paths listed in the final message)
- Outcome:

## T04 — World objects and behavior catalog v1, tutorial buoy, test island
- Status: pending
- Depends on: T00, T01
- Goal: Implement v14 §48 in the engine: a WorldObject is asset + geometry + behaviors from a catalog + params. Catalog v1: collision (block, bounce, brake, slow, boost), proximity, dialogue (speech bubbles, 1.5 s per line, tap to advance or skip, playful reaction when the ship leaves), collectible, reward, content (open an HTML panel), ticket, checkpoint, teleport, spawn, achievement-trigger, decorative, and an empty INICIAR_MINIJUEGO extension point. Sample world built from the T01 assets: spawn point, tutorial buoy that pulses the menu anchor and minimap placeholders, one event island with a wide proximity radius that opens a sample event panel, rocks as obstacles, coastline at both edges. Also: ship length on screen to ~48 px (D-15), the ship's idle bob loop and the passenger slot from the manifest (passenger hidden until the Fiestera mission).
- Context: docs/DECISIONES.md (D-12, D-13, D-15, D-16); docs/spec/03-mundo-y-motor.md, docs/spec/04-aventura.md (REQ-MUN-*, REQ-AVE-* for §7 and §9), docs/spec/07-admin.md (§48.2–48.3); docs/informes/2026-09-28-03-monorepo-y-motor-base.md; packages/world/**, packages/engine/**; the art/ manifests from T01.
- Scope: may touch ESTADO.md (own top section), packages/world/**, packages/engine/**, apps/web/app/juego/** / must not touch apps/web/app/(landing)/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests per behavior (a slow obstacle reduces speed by its param for its duration; proximity fires enter/exit once; dialogue advances at 1.5 s and skips; a collectible grants its reward exactly once per configured policy)
  - A swap test: the same behavior config with a different asset id renders differently and behaves identically (snapshot of simulation trace)
  - `pnpm typecheck && pnpm lint` → exit 0
- Outcome:

## T05 — Minimap, compass, on-board menu shell, settings, notification queue
- Status: pending
- Depends on: T00, T04, T02
- Goal: v14 §10, §19, §20, §14: minimap 96 px on mobile (D-07), tap to expand with island names, 500 ms long-press to drag with snap to safe zones and persisted position, compass to the next undiscovered target; on-board menu with the seven icons of §19 (sections can be stubs), settings with language, music and SFX separately, and the keyboard mode of D-14 (screen-direction by default, tank control as an option, persisted); notification queue (one at a time, 4 s, top, navy/orange, short sound).
- Context: docs/DECISIONES.md (D-07, D-14); docs/spec/03-mundo-y-motor.md, docs/spec/05-identidad-y-comunidad.md (menu, settings, notifications); packages/engine/** (KeyboardControls already exists), apps/web/app/juego/**.
- Scope: may touch ESTADO.md (own top section), packages/engine/src/ui/** (new), packages/engine/src/input/** (keyboard mode only), apps/web/app/juego/** / must not touch packages/world/**, apps/web/app/(landing)/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests for minimap snap zones, persisted position, the notification queue never showing two at once, and both keyboard modes
  - `pnpm e2e` → exit 0: on a 360×640 viewport the minimap occupies ≤ 22 % of the width and no HUD element overlaps the joystick zone
- Outcome:

## T06 — Supabase schema, migrations, RLS
- Status: pending
- Depends on: T00
- Goal: The data layer of docs/spec/08-arquitectura-y-datos.md for Launch 1: users and carnets (5 public questions, member-since date), events with the seven states of §49.4 and island separated from event, islands, world objects and versioned world snapshots (draft/published), home blocks, achievements with trigger conditions, points and coins ledger (idempotent transactions with stable ids), bottles, audit log. No Docker on this Mac (D-17): migrations are plain SQL in supabase/migrations/ and are tested against the local Homebrew PostgreSQL 17 (port 5432, database `boia_planet_test`, created and dropped by the test harness) with a Supabase-compatible shim (roles anon/authenticated/service_role, schema auth with auth.uid() reading request.jwt.claims). Migrations cumulative; seed data labeled `muestra`; RLS so that no client can write balances, roles, stamps or purchase states.
- Context: docs/DECISIONES.md (D-04, D-09, D-10, D-17); docs/spec/08-arquitectura-y-datos.md, docs/spec/06-comercial.md (event states table), docs/spec/07-admin.md; skills `supabase` and `supabase-postgres-best-practices` (load them before writing SQL).
- Scope: may touch ESTADO.md (own top section), supabase/**, packages/db/** (new), root package.json (scripts only) / must not touch apps/web/app/**, packages/engine/**, packages/world/**. Never touch other databases on the local server.
- Done when:
  - `pnpm db:test` (added by this task) → exit 0: applies every migration to an empty `boia_planet_test`, then re-applies the new ones on top of seeded data without a destructive reset
  - `pnpm test --filter db` → exit 0: RLS tests prove an anonymous or member role cannot insert into ledger, stamps, roles or event state; a second identical reward transaction id is rejected
  - `pnpm typecheck` → exit 0 with generated types committed
- Outcome:

## T07 — Public auth (OTP + magic link), guest session, idempotent merge
- Status: pending
- Depends on: T00, T06, T02
- Goal: D-10: sign in by email with a 6-digit code and a magic link in the same mail; guest identity stored locally with a server-side anonymous id; on sign-in, merge guest progress by ids (union of discoveries, rewards synced once per id, never importing local balances as truth); return to the same panel after verification; "Continuar sin registrarme" always available.
- Context: docs/DECISIONES.md (D-09, D-10, D-17); docs/spec/05-identidad-y-comunidad.md (REQ-IDE-* for §49.10), docs/spec/08-arquitectura-y-datos.md; supabase/**, packages/db/**, apps/web/**. Auth runs against the cloud dev project `boia-planet-dev` (D-17): if `.env.local` has no Supabase URL and keys, stop with STATUS: blocked and ask Hernán to create the project and load the keys with the `pedir-token` skill; never create accounts or paste secrets.
- Scope: may touch ESTADO.md (own top section), apps/web/app/(auth)/** (new), apps/web/lib/auth/** (new), packages/db/**, supabase/** (new migrations only) / must not touch packages/engine/**, apps/web/app/juego/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: merging the same guest twice grants each reward once; a tampered local balance is ignored; OTP and link both create the same session
  - `pnpm e2e` → exit 0 against the dev project: request a code, read it through the Supabase admin API in the test (service key from .env.local, never logged), sign in, land on the originating panel
- Outcome:

## T08 — Admin base: login with TOTP, roles, audit, events and home blocks
- Status: pending
- Depends on: T00, T07
- Goal: docs/spec/07-admin.md for Launch 1: admin login with password + TOTP, roles owner/admin/editor enforced in routes, services and RLS, audit log of every change, recoverable trash with double confirmation; Events CRUD with the seven states, automatic date transitions via pg_cron plus manual override with audit, event↔island separation (an island keeps history and can receive a new event); Home blocks editor (order, show/hide, schedule, priority event) with desktop/mobile preview; artists and photo albums CRUD. First-owner bootstrap generates a random temporary password shown once (never in repo).
- Context: docs/DECISIONES.md; docs/spec/07-admin.md, docs/spec/06-comercial.md; apps/web/**, packages/db/**, supabase/**.
- Scope: may touch ESTADO.md (own top section), apps/web/app/admin/** (new), apps/web/lib/admin/** (new), packages/db/**, supabase/** (new migrations only) / must not touch packages/engine/**, packages/world/**, apps/web/app/juego/**.
- Done when:
  - `pnpm test` → exit 0; adds permission tests per role (editor cannot publish; member cannot reach admin; no route lets a member escalate), and the event lifecycle test: publish → appears in home query; finish → leaves sale, island keeps memories; link a new event → back in home
  - `pnpm e2e` → exit 0: owner bootstrap, TOTP enrolment, create event, edit home blocks, preview, publish
  - `grep -r` for secrets in repo and client bundle → none (report the command)
- Outcome:

## T09 — Visual world editor
- Status: pending
- Depends on: T00, T04, T08
- Goal: The Admin world editor of v14 §48.4 and §23.1 sharing packages/world and the engine renderer so that what is placed appears in the same spot in the game: isometric canvas, asset library (upload PNG/WebP with validation), inspector for identity/appearance/position/geometry/behaviors/params/content/state/reward, templates (save and duplicate), layers, snap, undo/redo, validation (an island must not block navigation, a teleport cannot land on land, referenced ids must exist), draft → preview (real engine, no rewards) → atomic publish → restore previous version.
- Context: docs/DECISIONES.md; docs/spec/07-admin.md, docs/spec/03-mundo-y-motor.md; packages/world/**, packages/engine/**, apps/web/app/admin/**.
- Scope: may touch ESTADO.md (own top section), apps/web/app/admin/world/** (new), packages/world/**, packages/engine/src/editor/** (new), supabase/** (new migrations only) / must not touch apps/web/app/(landing)/**, apps/web/app/juego/**, art/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: validation rules above; publish is atomic (a failing validation leaves the published version untouched); restore does not revert ledger or profiles
  - `pnpm e2e` → exit 0: create an island with a test asset, add proximity + content behaviors, preview, publish, swap the obstacle asset keeping its slow behavior, restore
- Outcome:

## T10 — Wire the public app to published data and the ticketing adapter
- Status: pending
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

## Proposals (new scope)

## Log

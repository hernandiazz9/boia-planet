# Plan 001 — Playable demo of BOIA.PLANET (phase 1 + phase 2 foundations)

Status: draft
Created: 2026-09-28
Base branch: main
Goal: Reach the first milestone Álvaro can open on his phone: cinematic entry (planet → sea → landing), HTML landing with tickets, and a navigable world with the real ship sprites, a tutorial buoy and one event island by proximity; plus the data layer, auth and the essential Admin so that events, home blocks and the world are data, not code. Scope, stack and every product decision are fixed in docs/DECISIONES.md (D-01…D-12); the consolidated spec is docs/spec/ (REQ-* ids). Nothing here goes beyond Launch 1 (D-02).
Test command: pnpm test
Worktree setup: pnpm install

> DRAFT written by the orquestador session on 2026-09-28, before round 1 (encargos 01, 02, 03) closed.
> Before setting `Status: active`: re-check every Context path against the repo, confirm the test
> command is green on main, and drop or split tasks that round 1 already covered.

## Tasks

## T01 — Ship sprites in the engine
- Status: pending
- Depends on: none
- Goal: Replace the placeholder ship with the 8-direction sprites produced by encargo 01, read through art/barco/manifest.json (skins, idle bob loop, passenger slot, wake origin, pivot). The heading→direction mapping must stay monotonic through N (v14 §49.17).
- Context: docs/DECISIONES.md (D-05, D-07); docs/spec/03-mundo-y-motor.md; docs/prompts/01-arte-barco-blender.md point 6 (manifest contract); docs/informes/*-01-* and *-03-* (what exists, measured numbers); packages/engine/src/**; art/barco/**.
- Scope: may touch packages/engine/**, apps/web/app/juego/** / must not touch art/**, tools/**, packages/world/** (except adding optional manifest types), docs/spec/**.
- Done when:
  - `pnpm test` → exit 0, no fewer passing tests than main, plus a test that every skin×direction in the manifest resolves to an existing texture and anchors are inside the image bounds
  - `pnpm typecheck && pnpm lint` → exit 0
  - `pnpm build` → /juego route bundle ≤ 5 MB gzip (report the number)
- Outcome:

## T02 — Landing by blocks, tickets panel, analytics
- Status: pending
- Depends on: none
- Goal: The HTML landing of v14 §4.2/§4.4 driven by a typed block list with sample data: hero (title, positioning line, EXPLORAR EL UNIVERSO as dominant CTA per D-07, Tickets always visible), priority event, upcoming events, three artists rotating every 5 s without duplicates, philosophy, photos, store as external link, contact, footer with legal links. Tickets panel in HTML that works without WebGL. PostHog (EU) with the funnel events of D-04. Spanish only (D-03), i18n keys from the start.
- Context: docs/DECISIONES.md (D-02, D-03, D-04, D-07); docs/spec/02-entrada-y-landing.md, docs/spec/06-comercial.md, docs/spec/10-filosofia.md (copy is `muestra` until Álvaro approves); v14 §18.1 for the 26 artists (verbatim, neutral avatars); apps/web/**.
- Scope: may touch apps/web/** (except app/juego/**), packages/contracts/** / must not touch packages/engine/**, packages/world/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests for the block renderer (hidden blocks render nothing; artist rotation never repeats within a trio)
  - `pnpm build` → landing critical path ≤ 1 MB gzip (report the number)
  - `pnpm e2e` → exit 0: Playwright opens `/`, sees the CTA and Tickets above the fold at 360×640, opens the tickets panel with JavaScript disabled for the game bundle
  - axe-core on `/` → 0 serious or critical violations
- Outcome:

## T03 — Cinematic entry: planet → sea → landing
- Status: pending
- Depends on: T01, T02
- Goal: The automatic entry of v14 §4.4 and §47-B: planet illustrated in 2D layers, continuous approach, reveal of the isometric sea with islands and the ship, landing content appears over the same scene. No click, no language or login screen. Skip control (idempotent), reduced-motion variant (static scene + short fade), lightweight fallback when assets or the renderer fail, no replay on deep links or return visits. Target ~3 s, measured. Acceptance ENT 01–06 as far as they can be automated; the rest listed for Hernán to check on real phones.
- Context: docs/DECISIONES.md; docs/spec/02-entrada-y-landing.md (REQ-ENT-*); apps/web/app/**; packages/engine/** (camera and scene handoff); docs/informes/*-T01-* and *-T02-*.
- Scope: may touch apps/web/**, packages/engine/src/intro/** (new) / must not touch packages/world/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds a state-machine test: skip twice, back, route change and tab hide never duplicate the world or start a game
  - `pnpm e2e` → exit 0: first visit ends on an interactive landing without a click; with `prefers-reduced-motion` no camera movement; with the engine bundle blocked the landing still shows the island illustration and working Tickets
  - Recordings of desktop and mobile viewport saved under docs/informes/img/ (paths listed in the final message)
- Outcome:

## T04 — World objects and behavior catalog v1, tutorial buoy, test island
- Status: pending
- Depends on: T01
- Goal: Implement v14 §48 in the engine: a WorldObject is asset + geometry + behaviors from a catalog + params. Catalog v1: collision (block, bounce, brake, slow, boost), proximity, dialogue (speech bubbles, 1.5 s per line, tap to advance or skip, playful reaction when the ship leaves), collectible, reward, content (open an HTML panel), ticket, checkpoint, teleport, spawn, achievement-trigger, decorative, and an empty INICIAR_MINIJUEGO extension point. Sample world: spawn point, tutorial buoy that pulses the menu anchor and minimap placeholders, one event island with a wide proximity radius that opens a sample event panel, a few obstacles.
- Context: docs/DECISIONES.md; docs/spec/03-mundo-y-motor.md, docs/spec/04-aventura.md (REQ-MUN-*, REQ-AVE-* for §7 and §9), docs/spec/07-admin.md §48.2–48.3; packages/world/**, packages/engine/**.
- Scope: may touch packages/world/**, packages/engine/**, apps/web/app/juego/** / must not touch apps/web/app/(landing)/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests per behavior (a slow obstacle reduces speed by its param for its duration; proximity fires enter/exit once; dialogue advances at 1.5 s and skips; a collectible grants its reward exactly once per configured policy)
  - A swap test: the same behavior config with a different asset id renders differently and behaves identically (snapshot of simulation trace)
  - `pnpm typecheck && pnpm lint` → exit 0
- Outcome:

## T05 — Minimap, compass, on-board menu shell, settings, notification queue
- Status: pending
- Depends on: T04
- Goal: v14 §10, §19, §20, §14: minimap 96 px on mobile (D-07), tap to expand with island names, 500 ms long-press to drag with snap to safe zones and persisted position, compass to the next undiscovered target; on-board menu with the seven icons of §19 (sections can be stubs), settings with language, music and SFX separately; notification queue (one at a time, 4 s, top, navy/orange, short sound).
- Context: docs/DECISIONES.md (D-07); docs/spec/03-mundo-y-motor.md, docs/spec/05-identidad-y-comunidad.md (menu, settings, notifications); packages/engine/**, apps/web/app/juego/**.
- Scope: may touch packages/engine/src/ui/** (new), apps/web/app/juego/** / must not touch packages/world/**, apps/web/app/(landing)/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests for minimap snap zones, persisted position, and that the notification queue never shows two at once
  - `pnpm e2e` → exit 0: on a 360×640 viewport the minimap occupies ≤ 22 % of the width and no HUD element overlaps the joystick zone
- Outcome:

## T06 — Supabase schema, migrations, RLS
- Status: pending
- Depends on: none
- Goal: The data layer of docs/spec/08-arquitectura-y-datos.md for Launch 1: users and carnets (5 public questions, member-since date), events with the seven states of §49.4 and island separated from event, islands, world objects and versioned world snapshots (draft/published), home blocks, achievements with trigger conditions, points and coins ledger (idempotent transactions with stable ids), bottles, audit log. Local development with the Supabase CLI; migrations cumulative; seed data labeled `muestra`; RLS so that no client can write balances, roles, stamps or purchase states.
- Context: docs/DECISIONES.md (D-04, D-09, D-10); docs/spec/08-arquitectura-y-datos.md, docs/spec/06-comercial.md (event states table), docs/spec/07-admin.md; skill `supabase` and `supabase-postgres-best-practices` (load them before writing SQL).
- Scope: may touch supabase/**, packages/db/** (new), package.json scripts / must not touch apps/web/app/**, packages/engine/**, packages/world/**.
- Done when:
  - `supabase start && supabase db reset` → exit 0 from an empty database and again on top of seeded data (no destructive reset)
  - `pnpm test --filter db` → exit 0: RLS tests prove an anonymous or member role cannot insert into ledger, stamps, roles or event state; a second identical reward transaction id is rejected
  - `pnpm typecheck` → exit 0 with generated types committed
- Outcome:

## T07 — Public auth (OTP + magic link), guest session, idempotent merge
- Status: pending
- Depends on: T06
- Goal: D-10: sign in by email with a 6-digit code and a magic link in the same mail; guest identity stored locally with a server-side anonymous id; on sign-in, merge guest progress by ids (union of discoveries, rewards synced once per id, never importing local balances as truth); return to the same panel after verification; "Continuar sin registrarme" always available.
- Context: docs/DECISIONES.md (D-09, D-10); docs/spec/05-identidad-y-comunidad.md (REQ-IDE-* for §49.10), docs/spec/08-arquitectura-y-datos.md; supabase/**, packages/db/**, apps/web/**.
- Scope: may touch apps/web/app/(auth)/** (new), apps/web/lib/auth/** (new), packages/db/**, supabase/** (new migrations only) / must not touch packages/engine/**, apps/web/app/juego/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: merging the same guest twice grants each reward once; a tampered local balance is ignored; OTP and link both create the same session
  - `pnpm e2e` → exit 0 against local Supabase (Inbucket): request code, sign in, land on the originating panel
- Outcome:

## T08 — Admin base: login with TOTP, roles, audit, events and home blocks
- Status: pending
- Depends on: T07
- Goal: docs/spec/07-admin.md for Launch 1: admin login with password + TOTP, roles owner/admin/editor enforced in routes, services and RLS, audit log of every change, recoverable trash with double confirmation; Events CRUD with the seven states, automatic date transitions via pg_cron plus manual override with audit, event↔island separation (an island keeps history and can receive a new event); Home blocks editor (order, show/hide, schedule, priority event) with desktop/mobile preview; artists and photo albums CRUD. First-owner bootstrap generates a random temporary password shown once (never in repo).
- Context: docs/DECISIONES.md; docs/spec/07-admin.md, docs/spec/06-comercial.md; apps/web/**, packages/db/**, supabase/**.
- Scope: may touch apps/web/app/admin/** (new), apps/web/lib/admin/** (new), packages/db/**, supabase/** (new migrations only) / must not touch packages/engine/**, packages/world/**, apps/web/app/juego/**.
- Done when:
  - `pnpm test` → exit 0; adds permission tests per role (editor cannot publish; member cannot reach admin; no route lets a member escalate), and the event lifecycle test: publish → appears in home query; finish → leaves sale, island keeps memories; link a new event → back in home
  - `pnpm e2e` → exit 0: owner bootstrap, TOTP enrolment, create event, edit home blocks, preview, publish
  - `grep -r` for secrets in repo and client bundle → none (report the command)
- Outcome:

## T09 — Visual world editor
- Status: pending
- Depends on: T04, T08
- Goal: The Admin world editor of v14 §48.4 and §23.1 sharing packages/world and the engine renderer so that what is placed appears in the same spot in the game: isometric canvas, asset library (upload PNG/WebP with validation), inspector for identity/appearance/position/geometry/behaviors/params/content/state/reward, templates (save and duplicate), layers, snap, undo/redo, validation (an island must not block navigation, a teleport cannot land on land, referenced ids must exist), draft → preview (real engine, no rewards) → atomic publish → restore previous version.
- Context: docs/DECISIONES.md; docs/spec/07-admin.md, docs/spec/03-mundo-y-motor.md; packages/world/**, packages/engine/**, apps/web/app/admin/**.
- Scope: may touch apps/web/app/admin/world/** (new), packages/world/**, packages/engine/src/editor/** (new), supabase/** (new migrations only) / must not touch apps/web/app/(landing)/**, apps/web/app/juego/**, art/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: validation rules above; publish is atomic (a failing validation leaves the published version untouched); restore does not revert ledger or profiles
  - `pnpm e2e` → exit 0: create an island with a test asset, add proximity + content behaviors, preview, publish, swap the obstacle asset keeping its slow behavior, restore
- Outcome:

## T10 — Wire the public app to published data and the ticketing adapter
- Status: pending
- Depends on: T03, T05, T08, T09
- Goal: The landing, tickets and the game read only published data: home blocks and events from Supabase queries by state, the world from the published snapshot, guest and member progress through the ledger. Ticketing adapter interface with a sandbox implementation and a Fourvenues-shaped webhook (`payment.success` with `metadata.internal_id`) that adds a purchase stamp once per confirmation (D-06); external checkout still needs an explicit action. Deep links open Tickets/Fotos with the island visible and the panel open, without replaying the intro.
- Context: docs/DECISIONES.md (D-06); docs/spec/06-comercial.md, docs/spec/02-entrada-y-landing.md (§49.6), docs/spec/08-arquitectura-y-datos.md; everything T02–T09 produced (read their Outcome lines and the informes).
- Scope: may touch apps/web/**, packages/db/**, packages/contracts/**, supabase/functions/** (new) / must not touch packages/engine/src/** core systems (only its data loaders), art/**, tools/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: duplicate webhook delivery creates one stamp; a finished event never appears in a tickets CTA; a draft world is never served to the public route
  - `pnpm e2e` → exit 0: admin publishes an event and it appears on the landing and on its island without redeploy; sandbox checkout returns and the stamp appears in Mi Carnet
  - `pnpm build` → landing ≤ 1 MB gzip, /juego first sector ≤ 5 MB gzip
- Outcome:

## Decisions
- 2026-09-28 draft: task order inverts the v14 prompts (world and entry before Admin); see docs/PLAN.md and docs/DECISIONES.md D-02 (orquestador)

## Proposals (new scope)

## Log

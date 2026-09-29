# Plan 004 — Close the v14 gaps: ship economy, world-switch vortex, events and discounts that lead to islands, local ranking, sound, admin and delivery

Status: active
Created: 2026-09-29
Base branch: plan-004
Goal: Close every gap found in the v14 → code inventory (docs/informes/2026-09-29-inventario-v14.md) that can be built without Álvaro or Supabase, plus Hernán's decisions of 2026-09-29 (second batch): coins buy ships and skins (only the two starting-world ships unlocked, one ship unlocked by points), a black-hole transition when switching world (same places, only renders and dialogues change), discount cards that sail you to their island and a visible discount when buying there, «Ver fotos de la isla» into a «Fotos y eventos» page, a local-only ranking, texts for every zone written by the team, and the orchestrator's delegated decisions O1–O15 of the inventory. Also Álvaro's answers of inventory §6: the mascot (art/marca/boia-mascota.jpg) becomes every 3D boia of the game, the wordmark (art/marca/boia-wordmark.jpg) becomes the intro letters and the logo, the first real event is «BOIA Club · Halloween» at the Kiki García Bar, the home shows a personal selection of photos, and the legal pages use invented, jokey data. Everything stays browser-only (D-20) and `muestra` except that event. Runs next to plan 003 (Hernán, 2026-09-29): this plan integrates into the branch `plan-004` in the worktree .claude/worktrees/orq-004, and merges into main only at the end; main belongs to the plan 003 orchestrator until then.
Test command: pnpm test
Worktree setup: pnpm install
Status file: ESTADO.md
Max parallel agents: 2

Agent notes: your base branch is `plan-004` (not main): start with `git merge --ff-only plan-004`. Do not invoke the project skills `encargo` or `orquestador`; follow this prompt. Read docs/informes/2026-09-29-inventario-v14.md first: §1 and §2 are the decisions this plan implements, §3 the gaps by REQ id. Each task writes its ESTADO.md section (`## <date> — plan 004 Txx: <title>`, same content as before) to `.orchestrator/status/Txx.md` and never edits ESTADO.md; the orchestrator folds it in when integrating. Spanish copy uses "Boia" (D-18); UI copy comes from docs/propuestas/textos-zonas.md once T38 is merged. `/juego` (2D) and `/mar` (3D) share packages/store and packages/world: a gameplay feature lands in both unless the task says otherwise. Hernán may run a dev server on port 3000: never kill it and never use port 3000 (use 3100+). Run e2e with `--workers=2` and a free E2E_PORT. Every task touching the UI saves phone-size screenshots (390×844) in docs/informes/img/ named `p004-txx-*.png`.

## Tasks

## T38 — Decision D-23, spec updates and the texts of every zone
- Status: done
- Depends on: none (plan 003 T32 is done, D-22 is on main)
- Goal: Record inventory §1 as D-23 in docs/DECISIONES.md (author Hernán) with the orchestrator's delegated decisions O1–O15 inside it (author orquestador by Hernán's delegation, Álvaro only to review), close P4, P6, P8–P12 in «Preguntas abiertas» as decided, record Álvaro's answers of inventory §6 (P13 closed: full permission for Hernán; P2 stays open; new P14… for what is still missing: real links, real codes, artist photos, music options, Halloween poster, font file). Update the affected REQ lines (PRO-009 HUD, MUN-035/ADM-032 single spawn, COM-010 satellites, IDE-038 ranking local-only as a test-version exception, IDE-030/031 economy, new REQs for world-switch transition, carnet moderation and discount-to-island if check.py needs them). Fix stale docs: docs/PLAN.md Faro/Cañón frozen, mundos/arcilla/diseno.md Faro/Cañón as L2, docs/spec/00-indice.md decision range. Write docs/propuestas/textos-zonas.md: final-feeling Spanish copy (`muestra`, BOIA voice from docs/spec/10-filosofia.md) for the 18 zones of v14 §31.2 plus Welcome Aboard, Faro, Cañón, boia de WhatsApp, the 5 new informative boies (per world: Arcilla and Acuarela), Carnet invitations, empty and error states, ranking, ship shop, world switch; one key per string, grouped by screen. The 5 Carnet questions stay verbatim from v14 §44.1. Legal pages (aviso legal, privacidad, cookies) rewritten with the invented data of inventory §6 (Bollería Fina del Mediterráneo, S.L., Benito Camelas, Débora Melo, C/ Rosa Melano 69…), clearly marked `muestra`, in docs/propuestas/textos-zonas.md for T49 to wire.
- Context: docs/informes/2026-09-29-inventario-v14.md; docs/DECISIONES.md (D-20…D-22 format); docs/spec/**; tools/spec/check.py; docs/fuente/v14-maestro.md §31, §37, §44.1; mundos/*/diseno.md; apps/web/lib/i18n/es.ts (existing keys).
- Scope: may touch ESTADO.md (own top section), docs/DECISIONES.md, docs/spec/**, docs/PLAN.md, mundos/arcilla/diseno.md, docs/propuestas/textos-zonas.md (new) / must not touch code, art/**, plans/**.
- Done when:
  - `python3 tools/spec/check.py` → exit 0 and `python3 tools/spec/test_check.py` → exit 0
  - `grep -n "D-23" docs/DECISIONES.md` → the decision with Hernán's 11 points and O1–O15
  - docs/propuestas/textos-zonas.md covers every zone listed above (a table of zones at the top with the number of strings each)
- Outcome: D-23 (Hernán's 11 points, O1–O15, Álvaro's answers; P15–P22 new), 294 REQ, docs/propuestas/textos-zonas.md (32 zones, 618 strings, legal pages with the jokey data), stale docs fixed; O5 aligned with plan 003's catalog: coins buy B03 300/B06 400, B04 at 1500 points, achievements give B07/B01/B08, skins 150 → 69172c6

## T39 — Art: the BOIA mascot as every boia, ship skins to sell, secrets
- Status: done
- Depends on: none
- Goal: Render with the Blender pipeline what the economy and the map need: `noche` and `fiesta` skins for every style ship that lacks them (at least B05 Arcilla and B02 Acuarela, ideally all 8 styles), 8 directions + passenger frames like the base; the BOIA mascot (art/marca/boia-mascota.jpg: orange round body, navy-blue pointed cap with a hole, big eyes, wide grin, black outline) modelled in Blender as a floating buoy (the body is the buoy, a waterline and a small float ring or ballast so it reads as a boya) and rendered for every boia of the game in each world style (Arcilla clay, Acuarela wash): the first boia, the 5 new informative boies, the WhatsApp boia and the Boia Fiestera (the same mascot with her party details, replacing the current Fiestera art, TRIPULANTE frames included), with an idle bob and a talking frame; a glTF of the mascot boia for `/mar`; a secret marker per world (small, readable at game scale); and the matching glTF where `/mar` needs it (tools/blender/export_barcos_glb.py). Manifests valid and reproducible.
- Context: tools/blender/** (render.py, check.py, styles/, export_barcos_glb.py), art/barco/** (estilos, base/noche/fiesta, 3d/manifest.json), art/mundos/{arcilla,acuarela}/**, docs/barcos/barcos.json, plan 002 T18/T19 Outcomes.
- Scope: may touch ESTADO.md (own top section), tools/blender/**, art/barco/**, art/mundos/**/boia*/**, art/mundos/**/fiestera/**, art/mundos/**/secreto/**, art/marca/** (derived files only) / must not touch apps/**, packages/**, docs/spec/**.
- Done when:
  - Blender render of the new assets → exit 0 twice, byte-identical; `python3 tools/blender/check.py` → exit 0 listing them
  - A contact sheet p004-t39-skins.png (every ship × base/noche/fiesta) and p004-t39-boias-mascota.png (every boia in both worlds next to the logo) in docs/informes/img/
- Outcome: mascot boia in tools/blender/mascota.py (primera, info, WhatsApp, Fiestera with balloons; idle + talking) for Arcilla and Acuarela under `extras` in lugares.json, secret marker, noche/fiesta skins for 7 of 8 styles (B01 held base-only), mascot passenger on every ship, glTFs in art/barco/3d; 848 images, check.py green → e38c31a

## T40 — Ship economy: locked ships and skins, coins shop, points unlock
- Status: pending
- Depends on: T39, plan 003 finished
- Goal: First make `apps/web/e2e/demo.spec.ts:197` «Barco» pass again on mobile and desktop (it fails on plan-004 since the plan 003 T36 / T39 changes to ships and skins, found by T42). Then inventory §1.1 and O5 (as amended by D-23: B03/B06 by coins, B04 by 1500 points, B07/B01/B08 by achievements, skins 150): every ship style and skin is locked except B05 Arcilla and B02 Acuarela (base). Coins buy ships and skins at the `muestra` prices of O5; B04 Semi-realista unlocks at 1500 points (threshold, points are never spent); the achievement-reward ship of D-22/T36 stays locked until claimed. A «Barco» shop in the /juego menu and the /mar ship picker: each ship with its price or unlock condition and «te faltan N monedas/puntos», buy with confirmation, equip, owned marked. Flag and wake cosmetics are drawn on the ship (a flag overlay on the mast slot, wake tint) in both views. Balances stay derived from the ledger; a purchase is one idempotent ledger debit; physics identical whatever the ship or cosmetic (REQ-IDE-032 test). Saved choice restores on reload; a store migration keeps whatever the visitor has already equipped as owned.
- Context: inventory §1.1, §2 O2/O5, §3 Identidad; docs/spec/05-identidad-y-comunidad.md (REQ-IDE-027, 030…033); packages/store (cosmetics, buyCosmetic/equip, ledger, T36 reward types); apps/web/app/juego/menu/sections (Barco), apps/web/lib/barco/**, apps/web/app/mar/** (ship picker, ship-model.ts); packages/engine/src/ship-style.ts; art from T39.
- Scope: may touch ESTADO.md (own top section), packages/store/**, packages/contracts/**, packages/engine/src/ship/** and ship-style.ts, apps/web/app/juego/** (Barco section, ship rendering), apps/web/app/mar/** (picker and ship only), apps/web/lib/barco/**, apps/web/e2e/** / must not touch packages/world/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: a new visitor owns exactly B05 and B02; buying debits once even on double confirm; not enough coins refuses; B04 unlocks at 1500 points without spending them; cosmetics do not change lap times or collisions
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; a spec earns coins, buys a ship, equips it, reloads and still has it, in /juego and /mar
  - Screenshots p004-t40-tienda.png and p004-t40-barco-equipado.png
- Outcome:

## T41 — World switch through a black hole
- Status: running (attempt 1)
- Depends on: none
- Goal: Inventory §1.4: switching world (menu «Mundos», Admin active world) plays a vortex: the sea and islands spiral into a black hole centred on the ship (~1 s), the screen goes dark, and the new world unfolds outwards from the same point (~1 s) with every place where it was; the ship keeps its position, progress, mission and open links. Only renders, names and dialogues change (the world is a skin). Works in /juego (Pixi: displacement/twirl filter or a shader on the stage) and /mar (three.js: post-process or camera+scene twist); reduced motion uses a 300 ms crossfade; input is locked during the transition and released after; no double world, no leaked textures (old world assets released).
- Context: packages/engine/src/game.ts (setWorld), apps/web/app/juego/menu/sections/mundos.tsx, apps/web/app/juego/world-switch.test.ts, apps/web/app/mar/engine/mar3d.ts, apps/web/lib/admin (active world); D-20.7.
- Scope: may touch ESTADO.md (own top section), packages/engine/src/** (transition only), apps/web/app/juego/** (switch trigger), apps/web/app/mar/** (switch trigger and effect), apps/web/e2e/** / must not touch packages/world/**, packages/store/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: after the transition the ship position and every place position are unchanged; switching twice quickly ends in the last chosen world with one scene
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; a spec switches world in /juego and /mar and checks the same place is at the same screen spot before and after
  - A short recording p004-t41-agujero-negro.webm (or a 6-frame strip .png) in docs/informes/img/
- Outcome:

## T42 — Events and photos: event page, «Fotos y eventos», island state, satellites
- Status: done
- Depends on: none
- Goal: A shareable page per event `/eventos/<slug>` (HTML without the engine: poster, date, place label, format, activities, price, state, buy CTA only when on sale, memories when finished, «Ir a su isla»). A «Fotos y eventos» page `/fotos` with one gallery per island/event (anchor `#<place-or-event>`), reachable from the landing and from each island panel's «Ver fotos de la isla» (inventory §1.7). Event contract gains poster, activities, price (moved from lib/ticketing/pricing.ts), sale opening date and `format` as `all_day | satelite`; the state is derived from dates unless the Admin overrides it (REQ-COM-004). The island panel shows the event state (agotado without CTA, pospuesto/cancelado notice, finished with memories and poster) and a «Próximos eventos» block; satellites without island show in the All Day island's «Próximos eventos» and the Tickets panel with a link to the next All Day (O7). Deep links open without intro (REQ-ENT-011). Content: the first real event `halloween-2026` (not `muestra`): «BOIA Club · Halloween» at the Kiki García Bar, 31-10-2026: NOT an All Day but a BOIA Club night, i.e. format `satelite` with a `series: 'boia-club'` label shown on cards, no own island, listed in the Tickets panel and in the `allday` island's «Próximos eventos» (link to the next All Day only if one exists), poster «próximamente», price `muestra`; photos gain a `selection` flag: the home gallery shows only Álvaro's selection and «Ver todas» opens `/fotos`.
- Context: inventory §3 Comercial; docs/spec/06-comercial.md (REQ-COM-001…014, 030, 031), 02-entrada-y-landing.md (ENT-011, 036, 037); packages/contracts/src/events.ts, packages/store sample content; apps/web/app/(landing)/**, apps/web/lib/landing/**, apps/web/lib/ticketing/pricing.ts; apps/web/app/juego/world-ui.tsx, place-panels.tsx; apps/web/app/mar/sheet.tsx; apps/web/app/admin/sections/events.tsx.
- Scope: may touch ESTADO.md (own top section), packages/contracts/**, packages/store/src/sample/** and content schema (with migration), apps/web/app/(landing)/**, apps/web/app/eventos/** (new), apps/web/app/fotos/** (new), apps/web/lib/landing/**, apps/web/lib/ticketing/pricing.ts, apps/web/app/juego/world-ui.tsx and place-panels.tsx, apps/web/app/admin/sections/events.tsx (NOT apps/web/app/mar/**: plan 003 is still working there; list the /mar island-panel changes under OUT OF SCOPE for a follow-up), apps/web/e2e/** / must not touch packages/engine/**, packages/world/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: state derived from dates for each of the seven states; a finished event never shows a CTA; a satellite without island lists under the next All Day
  - `pnpm build` → landing critical path ≤ 192 KB gzip (report it); `/eventos/<slug>` and `/fotos` work with JS disabled
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; the 5-step event cycle spec (publish, sell out, finish, link a new event to the island, cancel/postpone) as REQ-COM-014; «Ver fotos de la isla» opens `/fotos#<isla>`
  - Screenshots p004-t42-evento.png, p004-t42-fotos.png, p004-t42-isla-estado.png
- Outcome: /eventos/<slug> and /fotos (in the landing group, no-JS OK), event state from dates with manual override (stateSource), format all_day|satelite, price/poster/activities/saleOpensAt in the contract, island panel state + «Próximos eventos» + «Ver fotos de la isla», BOIA Club · Halloween (satellite, 10 € muestra), photo selection on the home; store v3; 668 tests; landing 186.8 KB → 52656e7

## T43 — Discounts that lead to their island and show at checkout
- Status: done
- Depends on: T42
- Goal: Inventory §1.5–1.6: every discount card (found notice, «Mis códigos» menu section, landing) has «Ir a la isla»: in /juego and /mar the ship sails there on autopilot (skippable, like the «Entradas» turbo of plan 003 T35; from the landing it opens the game at that island). Buying in that island (and from its event page) shows a visible banner «Tienes un código de descuento para este evento» with the code and the saving, applied in the sandbox checkout. «Mis códigos» lists found codes with state (activo, usado, caducado), copy in one tap. The Admin gets a Descuentos section (create, edit, expire, link to event or «tienda», priority) through the store overrides with audit. Shop discounts (O8) show «Ir a la tienda». `discount_found` and the purchase analytics events are emitted (REQ-ARQ-019).
- Context: inventory §1.5–1.6, §2 O8, §3 Comercial; docs/spec/06-comercial.md (REQ-COM-020…022); apps/web/lib/ticketing/** (checkout, pricing, notices), apps/web/app/juego/** (DiscountCard, notices, menu), apps/web/app/mar/** (autopilot, sheet), packages/store (discounts, world-progress), apps/web/lib/analytics, apps/web/app/admin/**; plan 003 T35 Outcome (turbo sail).
- Scope: may touch ESTADO.md (own top section), apps/web/lib/ticketing/**, apps/web/lib/analytics/**, apps/web/app/juego/**, apps/web/app/mar/** (UI and autopilot call only), apps/web/app/admin/** and apps/web/lib/admin/**, packages/store/** and packages/contracts/** (discount fields only, with migration), apps/web/e2e/** / must not touch packages/engine/src/world/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: the banner appears only when a valid code for that event is owned; an expired code shows as such and is not applied; an Admin-created code is findable and audited
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; a spec finds the náufrago code, taps «Ir a la isla», arrives, sees the banner and buys with the discount, in /juego and /mar
  - Screenshots p004-t43-ir-a-la-isla.png and p004-t43-banner-descuento.png
- Outcome: «Ir a la isla» on discount cards with a /juego autopilot (app/juego/autopilot.ts, skippable, reduced motion jumps), banner «Tienes un código de descuento para este evento» in the island panel and the shared checkout, «Mis códigos» with activo/usado/caducado, Admin Descuentos (create/edit/expire/hide at a place, audited), shop code TIENDA15, discount_found + purchase_confirmed emitted; store v4; 685 tests; /mar part pending → 75d9c55

## T44 — Landing that sails you: accesses, header, footer, Carnet invitations
- Status: done
- Depends on: T42
- Goal: From the landing, Tickets, Fotos and Tienda can open the world at their island with the ship arriving there (REQ-ENT-034, AVE-022), while the plain HTML paths stay for no-JS and «solo quiero las entradas». Header: Mi Carnet and a sound toggle (ENT-029). Footer: invitation to create the Carnet and to join WhatsApp, Instagram link (ENT-032, O13). Carnet invitations in the three contexts of REQ-IDE-008 (after a purchase, when closing the gallery, after 5 min or 3 achievements) with the pacing of REQ-IDE-009 (non-blocking, one per session, never twice after «Ahora no»). The ship position and heading are saved and restored on reload of /juego (REQ-IDE-004) and the local-progress notice explains its limits (IDE-007). Re-check that Tickets is visible without scroll at 360×640 with the 3D CTA.
- Context: inventory §3 Accesos and Identidad; docs/spec/02-entrada-y-landing.md, 05-identidad-y-comunidad.md; apps/web/app/(landing)/**, apps/web/lib/world-handoff.ts, apps/web/app/juego/** (bootstrap at a place, `?cerca=`), apps/web/app/carnet/**; docs/propuestas/textos-zonas.md.
- Scope: may touch ESTADO.md (own top section), apps/web/app/(landing)/**, apps/web/lib/landing/**, apps/web/lib/world-handoff.ts, apps/web/app/juego/** (bootstrap, invitations, position save), apps/web/app/carnet/**, packages/store/** (position and invitation state only, with migration), apps/web/e2e/** / must not touch packages/engine/**, packages/world/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: invitation pacing (once per session, «Ahora no» respected); position restored after reload
  - `pnpm build` → landing ≤ 192 KB gzip
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; specs: Fotos from the landing lands the ship at Puerto de Fotos; Tickets visible without scroll at 360×640
- Outcome: «⛵ Ir en barco…» from Tickets/Fotos/Tienda to /juego?ir=<island> (glide to a safe point, panel opens; HTML paths unchanged), placeHref/readPlaceRequest in lib/world-handoff.ts, header Mi Carnet + sound toggle + Instagram, footer invitations, Carnet invitations with pacing, ship position restored (browser storage, no store migration); 696 tests; landing 188.9 kB → 78671aa

## T45 — Local ranking, Carnet moderation, six boies, dolphin, island shortcut, Fiestera destination
- Status: running (attempt 1)
- Depends on: T39 (boia art), T38 (texts)
- Goal: Ranking (inventory §1.8): the «Ranking» section works locally: points ranking (all-time and current world/season) of this browser's visitor among the `muestra` crew, own position highlighted, each row opens that Carnet, labelled «Ranking local de este navegador». Carnet moderation (O9): «Reportar» on public Carnets, Admin Moderación lists reported Carnets and can hide an answer or photo or reset the nickname, audited. Six boies (O12): five informative boies on the shared map along the first route, with per-world texts from textos-zonas.md, counted by the «X/6» achievement. Dolphin (O15): appears beside the ship every 2–4 min in open sea, guides a few seconds towards something undiscovered, then leaves. Island shortcut: on later visits the island panel offers «Explorar la isla» (REQ-AVE-013). Fiestera destination: an Admin screen to set the destination of new games per world, with a preview of how many started games it affects and an audited migration; publishing a mission without destination is refused (REQ-AVE-010/011). Secrets use T39's marker art.
- Context: inventory §2 O9/O12/O15, §3; docs/spec/04-aventura.md, 05-identidad-y-comunidad.md, 07-admin.md; packages/world/src/worlds/** (map.ts, skins), packages/engine/src/world/** (encounters, runtime), packages/engine/src/mission/**, packages/store (crew sample, carnet, reports), apps/web/app/juego/menu/sections/ranking.tsx, apps/web/app/carnet/**, apps/web/app/admin/**; plan 002 T21 notes.
- Scope: may touch ESTADO.md (own top section), packages/world/**, packages/engine/src/world/** and mission/**, packages/store/** (ranking query, carnet reports, with migration), apps/web/app/juego/**, apps/web/app/mar/** (the new boies and dolphin only), apps/web/app/carnet/**, apps/web/app/admin/** and apps/web/lib/admin/**, apps/web/e2e/** / must not touch art/**, docs/spec/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; `pnpm world:check` → exit 0; adds tests: ranking order and own position; a reported Carnet appears in moderation and hiding is audited; the six boies achievement is reachable on the map; a mission without destination is refused
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; specs: ranking shows the visitor; reporting a Carnet and hiding it from Admin
  - Screenshots p004-t45-ranking.png and p004-t45-boia-info.png
- Outcome:

## T46 — Sound, wake and controls feel
- Status: done
- Depends on: none
- Goal: One ambient loop per world generated in the browser (WebAudio, `muestra`, O10) starting on the first interaction in /juego and /mar at 30 % when music is on; pickup «ping», boost WHOOSH, bump on collision; behaviours can declare a sound and an animation id in their params (REQ-PRO-011) with a small built-in set. The wake reacts to turning, boost and collision (REQ-MUN-004; `collideShip` already returns contact). Keyboard and touch sensitivity in Ajustes/Controles (REQ-MUN-008). HUD: the fps/speed box only with `?debug` (O11). iOS audio unlock and pause on hidden tab.
- Context: apps/web/app/juego/sound.ts, sections/ajustes.tsx, controles.tsx; packages/engine/src/wake.ts, ship/controller.ts, input/**, ui/hud-layout.ts; packages/world/src/behaviors.ts; apps/web/app/mar/engine/effects.ts; docs/spec/01 (PRO-009, PRO-011), 03 (MUN-004, MUN-008).
- Scope: may touch ESTADO.md (own top section), apps/web/app/juego/**, apps/web/app/mar/** (sound and wake only), packages/engine/src/wake.ts, ship/**, input/**, ui/hud-layout.ts, packages/world/src/behaviors.ts (sound/animation params only), apps/web/e2e/** / must not touch packages/store/** beyond settings keys, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: wake intensity differs for turn/boost/collision; sensitivity scales turn rate; no audio before the first interaction
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; the HUD spec checks no fps box without `?debug`
- Outcome: WebAudio ambient loop per world (30 % of music, after first tap), ping/whoosh/bump, behaviour sound+animation params (feedbackFor), wake reacts to turn/boost/impact, keyboard/touch sensitivity 50–150 %, fps box hidden without ?debug, iOS unlock and pause on hidden tab; /juego only; 766 tests → f211f41

## T47 — Load the world by sectors
- Status: done
- Depends on: none
- Goal: `/juego` loads only the art of the sector around the spawn first (≤ 5 MB transferred before play, REQ-ARQ-014) and streams neighbouring sectors as the ship approaches, with texture atlases per sector, release of far textures, a lower-quality tier for weak devices, and no visible pop-in on the route. `/mar` loads glTF lazily the same way where it is cheap.
- Context: packages/engine/src/game.ts, manifest-loader.ts, world/**; packages/world/src/schema.ts (sectors); apps/web/app/api/art; art/mundos/** sizes; docs/spec/03-mundo-y-motor.md (REQ-MUN-012), 08 (ARQ-014).
- Scope: may touch ESTADO.md (own top section), packages/engine/**, packages/world/src/schema.ts and sector data, apps/web/app/juego/** (bootstrap), apps/web/app/mar/engine/** (lazy loading only), tools/ (an atlas build script), apps/web/scripts/** (a budget check) / must not touch art/** sources, packages/store/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; a budget script reports bytes before first play per world and fails over 5 MB
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; a spec sails from the port to the última isla with no missing-texture frames
- Outcome: /juego streams sectors around the start (spawn, ?cerca, ?ir or saved position) with WebP atlases (alta/baja tiers, generated into public/atlas at dev/build), releases far textures, `pnpm world:budget` (Arcilla 1.2 MB, Acuarela 1.8 MB before play; fails > 5 MB), ?piloto=<lugar>, ?calidad=; 736 tests → 0425d7a

## T48 — Admin hardening
- Status: done
- Depends on: T42, T43
- Goal: Deleting shows the impact (what links to it) and asks to type the name (REQ-ADM-029); trash with a retention setting and a purge that asks for confirmation again (ADM-030); achievements can be created, duplicated and versioned with icon, dates and scope, changing a condition makes a new version (ADM-021/022, on top of plan 003 T36); home and events edit as a draft with preview and «Publicar» (ADM-015), home CTAs editable and events excludable (ADM-017); validations for mission destination, circuits, dangling references and parameter ranges (ADM-013/014); music upload with licence fields (ADM-020, stored as data URL `muestra`); purchases and stamps written to the audit (ADM-007); docs/manual-admin.md with the manual data-request procedure (ADM-031).
- Context: inventory §3 Admin; docs/spec/07-admin.md; apps/web/app/admin/**, apps/web/lib/admin/**, packages/store (overrides, audit, trash).
- Scope: may touch ESTADO.md (own top section), apps/web/app/admin/**, apps/web/lib/admin/**, packages/store/** (with migration), docs/manual-admin.md (new), apps/web/e2e/admin*.spec.ts / must not touch packages/engine/**, packages/world/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: delete needs the exact name; a draft is invisible on the landing until published; an invalid parameter range is refused with its reason
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0
- Outcome: delete with impact + typed name, trash with 30-day retention and purge, achievements create/duplicate/version (trigger change bumps version), home/events draft with /admin/vista-previa and «Publicar» blocked by reasons, home CTAs and excluded events, PARAM_RANGES validation, music upload with licence, purchases/stamps audited, docs/manual-admin.md; store v5; 716 tests → f839789

## T49 — Delivery: per-REQ status, i18n, security headers, handover docs
- Status: pending
- Depends on: T40, T41, T42, T43, T44, T45, T46, T47, T48, T50
- Goal: A per-REQ status file (docs/spec/estado.md or generated by tools/spec) with HECHO/PARCIAL/FALTA/L2/final and a link to its test or evidence, checked by a script (REQ-PRO-017); all UI strings of /juego, /mar and /admin moved to the i18n keys (REQ-ARQ-020) using textos-zonas.md; CSP and security headers in next.config (ARQ-012); `.env.example`, a root README (run, test, deploy the test version), docs/manual-alvaro.md (how to use the Admin, in plain Spanish) and a delivery checklist (ARQ-024); `python3 tools/blender/check.py` wired into `pnpm test` (MUN-031); the 16-case device matrix as a doc with the cases already covered by e2e marked (ARQ-016).
- Context: docs/informes/2026-09-29-inventario-v14.md; docs/spec/09-requisitos.md; apps/web/lib/i18n/**; apps/web/next.config.ts; every Outcome of this plan.
- Scope: may touch ESTADO.md (own top section), docs/**, tools/spec/**, apps/web/** (strings, config), root package.json (scripts), README.md, .env.example / must not touch packages/store/**, packages/world/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → exit 0 with no env vars
  - the status script → exit 0 and prints counts per state; `grep -rn "'[A-ZÁÉÍÓÚ][a-záéíóú]\\+ " apps/web/app/juego apps/web/app/admin --include=*.tsx | wc -l` reported (literal UI strings left)
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0
- Outcome:

## T50 — Brand: wordmark letters, logo, colours and type
- Status: done
- Depends on: none
- Goal: Apply Álvaro's identity (inventory §6.8). Trace the wordmark (art/marca/boia-wordmark.jpg) to clean vectors (SVG in art/marca/), rebuild the intro's 3D «BOIA» letters from that shape in Blender (same pipeline and motion as plan 002 T27, replacing Inter), use the SVG wordmark and the mascot as logo in the landing header, footer, favicon/app icons and the Admin, and set the brand colours sampled from the two images (orange, navy-blue, black outline) as design tokens in apps/web (the /mar palette waits for plan 003). UI type: a free display font that matches the wordmark for titles (chosen by the agent, self-hosted, subset, within the 192 KB landing budget) until Álvaro sends the real font file.
- Context: art/marca/**; tools/blender/intro/titulo.py, art/intro/**, packages/engine/src/intro/**, apps/web/lib/intro/**; apps/web/app/(landing)/**, apps/web/app/globals.css, apps/web/app/icon.svg, apps/web/app/admin/admin.css, apps/web/app/mar/engine/palette.ts; plan 002 T27 Outcome.
- Scope: may touch ESTADO.md (own top section), art/marca/**, art/intro/**, tools/blender/intro/**, packages/engine/src/intro/** (title only), apps/web/lib/intro/**, apps/web/app/(landing)/** (logo, tokens), apps/web/app/globals.css, apps/web/app/icon.svg and app icons, apps/web/app/admin/admin.css, apps/web/public/fonts/** (new) (NOT apps/web/app/mar/**: plan 003 is working there; put the /mar brand colours under OUT OF SCOPE), apps/web/e2e/** / must not touch packages/world/**, packages/store/**, art/mundos/**.
- Done when:
  - Blender render of the letters → exit 0 twice byte-identical; `python3 tools/blender/check.py` → exit 0
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; `pnpm build` → landing ≤ 192 KB gzip (report it)
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0 (intro specs still pass)
  - Screenshots p004-t50-intro-letras.png (next to the wordmark image) and p004-t50-landing-logo.png
- Outcome: wordmark traced to SVG (tools/blender/intro/trazar_marca.py), intro letters rebuilt from it (orange faces, #36278A sides), logo in header/footer/icons/Admin, tokens #EC4F24/#FF5219/#36278A/#000, Titan One (OFL, 10.5 KB) for titles, landing 185.2 KB gzip (+4.3 KB CSS logos) → 8850a24

## Decisions
- 2026-09-29: main merged into plan-004 again (plan 003 T33, T34, its own «T50» compact /mar world); conflicts in ESTADO.md and engine ship/controller.test.ts (both sides added describe blocks) resolved by keeping both; tests, typecheck, lint green. Note: plan 003 also used the id T50, different from this plan's T50 (brand) (orchestrator)
- 2026-09-29 T46: fps box stays in the DOM hidden (specs use it); sensitivity as module state (setControlSensitivity) since game.ts was off limits; wake infers turn/boost/impact from motion (agent)
- 2026-09-29 T47: atlases generated (gitignored) at dev/build/e2e, fallback to per-PNG if generation fails; sharp borrowed from Next; long moves freeze ≤2.5 s until art loads; createGame takes start/preload; STREAM_TUNING muestra (agent)
- 2026-09-29 T48: draft is store state (v5); events keep «Guardar y publicar» (testid evento-guardar) plus «Guardar borrador»; purge asks the name again instead of re-auth (no login in the demo); achievement icons are keys without artwork; music ≤ ~1 MB muestra (agent)
- 2026-09-29: integration test command for plan 004 is now `pnpm test --testTimeout=30000` because lib/barco/catalog.test.ts palette test times out at 5 s under load (reverted pair dropped, re-integrated green) (orchestrator)
- 2026-09-29 T44: position and invitation state in localStorage/sessionStorage, not packages/store (no migration clash); one invitation per tab session, «Ahora no» silences that reason for good; header sound toggle drives music and effects together (agent)
- 2026-09-29: after T44 the combined plan-004 passes typecheck and lint (orchestrator)
- 2026-09-29 T43: /juego autopilot in apps/web (moveShip at 2.6×, ≤12 s, jumps if stuck, cancelled by steering); a code is used once per visitor; discount gains scope/priority/hiddenAt, «Caducar» sets endsAt now; menu tab «Mis códigos» keeps id `descuentos`; /juego?evento=<id>&piloto=1 starts the autopilot; sandbox emits purchase_confirmed (agent)
- 2026-09-29: T43 first integration hit a 5 s vitest timeout in lib/barco/catalog.test.ts under load (flaky, unrelated); reverted pair dropped and re-integrated green (orchestrator)
- 2026-09-29: T43 and T44 start in parallel without /mar (plan 003 still there); /mar parts of T43 go to a follow-up after plan 003 (orchestrator)
- 2026-09-29 T42: routes under app/(landing)/eventos and /fotos; stored state + stateSource dates|manual (Admin change → manual); no endsAt ⇒ ends 12 h after start; Halloween on_sale at 10 € muestra, 23:00 muestra; album.islandId links photos to islands; copy in lib/landing/eventos-copy.ts until T49; touched lib/ticketing/sandbox.ts outside scope (agent)
- 2026-09-29: T42 integrated although the full e2e had 2 failures: demo.spec.ts:197 «Barco» fails on the untouched plan-004 base too; T40 fixes it first (orchestrator)
- 2026-09-29: from T40 on, status sections go through .orchestrator/status/Txx.md (integrate.py --status-file ESTADO.md), agents run only covering tests while working and the full suite once at the end, and no watchdog timers (Hernán; skill updated) (orchestrator)
- 2026-09-29: main (plan 003 T35, T36) merged into plan-004 after T39; only ESTADO.md conflicted, resolved keeping every section. T42 starts without /mar (plan 003 T33/T34 still there) (orchestrator)
- 2026-09-29 T39: new boias/secret under `extras` in tools/blender/lugares.json until T45 wires them; B01 pencil stays base-only (registry note), its skins written but held; the ships' passenger is the small mascot (agent)
- 2026-09-29 T50: text on orange is black (navy on the new orange is 4.3:1); header logo decorative inside «Ir al inicio», footer logo named «BOIA.PLANET»; display font Titan One until Álvaro's font file (agent)
- 2026-09-29 T38: new Álvaro questions start at P15 (P14 exists from D-22); O5 follows plan 003's approved catalog (B03/B06 by coins, B04 by 1500 points, B07/B01/B08 by achievements, skins 150); five new boies ids boia-espacio/descubrir/pertenecer/allday/secretos, placed by T45; «Condiciones» becomes aviso legal; also updated REQ-ENT-003, ENT-032, AVE-018, COM-031 (agent)
- 2026-09-29: plan 004 runs in parallel with plan 003 on branch `plan-004` (integration worktree .claude/worktrees/orq-004); main is merged into plan-004 after each plan 003 task lands. Until plan 003 is done only tasks that do not touch its files run: T38 (docs; D-22 already on main) and T39 (art), then T50 without apps/web/app/mar/engine/palette.ts; T40–T48 wait for plan 003 to finish (they touch apps/web/app/mar, juego, engine or store) (orchestrator)
- 2026-09-29: coins buy ships and skins; only B05 and B02 unlocked at start; points unlock one ship (Hernán) → B04 at 1500 points, prices in inventory O5 (orchestrator)
- 2026-09-29: world switch = a black-hole vortex; same places, links and features, only renders and dialogues change (Hernán)
- 2026-09-29: discount cards sail you to their island; buying on that island shows «Tienes un código de descuento para este evento» (Hernán)
- 2026-09-29: islands offer «Ver fotos de la isla» into the «Fotos y eventos» page (Hernán)
- 2026-09-29: ranking active, local only; the team writes all zone texts; Carnet questions stay those of v14 §44.1; physical phone checked OK (Hernán)
- 2026-09-29: Álvaro-pending items the orchestrator can decide are decided (O1–O15 in the inventory); /mar 3D stays (Hernán)
- 2026-09-29: Álvaro's answers (inventory §6): the mascot is every 3D boia, incl. the Boia Fiestera; the wordmark drives the intro letters; first real event «BOIA Club · Halloween» at the Kiki García Bar, a BOIA Club night (satellite, series boia-club), not an All Day (Hernán); home shows Álvaro's photo selection; jokey invented legal data; full permission for Hernán (Álvaro via Hernán)

## Proposals (new scope)
- 2026-09-29 T46: /mar follow-up — installAudioLifecycle + setAmbientWorld in mar-client.tsx, whoosh on turbo, bump + splash in mar3d.ts/effects.ts; declared animations not played yet (object-view.ts); Game.setSensitivity and impact through game.ts; Admin-uploaded music still not played
- 2026-09-29 T47: /mar lazy glTF by distance reusing @boia/engine/streaming (after plan 003); pack the ship's 8 views into a WebP atlas (~700 kB per world); Fiestera crew art as separate PNGs; memory not measured on a minimum device
- 2026-09-29 T48: Carnet moderation (REQ-ADM-040) still missing (T45 has it); restore an earlier published revision (ADM-016); uploaded music does not play in /juego or /mar; achievement icons not drawn; «Textos» publishes hero.explore/hero.tickets outside the draft
- 2026-09-29 T44: Instagram in the WhatsApp boia panel (place-panels.tsx); invitation inside the checkout before buying; /mar position restore and invitations (after plan 003); prettier drift in circuit-hud.tsx and world-progress.ts
- 2026-09-29 T43: /mar follow-up after plan 003 — use place-panels DiscountCard in sheet.tsx with onGoToIsland → engineRef.current?.startVoyage(islandId), EventDiscountBanner above the island buy button, e2e mirroring descuentos.spec.ts; banner above the event page buy button (landing); lib/barco/catalog.test.ts palette test is slow (≈5.7 s) and flaky under load, raise its timeout
- 2026-09-29 T42: /mar island sheet lacks state notice, «Ver fotos de la isla», memories and satellites, still links /#fotos (after plan 003); local.ts confirmSandbox checks stored state, not eventState; Admin › Fotos can't set `selection` or `album.islandId`; satellites' common location not configurable; Supabase event columns missing
- 2026-09-29 T39: T45 must point place-art.ts at boias#… and secreto#secreto and move them out of `extras`; T40 must unhide B01/B05/B06 skins hidden by catalog.ts notes; stale sources_sha256 in untouched place manifests; arcilla*.glb export not byte-stable (Blender decimate)
- 2026-09-29 T50: /mar brand colours (after plan 003); Admin title wordmark needs admin-app.tsx; themeColor in app/layout.tsx still #12233f; Act 0 boia in intro-stage.tsx is not the mascot yet; landing-budget.mjs ignores CSS-loaded assets
- 2026-09-29 T38: es.ts still says «Lista provisional» for artists, legal slug `condiciones` → aviso legal, menu tab «Descuentos» vs «Mis códigos», ranking stub (covered by T40–T45/T49); O10 ambient music has no REQ; mapa.json still has a detour named `d_solar`

## Log
- 2026-09-29 draft written from the v14 inventory
- 2026-09-29 plan approved (Hernán: «Comitea», open the orchestrator in a worktree) · integration worktree .claude/worktrees/orq-004 on branch plan-004
- 2026-09-29 16:22 T38 launched · attempt 1 · agent a6c9b003993ca3178
- 2026-09-29 16:22 T39 launched · attempt 1 · agent aa756794320ace22d
- 2026-09-29 16:40 T38 done · branch worktree-agent-a6c9b003993ca3178 → 69172c6
- 2026-09-29 16:42 T50 launched · attempt 1 · agent af4598a59fa0e694c
- 2026-09-29 17:24 T39 conflict in ESTADO.md · sent back to agent aa756794320ace22d
- 2026-09-29 17:26 T50 done · branch worktree-agent-af4598a59fa0e694c → 8850a24
- 2026-09-29 17:28 T39 second ESTADO.md conflict (T50 landed) · sent back to agent aa756794320ace22d
- 2026-09-29 17:29 T39 done · branch worktree-agent-aa756794320ace22d (2 conflict rounds, ESTADO.md) → e38c31a
- 2026-09-29 17:30 main merged into plan-004 (plan 003 T35, T36) · tests pass
- 2026-09-29 17:32 T42 launched · attempt 1 · agent a773af34a3e92e4bd
- 2026-09-29 18:08 T42 done · branch worktree-agent-a773af34a3e92e4bd → 52656e7 (e2e: 2 pre-existing «Barco» failures, handed to T40)
- 2026-09-29 18:12 T43 launched · attempt 1 · agent a21a8aec83ac19724 (no /mar)
- 2026-09-29 18:12 T44 launched · attempt 1 · agent ad8707af4ade97d6a (no /mar)
- 2026-09-29 18:42 T43 done · branch worktree-agent-a21a8aec83ac19724 → 75d9c55 (e2e: known «Barco» ×2, 2 load flakes pass alone)
- 2026-09-29 18:45 T48 launched · attempt 1 · agent afe990571df86d31f
- 2026-09-29 18:47 T44 done · branch worktree-agent-ad8707af4ade97d6a → 78671aa
- 2026-09-29 18:49 T47 launched · attempt 1 · agent acdbcc0aadea9d92e (/juego only)
- 2026-09-29 19:47 T48 done · branch worktree-agent-afe990571df86d31f → f839789 (e2e 11 fails: 2 known Barco, 2 fixed, 7 load timeouts pass alone)
- 2026-09-29 19:50 T46 launched · attempt 1 · agent a34f3a8db29063fc6 (/juego only)
- 2026-09-29 20:01 T47 done · branch worktree-agent-acdbcc0aadea9d92e → 0425d7a (e2e: known Barco ×2, 3 load timeouts pass alone)
- 2026-09-29 20:04 T45 launched · attempt 1 · agent a0ef37ddb695c2396 (no /mar)
- 2026-09-29 20:23 T46 done · branch worktree-agent-a34f3a8db29063fc6 → f211f41
- 2026-09-29 20:24 main merged into plan-004 (plan 003 T33, T34, T50) · tests/typecheck/lint pass
- 2026-09-29 20:27 T41 launched · attempt 1 · agent aa35c1d521a60042d (/juego only)
- 2026-09-29 22:17 PAUSED (usage limit). T45 (agent a0ef37ddb695c2396) and T41 (agent aa35c1d521a60042d) still finishing e2e reruns in their worktrees; on resume treat them as orphans (section 7): integrate with --status-file ESTADO.md and test 'pnpm test --testTimeout=30000'. Pending: T40 (after plan 003), T49 (last). Phone preview: next start :3450 + cloudflared tunnel

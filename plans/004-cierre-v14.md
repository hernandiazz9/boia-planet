# Plan 004 — Close the v14 gaps: ship economy, world-switch vortex, events and discounts that lead to islands, local ranking, sound, admin and delivery

Status: draft
Created: 2026-09-29
Base branch: main
Goal: Close every gap found in the v14 → code inventory (docs/informes/2026-09-29-inventario-v14.md) that can be built without Álvaro or Supabase, plus Hernán's decisions of 2026-09-29 (second batch): coins buy ships and skins (only the two starting-world ships unlocked, one ship unlocked by points), a black-hole transition when switching world (same places, only renders and dialogues change), discount cards that sail you to their island and a visible discount when buying there, «Ver fotos de la isla» into a «Fotos y eventos» page, a local-only ranking, texts for every zone written by the team, and the orchestrator's delegated decisions O1–O15 of the inventory. Also Álvaro's answers of inventory §6: the mascot (art/marca/boia-mascota.jpg) becomes every 3D boia of the game, the wordmark (art/marca/boia-wordmark.jpg) becomes the intro letters and the logo, the first real event is «BOIA Club · Halloween» at the Kiki García Bar, the home shows a personal selection of photos, and the legal pages use invented, jokey data. Everything stays browser-only (D-20) and `muestra` except that event. Starts after plan 003 is done (it builds on T32's D-22 and T36/T37's claimable achievements).
Test command: pnpm test
Worktree setup: pnpm install
Max parallel agents: 3

Agent notes: do not invoke the project skills `encargo` or `orquestador`; follow this prompt. Read docs/informes/2026-09-29-inventario-v14.md first: §1 and §2 are the decisions this plan implements, §3 the gaps by REQ id. Each task adds its own section at the top of ESTADO.md (`## <date> — plan 004 Txx: <title>`); on a merge conflict there keep every section, newest on top. Spanish copy uses "Boia" (D-18); UI copy comes from docs/propuestas/textos-zonas.md once T38 is merged. `/juego` (2D) and `/mar` (3D) share packages/store and packages/world: a gameplay feature lands in both unless the task says otherwise. Hernán may run a dev server on port 3000: never kill it and never use port 3000 (use 3100+). Run e2e with `--workers=2` and a free E2E_PORT. Every task touching the UI saves phone-size screenshots (390×844) in docs/informes/img/ named `p004-txx-*.png`.

## Tasks

## T38 — Decision D-23, spec updates and the texts of every zone
- Status: pending
- Depends on: plan 003 T32 (D-22 must exist first; both edit docs/DECISIONES.md)
- Goal: Record inventory §1 as D-23 in docs/DECISIONES.md (author Hernán) with the orchestrator's delegated decisions O1–O15 inside it (author orquestador by Hernán's delegation, Álvaro only to review), close P4, P6, P8–P12 in «Preguntas abiertas» as decided, record Álvaro's answers of inventory §6 (P13 closed: full permission for Hernán; P2 stays open; new P14… for what is still missing: real links, real codes, artist photos, music options, Halloween poster, font file). Update the affected REQ lines (PRO-009 HUD, MUN-035/ADM-032 single spawn, COM-010 satellites, IDE-038 ranking local-only as a test-version exception, IDE-030/031 economy, new REQs for world-switch transition, carnet moderation and discount-to-island if check.py needs them). Fix stale docs: docs/PLAN.md Faro/Cañón frozen, mundos/arcilla/diseno.md Faro/Cañón as L2, docs/spec/00-indice.md decision range. Write docs/propuestas/textos-zonas.md: final-feeling Spanish copy (`muestra`, BOIA voice from docs/spec/10-filosofia.md) for the 18 zones of v14 §31.2 plus Welcome Aboard, Faro, Cañón, boia de WhatsApp, the 5 new informative boies (per world: Arcilla and Acuarela), Carnet invitations, empty and error states, ranking, ship shop, world switch; one key per string, grouped by screen. The 5 Carnet questions stay verbatim from v14 §44.1. Legal pages (aviso legal, privacidad, cookies) rewritten with the invented data of inventory §6 (Bollería Fina del Mediterráneo, S.L., Benito Camelas, Débora Melo, C/ Rosa Melano 69…), clearly marked `muestra`, in docs/propuestas/textos-zonas.md for T49 to wire.
- Context: docs/informes/2026-09-29-inventario-v14.md; docs/DECISIONES.md (D-20…D-22 format); docs/spec/**; tools/spec/check.py; docs/fuente/v14-maestro.md §31, §37, §44.1; mundos/*/diseno.md; apps/web/lib/i18n/es.ts (existing keys).
- Scope: may touch ESTADO.md (own top section), docs/DECISIONES.md, docs/spec/**, docs/PLAN.md, mundos/arcilla/diseno.md, docs/propuestas/textos-zonas.md (new) / must not touch code, art/**, plans/**.
- Done when:
  - `python3 tools/spec/check.py` → exit 0 and `python3 tools/spec/test_check.py` → exit 0
  - `grep -n "D-23" docs/DECISIONES.md` → the decision with Hernán's 11 points and O1–O15
  - docs/propuestas/textos-zonas.md covers every zone listed above (a table of zones at the top with the number of strings each)
- Outcome:

## T39 — Art: the BOIA mascot as every boia, ship skins to sell, secrets
- Status: pending
- Depends on: none
- Goal: Render with the Blender pipeline what the economy and the map need: `noche` and `fiesta` skins for every style ship that lacks them (at least B05 Arcilla and B02 Acuarela, ideally all 8 styles), 8 directions + passenger frames like the base; the BOIA mascot (art/marca/boia-mascota.jpg: orange round body, navy-blue pointed cap with a hole, big eyes, wide grin, black outline) modelled in Blender as a floating buoy (the body is the buoy, a waterline and a small float ring or ballast so it reads as a boya) and rendered for every boia of the game in each world style (Arcilla clay, Acuarela wash): the first boia, the 5 new informative boies, the WhatsApp boia and the Boia Fiestera (the same mascot with her party details, replacing the current Fiestera art, TRIPULANTE frames included), with an idle bob and a talking frame; a glTF of the mascot boia for `/mar`; a secret marker per world (small, readable at game scale); and the matching glTF where `/mar` needs it (tools/blender/export_barcos_glb.py). Manifests valid and reproducible.
- Context: tools/blender/** (render.py, check.py, styles/, export_barcos_glb.py), art/barco/** (estilos, base/noche/fiesta, 3d/manifest.json), art/mundos/{arcilla,acuarela}/**, docs/barcos/barcos.json, plan 002 T18/T19 Outcomes.
- Scope: may touch ESTADO.md (own top section), tools/blender/**, art/barco/**, art/mundos/**/boia*/**, art/mundos/**/fiestera/**, art/mundos/**/secreto/**, art/marca/** (derived files only) / must not touch apps/**, packages/**, docs/spec/**.
- Done when:
  - Blender render of the new assets → exit 0 twice, byte-identical; `python3 tools/blender/check.py` → exit 0 listing them
  - A contact sheet p004-t39-skins.png (every ship × base/noche/fiesta) and p004-t39-boias-mascota.png (every boia in both worlds next to the logo) in docs/informes/img/
- Outcome:

## T40 — Ship economy: locked ships and skins, coins shop, points unlock
- Status: pending
- Depends on: T39, plan 003 T36 and T37
- Goal: Inventory §1.1 and O5: every ship style and skin is locked except B05 Arcilla and B02 Acuarela (base). Coins buy ships and skins at the `muestra` prices of O5; B04 Semi-realista unlocks at 1500 points (threshold, points are never spent); the achievement-reward ship of D-22/T36 stays locked until claimed. A «Barco» shop in the /juego menu and the /mar ship picker: each ship with its price or unlock condition and «te faltan N monedas/puntos», buy with confirmation, equip, owned marked. Flag and wake cosmetics are drawn on the ship (a flag overlay on the mast slot, wake tint) in both views. Balances stay derived from the ledger; a purchase is one idempotent ledger debit; physics identical whatever the ship or cosmetic (REQ-IDE-032 test). Saved choice restores on reload; a store migration keeps whatever the visitor has already equipped as owned.
- Context: inventory §1.1, §2 O2/O5, §3 Identidad; docs/spec/05-identidad-y-comunidad.md (REQ-IDE-027, 030…033); packages/store (cosmetics, buyCosmetic/equip, ledger, T36 reward types); apps/web/app/juego/menu/sections (Barco), apps/web/lib/barco/**, apps/web/app/mar/** (ship picker, ship-model.ts); packages/engine/src/ship-style.ts; art from T39.
- Scope: may touch ESTADO.md (own top section), packages/store/**, packages/contracts/**, packages/engine/src/ship/** and ship-style.ts, apps/web/app/juego/** (Barco section, ship rendering), apps/web/app/mar/** (picker and ship only), apps/web/lib/barco/**, apps/web/e2e/** / must not touch packages/world/**, art/**, docs/spec/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: a new visitor owns exactly B05 and B02; buying debits once even on double confirm; not enough coins refuses; B04 unlocks at 1500 points without spending them; cosmetics do not change lap times or collisions
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; a spec earns coins, buys a ship, equips it, reloads and still has it, in /juego and /mar
  - Screenshots p004-t40-tienda.png and p004-t40-barco-equipado.png
- Outcome:

## T41 — World switch through a black hole
- Status: pending
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
- Status: pending
- Depends on: none
- Goal: A shareable page per event `/eventos/<slug>` (HTML without the engine: poster, date, place label, format, activities, price, state, buy CTA only when on sale, memories when finished, «Ir a su isla»). A «Fotos y eventos» page `/fotos` with one gallery per island/event (anchor `#<place-or-event>`), reachable from the landing and from each island panel's «Ver fotos de la isla» (inventory §1.7). Event contract gains poster, activities, price (moved from lib/ticketing/pricing.ts), sale opening date and `format` as `all_day | satelite`; the state is derived from dates unless the Admin overrides it (REQ-COM-004). The island panel shows the event state (agotado without CTA, pospuesto/cancelado notice, finished with memories and poster) and a «Próximos eventos» block; satellites without island show in the All Day island's «Próximos eventos» and the Tickets panel with a link to the next All Day (O7). Deep links open without intro (REQ-ENT-011). Content: the first real event `halloween-2026` (not `muestra`): «BOIA Club · Halloween» at the Kiki García Bar, 31-10-2026: NOT an All Day but a BOIA Club night, i.e. format `satelite` with a `series: 'boia-club'` label shown on cards, no own island, listed in the Tickets panel and in the `allday` island's «Próximos eventos» (link to the next All Day only if one exists), poster «próximamente», price `muestra`; photos gain a `selection` flag: the home gallery shows only Álvaro's selection and «Ver todas» opens `/fotos`.
- Context: inventory §3 Comercial; docs/spec/06-comercial.md (REQ-COM-001…014, 030, 031), 02-entrada-y-landing.md (ENT-011, 036, 037); packages/contracts/src/events.ts, packages/store sample content; apps/web/app/(landing)/**, apps/web/lib/landing/**, apps/web/lib/ticketing/pricing.ts; apps/web/app/juego/world-ui.tsx, place-panels.tsx; apps/web/app/mar/sheet.tsx; apps/web/app/admin/sections/events.tsx.
- Scope: may touch ESTADO.md (own top section), packages/contracts/**, packages/store/src/sample/** and content schema (with migration), apps/web/app/(landing)/**, apps/web/app/eventos/** (new), apps/web/app/fotos/** (new), apps/web/lib/landing/**, apps/web/lib/ticketing/pricing.ts, apps/web/app/juego/world-ui.tsx and place-panels.tsx, apps/web/app/mar/sheet.tsx, apps/web/app/admin/sections/events.tsx, apps/web/e2e/** / must not touch packages/engine/**, packages/world/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: state derived from dates for each of the seven states; a finished event never shows a CTA; a satellite without island lists under the next All Day
  - `pnpm build` → landing critical path ≤ 192 KB gzip (report it); `/eventos/<slug>` and `/fotos` work with JS disabled
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; the 5-step event cycle spec (publish, sell out, finish, link a new event to the island, cancel/postpone) as REQ-COM-014; «Ver fotos de la isla» opens `/fotos#<isla>`
  - Screenshots p004-t42-evento.png, p004-t42-fotos.png, p004-t42-isla-estado.png
- Outcome:

## T43 — Discounts that lead to their island and show at checkout
- Status: pending
- Depends on: T42
- Goal: Inventory §1.5–1.6: every discount card (found notice, «Mis códigos» menu section, landing) has «Ir a la isla»: in /juego and /mar the ship sails there on autopilot (skippable, like the «Entradas» turbo of plan 003 T35; from the landing it opens the game at that island). Buying in that island (and from its event page) shows a visible banner «Tienes un código de descuento para este evento» with the code and the saving, applied in the sandbox checkout. «Mis códigos» lists found codes with state (activo, usado, caducado), copy in one tap. The Admin gets a Descuentos section (create, edit, expire, link to event or «tienda», priority) through the store overrides with audit. Shop discounts (O8) show «Ir a la tienda». `discount_found` and the purchase analytics events are emitted (REQ-ARQ-019).
- Context: inventory §1.5–1.6, §2 O8, §3 Comercial; docs/spec/06-comercial.md (REQ-COM-020…022); apps/web/lib/ticketing/** (checkout, pricing, notices), apps/web/app/juego/** (DiscountCard, notices, menu), apps/web/app/mar/** (autopilot, sheet), packages/store (discounts, world-progress), apps/web/lib/analytics, apps/web/app/admin/**; plan 003 T35 Outcome (turbo sail).
- Scope: may touch ESTADO.md (own top section), apps/web/lib/ticketing/**, apps/web/lib/analytics/**, apps/web/app/juego/**, apps/web/app/mar/** (UI and autopilot call only), apps/web/app/admin/** and apps/web/lib/admin/**, packages/store/** and packages/contracts/** (discount fields only, with migration), apps/web/e2e/** / must not touch packages/engine/src/world/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: the banner appears only when a valid code for that event is owned; an expired code shows as such and is not applied; an Admin-created code is findable and audited
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; a spec finds the náufrago code, taps «Ir a la isla», arrives, sees the banner and buys with the discount, in /juego and /mar
  - Screenshots p004-t43-ir-a-la-isla.png and p004-t43-banner-descuento.png
- Outcome:

## T44 — Landing that sails you: accesses, header, footer, Carnet invitations
- Status: pending
- Depends on: T42
- Goal: From the landing, Tickets, Fotos and Tienda can open the world at their island with the ship arriving there (REQ-ENT-034, AVE-022), while the plain HTML paths stay for no-JS and «solo quiero las entradas». Header: Mi Carnet and a sound toggle (ENT-029). Footer: invitation to create the Carnet and to join WhatsApp, Instagram link (ENT-032, O13). Carnet invitations in the three contexts of REQ-IDE-008 (after a purchase, when closing the gallery, after 5 min or 3 achievements) with the pacing of REQ-IDE-009 (non-blocking, one per session, never twice after «Ahora no»). The ship position and heading are saved and restored on reload of /juego (REQ-IDE-004) and the local-progress notice explains its limits (IDE-007). Re-check that Tickets is visible without scroll at 360×640 with the 3D CTA.
- Context: inventory §3 Accesos and Identidad; docs/spec/02-entrada-y-landing.md, 05-identidad-y-comunidad.md; apps/web/app/(landing)/**, apps/web/lib/world-handoff.ts, apps/web/app/juego/** (bootstrap at a place, `?cerca=`), apps/web/app/carnet/**; docs/propuestas/textos-zonas.md.
- Scope: may touch ESTADO.md (own top section), apps/web/app/(landing)/**, apps/web/lib/landing/**, apps/web/lib/world-handoff.ts, apps/web/app/juego/** (bootstrap, invitations, position save), apps/web/app/carnet/**, packages/store/** (position and invitation state only, with migration), apps/web/e2e/** / must not touch packages/engine/**, packages/world/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: invitation pacing (once per session, «Ahora no» respected); position restored after reload
  - `pnpm build` → landing ≤ 192 KB gzip
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; specs: Fotos from the landing lands the ship at Puerto de Fotos; Tickets visible without scroll at 360×640
- Outcome:

## T45 — Local ranking, Carnet moderation, six boies, dolphin, island shortcut, Fiestera destination
- Status: pending
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
- Status: pending
- Depends on: none
- Goal: One ambient loop per world generated in the browser (WebAudio, `muestra`, O10) starting on the first interaction in /juego and /mar at 30 % when music is on; pickup «ping», boost WHOOSH, bump on collision; behaviours can declare a sound and an animation id in their params (REQ-PRO-011) with a small built-in set. The wake reacts to turning, boost and collision (REQ-MUN-004; `collideShip` already returns contact). Keyboard and touch sensitivity in Ajustes/Controles (REQ-MUN-008). HUD: the fps/speed box only with `?debug` (O11). iOS audio unlock and pause on hidden tab.
- Context: apps/web/app/juego/sound.ts, sections/ajustes.tsx, controles.tsx; packages/engine/src/wake.ts, ship/controller.ts, input/**, ui/hud-layout.ts; packages/world/src/behaviors.ts; apps/web/app/mar/engine/effects.ts; docs/spec/01 (PRO-009, PRO-011), 03 (MUN-004, MUN-008).
- Scope: may touch ESTADO.md (own top section), apps/web/app/juego/**, apps/web/app/mar/** (sound and wake only), packages/engine/src/wake.ts, ship/**, input/**, ui/hud-layout.ts, packages/world/src/behaviors.ts (sound/animation params only), apps/web/e2e/** / must not touch packages/store/** beyond settings keys, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: wake intensity differs for turn/boost/collision; sensitivity scales turn rate; no audio before the first interaction
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; the HUD spec checks no fps box without `?debug`
- Outcome:

## T47 — Load the world by sectors
- Status: pending
- Depends on: none
- Goal: `/juego` loads only the art of the sector around the spawn first (≤ 5 MB transferred before play, REQ-ARQ-014) and streams neighbouring sectors as the ship approaches, with texture atlases per sector, release of far textures, a lower-quality tier for weak devices, and no visible pop-in on the route. `/mar` loads glTF lazily the same way where it is cheap.
- Context: packages/engine/src/game.ts, manifest-loader.ts, world/**; packages/world/src/schema.ts (sectors); apps/web/app/api/art; art/mundos/** sizes; docs/spec/03-mundo-y-motor.md (REQ-MUN-012), 08 (ARQ-014).
- Scope: may touch ESTADO.md (own top section), packages/engine/**, packages/world/src/schema.ts and sector data, apps/web/app/juego/** (bootstrap), apps/web/app/mar/engine/** (lazy loading only), tools/ (an atlas build script), apps/web/scripts/** (a budget check) / must not touch art/** sources, packages/store/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; a budget script reports bytes before first play per world and fails over 5 MB
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0; a spec sails from the port to the última isla with no missing-texture frames
- Outcome:

## T48 — Admin hardening
- Status: pending
- Depends on: T42, T43
- Goal: Deleting shows the impact (what links to it) and asks to type the name (REQ-ADM-029); trash with a retention setting and a purge that asks for confirmation again (ADM-030); achievements can be created, duplicated and versioned with icon, dates and scope, changing a condition makes a new version (ADM-021/022, on top of plan 003 T36); home and events edit as a draft with preview and «Publicar» (ADM-015), home CTAs editable and events excludable (ADM-017); validations for mission destination, circuits, dangling references and parameter ranges (ADM-013/014); music upload with licence fields (ADM-020, stored as data URL `muestra`); purchases and stamps written to the audit (ADM-007); docs/manual-admin.md with the manual data-request procedure (ADM-031).
- Context: inventory §3 Admin; docs/spec/07-admin.md; apps/web/app/admin/**, apps/web/lib/admin/**, packages/store (overrides, audit, trash).
- Scope: may touch ESTADO.md (own top section), apps/web/app/admin/**, apps/web/lib/admin/**, packages/store/** (with migration), docs/manual-admin.md (new), apps/web/e2e/admin*.spec.ts / must not touch packages/engine/**, packages/world/**, art/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: delete needs the exact name; a draft is invisible on the landing until published; an invalid parameter range is refused with its reason
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0
- Outcome:

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
- Status: pending
- Depends on: none
- Goal: Apply Álvaro's identity (inventory §6.8). Trace the wordmark (art/marca/boia-wordmark.jpg) to clean vectors (SVG in art/marca/), rebuild the intro's 3D «BOIA» letters from that shape in Blender (same pipeline and motion as plan 002 T27, replacing Inter), use the SVG wordmark and the mascot as logo in the landing header, footer, favicon/app icons and the Admin, and set the brand colours sampled from the two images (orange, navy-blue, black outline) as design tokens in apps/web and the /mar palette. UI type: a free display font that matches the wordmark for titles (chosen by the agent, self-hosted, subset, within the 192 KB landing budget) until Álvaro sends the real font file.
- Context: art/marca/**; tools/blender/intro/titulo.py, art/intro/**, packages/engine/src/intro/**, apps/web/lib/intro/**; apps/web/app/(landing)/**, apps/web/app/globals.css, apps/web/app/icon.svg, apps/web/app/admin/admin.css, apps/web/app/mar/engine/palette.ts; plan 002 T27 Outcome.
- Scope: may touch ESTADO.md (own top section), art/marca/**, art/intro/**, tools/blender/intro/**, packages/engine/src/intro/** (title only), apps/web/lib/intro/**, apps/web/app/(landing)/** (logo, tokens), apps/web/app/globals.css, apps/web/app/icon.svg and app icons, apps/web/app/admin/admin.css, apps/web/app/mar/engine/palette.ts, apps/web/public/fonts/** (new), apps/web/e2e/** / must not touch packages/world/**, packages/store/**, art/mundos/**.
- Done when:
  - Blender render of the letters → exit 0 twice byte-identical; `python3 tools/blender/check.py` → exit 0
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; `pnpm build` → landing ≤ 192 KB gzip (report it)
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0 (intro specs still pass)
  - Screenshots p004-t50-intro-letras.png (next to the wordmark image) and p004-t50-landing-logo.png
- Outcome:

## Decisions
- 2026-09-29: coins buy ships and skins; only B05 and B02 unlocked at start; points unlock one ship (Hernán) → B04 at 1500 points, prices in inventory O5 (orchestrator)
- 2026-09-29: world switch = a black-hole vortex; same places, links and features, only renders and dialogues change (Hernán)
- 2026-09-29: discount cards sail you to their island; buying on that island shows «Tienes un código de descuento para este evento» (Hernán)
- 2026-09-29: islands offer «Ver fotos de la isla» into the «Fotos y eventos» page (Hernán)
- 2026-09-29: ranking active, local only; the team writes all zone texts; Carnet questions stay those of v14 §44.1; physical phone checked OK (Hernán)
- 2026-09-29: Álvaro-pending items the orchestrator can decide are decided (O1–O15 in the inventory); /mar 3D stays (Hernán)
- 2026-09-29: Álvaro's answers (inventory §6): the mascot is every 3D boia, incl. the Boia Fiestera; the wordmark drives the intro letters; first real event «BOIA Club · Halloween» at the Kiki García Bar, a BOIA Club night (satellite, series boia-club), not an All Day (Hernán); home shows Álvaro's photo selection; jokey invented legal data; full permission for Hernán (Álvaro via Hernán)

## Proposals (new scope)

## Log
- 2026-09-29 draft written from the v14 inventory (orchestrator session, not launched; waits for plan 003)

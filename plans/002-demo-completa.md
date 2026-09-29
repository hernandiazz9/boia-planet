# Plan 002 — Complete playable demo: two worlds, missions, community, admin, deployable

Status: active
Created: 2026-09-28
Base branch: main
Goal: Turn the plan 001 demo into a test version that feels final: two finished worlds (Arcilla/B05 and Acuarela/B02), each with its own islands, story and ship; every L1 island and encounter reachable (event islands, náufragos, hidden discounts, chests, dolphin, whirlpool, circuit, Puerto de Fotos, shop, última isla) plus the two minigames (faro, cañón); the Boia Fiestera mission from the port; bottles, Mi Carnet, achievements, points and coins; tickets that grant the stamp directly; an Admin reachable with a «Probar admin» button; the intro with 3D «BOIA» letters and EXPLORAR revealing the port; polished for real phones and ready for Hernán to deploy on Vercel. No Supabase yet: everything persists in the visitor's browser behind a repository interface that Supabase will replace later. Decisions in docs/DECISIONES.md (D-01…D-19, plus D-20 from T15); spec in docs/spec/.
Test command: pnpm test
Worktree setup: pnpm install
Max parallel agents: 3

Agent notes: do not invoke the project skills `encargo` or `orquestador` (the encargo skill cds into the main checkout); follow this prompt instead. Each task adds its own section at the top of ESTADO.md in the existing format (`## <date> — plan 002 Txx: <title>`, what exists, commands, deviations, untested); on a merge conflict there, keep every section, newest on top. Spanish copy and docs use the name "Boia" (D-18). All copy, numbers and art are `muestra` until Álvaro approves. The first task wiring @boia/store into apps/web adds it to apps/web/package.json and to transpilePackages in apps/web/next.config.ts; any task may make that two-line change even if outside its Scope. Hernán may have a dev server of the main checkout on port 3000: never kill it and never use port 3000 (use 3100+). No Supabase, no mail, no network services: persistence goes through the local repository from T16. Several agents share this machine: run the full e2e suite with `--workers=2` and a free E2E_PORT.

## Tasks

## T18 — Arcilla world art (B05) from the mundos exploration
- Status: done
- Depends on: none
- Goal: Produce the game-ready art of the Arcilla world with the Blender pipeline, from mundos/arcilla (diseno.md, mapa.json, zonas/*.py, piezas.py, paleta.json): every zone's islands and landmarks as separate sprites with manifests (per v14 §49.17 and the existing check): Puerto de salida El Varadero (the port, with the spawn ring), Cala del Alfar, the Boia Fiestera encounter spot (with 3–4 crocodiles that can dive, frames for surfacing and diving), the All Day stage island (event), Puerto de Fotos, the shop island, mar vivo elements (náufrago on a raft, debris, chest, dolphin, whirlpool), the El Freu circuit gates, the Isla del Amanecer (última isla), the Faro and Cañón islands for the minigames, coast tiles including corners and bottom edge, the Boia Fiestera character on the TRIPULANTE slot of the B05 ship, and a bottle. Same camera (30°, D-13) and pixels per unit as the ship. Files go to `art/mundos/arcilla/<place-id>/` named by the stable place ids of mundos/arcilla/mapa.json (which becomes the shared map every world uses, T17), so another world only has to supply the same place ids.
- Context: mundos/arcilla/** (design, map, zones, pieces, palette), mundos/README.md, mundos/temas.py; tools/blender/** (render.py, check.py, styles/, manifest.schema.json); art/barco/estilos/arcilla-maqueta (T11); docs/spec/04-aventura.md (REQ-AVE-*), docs/barcos/barcos.json (B05).
- Scope: may touch ESTADO.md (own top section), tools/blender/**, art/mundos/arcilla/** (new), mundos/arcilla/** (only to share code with tools/blender) / must not touch apps/**, packages/**, art/barco/** (except adding the Fiestera passenger frames for B05 if the manifest needs it), docs/spec/**.
- Done when:
  - `/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/render.py -- --all` → exit 0 twice with byte-identical outputs (diff command reported)
  - `python3 tools/blender/check.py` → exit 0 and lists every Arcilla manifest valid with counts
  - A contact sheet of all Arcilla assets at game scale over its sea in docs/informes/img/ (path in the final message)
- Outcome: 19 Arcilla places / 116 images in art/mundos/arcilla/<place-id>/ (ids in tools/blender/lugares.json: puerto, cala, fiestera, allday, fotos, tienda, ultima, naufrago, restos, cofres, botellas, delfin, remolino, circuito, faro, canon, costa_oeste/este/sur); only `allday` is an event island; Fiestera as `tripulante` part at slot_passenger; faro/canon added to mapa.json; sheet p002-t18-hoja-arcilla.png → 0ae2ee4

## T16 — Local repository: persistence in the browser behind a swappable interface
- Status: done
- Depends on: none
- Goal: One data layer for the whole demo, with the shapes of packages/db (T06) and an interface Supabase can implement later: guest identity with nickname (no mail), progress (discoveries, idempotent reward ledger with stable ids, points and coins as separate balances derived from the ledger, never written directly), achievements, cosmetics, carnet (5 questions of REQ-IDE, member-since, stamps), bottles (one active per identity, 140 chars, position, reports, removal), and content (events with the seven states, home blocks, artists, photo albums, texts, worlds and their objects, active world) as sample data plus admin overrides. Storage in IndexedDB or localStorage with a schema version and migrations, tolerant of blocked or cleared storage (falls back to memory and says so). A React-free core in a new package so engine, landing, juego and admin share it.
- Context: packages/db/src/database.types.ts and supabase/migrations (T06 shapes and invariants: ledger ids chosen by the server, balances derived); packages/contracts (EVENT_STATES, HOME_BLOCK_TYPES); docs/spec/05-identidad-y-comunidad.md (REQ-IDE-*), 06-comercial.md, 08-arquitectura-y-datos.md; the plan 001 WIP branch `worktree-agent-a208530713932c80c` (guest identity and merge ideas; read only, do not merge it).
- Scope: may touch ESTADO.md (own top section), packages/store/** (new), packages/contracts/**, root package.json (scripts only), pnpm-workspace.yaml / must not touch packages/db/**, supabase/**, apps/web/app/**, packages/engine/**, packages/world/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: a reward with the same id is granted once; balances cannot be set directly; one active bottle per identity and the 140-char limit; admin overrides win over sample content and can be reset; a schema-version bump migrates old data; blocked storage falls back to memory
  - `pnpm typecheck && pnpm lint` → exit 0
- Outcome: packages/store (@boia/store): async repository, localStorage `boia.store` v1 with memory fallback; ledger ids chosen by the repository, balances derived; carnet, bottles, stamps, admin overrides per place (shared) and per (world, place) skins, append-only audit, reset per area; sample content incl. 3 fictional crew; NOT yet wired into apps/web (add to package.json + transpilePackages) → 8d8b2b7

## T17 — Multiple worlds in the engine
- Status: done
- Depends on: none
- Goal: The engine and packages/world support several worlds over ONE SHARED MAP (Hernán, D-20): a single list of places (stable id, position, footprint/collision, behaviors and params, spawn, port and intro landing point) common to every world, and per world a skin for each place (art asset, name, texts, story lines) plus the world's ship style (from art/barco styles), sea palette, UI accents and music slot. Moving a place moves it in every world at once; adding an island means adding one place and dropping its files named by world. Asset convention: `art/mundos/<world-id>/<place-id>/` with its manifest; a place with no skin in a world renders a clear placeholder and is listed by a new `pnpm world:check` (exit 1 on missing skins or unknown place ids, with a per-world table). A world may hide a place only through an explicit flag. Naming (Hernán): each place has a shared name plus an optional per-world name override; renaming offers «only in this world» (sets the override) or «in every world» (sets the shared name and clears the overrides). Sample data: event/ticket islands use only the shared name (same in every world); other places may carry per-world names of real coastal places of the world. Switching world keeps progress keyed by stable place ids, never by coordinates (REQ-AVE-011). Keep the current sample world as world `muestra` until T20/T24 replace it. World selection API usable from the menu and from Admin (active world). No art or content here beyond a second tiny test world proving the switch.
- Context: packages/world/** (SAMPLE_WORLD, behaviors catalog, schema version), packages/engine/** (world loading, ship style resolution from T11), apps/web/app/juego/** (world bootstrap, menu «Barco»); mundos/README.md (one map, many worlds); docs/spec/03-mundo-y-motor.md.
- Scope: may touch ESTADO.md (own top section), packages/world/**, packages/engine/**, apps/web/app/juego/**, root package.json (scripts only) / must not touch apps/web/app/(landing)/**, art/**, tools/blender/**, mundos/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: two registered worlds render the same places with their own skins and ship style; moving a place in the shared map moves it in both worlds; switching keeps discoveries by id; a skin for an unknown place id is rejected
  - `pnpm world:check` → prints the per-world skin table (exit 0 for the test worlds; exit 1 when a skin is removed in a test fixture)
  - `pnpm typecheck && pnpm lint` → exit 0; `pnpm e2e` → exit 0 (existing specs)
- Outcome: shared map (packages/world/src/worlds/map.ts) + per-world skins (skin.ts) composing WorldConfig; names shared + per-world override, renamePlace scope {world}|'all'; placeholder:sin-skin; `pnpm world:check`; ?mundo=, WorldChoice interface (URL > boia:mundo > boia:mundo-activo > default); game.setWorld live; test world `prueba` → ce3827b

## T15 — Decision D-20 and spec updates for the complete demo
- Status: done
- Depends on: none
- Goal: Record Hernán's decisions of 2026-09-28 as D-20 in docs/DECISIONES.md (existing format, author Hernán, Álvaro's approval pending where identity/business is touched), with seven points: (1) the test version brings forward from L2 the two minigames (faro, cañón), a second world and seasons-as-worlds: two worlds, Arcilla (B05) and Acuarela (B02), each with its own islands, story and ship style, following the one-map-many-worlds exploration in mundos/; (2) until Supabase exists, all persistence (progress, carnet, bottles, admin edits) lives in the visitor's browser behind a repository interface, so bottles are only visible to their author in this version; (3) without a ticketing provider, «Comprar entrada» grants the purchase stamp directly (sandbox, clearly labelled); (4) the Admin is reachable in the test version with a «Probar admin» button, without login, clearly marked as a demo; (5) the intro title «BOIA» becomes 3D letters rendered in Blender that move like messenger.abeto.co (D-05 holds: no 3D in the browser; this amends the flat wordmark of D-19 and REQ-ENT-003); (6) after EXPLORAR the camera pulls back a little and the ship starts at a port (El Varadero in Arcilla), where the first encounters and the Boia Fiestera mission begin. (7) one shared map for all worlds: a place is one point with a stable id and each world supplies its own skin, name and texts; moving a place moves it in every world; new islands are added once with files named by world; names are shared with optional per-world overrides, and renaming lets you choose «only this world» or «every world»; event/ticket islands start with the same name in every world, the others may take per-world names of real coastal places. Also list in D-20, as «Para la versión final», everything deferred (see the plan's Proposals: Supabase shared backend, mail auth, Admin TOTP, visual editor, real ticketing, PostHog key, server-side minigame validation, Álvaro's approvals and real links, intro auto-advance, domain and accounts). Update the affected REQ lines in docs/spec/ (same IDs and line format; mark the L2 items brought forward as `L1-demo` or note D-20 in the source, whichever tools/spec/check.py accepts), and add P-items for Álvaro.
- Context: docs/DECISIONES.md (D-02, D-05, D-08, D-16, D-19 format); docs/spec/02-entrada-y-landing.md, 03-mundo-y-motor.md, 04-aventura.md, 05-identidad-y-comunidad.md, 06-comercial.md, 07-admin.md; mundos/README.md and mundos/arcilla/diseno.md; tools/spec/check.py.
- Scope: may touch ESTADO.md (own top section), docs/DECISIONES.md, docs/spec/** / must not touch docs/fuente/**, code, art/, tools/blender/**, mundos/**.
- Done when:
  - `python3 tools/spec/check.py` → exit 0 and `python3 tools/spec/test_check.py` → exit 0
  - `grep -n "D-20" docs/DECISIONES.md` → the decision with its seven points, the «Para la versión final» list and the pending-Álvaro note
- Outcome: D-20 (7 points, «Para la versión final» 11 items, pending Álvaro), P10–P13; minigames REQ-AVE-035…039 now L1; test-version exceptions REQ-ARQ-025, IDE-051, COM-035, ADM-039; REQ-MUN-035…037 shared map/worlds; 286 REQ → 9aab31b

## T20 — Arcilla world in the game: every island and encounter
- Status: done
- Depends on: T16, T17, T18
- Goal: Build the shared map (places, once, in packages/world) from mundos/arcilla/mapa.json and the Arcilla skins from T18's art, and make every place work with the behavior catalog and the local repository: start at the port El Varadero (spawn ring); event islands with their panels, tickets and memories; náufragos that ask for a lift and grant a ticket discount; hidden discounts in debris and treasure (code copied with one tap, granted once, expired shown as such); chests; dolphin; whirlpool; the El Freu circuit with a local personal record; Puerto de Fotos opening the gallery; the shop island (external link); the Isla del Amanecer as última isla; Faro and Cañón islands wired to `start_minigame` with ids `faro` and `canon` (the minigames themselves are T23); secondary islands along the route; coasts with corners and bottom edge. Replace the plan 001 sample world as the default world. Minimap and compass list the new places.
- Context: mundos/arcilla/** (diseno.md zones, mapa.json), art/mundos/arcilla/** manifests (T18), packages/world/** and packages/engine/** (T17 world registry, behavior catalog), packages/store (T16), docs/spec/04-aventura.md (REQ-AVE-012…027), 06-comercial.md (REQ-COM-020…022), apps/web/app/juego/**.
- Scope: may touch ESTADO.md (own top section), packages/world/**, packages/engine/**, apps/web/app/juego/** / must not touch apps/web/app/(landing)/**, art/**, tools/blender/**, packages/store/** (use its API; report missing pieces as OUT OF SCOPE unless tiny), docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: every place in mapa.json exists in the world data; no island blocks navigation and no teleport lands on land; a discount code is granted once; the circuit keeps the best local time
  - `pnpm e2e` → exit 0; a new spec drives the ship from the port to each kind of place (event island panel, náufrago, discount, Puerto de Fotos, shop, circuit start) on desktop and mobile
  - `pnpm typecheck && pnpm lint` → exit 0
- Outcome: shared map from mapa.json + Arcilla skins; every place works (port ring spawn, allday event panel/tickets, náufrago discount, restos/cofres codes, delfín, remolino, El Freu circuit with local record, Puerto de Fotos, tienda, faro/canon minigames, última isla); Arcilla is the default world with its own ship; `?cerca=<place>` test start; 513 tests, e2e 78 → 40b890d

## T19 — Acuarela world design and art (B02)
- Status: done
- Depends on: T18
- Goal: Design and produce the second world, Acuarela ilustrada, matching the B02 ship, on the SAME shared map as Arcilla (same place ids and positions, D-20): a story that fits the watercolour look and BOIA's Alicante roots (different from Arcilla, `muestra`), and for every place of the shared map its Acuarela identity — its own island look, landmark, name and story line (names of real coastal places of the world, except event/ticket islands, which keep their shared name), so the islands feel different while sitting on the same points. Write mundos/acuarela/diseno.md (story plus one entry per place id) following mundos/arcilla's structure, then render one skin per place id into `art/mundos/acuarela/<place-id>/` with manifests as in T18. No separate map.
- Context: T18's Outcome and its pipeline changes; mundos/arcilla/** as the model; tools/blender/styles/02_acuarela_ilustrada.py; docs/barcos/barcos.json (B02: estilo, aspecto, paleta, notas_render); docs/spec/04-aventura.md.
- Scope: may touch ESTADO.md (own top section), mundos/acuarela/** (new), tools/blender/**, art/mundos/acuarela/** (new) / must not touch apps/**, packages/**, art/mundos/arcilla/**, docs/spec/**.
- Done when:
  - Blender `render.py -- --all` → exit 0 twice, byte-identical; `python3 tools/blender/check.py` → exit 0 listing every Acuarela manifest
  - mundos/acuarela/diseno.md covers every place id of the shared map, and every place id has an Acuarela skin (a script or check lists 0 missing)
  - A contact sheet of all Acuarela assets at game scale in docs/informes/img/ (path in the final message)
- Outcome: Acuarela = painter's notebook on the night of Sant Joan (Explanada → Tabarca bonfire), 19 places / 116 images in art/mundos/acuarela/<place-id>/, real coastal names except `allday`; mundos/acuarela/diseno.md + herramientas/cobertura.py (0 missing); sheet p002-t19-hoja-acuarela.png → 0989c4c

## T22 — Mi Carnet and bottles
- Status: done
- Depends on: T16, T17
- Goal: Mi Carnet (REQ-IDE-010…022) as a menu section and a shareable view: nickname (created as a guest, no mail), neutral avatar or photo from device, «Miembro desde», the 5 questions of §44.1 verbatim, rank, points, achievements, ship and cosmetics, stamps. Bottles (REQ-IDE-040…044): write one active bottle of up to 140 characters at a valid sea spot next to the ship, edit or remove it, read bottles found in the sea (author nickname and «VER SU CARNET», the bottle stays), report; no points or coins for bottles. In this version bottles live in the browser (D-20): seed a few `muestra` bottles from other fictional crew so reading works.
- Context: docs/spec/05-identidad-y-comunidad.md (REQ-IDE-*), v14 §44.1 for the 5 questions (verbatim); packages/store (T16); packages/engine (T17 worlds, sea validity); apps/web/app/juego/menu/sections/ (T05); apps/web/app/(landing) only for a carnet deep link if needed.
- Scope: may touch ESTADO.md (own top section), apps/web/app/juego/**, apps/web/app/carnet/** (new), packages/engine/src/bottles/** (new), packages/world/** (bottle object type only) / must not touch packages/store/** (API only), art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: a bottle on land is rejected; second active bottle replaces or is refused per spec; reading never removes it; the carnet shows the 5 questions verbatim from their source
  - `pnpm e2e` → exit 0; a spec creates a nickname, fills the carnet, drops a bottle, reloads and finds it, reads a seeded bottle and opens its author's carnet
- Outcome: Mi Carnet (menu section + /carnet, /carnet/<id>, ?menu=carnet), bottles in the sea via Game.setBottles (found at 150 u), second active bottle refused, seeded crew bottles; all web repo access through apps/web/app/juego/repo.ts gameRepository(); REQ-IDE-051 copy «solo en este navegador», no share button → f6adabd

## T23 — Minigames: Vigilancia del faro and Cañón contra tiburones
- Status: done
- Depends on: T16, T17
- Goal: The two minigames of REQ-AVE-036/037 behind the INICIAR_MINIJUEGO extension point, started by `start_minigame` with ids `faro` and `canon`: faro — sweep the beam, identify pirate flags, raise the alarm, end after 5 pirates or when time, errors or ships run out; cañón — aim by dragging, fire balls in an arc, end after scaring 3 sharks or when time or ammo run out, no wounds shown. Rewards per once/daily/season policy validated locally with session, seed and duration (REQ-AVE-038; the server check comes with Supabase). Touch and keyboard, reduced motion, pause on tab hide, exit back to the sea where you were. Art: simple vector or reuse of world art in each world's style (no Blender needed); `muestra`.
- Context: docs/spec/04-aventura.md (REQ-AVE-036…038), docs/DECISIONES.md D-09; packages/engine (start_minigame extension point from T04), packages/store (T16 ledger).
- Scope: may touch ESTADO.md (own top section), packages/engine/src/minigames/** (new), packages/engine/package.json (exports only), apps/web/app/juego/** (mount point only) / must not touch packages/world/**, packages/store/** (API only), art/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: both end conditions of each game; a replayed seed with an impossible duration grants nothing; the once/daily policy holds across reloads
  - `pnpm e2e` → exit 0; a spec opens each minigame through its test route, plays to an end state and returns to the sea
- Outcome: faro (daily) and cañón (season) in packages/engine/src/minigames, test route /juego?minijuego=faro|canon, non-modal «Jugar» panel near the island, seed-based minimum duration, rewards via gameRepository().progress, arcilla/acuarela styles; islands to be placed by T20 → e2c8abf

## T21 — Boia Fiestera mission, achievements, points and coins
- Status: done
- Depends on: T20
- Goal: REQ-AVE-005…011 in Arcilla: the Fiestera floats among 3–4 crocodiles that dive one by one as the ship nears; she boards with the notice «Nueva tripulante a bordo · Boia Fiestera rescatada · Destino: última isla»; she stays visible in the TRIPULANTE slot; she disembarks at the Isla del Amanecer with a celebration, achievement and big reward; the world stays open after. Destination stored by world/season id, never coordinates. Achievements system with the base list of REQ-IDE-025 (first boia, X/6 boies, islands, ticket, 5/20 minutes, Fiestera, circuit, secrets), notices one at a time 4 s (T05 queue), points and coins as separate balances from the T16 ledger, shown in the HUD/menu.
- Context: docs/spec/04-aventura.md (REQ-AVE-005…011), 05-identidad-y-comunidad.md (REQ-IDE-024…028); T18 art (crocodiles, Fiestera on B05); packages/store (T16); packages/engine (dialogue, collectible, reward, achievement-trigger behaviors); apps/web/app/juego/** (menu, notices).
- Scope: may touch ESTADO.md (own top section), packages/world/**, packages/engine/**, apps/web/app/juego/** / must not touch apps/web/app/(landing)/**, art/**, packages/store/** (API only), docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: the mission steps in order, reward granted once even after reload, destination survives a world switch, each base achievement fires once
  - `pnpm e2e` → exit 0; a spec rescues the Fiestera and lands her at the última isla on desktop
- Outcome: Fiestera mission keyed on map data (params.mission, cocodrilo objects, params.missionDestination), one global mission surviving reloads/world switches, delivery reward 100 pts/100 coins (muestra); achievements notices only when the store grants; points/coins chip next to Inicio; Logros shows balances, rank and progress; 550 tests → 58bb656

## T27 — Intro: 3D «BOIA» letters rendered in Blender
- Status: done
- Depends on: T18
- Goal: Model «BOIA» as 3D letters in Blender in BOIA's identity (extruded, soft bevel, brand orange/navy, `muestra`), animate them like the title of messenger.abeto.co (letters rise one by one, bob and wobble independently, subtle turn catching the light), render as a light image sequence or sprite sheet with a seamless idle loop and an exit move, and use them as the title of act 2 over the mini-world (replacing the flat wordmark). Reduced motion shows a still frame. The landing critical path stays within T14's budget (≤ 192 KB gzip); the sequence loads after the mini-world.
- Context: T14's intro (packages/engine/src/intro/**, apps/web/lib/intro/**, intro config); docs/propuestas/2026-09-28-intro-mini-mundo.md; D-19/D-20; tools/blender/** pipeline; docs/barcos/barcos.json brand colours.
- Scope: may touch ESTADO.md (own top section), tools/blender/**, art/intro/** (new), packages/engine/src/intro/**, apps/web/lib/intro/**, apps/web/app/(landing)/** (title element only), apps/web/e2e/** / must not touch packages/world/**, apps/web/app/juego/**, docs/spec/**.
- Done when:
  - Blender render of the letters → exit 0 twice byte-identical; `python3 tools/blender/check.py` → exit 0
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; `pnpm e2e` → exit 0 (intro specs updated: title visible, reduced motion still frame)
  - `pnpm build` → landing critical path ≤ 192 KB gzip (report the number)
  - A recording of the new title on mobile and desktop in docs/informes/img/ (paths in the final message)
- Outcome: Blender renders each letter at 17 turn angles in one 203 KB WebP sheet (tools/blender/intro/titulo.py, Cycles CPU, own PNG writer); rise/bob/wobble/exit computed in the browser on a 2D canvas (titlePoses), intro config v3; text fallback kept; landing 168.5 kB; recordings p002-t27-titulo-* → f0d9a26

## T24 — Acuarela world in the game and world switching
- Status: running (attempt 1)
- Depends on: T19, T20
- Goal: Add the Acuarela skins (T19's art, names and texts from mundos/acuarela/diseno.md; event/ticket islands keep their shared name) to the shared map so every place and encounter works in Acuarela exactly where it is in Arcilla (no second map), its Fiestera encounter and última isla (T21 mission logic generalised if needed), Faro and Cañón islands wired to the minigames. Switching world: from the menu («Mundos», showing both with their story line and ship) and as Admin's active world; each world uses its ship style by default (B05 / B02) and the «Barco» section still lets you change it.
- Context: T19 and T20 Outcomes; mundos/acuarela/**; art/mundos/acuarela/**; packages/world, packages/engine (T17 registry); apps/web/app/juego/** (menu).
- Scope: may touch ESTADO.md (own top section), packages/world/**, packages/engine/**, apps/web/app/juego/** / must not touch apps/web/app/(landing)/**, art/**, tools/blender/**, packages/store/** (API only), docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: every shared place has an Acuarela skin; moving a place moves it in both worlds; progress in Arcilla survives switching to Acuarela and back
  - `pnpm world:check` → exit 0 with both worlds complete
  - `pnpm e2e` → exit 0; a spec switches world from the menu, sails to Acuarela's event island and its náufrago
- Outcome:

## T25 — Tickets that grant the stamp directly
- Status: done
- Depends on: T16, T22
- Goal: Without a ticketing provider (D-20): «Comprar entrada» on the landing, the tickets panel and event islands opens a sandbox checkout clearly labelled as a test (event, price `muestra`, náufrago discount applied when the visitor has it) and on confirm adds the event's stamp to Mi Carnet once per purchase id, fires the ticket achievement and shows the notice. Keep the ticketing adapter interface of the plan so a real provider replaces the sandbox later. A finished event never shows a buy CTA.
- Context: docs/spec/06-comercial.md (REQ-COM-*), D-06; packages/store (T16); apps/web/app/(landing)/** (tickets panel from T02), apps/web/app/juego/** (event island panel), Mi Carnet (T22).
- Scope: may touch ESTADO.md (own top section), apps/web/app/(landing)/**, apps/web/app/juego/** (ticket panel only), apps/web/lib/ticketing/** (new), packages/contracts/** / must not touch packages/store/** (API only), packages/engine/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: a stamp is added once per purchase id even on double confirm; the discount applies only with a valid code; finished events have no CTA
  - `pnpm e2e` → exit 0; a spec buys from the landing and from an island and sees the stamp in Mi Carnet
- Outcome: sandbox checkout from landing and islands (lib/ticketing adapter: start/confirm, real provider plugs in via ticketing()), one stamp per purchase id, best found discount auto-applied, ticket achievement via buy_ticket trigger; repo moved to apps/web/lib/repo.ts; landing 166.5 kB → a450c34

## T26 — Demo Admin with a «Probar admin» button
- Status: done
- Depends on: T20, T22
- Goal: The L1 Admin sections (REQ-ADM-008) in a demo mode reachable from a «Probar admin» button (landing footer and menu), no login, a permanent banner saying changes stay in this browser: Página principal (order, show/hide, schedule, priority event, desktop/mobile preview), Eventos (seven states with manual override, event↔island link, an island keeps its memories), Mundo (the shared map: list places, edit position, params and enabled state with a map preview — a position change moves the place in every world, stated in the UI; per world: skin and texts of each place; renaming a place asks «solo en este mundo» or «en todos los mundos»; set spawn, port and intro landing point; validation from T09: islands never block navigation, teleports never land on land, ids exist), Artistas, Fotos y vídeos, Logros y cosméticos, Moderación (bottles and reports), Textos y música, Temporadas (active world), Usuarios de administración and Integraciones as read-only stubs. Every change goes through T16 overrides, is logged in a local audit list and can be reset to sample data. The landing still reads apps/web/lib/landing SAMPLE_CONTENT (T25 note): make it read events, home blocks, artists and photos from the repository (gameRepository in apps/web/lib/repo.ts) so admin changes show on the landing. The visual drag-and-drop editor stays for later.
- Context: docs/spec/07-admin.md (REQ-ADM-*), docs/DECISIONES.md D-20; packages/store (T16 overrides and audit); packages/world validation; apps/web/app/(landing) and juego (to see changes live).
- Scope: may touch ESTADO.md (own top section), apps/web/app/admin/** (new), apps/web/lib/admin/** (new), apps/web/app/(landing)/** (the button and reading content from the repository), apps/web/lib/landing/**, apps/web/app/juego/** (only the button), apps/web/e2e/** / must not touch packages/store/** (API only), packages/engine/**, docs/spec/**.
- Done when:
  - `pnpm test` → exit 0; adds tests: an invalid world edit is refused with its reason; reset restores sample data; each change writes an audit entry
  - `pnpm e2e` → exit 0; a spec opens «Probar admin», creates an event, links it to an island, reorders home blocks, moves an object and sees all of it on the landing and in the world; hides a reported bottle
- Outcome: /admin demo (no login, banner) with all L1 sections, rules in apps/web/lib/admin (validate, actions+audit, world overlay); spawn/port/intro point as reserved places mapa:salida/puerto/entrada; landing reads @boia/store (lazy import, landing critical path 201 kB); event↔island panels; active world in store + boia:mundo-activo → bc9ca58

## T28 — EXPLORAR reveals the port and starts the adventure there
- Status: running (attempt 1)
- Depends on: T20, T27
- Goal: When EXPLORAR is pressed, the camera pulls back a little (less than the early versions) and reveals the port El Varadero with the ship in it, then hands the live scene to /juego (T12) with the ship at the port; the first boia and the path to the Boia Fiestera encounter are the first things met. The intro landing point and the port framing are config data per world. Deep links to /juego still start clean at the active world's port.
- Context: T12 handoff (apps/web/lib/world-handoff.ts), T14/T27 intro, T20 Arcilla world (port, spawn ring), T17 registry; docs/spec/02-entrada-y-landing.md (REQ-ENT-012), D-20 point 6.
- Scope: may touch ESTADO.md (own top section), packages/engine/src/intro/**, apps/web/lib/intro/**, apps/web/lib/world-handoff.ts, apps/web/app/(landing)/**, apps/web/app/juego/** (bootstrap only), apps/web/e2e/** / must not touch packages/world/** (data only through its API), art/**, docs/spec/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds a test that EXPLORAR ends with the ship at the active world's port
  - `pnpm e2e` → exit 0; the demo spec now checks the port is visible after EXPLORAR on mobile and desktop
- Outcome:

## T29 — Real-phone polish, sound and music
- Status: pending
- Depends on: T21, T23, T24, T25, T26, T28
- Goal: Make it feel final on phones: frame-time budget and memory on mid-range Android and iPhone profiles (Chromium mobile emulation with CPU ×4 plus WebKit in Playwright), texture atlases and lazy loading per world sector, iOS Safari quirks (audio unlock, WebGL context loss and restore, safe areas, 100vh), Instagram in-app browser, the Pixi hidden accessibility button tab stop, keyboard and screen-reader paths for panels, reduced motion everywhere; sound: SFX set and one music loop per world (`muestra`, royalty-free or generated), with the separate music and SFX controls of T05 and no audio before the first interaction.
- Context: ESTADO.md sections of plans 001 and 002 (open issues); docs/spec/03-mundo-y-motor.md, 02-entrada-y-landing.md (performance and accessibility REQs); apps/web/**, packages/engine/**.
- Scope: may touch ESTADO.md (own top section), apps/web/**, packages/engine/**, art/audio/** (new) / must not touch packages/store/**, packages/world/** (data), docs/spec/**.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0
  - `pnpm e2e` → exit 0 including a WebKit project; a perf spec reports p95 frame time on throttled mobile for the intro, sailing and a minigame (numbers in ESTADO.md), and axe shows 0 serious or critical violations on landing, carnet and admin
  - `pnpm build` → landing ≤ 192 KB gzip, /juego first world sector ≤ 5 MB gzip (report both) — T26 left the landing at 201 kB: bring it back under 192
- Outcome:

## T30 — Final demo pass and deploy preparation
- Status: pending
- Depends on: T15, T29
- Goal: One last end-to-end pass of the whole test version and everything Hernán needs to deploy it himself on Vercel: build without any env var, `vercel.json` or project settings if needed, `/api/art` and art served correctly in production, analytics off without key, a README section «Desplegar la versión de prueba» with the exact commands (`vercel` / `vercel --prod`), and a demo guide in ESTADO.md: what to try, in order, on a phone. Fix small glue gaps found on the way.
- Context: every Outcome of this plan; D-04 (Vercel), D-16 (art from the repo); apps/web/**.
- Scope: may touch ESTADO.md (own top section), README.md, apps/web/** (glue and config only), vercel.json (new), root package.json (scripts only) / must not touch packages/store/**, packages/world/**, art/**, docs/spec/**. Never run a deploy.
- Done when:
  - `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → exit 0 with no env vars set
  - `pnpm e2e` → exit 0 (full suite)
  - A full recorded run on mobile (intro → port → Fiestera → an event island with purchase and stamp → a bottle → a minigame → switch world → admin change seen live) saved in docs/informes/img/ (path in the final message)
- Outcome:

## T31 — The intro plays on every full page load
- Status: done
- Depends on: T27
- Goal: Hernán wants the intro (mini-world, 3D «BOIA» letters, «Zarpar», landing) every time `/` is fully loaded or reloaded, not only on the first visit. Drop the «seen» gate (boia.intro.v2) for full loads of `/`; keep what still makes sense: deep links (/#tickets, event, gallery, ?menu=…) and routes other than `/` skip the intro (REQ-ENT-011), client-side navigation back to `/` inside the app does not replay it, «Saltar animación» and «Solo quiero ver las entradas» still work from the first moment, reduced motion keeps its still variant, the lightweight landing fallback stays. Record it as D-21 in docs/DECISIONES.md (author Hernán, amends REQ-ENT-009 and D-19's seen flag, Álvaro's approval pending) and update REQ-ENT-009 in docs/spec/02-entrada-y-landing.md; `/?intro=1` stays as an explicit replay.
- Context: T14/T27 intro (packages/engine/src/intro/**, apps/web/lib/intro/**, intro config v3, seen flag boia.intro.v2); docs/spec/02-entrada-y-landing.md (REQ-ENT-009, 011); docs/DECISIONES.md (D-19, D-20 format); apps/web/e2e/** intro and landing specs (several assume return visits skip the intro).
- Scope: may touch ESTADO.md (own top section), docs/DECISIONES.md, docs/spec/02-entrada-y-landing.md, packages/engine/src/intro/**, apps/web/lib/intro/**, apps/web/app/(landing)/** (intro gate only), apps/web/e2e/** / must not touch packages/world/**, apps/web/app/juego/**, art/**, tools/blender/**.
- Done when:
  - `python3 tools/spec/check.py` → exit 0; `grep -n "D-21" docs/DECISIONES.md` shows the decision
  - `pnpm test && pnpm typecheck && pnpm lint` → exit 0; adds tests: a second full load of `/` plays the intro; a deep link skips it; in-app navigation back to `/` does not replay it
  - `E2E_PORT=<free> pnpm e2e --workers=2` → exit 0 with the landing/intro/demo specs updated to the new rule
- Outcome: decideEntry({pathname,search,hash,reducedMotion}) in packages/engine/src/intro/entry.ts: plain `/` always plays, any hash/query/other route goes direct (utm_*, fbclid, gclid… ignored), ?intro=1 forces, ?intro=0 skips; seen flag removed; mountMode for in-app navigation; D-21 + REQ-ENT-001/008/009 → 3f9bd7b

## Decisions
- 2026-09-28: Hernán chose for the test version: persistence in the browser, worlds Arcilla (B05) + Acuarela (B02), the exploracion-mundos branch as base (integrated as 7614d51), 3D «BOIA» letters rendered in Blender, minigames brought forward, tickets granting the stamp directly, Admin behind a «Probar admin» button, EXPLORAR revealing a port, Supabase keys later (Hernán)
- 2026-09-28: one shared map for all worlds: a place is one point with a stable id; each world supplies its skin, name and texts per place id; moving a place moves it in every world; new islands = one place + files named by world under art/mundos/<world-id>/<place-id>/, checked by `pnpm world:check` (Hernán)
- 2026-09-28: island names = shared name + optional per-world override; renaming offers «solo en este mundo» or «en todos los mundos» (clears overrides); event/ticket islands start with the same name everywhere, others may use per-world real coastal names (Hernán, clarified)
- 2026-09-28 T17: world order URL > visitor choice > admin active world > default behind WorldChoice; a world's ship style applies only when none is chosen; setWorld keeps ship position and rewards; per-object runtime state (e.g. dialogue seen) resets on a switch (agent)
- 2026-09-28 T16: one JSON doc in localStorage, schema v1; reward ids `world_reward:<ref>[@day|@season:<world>]`, `achievement:<id>`, `stamp:<purchaseId>`…; daily = Europe/Madrid day, season = active world; sandbox purchase grants stamp, not the ticket achievement (T25); nicknames unique case-insensitive; writing/reporting a bottle needs a Carnet; spring event linked to island `allday` (agent)
- 2026-09-28 T15: check.py only accepts L1/L2/diferido, so brought-forward items are L1 with D-20 in the source; final-version REQs left intact and test-version exceptions added as separate L1 REQs naming what retires them (agent)
- 2026-09-29 T22: bottles drawn via Game.setBottles (not setWorld) so dialogues/effects don't restart; sample bottles moved into open sea by a fixed rule; «Compartir» removed per REQ-IDE-051 (deviation from «shareable view» until a server exists) (agent)
- 2026-09-29 T25: sample prices in lib/ticketing/pricing.ts (events have no price field); discounts never typed, best active found discount applies; checkout loads on click; no-JS link still goes to the sample ticketing URL (agent)
- 2026-09-29 T23: sessions in memory (reload invalidates), hidden tab pauses and voids the reward, record_only best kept in device storage, alarm on empty sea = false alarm, escaped pirate not an error (agent)
- 2026-09-29 T18: canonical meshes and no SSS for world art so renders are byte-identical; puerto sprite is the central paseo, costa_sur tiles fill the bottom edge; orchestrator authorized the one-line skip of art/mundos in packages/engine swap.test.ts to keep main green (agent / orchestrator)
- 2026-09-29 T27: only the light is pre-rendered (17 angles per letter) and motion is computed in the browser, so the loop is seamless and tunable without re-rendering; letters use Blender's Inter font, orange faces and navy sides; swap.test.ts now skips art/ folders without their own manifest.json (agent)
- 2026-09-29: the intro plays on every full load of `/` (not only the first visit); deep links and in-app navigation still skip it (Hernán) → T31
- 2026-09-29 T31: campaign params (utm_*, fbclid, gclid, igsh…) still show the intro; browser Back to `/` without bfcache counts as a full load; also edited docs/spec/09-requisitos.md rows so check.py passes (agent)
- 2026-09-29 T19: Acuarela story = Sant Joan night; places not in real coastal order; --all rendered into tools/blender/out to avoid rewriting 35 stale sources_sha256 lines outside scope (agent)
- 2026-09-29 T20: e2e start next to places with ?cerca=<place> because the Arcilla map is too big to sail in test time; default ship is the world's own (arcilla); touched outside scope: apps/web/lib/repo.ts, lib/intro/load.ts, engine intro scene/sphere-probe, e2e specs (agent)
- 2026-09-29 T26: «en todos los mundos» writes the name into each registered world (later worlds don't inherit); sea check copied into lib/admin/validate.ts (engine index loads Pixi); spring event island now `allday`; also edited juego game-canvas/place-panels so admin changes show in the world (agent)
- 2026-09-29 T21: Fiestera asks for help at the crocodile radius (4.0) and boards at 2.6; she waits in the última isla niche (missionDrop); map trigger find_boia = catalogue find_buoy; time played logged every 15 s while visible; mission built from the Admin-edited world (agent)

## Proposals (new scope)
- 2026-09-29 T21: «Seis boies» achievement unreachable (map has one boia trigger) — add 5 more boies to the shared map; Admin screen for the Fiestera destination of new games + audited migration (REQ-AVE-011) not built
- 2026-09-29 T26: landing critical path is now 201 kB, over the 192 kB intro budget — T29 must bring it back under
- 2026-09-29 T20: Playwright hangs on an orphaned next-server after the run on this machine; fix the webServer config; dolphin and whirlpool only unit-tested
- 2026-09-29 T27: the title sheet is upscaled ~1.6× on 3× DPR phones; consider a 2× sheet; letters use Inter until BOIA's real wordmark font is provided
- 2026-09-29 T18: no art yet for secrets, season buoys on the top edge, circuit grandstand and judge; 16 older manifests carry a stale sources_sha256 until the next --all
- 2026-09-29 T23: minimap logs negative-size SVG errors while resizing (pre-existing); full e2e flaky at 5 workers under load (passes with --workers=2)
- 2026-09-29 T25: add a price field to events in the store/contracts (today prices live in lib/ticketing/pricing.ts)
- 2026-09-29 T22: move apps/web/app/juego/repo.ts to apps/web/lib so landing/admin share it; photo upload from device untested
- 2026-09-28 T15: mundos/arcilla/diseno.md still marks Faro and Cañón as L2 empty lots; update when placing them (T18/T20)
- 2026-09-28 T17: per-object runtime state (dialogue already seen) should persist across world switches via the store
- Deferred to the final version (Hernán, 2026-09-28): Supabase as the shared backend (bottles, admin edits and progress shared between visitors; migrations from T06 applied to the cloud project), public auth by mail code + magic link and guest merge (plan 001 T07, WIP branch worktree-agent-a208530713932c80c), real Admin login with password + TOTP and roles (plan 001 T08), the visual drag-and-drop world editor (plan 001 T09), real ticketing (Fourvenues-shaped webhook, stamp on confirmed payment, D-06) replacing the sandbox, PostHog EU project and key, server-side validation of minigame rewards, real links and copy from Álvaro, Álvaro's approval of D-19/D-20, the intro and the art direction, the act-2 auto-advance of the intro (implemented, off), domain and accounts in BOIA's name (REQ-PRO-021)

## Log
- 2026-09-28 23:15 exploracion-mundos branch integrated into main → 7614d51 (its worktree .claude/worktrees/mundos still holds untracked mundos/arcilla/qa/ and mundos/informes/)
- 2026-09-28 23:30 T18 launched · attempt 1 · agent a8860dac8c735eeac
- 2026-09-28 23:30 T16 launched · attempt 1 · agent a2d18b0ece93c7b3a
- 2026-09-28 23:30 T17 launched · attempt 1 · agent a1f17bda51cab8097
- 2026-09-28 23:45 T17 done · branch worktree-agent-a1f17bda51cab8097 → ce3827b
- 2026-09-28 23:47 T15 launched · attempt 1 · agent a652f8d4e7651fde5
- 2026-09-28 23:47 T16 done · branch worktree-agent-a2d18b0ece93c7b3a (1 conflict round) → 8d8b2b7
- 2026-09-28 23:49 T22 launched · attempt 1 · agent afaff0ae95b07a142
- 2026-09-28 23:54 T15 done · branch worktree-agent-a652f8d4e7651fde5 (1 conflict round) → 9aab31b
- 2026-09-28 23:55 T23 launched · attempt 1 · agent a154f90bd0f0e1afa
- 2026-09-29 00:25 T22 done · branch worktree-agent-afaff0ae95b07a142 (1 conflict round) → f6adabd
- 2026-09-29 00:13 T25 launched · attempt 1 · agent a8b91419ffa46292b
- 2026-09-29 00:41 T25 done · branch worktree-agent-a8b91419ffa46292b → a450c34
- 2026-09-29 01:00 T23 done · branch worktree-agent-a154f90bd0f0e1afa (1 conflict round) → e2c8abf
- 2026-09-29 01:40 T18 done · branch worktree-agent-a8860dac8c735eeac (1 merge round) → 0ae2ee4
- 2026-09-29 01:27 T20 launched · attempt 1 · agent a105e608c994e8161
- 2026-09-29 01:27 T19 launched · attempt 1 · agent ac12551dbf19cf19b
- 2026-09-29 01:27 T27 launched · attempt 1 · agent a919e19d514682d6b
- 2026-09-29 01:53 T27 done · branch worktree-agent-a919e19d514682d6b → f0d9a26
- 2026-09-29 02:00 PAUSED by Hernán (usage limit). T20 agent stopped, WIP 63a4fdd on worktree-agent-a105e608c994e8161 (worktree .claude/worktrees/agent-a105e608c994e8161 kept). T19 agent stopped, WIP df06477 on worktree-agent-ac12551dbf19cf19b (worktree .claude/worktrees/agent-ac12551dbf19cf19b kept). On resume: section 7 (orphans) → continuation agents (interrupted) for T20 and T19; everything else pending is blocked on them.
- 2026-09-29 RESUMED by Hernán · T20 continuation (interrupted) · attempt 1 · agent a9a8600bd7f3cc391 · merges worktree-agent-a105e608c994e8161
- 2026-09-29 RESUMED · T19 continuation (interrupted) · attempt 1 · agent abbf91d7fdb9babc9 · merges worktree-agent-ac12551dbf19cf19b
- 2026-09-29 T31 launched · attempt 1 · agent a1a0db578c292eb82
- 2026-09-29 PAUSED T20 and T19 again so T31 runs alone (Hernán: intro first). T20 WIP on worktree-agent-a9a8600bd7f3cc391, T19 WIP on worktree-agent-abbf91d7fdb9babc9; resume both with continuation agents after T31
- 2026-09-29 02:56 T31 done · branch worktree-agent-a1a0db578c292eb82 → 3f9bd7b (Hernán checked it works)
- 2026-09-29 03:00 merged origin/main (0e512c7 Vercel deploy fix) into local main; tests green
- 2026-09-29 03:00 T20 continuation 2 · agent a1fcd6e146a666805 · merges worktree-agent-a9a8600bd7f3cc391
- 2026-09-29 03:00 T19 continuation 2 · agent a3f0770e4a9a1e2c3 · merges worktree-agent-abbf91d7fdb9babc9
- 2026-09-29 03:26 T19 done · branch worktree-agent-a3f0770e4a9a1e2c3 (3 attempts' worktrees removed) → 0989c4c
- 2026-09-29 03:35 T20 done · branch worktree-agent-a1fcd6e146a666805 (3 attempts' worktrees removed) → 40b890d
- 2026-09-29 03:37 T21 launched · attempt 1 · agent a8a239e3b0fba4d0a
- 2026-09-29 03:37 T24 launched · attempt 1 · agent a7f0ae4fa2a6b1c74
- 2026-09-29 03:37 T26 launched · attempt 1 · agent a66fcfe8f16ef5caf
- 2026-09-29 04:16 T26 done · branch worktree-agent-a66fcfe8f16ef5caf → bc9ca58
- 2026-09-29 04:18 T28 launched · attempt 1 · agent a24eaf6fb4212430d
- 2026-09-29 04:28 T21 done · branch worktree-agent-a8a239e3b0fba4d0a (1 conflict round) → 58bb656

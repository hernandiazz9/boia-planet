# boia-planet

BOIA.PLANET: la web-universo de Boia, colectivo de eventos musicales de
Alicante. Landing con entradas de los «All Day BOIA» y un mundo isométrico
navegable en barco (`/juego`). Cómo se trabaja en el repo: `CLAUDE.md`;
requisitos: `docs/DECISIONES.md` y `docs/spec/`; estado: `ESTADO.md`.

Monorepo `pnpm` (Node 24, pnpm 11.27.1 por `packageManager`):
`apps/web` (Next.js), `packages/*` (motor, mundo, contratos, repositorio),
`art/` (el arte que sale de Blender, servido por `/api/art`, D-16).

## En local

```sh
pnpm install
pnpm dev          # http://localhost:3000
pnpm demo         # igual, e imprime la URL de la Wi-Fi para abrirla en el móvil
PORT=3100 pnpm demo
```

Comprobaciones (las mismas que corren los encargos):

```sh
pnpm test && pnpm typecheck && pnpm lint && pnpm build
E2E_PORT=3107 pnpm e2e --workers=2      # ~6 min; la primera vez: pnpm --filter @boia/web exec playwright install chromium
```

## Desplegar la versión de prueba

La versión de prueba (plan 002, D-20) no usa ningún servicio: ni Supabase, ni
correo, ni ticketera. Todo lo que hace el visitante (Carnet, botellas,
sellos, descuentos, cambios del Admin) se guarda en su navegador. Por eso
**no necesita ninguna variable de entorno**: `pnpm build` funciona con el
entorno vacío, la analítica queda apagada sin `NEXT_PUBLIC_POSTHOG_KEY` (los
eventos sólo se apuntan en `window.__boiaAnalytics`) y el arte sale del
propio repo por `/api/art` (`next.config.ts` mete todo `art/` en la función).

### Ajustes del proyecto en Vercel (una vez)

En _Project → Settings_:

- **Framework Preset:** Next.js.
- **Root Directory:** `apps/web`.
- **Include files outside the Root Directory in the Build Step:** activado
  (los paquetes del workspace y `art/` están fuera de `apps/web`).
- **Install, Build y Output Command:** los de por defecto. Vercel usa pnpm
  por `pnpm-lock.yaml` y `packageManager`; el build es `pnpm run build` de
  `apps/web`, que además falla si la landing pasa de su presupuesto.
- **Node.js Version:** 24.x.
- **Environment Variables:** ninguna.

No hace falta `vercel.json`. Las URLs de _preview_ piden sesión de Vercel si
la _Deployment Protection_ está activa (lo está por defecto); la de
producción es pública.

### Camino 1: desde GitHub (el habitual)

El repo `hernandiazz9/boia-planet` está conectado al proyecto:

```sh
git push origin main        # despliega a producción
git push origin <rama>      # despliega una preview de esa rama
```

### Camino 2: desde la terminal, con la CLI de Vercel

Siempre **desde la raíz del repo** (no desde `apps/web`: la subida tiene que
llevar `packages/` y `art/`).

```sh
pnpm dlx vercel login       # una vez
pnpm dlx vercel link        # una vez: elige el proyecto existente; crea .vercel/ (la CLI lo añade a .gitignore)
pnpm dlx vercel             # preview
pnpm dlx vercel --prod      # producción
```

(Con la CLI instalada, `npm i -g vercel`, es lo mismo sin `pnpm dlx`:
`vercel`, `vercel --prod`.)

### Comprobar el despliegue

1. `https://<dominio>/api/art/barco/manifest.json` responde JSON (el arte llega).
2. `https://<dominio>/` enseña la entrada (letras 3D «BOIA», «Zarpar») y la landing.
3. EXPLORAR lleva a `/juego` con el barco en el puerto.
4. «Navegar en 3D» lleva a `/mar` (el mar 3D; sus barcos también salen de
   `/api/art`, `art/barco/3d/*.glb`).
5. El recorrido completo para el móvil está en `ESTADO.md` (plan 002 T30, «Guía de la demo»).

`/sphere-probe` da 404 en producción (sólo existe con `BOIA_SPHERE_PROBE=1`).

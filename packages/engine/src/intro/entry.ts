import type { IntroMode } from './timeline';

/**
 * La puerta de la entrada (REQ-ENT-001, 009, 010, 011; D-21): qué toca al
 * cargar la página, según la URL y nada más.
 * - `/` a secas, en cada carga completa o recarga: la entrada (la cinemática
 *   en tres actos, o su variante quieta con movimiento reducido). No hay marca
 *   de «ya la vio».
 * - Una URL que apunta a algo concreto entra directa a su contenido, sin
 *   entrada: cualquier `#…` (`/#tickets`, `/#fotos`), cualquier parámetro
 *   (`?menu=…`, `?intro=0`) o una ruta distinta de `/`. Los parámetros de
 *   campaña (`utm_*`, `fbclid`, `gclid`…) no apuntan a nada y no cuentan.
 * - `?intro=1` la pide explícitamente («Ver la introducción») aunque la URL
 *   apunte a otra cosa.
 *
 * Autocontenida a propósito: `bootScript` la serializa con `toString()` y
 * la ejecuta en línea antes del primer pintado, sin esperar a React.
 */
export function decideEntry(input: {
  pathname: string;
  search: string;
  hash: string;
  reducedMotion: boolean;
}): IntroMode {
  let plainHome = input.pathname === '/' && input.hash.length <= 1;
  let replay = false;
  for (const part of input.search.replace(/^\?/, '').split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = eq < 0 ? part : part.slice(0, eq);
    if (key === 'intro' && eq > 0 && part.slice(eq + 1) === '1') replay = true;
    else if (!/^(utm_\w+|fbclid|gclid|msclkid|ttclid|igsh|igshid)$/.test(key)) plainHome = false;
  }
  if (!plainHome && !replay) return 'direct';
  return input.reducedMotion ? 'reduced' : 'intro';
}

/**
 * Modo con el que arranca el montaje de la escena del hero: la entrada sólo
 * se reproduce si el script de arranque de esta carga la pidió y nadie la ha
 * resuelto aún (saltada antes de hidratar, plazo agotado o ya reclamada).
 * Volver a `/` navegando dentro de la app no es una carga completa: React no
 * ejecuta el `<script>` de arranque que inserta, así que el montaje encuentra
 * la entrada de la carga anterior ya resuelta, o ninguna, y entra directo.
 */
export function mountMode(
  entry: Pick<BootEntry, 'mode' | 'claimed' | 'landed'> | undefined,
): IntroMode {
  if (!entry || entry.claimed || entry.landed) return 'direct';
  return entry.mode;
}

/** Estado que el script de arranque deja en `window.__boiaEntry`. */
export interface BootEntry {
  mode: IntroMode;
  /** `performance.now()` al ejecutarse el script. */
  t0: number;
  /** El controlador de React tomó el relevo. */
  claimed: boolean;
  /** Saltar pulsado antes de que React hidratase. */
  skipped: boolean;
  /** Cómo se llegó a la landing; `null` mientras la entrada sigue en curso. */
  landed: 'played' | 'skipped' | 'none' | null;
  /** Muestra la landing (una vez) y avisa con el evento `boia:landed`. */
  reveal(outcome: 'played' | 'skipped' | 'none'): void;
  /** Temporizador de seguridad del script (se cancela al tomar el relevo). */
  timer: number;
}

export const LANDED_EVENT = 'boia:landed';

/**
 * Script en línea que va antes del contenido de la landing. Decide el modo,
 * lo marca en `<html data-entry>` y, si toca cinemática (o su variante
 * reducida), oculta la landing con `<html data-intro="play">` (CSS) hasta
 * que la escena llegue. Garantías aunque el JavaScript de la app nunca
 * llegue a ejecutarse:
 * - si nadie toma el relevo en `loadBudgetMs`, muestra la landing ligera;
 * - «Saltar animación» y «Solo quiero ver las entradas» funcionan antes de
 *   hidratar (cualquier `[data-intro-skip]`);
 * - si a `hardCapMs` nadie ha tomado el relevo, la landing se muestra. Una
 *   vez tomado, manda el controlador: la pausa espera al botón sin límite.
 * Sin JavaScript el script no corre y la landing sale tal cual.
 */
export function bootScript(opts: {
  loadBudgetMs: number;
  hardCapMs: number;
  /** Imágenes que la cinemática necesita primero; se piden ya, sólo si se va a reproducir. */
  preload?: readonly string[];
}): string {
  return `(function(){try{
var decide=${decideEntry.toString()};
var d=document.documentElement,w=window,reduced=false;
try{reduced=w.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch(e){}
var mode=decide({pathname:location.pathname,search:location.search,hash:location.hash,reducedMotion:reduced});
var entry=w.__boiaEntry={mode:mode,t0:performance.now(),claimed:false,skipped:false,landed:null,timer:0,
reveal:function(o){if(entry.landed)return;entry.landed=o;clearTimeout(entry.timer);d.removeAttribute("data-intro");
try{w.dispatchEvent(new CustomEvent(${JSON.stringify(LANDED_EVENT)},{detail:{intro:o}}));}catch(e){}}};
d.setAttribute("data-entry",mode);
if(mode==="direct"){entry.landed="none";return;}
d.setAttribute("data-intro","play");
var pre=${JSON.stringify(opts.preload ?? [])};for(var i=0;i<pre.length;i++){new Image().src=pre[i];}
entry.timer=setTimeout(function(){if(!entry.claimed)entry.reveal("none");},${Math.round(opts.loadBudgetMs)});
setTimeout(function(){if(!entry.claimed)entry.reveal("none");},${Math.round(opts.hardCapMs)});
document.addEventListener("click",function(e){var t=e.target;
if(!entry.claimed&&t&&t.closest&&t.closest("[data-intro-skip]")){entry.skipped=true;entry.reveal("skipped");}},true);
}catch(e){document.documentElement.removeAttribute("data-intro");}})();`;
}

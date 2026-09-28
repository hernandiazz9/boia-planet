import type { IntroMode } from './timeline';

/**
 * Qué entrada toca al cargar la página (REQ-ENT-001, 009, 010, 011):
 * - `?intro=1` pide volver a ver la introducción («Ver introducción»);
 * - un enlace directo (cualquier `#…`, p. ej. `/#tickets`) abre su
 *   contenido sin introducción;
 * - una visita posterior entra directa a la landing;
 * - la primera visita con movimiento reducido: mini-mundo quieto, título y
 *   botón, y un fundido al pulsar;
 * - si no, la cinemática en tres actos.
 *
 * Autocontenida a propósito: `bootScript` la serializa con `toString()` y
 * la ejecuta en línea antes del primer pintado, sin esperar a React.
 */
export function decideEntry(input: {
  search: string;
  hash: string;
  seen: boolean;
  reducedMotion: boolean;
}): IntroMode {
  const replay = /[?&]intro=1(?:&|$)/.test(input.search);
  if (!replay && input.hash.length > 1) return 'direct';
  if (!replay && input.seen) return 'direct';
  return input.reducedMotion ? 'reduced' : 'intro';
}

/**
 * Marca de «ya la vio». v2 (T14): la intro «mini-mundo» es nueva, así que
 * todo el mundo la ve una vez aunque ya hubiera visto la de T03 (v1).
 */
export const INTRO_SEEN_KEY = 'boia.intro.v2';

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
var d=document.documentElement,w=window,seen=false,reduced=false;
try{seen=localStorage.getItem(${JSON.stringify(INTRO_SEEN_KEY)})==="seen";localStorage.setItem(${JSON.stringify(INTRO_SEEN_KEY)},"seen");}catch(e){}
try{reduced=w.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch(e){}
var mode=decide({search:location.search,hash:location.hash,seen:seen,reducedMotion:reduced});
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

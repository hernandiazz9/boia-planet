/**
 * Invitaciones a crear el Carnet (REQ-IDE-008) y su ritmo (REQ-IDE-009), T44.
 *
 * Momentos: después de una compra, al cerrar una galería (el Puerto de
 * Fotos), tras 5 minutos activos en el mar o al tener 3 logros distintos.
 * Reglas:
 * - nunca a quien ya tiene Carnet;
 * - una por sesión de pestaña (la spec admite hasta 3 separadas 3 min; el
 *   plan pide una, que cumple las dos cosas);
 * - «Ahora no» se recuerda en el dispositivo y ese motivo no vuelve nunca;
 * - sin contexto nuevo no se repite: los 5 minutos y los 3 logros salen una
 *   sola vez; cada compra o galería cerrada es un momento nuevo;
 * - nunca sobre una carrera, un diálogo, el pago o un panel abierto: el
 *   motivo espera a que se cierren (lo decide quien llama con `blocked`);
 * - no bloquea: es una tarjeta con «Crear mi Carnet» y «Ahora no», y el mar
 *   sigue.
 *
 * La lógica no toca el DOM: recibe dos almacenes (el de la sesión y el del
 * dispositivo) con la forma de `Storage`.
 */

export const INVITE_REASONS = ['purchase', 'gallery', 'progress', 'achievements'] as const;
export type InviteReason = (typeof INVITE_REASONS)[number];

/** Motivos sin contexto nuevo posible: salen una vez en este navegador. */
const ONCE_REASONS: ReadonlySet<InviteReason> = new Set(['progress', 'achievements']);

/** Minutos activos y logros que abren la invitación de progreso. muestra */
export const INVITE_ACTIVE_SECONDS = 5 * 60;
export const INVITE_ACHIEVEMENTS = 3;

export interface InviteStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** sessionStorage: qué invitación salió en esta sesión. */
export const INVITE_SESSION_KEY = 'boia.carnet.invitacion.sesion';
/** localStorage: motivos con «Ahora no» (para siempre en este navegador). */
export const INVITE_DEVICE_KEY = 'boia.carnet.invitaciones';

interface DeviceState {
  /** Motivo → cuándo se dijo «Ahora no». */
  declined: Partial<Record<InviteReason, string>>;
  /** Motivo → la última vez que salió (registro, REQ-IDE-009). */
  shown: Partial<Record<InviteReason, string>>;
}

const isReason = (v: unknown): v is InviteReason =>
  typeof v === 'string' && (INVITE_REASONS as readonly string[]).includes(v);

function readDevice(store: InviteStore): DeviceState {
  try {
    const raw: unknown = JSON.parse(store.getItem(INVITE_DEVICE_KEY) ?? '{}');
    const pick = (o: unknown) =>
      Object.fromEntries(
        Object.entries(o && typeof o === 'object' ? o : {}).filter(
          ([k, v]) => isReason(k) && typeof v === 'string',
        ),
      ) as Partial<Record<InviteReason, string>>;
    const r = (raw ?? {}) as Record<string, unknown>;
    return { declined: pick(r.declined), shown: pick(r.shown) };
  } catch {
    return { declined: {}, shown: {} };
  }
}

function write(store: InviteStore, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    // Sin almacenamiento: la invitación no se recuerda, pero nada se rompe.
  }
}

export interface InviteContext {
  hasCarnet: boolean;
  /** Carrera, diálogo, pago, panel o menú abiertos (REQ-IDE-009). */
  blocked: boolean;
}

export class CarnetInvitations {
  constructor(
    private readonly session: InviteStore,
    private readonly device: InviteStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** La invitación que ya salió en esta sesión, si salió. */
  shownThisSession(): InviteReason | null {
    try {
      const v = this.session.getItem(INVITE_SESSION_KEY);
      return isReason(v) ? v : null;
    } catch {
      return null;
    }
  }

  declined(reason: InviteReason): boolean {
    return readDevice(this.device).declined[reason] !== undefined;
  }

  /** ¿Se puede enseñar ahora la invitación de `reason`? No la marca. */
  canOffer(reason: InviteReason, ctx: InviteContext): boolean {
    if (ctx.hasCarnet || ctx.blocked) return false;
    if (this.shownThisSession() !== null) return false;
    const d = readDevice(this.device);
    if (d.declined[reason] !== undefined) return false;
    // Sin contexto nuevo no se repite: una compra o una galería cerrada lo
    // son cada vez; los 5 minutos y los 3 logros, sólo la primera.
    return !(ONCE_REASONS.has(reason) && d.shown[reason] !== undefined);
  }

  /**
   * Intenta enseñarla: si se puede, la apunta (ésta es la de la sesión) y
   * devuelve `true`.
   */
  offer(reason: InviteReason, ctx: InviteContext): boolean {
    if (!this.canOffer(reason, ctx)) return false;
    write(this.session, INVITE_SESSION_KEY, reason);
    const d = readDevice(this.device);
    d.shown[reason] = this.now().toISOString();
    write(this.device, INVITE_DEVICE_KEY, JSON.stringify(d));
    return true;
  }

  /** «Ahora no»: ese motivo no vuelve a salir en este navegador. */
  decline(reason: InviteReason): void {
    const d = readDevice(this.device);
    d.declined[reason] = this.now().toISOString();
    write(this.device, INVITE_DEVICE_KEY, JSON.stringify(d));
  }
}

/** Almacén que no guarda nada (servidor, o sin `Storage`). */
export const NO_STORE: InviteStore = { getItem: () => null, setItem: () => {} };

/** Las invitaciones de este navegador (sesión de pestaña + dispositivo). */
export function browserInvitations(): CarnetInvitations {
  const pick = (get: () => Storage): InviteStore => {
    try {
      return get();
    } catch {
      return NO_STORE;
    }
  };
  return new CarnetInvitations(
    pick(() => window.sessionStorage),
    pick(() => window.localStorage),
  );
}

/**
 * Motivo de progreso que toca, si alguno: 5 minutos activos o 3 logros.
 * Los dos se piden por separado para poder decir «Ahora no» a cada uno.
 */
export function progressReason(activeSeconds: number, achievements: number): InviteReason | null {
  if (achievements >= INVITE_ACHIEVEMENTS) return 'achievements';
  if (activeSeconds >= INVITE_ACTIVE_SECONDS) return 'progress';
  return null;
}

/** Textos de docs/propuestas/textos-zonas.md, zona 24 (`muestra`). */
export const INVITE_COPY: Record<InviteReason, { title: string; body: string }> & {
  create: string;
  later: string;
  localLimit: string;
  label: string;
} = {
  purchase: {
    title: '¿Guardamos esta entrada en tu Carnet?',
    body: 'Con tu Carnet, el sello de este evento se queda contigo. Tardas un momento y no te pedimos email.',
  },
  gallery: {
    title: '¿Te has visto en alguna?',
    body: 'Con tu Carnet guardas los recuerdos de tus fiestas y los sellos de cada evento.',
  },
  progress: {
    title: 'Llevas un buen rato navegando',
    body: 'Hazte el Carnet y ponle nombre a tu barco: tus logros y tus monedas tendrán dueño.',
  },
  achievements: {
    title: 'Tres logros ya. Esto va en serio.',
    body: 'Con tu Carnet, los demás verán lo que has conseguido. Y tú también.',
  },
  create: 'Crear mi Carnet',
  later: 'Ahora no',
  label: 'Invitación a crear tu Carnet',
  /** REQ-IDE-007: los límites del progreso local, antes de registrarse. */
  localLimit:
    'Tu progreso se guarda sólo en este navegador: si borras sus datos, se pierde, y todavía no cuenta para ningún ranking compartido.',
};

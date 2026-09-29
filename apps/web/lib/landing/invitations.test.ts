import { describe, expect, it } from 'vitest';
import {
  CarnetInvitations,
  INVITE_ACHIEVEMENTS,
  INVITE_ACTIVE_SECONDS,
  INVITE_REASONS,
  type InviteStore,
  progressReason,
} from './invitations';

/**
 * Ritmo de las invitaciones al Carnet (T44, REQ-IDE-008/009): una por
 * sesión, «Ahora no» respetado para siempre, nunca con Carnet ni bloqueada, y
 * los momentos sin contexto nuevo sólo una vez.
 */

class MemoryStore implements InviteStore {
  private readonly map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

const free = { hasCarnet: false, blocked: false };

/** Un navegador: su almacén del dispositivo y una sesión de pestaña nueva por visita. */
function browser() {
  const device = new MemoryStore();
  return { device, visit: () => new CarnetInvitations(new MemoryStore(), device) };
}

describe('invitaciones al Carnet: ritmo (REQ-IDE-009)', () => {
  it('una sola por sesión, sea cual sea el motivo', () => {
    const inv = browser().visit();
    expect(inv.offer('gallery', free)).toBe(true);
    expect(inv.shownThisSession()).toBe('gallery');
    for (const r of INVITE_REASONS) expect(inv.offer(r, free), r).toBe(false);
  });

  it('en otra sesión puede salir otra', () => {
    const b = browser();
    expect(b.visit().offer('purchase', free)).toBe(true);
    expect(b.visit().offer('gallery', free)).toBe(true);
  });

  it('«Ahora no» no vuelve a enseñar ese motivo, ni en otras sesiones', () => {
    const b = browser();
    const first = b.visit();
    expect(first.offer('purchase', free)).toBe(true);
    first.decline('purchase');
    for (let i = 0; i < 3; i++) expect(b.visit().offer('purchase', free)).toBe(false);
    // Otro momento sí es un contexto nuevo.
    expect(b.visit().offer('gallery', free)).toBe(true);
  });

  it('una compra o una galería son contexto nuevo cada vez; los 5 min y los 3 logros, no', () => {
    const b = browser();
    expect(b.visit().offer('purchase', free)).toBe(true);
    expect(b.visit().offer('purchase', free)).toBe(true);
    expect(b.visit().offer('progress', free)).toBe(true);
    expect(b.visit().offer('progress', free)).toBe(false);
    expect(b.visit().offer('achievements', free)).toBe(true);
    expect(b.visit().offer('achievements', free)).toBe(false);
  });

  it('nunca con Carnet ni sobre una carrera, un diálogo o el pago (bloqueada)', () => {
    const inv = browser().visit();
    expect(inv.offer('gallery', { hasCarnet: true, blocked: false })).toBe(false);
    expect(inv.offer('gallery', { hasCarnet: false, blocked: true })).toBe(false);
    // No gastó la de la sesión: al desbloquearse, sale.
    expect(inv.shownThisSession()).toBeNull();
    expect(inv.offer('gallery', free)).toBe(true);
  });

  it('un almacén roto no rompe nada', () => {
    const broken: InviteStore = {
      getItem: () => {
        throw new Error('sin almacenamiento');
      },
      setItem: () => {
        throw new Error('sin almacenamiento');
      },
    };
    const inv = new CarnetInvitations(broken, broken);
    expect(() => inv.offer('gallery', free)).not.toThrow();
    expect(() => inv.decline('gallery')).not.toThrow();
  });
});

describe('invitaciones al Carnet: momentos de progreso (REQ-IDE-008)', () => {
  it('a los 5 minutos activos o a los 3 logros', () => {
    expect(progressReason(0, 0)).toBeNull();
    expect(progressReason(INVITE_ACTIVE_SECONDS - 1, INVITE_ACHIEVEMENTS - 1)).toBeNull();
    expect(progressReason(INVITE_ACTIVE_SECONDS, 0)).toBe('progress');
    expect(progressReason(0, INVITE_ACHIEVEMENTS)).toBe('achievements');
  });
});

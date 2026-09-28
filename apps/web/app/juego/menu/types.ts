import type { Game } from '@boia/engine';
import type { DiscoveryTarget, MinimapZone, Notice, Settings } from '@boia/engine/ui';
import type { ComponentType, ReactNode } from 'react';
import type { ShipCatalog } from '../../../lib/barco/catalog';
import type { ShipLook } from '../ship-look';

/**
 * Una sección del Menú de a bordo (§19, REQ-IDE-034). Cada sección es un
 * módulo en `sections/` que exporta uno de estos; el orden y la separación
 * salen de `sections/index.ts`. Añadir una sección = un archivo + una línea.
 */
export interface MenuSection {
  id: string;
  /** Icono grande de la barra (el título va dentro de la sección, no junto al icono). */
  icon: ReactNode;
  /** Título de la sección, tooltip en escritorio y nombre accesible del icono. */
  label: string;
  /** `tools` (Controles, Ajustes) va al final, tras una separación. */
  group: 'progress' | 'tools';
  Component: ComponentType<{ ctx: MenuContext }>;
}

/** Lo que el juego ofrece a las secciones. */
export interface MenuContext {
  settings: Settings;
  updateSettings: (change: (s: Settings) => Settings) => void;
  /** Logros de esta sesión, en orden (guardarlos es de T07). */
  achievements: readonly Notice[];
  /** Lo descubierto en esta sesión. */
  discovered: readonly DiscoveryTarget[];
  minimapZone: MinimapZone;
  /** Zonas del minimapa válidas en esta pantalla. */
  minimapZones: readonly MinimapZone[];
  setMinimapZone: (z: MinimapZone) => void;
  /** Sección «Barco»: estilos y skins, lo aplicado y cómo cambiarlo. */
  ship: ShipMenu;
  /** El motor, si ya arrancó (p. ej. para aplicar un cambio al barco). */
  game: Game | null;
  close: () => void;
}

/** Estado de la sección «Barco» (T12). */
export interface ShipMenu {
  /** Estilos y skins del arte; null si no hay arte del barco (barco provisional). */
  catalog: ShipCatalog | null;
  /** Lo que lleva el barco ahora; null mientras arranca o con el barco provisional. */
  current: ShipLook | null;
  /** Hay un cambio cargándose. */
  pending: boolean;
  /** Aplica un estilo y una skin al barco al momento y lo guarda en este navegador. */
  choose: (look: ShipLook) => void;
}

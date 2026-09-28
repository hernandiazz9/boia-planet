import { type WorldConfig, worldToScreen } from '@boia/world';
import type { IntroConfig } from './config';
import { introGeometry, type IntroGeometry } from './sphere';

/**
 * Geometría de la esfera para un mundo (`@boia/world`). Aparte del punto de
 * entrada puro (`@boia/engine/intro`) porque arrastra `@boia/world` (y zod):
 * la web la llama al construir la página, fuera de la ruta crítica.
 *
 * Devuelve `null` si el punto de aterrizaje de la configuración cae fuera
 * del mundo: entonces la entrada no se juega y sale la landing ligera.
 */
export function worldIntroGeometry(
  world: WorldConfig,
  config: IntroConfig,
  artScale: number,
): IntroGeometry | null {
  const b = world.bounds;
  const p = config.landingPoint;
  if (p.x < b.left || p.x > b.right || p.y < b.top || p.y > b.bottom) return null;
  const top = worldToScreen({ x: b.left, y: b.top });
  const bottom = worldToScreen({ x: b.right, y: b.bottom });
  return introGeometry({
    artScale,
    box: { left: top.x, right: bottom.x, top: top.y, bottom: bottom.y },
    landing: worldToScreen(p),
  });
}

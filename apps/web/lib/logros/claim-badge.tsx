'use client';

import './logros.css';

/**
 * El numerito sobre el icono de logros (T37) mientras haya logros
 * completados sin reclamar. Sin nada pendiente, no se pinta.
 */
export function ClaimBadge({ count, testId }: { count: number; testId: string }) {
  if (count <= 0) return null;
  return (
    <span className="logros-contador" data-testid={testId} aria-hidden="true">
      {count > 9 ? '9+' : count}
    </span>
  );
}

/** El nombre accesible del icono con su número. muestra */
export function claimLabel(base: string, count: number): string {
  if (count <= 0) return base;
  return `${base}: ${count === 1 ? '1 premio' : `${count} premios`} por reclamar`;
}

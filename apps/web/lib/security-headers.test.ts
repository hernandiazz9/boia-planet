import { describe, expect, it } from 'vitest';
import { RENAMED_ROUTES, securityHeaders } from './security-headers';

const HOST = 'https://analytics.example';
const get = (dev: boolean, key: string) =>
  securityHeaders({ dev, analyticsHost: HOST }).find((h) => h.key === key)?.value ?? '';

describe('cabeceras de seguridad (REQ-ARQ-012)', () => {
  it('CSP: nada de fuera salvo imágenes https y la analítica', () => {
    const csp = get(false, 'Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain(`connect-src 'self' data: blob: ${HOST}`);
    // PixiJS 8 compila con `new Function` (ver security-headers.ts).
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).not.toContain('ws:');
    expect(get(true, 'Content-Security-Policy')).toContain('ws:');
  });

  it('el resto de cabeceras', () => {
    expect(get(false, 'X-Content-Type-Options')).toBe('nosniff');
    expect(get(false, 'X-Frame-Options')).toBe('SAMEORIGIN');
    expect(get(false, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(get(false, 'Permissions-Policy')).toContain('camera=()');
    expect(get(false, 'Strict-Transport-Security')).toContain('max-age=');
  });

  it('«Condiciones» lleva al aviso legal', () => {
    expect(RENAMED_ROUTES).toContainEqual(
      expect.objectContaining({ source: '/legal/condiciones', destination: '/legal/aviso-legal' }),
    );
  });
});

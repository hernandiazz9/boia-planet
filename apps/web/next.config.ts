import { networkInterfaces } from 'node:os';
import path from 'node:path';
import type { NextConfig } from 'next';

/** IPs de la red local del Mac, para abrir el servidor de desarrollo desde el móvil. */
function lanHosts(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i!.address);
}

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@boia/engine', '@boia/world', '@boia/store'],
  // /api/art lee `art/` de la raíz del repo: en Vercel la función sólo lleva los
  // archivos trazados, así que se incluyen a mano desde la raíz del monorepo.
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  outputFileTracingIncludes: { '/api/art/[...path]': ['../../art/**/*'] },
  // El móvil entra por la IP de la Wi-Fi; 127.0.0.1 para las pruebas locales (pnpm demo).
  allowedDevOrigins: ['127.0.0.1', ...lanHosts()],
  // ESLint corre una vez en la raíz (`pnpm lint`), no dentro de `next build`.
  eslint: { ignoreDuringBuilds: true },
};

export default config;

import { networkInterfaces } from 'node:os';
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
  transpilePackages: ['@boia/engine', '@boia/world'],
  allowedDevOrigins: lanHosts(),
  // ESLint corre una vez en la raíz (`pnpm lint`), no dentro de `next build`.
  eslint: { ignoreDuringBuilds: true },
};

export default config;

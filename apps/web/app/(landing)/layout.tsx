import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './landing.css';

/**
 * Display de los títulos (T50): Titan One, subconjunto latino (con tildes, ñ,
 * ¿ y ¡) servido desde la web, SIL OFL (public/fonts/OFL-titan-one.txt). Es la
 * libre que más se parece al wordmark de BOIA; se cambia por la de Álvaro
 * cuando la mande. next/font la precarga, así cuenta en el presupuesto de la
 * landing.
 */
const display = localFont({
  src: '../../public/fonts/titan-one-latin.woff2',
  weight: '400',
  display: 'swap',
  variable: '--font-display',
  fallback: ['Arial Black', 'system-ui', 'sans-serif'],
});

export default function LandingLayout({ children }: { children: ReactNode }) {
  // `display: contents`: la envoltura sólo lleva la variable de la fuente, no cuenta en el diseño.
  return <div className={`${display.variable} landing-root`}>{children}</div>;
}

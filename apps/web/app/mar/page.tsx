import type { Metadata, Viewport } from 'next';
import { MarClient } from './mar-client';

export const metadata: Metadata = { title: 'boia-planet · mar 3D' };

// Como en /juego: en el mar un pellizco es el zoom de la cámara, no el de la página.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#231a5c',
};

export default function MarPage() {
  return <MarClient />;
}

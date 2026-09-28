import type { Metadata, Viewport } from 'next';
import { GameCanvas } from './game-canvas';

export const metadata: Metadata = { title: 'boia-planet · juego' };

// Sólo aquí se bloquea el zoom: en el juego un pellizco es un segundo dedo.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#12233f',
};

export default function JuegoPage() {
  return <GameCanvas />;
}

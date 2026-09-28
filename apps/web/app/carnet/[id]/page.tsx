import type { Metadata } from 'next';
import { CarnetPage } from '../carnet-page';

export const metadata: Metadata = { title: 'Carnet BOIA · boia-planet' };

/** El Carnet de un miembro por su id (desde su botella o un enlace compartido). */
export default async function CarnetDeMiembroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId = id;
  try {
    userId = decodeURIComponent(id);
  } catch {
    // ya venía decodificado
  }
  return <CarnetPage userId={userId} />;
}

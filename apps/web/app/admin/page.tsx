import type { Metadata } from 'next';
import { ADMIN_COPY } from '../../lib/admin/copy';
import { AdminApp } from './admin-app';
import './admin.css';

export const metadata: Metadata = {
  title: `${ADMIN_COPY.bannerTitle} · boia-planet`,
  robots: { index: false, follow: false },
};

/** «Probar admin» (T26, D-20): todo pasa en el navegador, con el repositorio local. */
export default function AdminPage() {
  return <AdminApp />;
}

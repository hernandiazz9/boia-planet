import type { Metadata } from 'next';
import { ADMIN_COPY } from '../../lib/admin/copy';
import { AdminApp } from './admin-app';
import './admin.css';
import { t } from '../../lib/i18n';

export const metadata: Metadata = {
  title: t('admin.admin.boiaPlanet', { bannerTitle: ADMIN_COPY.bannerTitle }),
  robots: { index: false, follow: false },
};

/** «Probar admin» (T26, D-20): todo pasa en el navegador, con el repositorio local. */
export default function AdminPage() {
  return <AdminApp />;
}

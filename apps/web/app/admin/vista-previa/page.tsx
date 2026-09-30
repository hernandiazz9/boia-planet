import type { Metadata } from 'next';
import '../../(landing)/landing.css';
import { DraftPreview } from './draft-preview';
import { t } from '../../../lib/i18n';

export const metadata: Metadata = {
  title: t('admin.vistaPrevia.vistaPreviaDelBorrador'),
  robots: { index: false, follow: false },
};

/**
 * Vista previa privada del borrador de la home (REQ-ADM-015, T48): la home
 * con los cambios sin publicar de este navegador, pintada con los mismos
 * bloques que la landing. No concede nada ni vende: sólo enseña.
 */
export default function DraftPreviewPage() {
  return <DraftPreview />;
}

import type { MessageKey } from '../i18n';

/**
 * Las páginas legales (`/legal/<id>`) y sus párrafos, con los textos de
 * docs/propuestas/textos-zonas.md (zona 32). Los datos del titular son
 * **inventados** (D-23, O14): cada página lo dice arriba
 * (`legal.sampleBanner`) y antes de publicar de verdad se sustituyen por los
 * de BOIA con revisión profesional (P21, REQ-PRO-020). «Condiciones» pasó a
 * ser el aviso legal: `/legal/condiciones` redirige (lib/security-headers.ts).
 */
export const LEGAL_DOCS = {
  'aviso-legal': {
    title: 'legal.aviso.title',
    body: [
      'legal.aviso.owner',
      'legal.aviso.contact',
      'legal.aviso.purpose',
      'legal.aviso.use',
      'legal.aviso.moderation',
      'legal.aviso.purchases',
      'legal.aviso.ip',
      'legal.aviso.links',
      'legal.aviso.liability',
      'legal.aviso.law',
    ],
  },
  privacidad: {
    title: 'legal.privacy.title',
    body: [
      'legal.privacy.intro',
      'legal.privacy.controller',
      'legal.privacy.what',
      'legal.privacy.notAsked',
      'legal.privacy.where',
      'legal.privacy.why',
      'legal.privacy.basis',
      'legal.privacy.sharing',
      'legal.privacy.analytics',
      'legal.privacy.retention',
      'legal.privacy.rights',
      'legal.privacy.future',
    ],
  },
  cookies: {
    title: 'legal.cookies.title',
    body: [
      'legal.cookies.body',
      'legal.cookies.storage',
      'legal.cookies.thirdParty',
      'legal.cookies.manage',
      'legal.cookies.prefs',
    ],
  },
} satisfies Record<string, { title: MessageKey; body: MessageKey[] }>;

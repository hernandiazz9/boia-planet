import type { ClientFunnelEvent, FunnelEventProps } from '@boia/contracts/analytics';

/**
 * Embudo en PostHog, nube UE (D-04, REQ-ARQ-019), sin SDK: cada evento es un
 * POST a la API pública de captura. Motivos: cero kB en la ruta crítica y
 * nada guardado en el navegador (identificador anónimo en memoria, sin
 * cookies ni localStorage), así que no hace falta banner de consentimiento.
 * Sin `NEXT_PUBLIC_POSTHOG_KEY` no sale nada de la página; los eventos sólo
 * quedan en `window.__boiaAnalytics` para depurar y para las pruebas e2e.
 *
 * `purchase_confirmed` no se puede emitir desde aquí: lo manda el servidor
 * desde el webhook verificado de la ticketera (REQ-COM-017).
 */

export interface CapturedEvent {
  event: ClientFunnelEvent;
  properties: Record<string, unknown>;
  timestamp: string;
}

declare global {
  interface Window {
    __boiaAnalytics?: CapturedEvent[];
  }
}

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let distinctId: string | undefined;

function anonymousId(): string {
  distinctId ??=
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return distinctId;
}

export function track<E extends ClientFunnelEvent>(event: E, props: FunnelEventProps[E]): void {
  if (typeof window === 'undefined') return;
  const record: CapturedEvent = {
    event,
    properties: {
      ...props,
      $pathname: window.location.pathname,
      $lib: 'boia-web',
      // Eventos anónimos: PostHog no crea perfil de persona.
      $process_person_profile: false,
    },
    timestamp: new Date().toISOString(),
  };
  (window.__boiaAnalytics ??= []).push(record);
  if (!KEY) return;

  const body = JSON.stringify({ api_key: KEY, distinct_id: anonymousId(), ...record });
  try {
    // text/plain evita el preflight CORS; keepalive deja salir el evento
    // aunque la página navegue (Explorar, ticketera).
    void fetch(`${HOST}/i/v0/e/`, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    }).catch(() => undefined);
  } catch {
    // La analítica nunca rompe la página.
  }
}

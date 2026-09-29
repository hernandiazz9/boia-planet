import type { CarnetView } from '@boia/store';
import { Avatar } from './avatar';

/**
 * El Carnet BOIA tal como lo ven los demás (REQ-IDE-010…022): identidad
 * musical, no ficha ni estatus. Sirve igual para el propio (menú), el de
 * otra persona (desde su botella) y la vista para compartir (/carnet).
 *
 * - Cada respuesta va con su pregunta en pequeño y la respuesta en grande,
 *   nunca sin contexto (REQ-IDE-015); sólo las contestadas.
 * - Los sellos son una colección de recuerdos, no una lista de compras
 *   (REQ-IDE-022).
 * - Sin artistas vistos ni valoraciones (REQ-IDE-019).
 */

/** Lo que se ve si la moderación retiró la foto (textos-zonas, zona 18). muestra */
export const MODERATED_PHOTO = 'Foto retirada por moderación.';

export function memberSinceLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Madrid',
  }).format(d);
}

export interface CarnetExtras {
  /** «Estilo · skin» del barco (sólo del propio: vive en este navegador). */
  shipLabel?: string | null;
  /** Nombre de cada cosmético por id. */
  cosmeticNames?: Readonly<Record<string, string>>;
}

export function CarnetCard({ carnet, extras = {} }: { carnet: CarnetView; extras?: CarnetExtras }) {
  const since = memberSinceLabel(carnet.memberSince);
  const cosmetics = carnet.cosmeticIds.filter(Boolean);
  return (
    <article className="carnet" data-testid="carnet" aria-label={`Carnet de ${carnet.nickname}`}>
      <header className="carnet-head">
        <Avatar avatarKey={carnet.avatarKey} image={carnet.avatarImage} name={carnet.nickname} />
        <div>
          <p className="carnet-kicker">
            Carnet BOIA{carnet.isSample ? ' · miembro de muestra' : ''}
          </p>
          <h3 className="carnet-name" data-testid="carnet-apodo">
            {carnet.nickname}
          </h3>
          {since ? <p className="carnet-since">Miembro de BOIA desde {since}</p> : null}
          {carnet.moderated.photo ? (
            <p className="carnet-moderated" data-testid="carnet-foto-retirada">
              {MODERATED_PHOTO}
            </p>
          ) : null}
        </div>
      </header>

      <dl className="carnet-stats">
        <div>
          <dt>Rango</dt>
          <dd data-testid="carnet-rango">{carnet.rank?.name ?? '—'}</dd>
        </div>
        <div>
          <dt>Puntos</dt>
          <dd data-testid="carnet-puntos">{carnet.points}</dd>
        </div>
        <div>
          <dt>Sellos</dt>
          <dd>{carnet.stamps.length}</dd>
        </div>
      </dl>

      <section aria-label="Respuestas">
        {carnet.answers.length === 0 ? (
          <p className="juego-muted">
            {carnet.isMine ? 'Aún no has contestado ninguna pregunta.' : 'Aún sin respuestas.'}
          </p>
        ) : (
          <ul className="carnet-answers" data-testid="carnet-respuestas">
            {carnet.answers.map((a) => (
              <li key={a.questionId} data-moderada={a.moderated ? 'si' : undefined}>
                <p className="carnet-question">{a.question}</p>
                <p className={a.moderated ? 'carnet-answer carnet-moderated' : 'carnet-answer'}>
                  {a.answer}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Sellos">
        <h4>Sellos</h4>
        {carnet.stamps.length === 0 ? (
          <p className="juego-muted">
            Aún sin sellos. Cada evento deja el suyo al comprar la entrada.
          </p>
        ) : (
          <ul className="carnet-stamps" data-testid="carnet-sellos">
            {carnet.stamps.map((s) => (
              <li key={s.eventId} className="carnet-stamp">
                <span aria-hidden="true">✺</span>
                <span>{s.eventName ?? s.eventId}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Logros">
        <h4>Logros</h4>
        {carnet.achievements.length === 0 ? (
          <p className="juego-muted">Aún sin logros.</p>
        ) : (
          <ul className="carnet-chips" data-testid="carnet-logros">
            {carnet.achievements.map((a) => (
              <li key={a.id} title={a.description ?? undefined}>
                🏅 {a.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Barco">
        <h4>Barco</h4>
        {extras.shipLabel ? <p data-testid="carnet-barco">⛵ {extras.shipLabel}</p> : null}
        {cosmetics.length > 0 ? (
          <ul className="carnet-chips" data-testid="carnet-cosmeticos">
            {cosmetics.map((id) => (
              <li key={id}>
                {extras.cosmeticNames?.[id] ?? id}
                {Object.values(carnet.equipped).includes(id) ? ' · equipado' : ''}
              </li>
            ))}
          </ul>
        ) : !extras.shipLabel ? (
          <p className="juego-muted">Barco de serie, sin cosméticos todavía.</p>
        ) : null}
      </section>
    </article>
  );
}

'use client';

import {
  CARNET_ANSWER_MAX,
  type CarnetQuestion,
  NICKNAME_MAX,
  NICKNAME_MIN,
  charLength,
} from '@boia/contracts';
import { type BoiaRepository, type CarnetView, isStoreError } from '@boia/store';
import { type FormEvent, useId, useState } from 'react';
import { Avatar, DEFAULT_AVATAR, NEUTRAL_AVATARS, shrinkPhoto } from './avatar';

/**
 * Alta rápida y edición del Carnet (REQ-IDE-010, REQ-IDE-013, REQ-IDE-014):
 * apodo, avatar neutro o foto del dispositivo y las 5 preguntas de §44.1,
 * textuales y opcionales. Antes de crear se dice qué será público. Sin
 * email: en la demo el Carnet es del invitado de este navegador (D-20).
 */

/**
 * En la versión de prueba nada se comparte (REQ-IDE-051, D-20): se dice en
 * pantalla. muestra
 */
export const LOCAL_ONLY_NOTICE =
  'Versión de prueba: todo se guarda sólo en este navegador y nadie más lo ve.';

/** Qué será público (REQ-IDE-013) cuando haya servidor. muestra */
export const PUBLIC_FIELDS_NOTICE =
  'Cuando BOIA.PLANET abra, tu Carnet será público: apodo, foto o avatar, «Miembro de BOIA desde», tus respuestas, rango, puntos, logros, barco y sellos. No te pedimos email.';

export function CarnetForm({
  questions,
  initial,
  busy = false,
  error = null,
  onSubmit,
  onCancel,
  onPhoto,
}: {
  questions: readonly CarnetQuestion[];
  initial: CarnetDraft;
  busy?: boolean;
  error?: string | null;
  onSubmit: (draft: CarnetDraft) => void;
  onCancel?: (() => void) | undefined;
  onPhoto?: ((file: File) => Promise<string>) | undefined;
}) {
  const [draft, setDraft] = useState(initial);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const id = useId();
  const set = (patch: Partial<CarnetDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const creating = initial.isNew;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(draft);
  };

  return (
    <form className="carnet-form" data-testid="carnet-form" onSubmit={submit}>
      {creating ? (
        <p className="carnet-notice">
          {PUBLIC_FIELDS_NOTICE} {LOCAL_ONLY_NOTICE}
        </p>
      ) : null}
      <label className="juego-field">
        <span>Apodo</span>
        <input
          name="apodo"
          data-testid="carnet-apodo-input"
          value={draft.nickname}
          minLength={NICKNAME_MIN}
          maxLength={NICKNAME_MAX}
          required
          autoComplete="nickname"
          onChange={(e) => set({ nickname: e.target.value })}
        />
        <small className="juego-muted">
          De {NICKNAME_MIN} a {NICKNAME_MAX} caracteres. Es como te verán en BOIA.
        </small>
      </label>

      <fieldset className="juego-field">
        <legend>Foto o avatar</legend>
        <div className="carnet-avatar-pick" role="radiogroup" aria-label="Avatar neutro">
          {NEUTRAL_AVATARS.map((a) => {
            const checked = !draft.avatarImage && draft.avatarKey === a.key;
            return (
              <button
                key={a.key}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={a.label}
                title={a.label}
                className={checked ? 'is-active' : undefined}
                onClick={() => set({ avatarKey: a.key, avatarImage: null })}
              >
                <Avatar avatarKey={a.key} image={null} size={40} name={a.label} />
              </button>
            );
          })}
        </div>
        {onPhoto ? (
          <div className="carnet-photo">
            {draft.avatarImage ? (
              <>
                <Avatar avatarKey={null} image={draft.avatarImage} size={48} name="tu foto" />
                <button
                  type="button"
                  className="juego-link"
                  onClick={() => set({ avatarImage: null })}
                >
                  Quitar la foto
                </button>
              </>
            ) : null}
            <label className="juego-link" htmlFor={`${id}-foto`}>
              {draft.avatarImage ? 'Cambiar la foto' : 'Subir una foto del dispositivo'}
            </label>
            <input
              id={`${id}-foto`}
              type="file"
              accept="image/*"
              className="carnet-file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setPhotoError(null);
                onPhoto(file).then(
                  (url) => set({ avatarImage: url }),
                  () => setPhotoError('No hemos podido usar esa foto. Prueba con otra.'),
                );
              }}
            />
            {photoError ? <p className="carnet-error">{photoError}</p> : null}
          </div>
        ) : null}
      </fieldset>

      <fieldset className="juego-field">
        <legend>Tus 5 preguntas</legend>
        <p className="juego-muted">Contesta las que quieras; puedes cambiarlas cuando quieras.</p>
        {questions.map((q) => (
          <label key={q.id} className="carnet-q">
            <span>{q.prompt}</span>
            <textarea
              data-testid={`carnet-pregunta-${q.id}`}
              value={draft.answers[q.id] ?? ''}
              maxLength={CARNET_ANSWER_MAX}
              rows={2}
              onChange={(e) => set({ answers: { ...draft.answers, [q.id]: e.target.value } })}
            />
          </label>
        ))}
      </fieldset>

      {error ? (
        <p className="carnet-error" role="alert" data-testid="carnet-error">
          {error}
        </p>
      ) : null}
      <div className="carnet-actions">
        <button type="submit" className="juego-button" disabled={busy} data-testid="carnet-guardar">
          {creating ? 'Crear mi Carnet' : 'Guardar'}
        </button>
        {onCancel ? (
          <button type="button" className="juego-button is-quiet" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}

export interface CarnetDraft {
  isNew: boolean;
  nickname: string;
  avatarKey: string | null;
  avatarImage: string | null;
  answers: Record<string, string>;
}

export function draftFrom(carnet: CarnetView | null): CarnetDraft {
  if (!carnet) {
    return {
      isNew: true,
      nickname: '',
      avatarKey: DEFAULT_AVATAR.key,
      avatarImage: null,
      answers: {},
    };
  }
  return {
    isNew: false,
    nickname: carnet.nickname,
    avatarKey: carnet.avatarKey,
    avatarImage: carnet.avatarImage,
    answers: Object.fromEntries(carnet.answers.map((a) => [a.questionId, a.answer])),
  };
}

/** Texto para la interfaz de un error del repositorio al guardar el Carnet. muestra */
export function carnetErrorText(e: unknown): string {
  if (isStoreError(e, 'conflict')) {
    return /apodo/.test((e as Error).message)
      ? 'Ese apodo ya lo lleva otro miembro de BOIA. Prueba con otro.'
      : 'Ya tienes un Carnet en este navegador.';
  }
  if (isStoreError(e, 'invalid')) return `Revisa esto: ${(e as Error).message}.`;
  return 'No se ha podido guardar. Vuelve a intentarlo.';
}

/** Guarda el borrador: crea o actualiza y contesta las preguntas que cambiaron. */
export async function saveCarnet(
  repo: BoiaRepository,
  before: CarnetView | null,
  draft: CarnetDraft,
  questions: readonly CarnetQuestion[],
): Promise<CarnetView> {
  const nickname = draft.nickname.trim();
  if (charLength(nickname) < NICKNAME_MIN) {
    throw Object.assign(new Error(`apodo: entre ${NICKNAME_MIN} y ${NICKNAME_MAX} caracteres`), {
      code: 'invalid',
    });
  }
  let view: CarnetView;
  if (!before) {
    view = await repo.carnet.create({
      nickname,
      avatarKey: draft.avatarKey,
      avatarImage: draft.avatarImage,
    });
  } else if (
    nickname !== before.nickname ||
    draft.avatarKey !== before.avatarKey ||
    draft.avatarImage !== before.avatarImage
  ) {
    view = await repo.carnet.update({
      nickname,
      avatarKey: draft.avatarKey,
      avatarImage: draft.avatarImage,
    });
  } else {
    view = before;
  }
  const old = Object.fromEntries((before?.answers ?? []).map((a) => [a.questionId, a.answer]));
  for (const q of questions) {
    const next = (draft.answers[q.id] ?? '').trim();
    if (next === (old[q.id] ?? '')) continue;
    view = await repo.carnet.answer(q.id, next || null);
  }
  return view;
}

/** Formulario conectado al repositorio. */
export function CarnetEditor({
  repo,
  questions,
  before,
  onDone,
  onCancel,
}: {
  repo: BoiaRepository;
  questions: readonly CarnetQuestion[];
  before: CarnetView | null;
  onDone: (view: CarnetView) => void;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <CarnetForm
      questions={questions}
      initial={draftFrom(before)}
      busy={busy}
      error={error}
      onCancel={onCancel}
      onPhoto={shrinkPhoto}
      onSubmit={(draft) => {
        setBusy(true);
        setError(null);
        saveCarnet(repo, before, draft, questions)
          .then(onDone, (e: unknown) => {
            const invalidLocal = (e as { code?: string }).code === 'invalid';
            setError(invalidLocal ? `Revisa esto: ${(e as Error).message}.` : carnetErrorText(e));
          })
          .finally(() => setBusy(false));
      }}
    />
  );
}

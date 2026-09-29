import {
  EVENT_STATES,
  type BoiaEvent,
  type Discount,
  type DiscountInput,
  type EventState,
  type HomeBlock,
  discountSchema,
  eventSchema,
} from '@boia/contracts';
import {
  type AchievementDefinition,
  type AdminOptions,
  type BoiaRepository,
  type ContentArea,
  type EntityArea,
  type MusicTrack,
  type PlacePatch,
  type SkinPatch,
  MUSIC_DATA_MAX,
  TRASH_RETENTION_MAX_DAYS,
  TRASH_RETENTION_MIN_DAYS,
  achievementDefinitionSchema,
  isStableKey,
  mergePlacePatch,
  musicTrackSchema,
} from '@boia/store';
import type { RenameScope, WorldRegistry } from '@boia/world';
import { MINIGAMES, type TriggerChoices, triggerParamsProblem } from './achievements';
import { type ReferenceData, danglingReferences, itemName, referencesTo } from './references';
import { circuitIds, worldProblem } from './validate';
import {
  EMPTY_WORLD_CONTENT,
  MAP_POINTS,
  type MapPointKey,
  composeLiveWorld,
  discountHidingPlaces,
  eventIslands,
  liveMap,
} from './world';

/**
 * Lo que hace el Admin de la demo (T26, REQ-ADM-008, REQ-ADM-039) sobre el
 * repositorio local (T16), con las comprobaciones que el repositorio no puede
 * hacer solo porque no conoce el mundo: islas y lugares que existen, que
 * ninguna isla corte el paso, que nada acabe en tierra. Cada cambio pasa por
 * `repo.admin`, que lo anota en la auditoría local con autor `admin-demo`.
 * Un rechazo es un `AdminError` con el motivo para la interfaz.
 */

export class AdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminError';
  }
}

export interface AdminDeps {
  repo: BoiaRepository;
  /** Mundos sobre el mapa compartido (`WORLD_REGISTRY`). */
  registry: WorldRegistry;
  now?: () => Date;
}

const opts = (reason: string | null | undefined): AdminOptions => ({ reason: reason ?? null });

/** Un slug a partir de un nombre (ids de eventos y artistas nuevos). */
export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Un código nuevo o editado desde el Admin (sin id: se saca del código). */
export type DiscountFormInput = Omit<DiscountInput, 'id' | 'sample'> & {
  id?: string;
  sample?: boolean;
};

/** Códigos: letras y cifras (y guiones), en mayúsculas, como los copia la gente. */
const DISCOUNT_CODE = /^[A-Z0-9][A-Z0-9-]{2,23}$/;

export type EventInput = Omit<BoiaEvent, 'id' | 'slug' | 'sample'> & {
  id?: string;
  slug?: string;
  sample?: boolean;
};

/** Botones de la portada que se editan (REQ-ADM-017) y su clave de texto. */
export const HOME_CTA_KEYS = { explore: 'hero.explore', tickets: 'hero.tickets' } as const;
export type HomeCta = keyof typeof HOME_CTA_KEYS;
export const HOME_CTA_MAX = 40;

/** Iconos de logro que se pueden elegir (claves de arte; `muestra`). */
export const ACHIEVEMENT_ICONS = [
  'boia',
  'isla',
  'barco',
  'ancla',
  'brujula',
  'estrella',
  'botella',
  'faro',
  'canon',
  'reloj',
  'entrada',
  'carnet',
  'delfin',
  'cofre',
] as const;

/** Un logro nuevo o editado (sin id: se saca del título; la versión la pone el repositorio). */
export type AchievementInput = Omit<
  AchievementDefinition,
  'id' | 'version' | 'sample' | 'triggerParams'
> & {
  id?: string;
  triggerParams?: AchievementDefinition['triggerParams'];
  sample?: boolean;
};

/** Una pista de música subida (sin id: se saca del título). */
export type MusicInput = Omit<MusicTrack, 'id' | 'sample' | 'kind'> & {
  id?: string;
  kind?: MusicTrack['kind'];
};

/** Segunda confirmación: el nombre escrito tiene que ser el del elemento, tal cual. */
function confirmName(name: string, typed: string): void {
  if (typed.trim() !== name) {
    throw new AdminError(`para confirmar, escribe el nombre exacto: «${name}»`);
  }
}

export function createAdminActions(deps: AdminDeps) {
  const { repo, registry } = deps;
  const now = deps.now ?? (() => new Date());

  const content = async () => ({
    places: await repo.content.places(),
    skins: await repo.content.skins(),
    events: await repo.content.events(),
    now: now(),
  });

  /** Rechaza el estado del mundo si no se puede jugar. */
  const checkWorld = async (next: {
    places?: Record<string, PlacePatch>;
    skins?: Record<string, Record<string, SkinPatch>>;
    events?: BoiaEvent[];
  }) => {
    const c = await content();
    const why = worldProblem(registry, {
      places: next.places ?? c.places,
      skins: next.skins ?? c.skins,
      events: next.events ?? c.events,
      now: c.now,
    });
    if (why) throw new AdminError(why);
  };

  const homeBlock = async (id: string): Promise<HomeBlock> => {
    const b = (await repo.admin.draftList('homeBlocks')).find((x) => x.id === id);
    if (!b) throw new AdminError(`no existe el bloque «${id}»`);
    return b;
  };

  /** Un evento del formulario, comprobado: id libre, isla y artistas que existen, esquema. */
  const prepareEvent = async (input: EventInput): Promise<BoiaEvent> => {
    const name = input.name.trim();
    const id = input.id ?? `ev-${slugify(name) || 'evento'}`;
    const slug = input.slug ?? (slugify(name) || id);
    const known = new Set([
      ...(await repo.content.events()).map((e) => e.id),
      ...(await repo.admin.draftList('events')).map((e) => e.id),
    ]);
    if (!input.id && known.has(id)) {
      throw new AdminError(`ya hay un evento con el id «${id}»: cambia el nombre`);
    }
    if (input.islandId) {
      const ok = eventIslands(registry.map).some((p) => p.id === input.islandId);
      if (!ok) throw new AdminError(`la isla «${input.islandId}» no existe o no admite eventos`);
    }
    const artists = new Set((await repo.content.list('artists')).map((a) => a.id));
    const missing = input.artistIds.filter((a) => !artists.has(a));
    if (missing.length) throw new AdminError(`no existen los artistas: ${missing.join(', ')}`);
    const candidate = { ...input, id, slug, name, sample: input.sample ?? false };
    if (!candidate.islandId) delete candidate.islandId;
    if (!candidate.stateNote) delete candidate.stateNote;
    if (!candidate.ticketUrl) delete candidate.ticketUrl;
    const parsed = eventSchema.safeParse(candidate);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      throw new AdminError(`evento: ${i?.path.join('.') ?? ''} ${i?.message ?? 'no válido'}`);
    }
    return parsed.data;
  };

  /** Un elemento tal como lo ve el Admin: en las áreas con borrador, con el borrador encima. */
  const findItem = async (area: EntityArea, id: string): Promise<unknown> => {
    if (area === 'events' || area === 'homeBlocks') {
      return (await repo.admin.draftList(area)).find((x) => x.id === id) ?? null;
    }
    return repo.content.get(area, id);
  };

  /** Opciones que existen para los parámetros de logro (circuitos, minijuegos, mundos). */
  const triggerChoices = (): TriggerChoices => {
    const world = composeLiveWorld(registry, registry.defaultId, EMPTY_WORLD_CONTENT).config;
    return { circuits: circuitIds(world), games: MINIGAMES, worlds: registry.ids() };
  };

  /** Todo lo que se cruza para impacto y referencias rotas (con o sin borrador). */
  const referenceData = async ({ draft }: { draft: boolean }): Promise<ReferenceData> => {
    const events = draft ? await repo.admin.draftList('events') : await repo.content.events();
    const homeBlocks = draft
      ? await repo.admin.draftList('homeBlocks')
      : await repo.content.list('homeBlocks');
    const discounts = await repo.content.list('discounts');
    const map = liveMap(registry, {
      places: await repo.content.places(),
      skins: await repo.content.skins(),
      events,
      discounts,
      now: now(),
    });
    const [purchases, found, progress, owned] = await Promise.all([
      repo.purchases.list(),
      repo.progress.discounts(),
      repo.progress.achievements(),
      repo.progress.cosmetics(),
    ]);
    return {
      events,
      homeBlocks,
      artists: await repo.content.list('artists'),
      albums: await repo.content.list('albums'),
      photos: await repo.content.list('photos'),
      discounts,
      achievements: await repo.content.list('achievements'),
      cosmetics: await repo.content.list('cosmetics'),
      map,
      worldIds: registry.ids(),
      visitor: {
        purchaseEventIds: purchases.map((p) => p.eventId),
        foundDiscountIds: found.map((f) => f.discount.id),
        achievementIds: progress.filter((a) => a.obtained).map((a) => a.definition.id),
        cosmeticIds: owned.map((c) => c.id),
      },
    };
  };

  const api = {
    // --- Eventos -----------------------------------------------------------

    /**
     * Crea o edita un evento y lo publica ya («Guardar y publicar»). La isla,
     * si la hay, tiene que admitir eventos. Si tenía borrador, lo sustituye.
     */
    async saveEvent(input: EventInput, reason?: string | null): Promise<BoiaEvent> {
      const event = await prepareEvent(input);
      const events = await repo.content.events();
      await checkWorld({ events: [...events.filter((e) => e.id !== event.id), event] });
      return repo.admin.upsert('events', event, opts(reason));
    },

    /**
     * Guarda un evento en el borrador (REQ-ADM-015): no se ve en la web ni en
     * el mar hasta «Publicar». Mismas comprobaciones que al publicar.
     */
    async saveEventDraft(input: EventInput, reason?: string | null): Promise<BoiaEvent> {
      const event = await prepareEvent(input);
      const events = await repo.admin.draftList('events');
      await checkWorld({ events: [...events.filter((e) => e.id !== event.id), event] });
      return repo.admin.draftUpsert('events', event, opts(reason ?? 'borrador de evento'));
    },

    /**
     * Estado fijado a mano desde la lista (REQ-COM-004): se publica al
     * momento y, si el evento tiene borrador, el borrador lo recoge también
     * (así «Publicar» no lo deshace).
     */
    async setEventStateManual(id: string, state: EventState) {
      if (!EVENT_STATES.includes(state)) throw new AdminError(`estado desconocido: ${state}`);
      const published = await repo.content.get('events', id);
      const draft = (await repo.admin.pendingDrafts()).some(
        (c) => c.area === 'events' && c.id === id,
      )
        ? (await repo.admin.draftList('events')).find((e) => e.id === id)
        : undefined;
      if (!published && !draft) throw new AdminError(`no existe el evento «${id}»`);
      const why = `estado a mano: ${state}`;
      if (published) {
        await api.saveEvent({ ...published, state, stateSource: 'manual' }, why);
      }
      if (draft) {
        await repo.admin.draftUpsert(
          'events',
          { ...draft, state, stateSource: 'manual' },
          opts(why),
        );
      }
    },

    /** Cambia el estado a mano (los siete estados de REQ-COM-003), con su nota. */
    async setEventState(id: string, state: EventState, note?: string | null) {
      if (!EVENT_STATES.includes(state)) throw new AdminError(`estado desconocido: ${state}`);
      const e = await repo.content.get('events', id);
      if (!e) throw new AdminError(`no existe el evento «${id}»`);
      const next: BoiaEvent = { ...e, state };
      if (note) next.stateNote = note;
      else delete next.stateNote;
      return repo.admin.upsert('events', next, opts(`estado: ${state}`));
    },

    /** Liga (o suelta, con null) un evento a una isla. La isla se queda con sus recuerdos. */
    async linkEventToIsland(eventId: string, islandId: string | null) {
      const e = await repo.content.get('events', eventId);
      if (!e) throw new AdminError(`no existe el evento «${eventId}»`);
      const next: BoiaEvent = { ...e };
      if (islandId) next.islandId = islandId;
      else delete next.islandId;
      return api.saveEvent(next, islandId ? `isla: ${islandId}` : 'sin isla');
    },

    async duplicateEvent(id: string) {
      const e = await repo.content.get('events', id);
      if (!e) throw new AdminError(`no existe el evento «${id}»`);
      const events = await repo.content.events();
      let n = 2;
      while (events.some((x) => x.id === `${id}-copia-${n}`)) n++;
      const copy: BoiaEvent = {
        ...e,
        id: `${id}-copia-${n}`,
        slug: `${e.slug}-copia-${n}`,
        name: `${e.name} (copia)`,
        state: 'draft',
        sample: false,
      };
      delete copy.islandId;
      return repo.admin.upsert('events', copy, opts(`duplicado de ${id}`));
    },

    // --- Descuentos (T43, REQ-COM-020) --------------------------------------

    /**
     * Crea o edita un código: destino (un evento o la tienda), vigencia,
     * porcentaje o importe, prioridad y dónde se esconde en el mar. Queda en
     * la auditoría como cualquier cambio del Admin.
     */
    async saveDiscount(input: DiscountFormInput, reason?: string | null): Promise<Discount> {
      const code = input.code.trim().toUpperCase();
      if (!DISCOUNT_CODE.test(code)) {
        throw new AdminError('el código va en mayúsculas, con letras y cifras (3 a 24)');
      }
      const id = input.id ?? `dto-${slugify(code)}`;
      const all = await repo.content.list('discounts');
      if (!input.id && all.some((d) => d.id === id)) {
        throw new AdminError(`ya hay un descuento con el id «${id}»`);
      }
      if (all.some((d) => d.id !== id && d.code.toUpperCase() === code)) {
        throw new AdminError(`ya hay otro descuento con el código «${code}»`);
      }
      const scope = input.scope ?? 'event';
      const candidate: DiscountInput = {
        ...input,
        id,
        code,
        label: input.label.trim(),
        scope,
        sample: input.sample ?? false,
      };
      if (scope === 'store' || !candidate.eventId) delete candidate.eventId;
      if (!candidate.hiddenAt) delete candidate.hiddenAt;
      if (!candidate.conditions) delete candidate.conditions;
      if (!candidate.url) delete candidate.url;
      if (!candidate.startsAt) delete candidate.startsAt;
      if (!candidate.endsAt) delete candidate.endsAt;
      if (candidate.eventId && !(await repo.content.get('events', candidate.eventId))) {
        throw new AdminError(`no existe el evento «${candidate.eventId}»`);
      }
      if (
        candidate.hiddenAt &&
        !discountHidingPlaces(registry.map).some((p) => p.id === candidate.hiddenAt)
      ) {
        throw new AdminError(`«${candidate.hiddenAt}» no es un escondite de códigos`);
      }
      if (candidate.kind === 'percent' && (candidate.value ?? 0) > 100) {
        throw new AdminError('un porcentaje no pasa de 100');
      }
      if (
        candidate.startsAt &&
        candidate.endsAt &&
        new Date(candidate.startsAt) >= new Date(candidate.endsAt)
      ) {
        throw new AdminError('el descuento caduca antes de empezar');
      }
      const parsed = discountSchema.safeParse(candidate);
      if (!parsed.success) {
        const i = parsed.error.issues[0];
        throw new AdminError(`descuento: ${i?.path.join('.') ?? ''} ${i?.message ?? 'no válido'}`);
      }
      return repo.admin.upsert('discounts', parsed.data, opts(reason ?? 'descuento'));
    },

    /**
     * Caduca un código ya (su fin pasa a ahora): quien lo tenga lo ve
     * caducado y ya no se aplica. Se puede reactivar editando su fecha.
     */
    async expireDiscount(id: string) {
      const d = await repo.content.get('discounts', id);
      if (!d) throw new AdminError(`no existe el descuento «${id}»`);
      const at = now();
      const next: Discount = { ...d, endsAt: at.toISOString() };
      if (next.startsAt && new Date(next.startsAt) >= at) delete next.startsAt;
      return repo.admin.upsert('discounts', next, opts('caducar'));
    },

    // --- Página principal (en borrador hasta «Publicar», REQ-ADM-015) -------

    /** Sube (-1) o baja (+1) un bloque de la home. */
    async moveBlock(id: string, delta: -1 | 1) {
      const ids = (await repo.admin.draftList('homeBlocks')).map((b) => b.id);
      const i = ids.indexOf(id);
      const j = i + delta;
      if (i < 0) throw new AdminError(`no existe el bloque «${id}»`);
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      await repo.admin.draftReorder('homeBlocks', ids, opts(`mover ${id}`));
    },

    async setBlockVisible(id: string, visible: boolean) {
      const b = await homeBlock(id);
      await repo.admin.draftUpsert(
        'homeBlocks',
        { ...b, visible },
        opts(visible ? 'mostrar' : 'ocultar'),
      );
    },

    /** Titular y subtítulo de la portada. */
    async setHeroTexts(title: string, positioning: string) {
      const hero = (await repo.admin.draftList('homeBlocks')).find((b) => b.type === 'hero');
      if (!hero || hero.type !== 'hero') throw new AdminError('la home no tiene portada');
      const t = title.trim();
      const p = positioning.trim();
      if (!t || !p) throw new AdminError('la portada necesita titular y subtítulo');
      await repo.admin.draftUpsert(
        'homeBlocks',
        { ...hero, title: t, positioning: p },
        opts('portada'),
      );
    },

    /**
     * Textos de los botones de la portada (REQ-ADM-017): «Explorar» y
     * «Tickets». Vacío o igual al de la app: vuelve al de la app.
     */
    async setHomeCtas(ctas: Partial<Record<HomeCta, string>>, defaults: Record<HomeCta, string>) {
      for (const [cta, key] of Object.entries(HOME_CTA_KEYS) as [HomeCta, string][]) {
        const v = ctas[cta];
        if (v === undefined) continue;
        const text = v.trim();
        if (text.length > HOME_CTA_MAX) {
          throw new AdminError(
            `el botón «${defaults[cta]}» admite hasta ${HOME_CTA_MAX} caracteres`,
          );
        }
        await repo.admin.draftText(
          key,
          text && text !== defaults[cta] ? text : null,
          opts('botón'),
        );
      }
    },

    /** Eventos que no salen en «Próximos eventos» (REQ-ADM-017, REQ-COM-011); no los borra. */
    async setExcludedEvents(eventIds: readonly string[]) {
      const block = (await repo.admin.draftList('homeBlocks')).find(
        (b) => b.type === 'upcoming_events',
      );
      if (!block || block.type !== 'upcoming_events') {
        throw new AdminError('la home no tiene bloque de próximos eventos');
      }
      const known = new Set((await repo.admin.draftList('events')).map((e) => e.id));
      const missing = eventIds.filter((id) => !known.has(id));
      if (missing.length) throw new AdminError(`no existen los eventos: ${missing.join(', ')}`);
      await repo.admin.draftUpsert(
        'homeBlocks',
        { ...block, excludeEventIds: [...new Set(eventIds)] },
        opts('excluir eventos'),
      );
    },

    /** Programa un bloque: ISO con zona o null para quitar el límite. */
    async scheduleBlock(id: string, showFrom: string | null, showUntil: string | null) {
      const b = await homeBlock(id);
      if (showFrom && showUntil && new Date(showFrom) >= new Date(showUntil)) {
        throw new AdminError('la programación termina antes de empezar');
      }
      const next: HomeBlock = { ...b };
      if (showFrom) next.showFrom = showFrom;
      else delete next.showFrom;
      if (showUntil) next.showUntil = showUntil;
      else delete next.showUntil;
      await repo.admin.draftUpsert('homeBlocks', next, opts('programar'));
    },

    /** Evento prioritario del bloque de la home (null: el que resuelva la home). */
    async setPriorityEvent(eventId: string | null) {
      const block = (await repo.admin.draftList('homeBlocks')).find(
        (b) => b.type === 'priority_event',
      );
      if (!block || block.type !== 'priority_event') {
        throw new AdminError('la home no tiene bloque de evento prioritario');
      }
      if (eventId && !(await repo.admin.draftList('events')).some((e) => e.id === eventId)) {
        throw new AdminError(`no existe el evento «${eventId}»`);
      }
      const next = { ...block };
      if (eventId) next.eventId = eventId;
      else delete next.eventId;
      await repo.admin.draftUpsert('homeBlocks', next, opts('evento prioritario'));
    },

    // --- Borrador y publicación (REQ-ADM-015, REQ-ADM-014) ------------------

    /**
     * Lo que impide publicar el borrador, cada cosa con su motivo: referencias
     * rotas (home, mapa, eventos, logros), un mar que no se puede jugar con
     * los eventos del borrador o una home sin portada. Vacío: se puede.
     */
    async publishProblems(): Promise<string[]> {
      const out: string[] = [];
      const data = await referenceData({ draft: true });
      out.push(...danglingReferences(data));
      const hero = data.homeBlocks.find((b) => b.type === 'hero');
      if (!hero || !hero.visible) {
        out.push('Página principal: la portada (con «Explorar» y «Tickets») tiene que verse');
      }
      const texts = await repo.admin.draftTexts();
      for (const key of Object.values(HOME_CTA_KEYS)) {
        if (texts[key] !== undefined && texts[key].trim() === '') {
          out.push(`Página principal: el botón «${key}» está vacío`);
        }
      }
      try {
        await checkWorld({ events: [...data.events] });
      } catch (err) {
        out.push(`Mapa: ${err instanceof Error ? err.message : String(err)}`);
      }
      return out;
    },

    /** Publica todo el borrador de una vez (una revisión nueva) si no hay problemas. */
    async publish(reason?: string | null) {
      if ((await repo.admin.pendingDrafts()).length === 0) {
        throw new AdminError('no hay cambios sin publicar');
      }
      const problems = await api.publishProblems();
      if (problems.length) {
        throw new AdminError(`no se publica: ${problems.join(' · ')}`);
      }
      return repo.admin.publish(opts(reason ?? 'publicar'));
    },

    /** Tira el borrador (todo, o el de un evento). */
    async discardDrafts(target?: { area: 'homeBlocks' | 'events' | 'texts'; id?: string }) {
      await repo.admin.discardDrafts(target ?? null, opts('descartar borrador'));
    },

    // --- Borrar con impacto y papelera (REQ-ADM-029, REQ-ADM-030) -----------

    /** Nombre del elemento y qué lo nombra: lo que se enseña antes de borrarlo. */
    async impact(area: EntityArea, id: string) {
      const item = await findItem(area, id);
      if (!item) throw new AdminError(`no existe «${id}»`);
      const data = await referenceData({ draft: false });
      return { name: itemName(area, item), references: referencesTo(area, id, data) };
    },

    /**
     * A la papelera, sólo si se escribe su nombre exacto (segunda
     * confirmación inequívoca, REQ-ADM-029). Un evento que sólo existe en el
     * borrador se descarta.
     */
    async trashItem(area: EntityArea, id: string, typedName: string, reason?: string | null) {
      const item = await findItem(area, id);
      if (!item) throw new AdminError(`no existe «${id}»`);
      confirmName(itemName(area, item), typedName);
      const published = await repo.content.get(area, id);
      if (!published && (area === 'events' || area === 'homeBlocks')) {
        await repo.admin.discardDrafts({ area, id }, opts(reason ?? 'borrar borrador'));
        return;
      }
      await repo.admin.remove(area, id, opts(reason ?? 'papelera'));
    },

    /**
     * Purga un elemento de la papelera: irreversible, con otra confirmación
     * escribiendo su nombre (en la demo no hay login con el que
     * reautenticarse, REQ-ADM-030).
     */
    async purgeItem(area: EntityArea, id: string, typedName: string) {
      const item = (await repo.admin.trash()).find((t) => t.area === area && t.id === id);
      if (!item) throw new AdminError(`«${id}» no está en la papelera`);
      confirmName(itemName(area, item.value), typedName);
      await repo.admin.purge(area, id, opts('purga confirmada escribiendo el nombre'));
    },

    /** Plazo de la papelera en días (REQ-ADM-030) [pendiente Álvaro]. */
    async setTrashRetention(days: number) {
      if (
        !Number.isInteger(days) ||
        days < TRASH_RETENTION_MIN_DAYS ||
        days > TRASH_RETENTION_MAX_DAYS
      ) {
        throw new AdminError(
          `el plazo de la papelera va de ${TRASH_RETENTION_MIN_DAYS} a ${TRASH_RETENTION_MAX_DAYS} días`,
        );
      }
      return repo.admin.setSettings({ trashRetentionDays: days }, opts('plazo de la papelera'));
    },

    async purgeExpired() {
      return repo.admin.purgeExpired(opts('plazo de la papelera cumplido'));
    },

    // --- Logros (REQ-ADM-021, REQ-ADM-022) ----------------------------------

    /**
     * Crea o edita un logro con una condición del catálogo, sus parámetros en
     * rango, premio, icono, ámbito y fechas. Cambiar la condición de uno que
     * ya existe es una versión nueva (lo decide el repositorio).
     */
    async saveAchievement(input: AchievementInput, reason?: string | null) {
      const title = input.title.trim();
      if (!title) throw new AdminError('un logro necesita título');
      const all = await repo.content.list('achievements');
      const id = input.id ?? (slugify(title) || 'logro');
      if (!isStableKey(id)) throw new AdminError(`«${id}» no vale como id`);
      if (!input.id && all.some((a) => a.id === id)) {
        throw new AdminError(`ya hay un logro con el id «${id}»: cambia el título`);
      }
      const params = input.triggerParams ?? {};
      const why = triggerParamsProblem(input.trigger, params, triggerChoices());
      if (why) throw new AdminError(`condición: ${why}`);
      if (input.scope === 'season') {
        if (!input.seasonId || !registry.has(input.seasonId)) {
          throw new AdminError('un logro de temporada necesita un mundo que exista');
        }
      }
      if (input.cosmeticKey && !(await repo.content.get('cosmetics', input.cosmeticKey))) {
        throw new AdminError(`no existe el premio «${input.cosmeticKey}»`);
      }
      if (input.startsAt && input.endsAt && new Date(input.startsAt) >= new Date(input.endsAt)) {
        throw new AdminError('el logro termina antes de empezar');
      }
      if (input.iconKey && !(ACHIEVEMENT_ICONS as readonly string[]).includes(input.iconKey)) {
        throw new AdminError(`icono desconocido: ${input.iconKey}`);
      }
      const candidate: Record<string, unknown> = {
        ...input,
        id,
        title,
        triggerParams: params,
        sample: input.sample ?? false,
      };
      if (input.scope !== 'season') delete candidate.seasonId;
      for (const k of ['description', 'iconKey', 'cosmeticKey', 'badgeKey', 'startsAt', 'endsAt']) {
        if (!candidate[k]) delete candidate[k];
      }
      const parsed = achievementDefinitionSchema.safeParse(candidate);
      if (!parsed.success) {
        const i = parsed.error.issues[0];
        throw new AdminError(`logro: ${i?.path.join('.') ?? ''} ${i?.message ?? 'no válido'}`);
      }
      return repo.admin.upsert('achievements', parsed.data, opts(reason ?? 'logro'));
    },

    /** Duplica un logro como uno nuevo, desactivado hasta revisarlo. */
    async duplicateAchievement(id: string) {
      const a = await repo.content.get('achievements', id);
      if (!a) throw new AdminError(`no existe el logro «${id}»`);
      const all = await repo.content.list('achievements');
      let n = 2;
      while (all.some((x) => x.id === `${id}-copia-${n}`)) n++;
      return repo.admin.upsert(
        'achievements',
        { ...a, id: `${id}-copia-${n}`, title: `${a.title} (copia)`, active: false, sample: false },
        opts(`duplicado de ${id}`),
      );
    },

    // --- Música (REQ-ADM-020) -----------------------------------------------

    /** Sube una pista (data URL `muestra`) con su licencia y origen. */
    async saveMusic(input: MusicInput) {
      const title = input.title.trim();
      if (!title) throw new AdminError('la pista necesita título');
      if (!input.licence.trim()) throw new AdminError('falta la licencia de la pista');
      if (!input.origin.trim()) throw new AdminError('falta el autor u origen de la pista');
      if (!/^data:audio\//.test(input.src)) throw new AdminError('el archivo no es de audio');
      if (input.src.length > MUSIC_DATA_MAX) {
        throw new AdminError(
          `el audio pesa demasiado para guardarlo en el navegador (hasta ${Math.floor(
            (MUSIC_DATA_MAX * 3) / 4 / 1024,
          )} KB)`,
        );
      }
      if (input.worldId && !registry.has(input.worldId)) {
        throw new AdminError(`no existe el mundo «${input.worldId}»`);
      }
      const all = await repo.content.list('music');
      const id = input.id ?? `musica-${slugify(title) || 'pista'}`;
      if (!input.id && all.some((m) => m.id === id)) {
        throw new AdminError(`ya hay una pista con el id «${id}»: cambia el título`);
      }
      const candidate: Record<string, unknown> = {
        ...input,
        id,
        title,
        licence: input.licence.trim(),
        origin: input.origin.trim(),
        sample: true,
      };
      if (!candidate.worldId) delete candidate.worldId;
      if (!candidate.licenceUrl) delete candidate.licenceUrl;
      const parsed = musicTrackSchema.safeParse(candidate);
      if (!parsed.success) {
        const i = parsed.error.issues[0];
        throw new AdminError(`pista: ${i?.path.join('.') ?? ''} ${i?.message ?? 'no válida'}`);
      }
      return repo.admin.upsert('music', parsed.data, opts('música'));
    },

    // --- Mundo --------------------------------------------------------------

    /**
     * Cambio compartido de un lugar (posición, parámetros, activado): vale en
     * todos los mundos. Se rechaza con su motivo si el mar deja de jugarse.
     */
    async editPlace(placeId: string, patch: PlacePatch, reason?: string | null) {
      const places = await repo.content.places();
      const merged = mergePlacePatch(places[placeId], patch);
      await checkWorld({ places: { ...places, [placeId]: merged } });
      await repo.admin.setPlace(placeId, patch, opts(reason ?? 'mundo'));
    },

    /** Mueve la salida, el puerto o el aterrizaje de la entrada. */
    async setMapPoint(key: MapPointKey, p: { x: number; y: number }) {
      return api.editPlace(MAP_POINTS[key], { x: p.x, y: p.y }, `punto del mapa: ${key}`);
    },

    /** Deshace los cambios de un lugar (vuelve a la muestra). */
    async clearPlace(placeId: string) {
      const places = { ...(await repo.content.places()) };
      delete places[placeId];
      await checkWorld({ places });
      await repo.admin.setPlace(placeId, null, opts('volver a la muestra'));
    },

    /**
     * Renombra un lugar: sólo en este mundo o en todos (REQ-MUN-036, D-20).
     * «En todos» deja el mismo nombre en cada mundo registrado.
     */
    async renamePlace(placeId: string, name: string, scope: RenameScope) {
      const trimmed = name.trim();
      if (!trimmed) throw new AdminError('un lugar necesita nombre');
      if (!registry.map.places.some((p) => p.id === placeId)) {
        throw new AdminError(`no existe el lugar «${placeId}»`);
      }
      const worlds = scope === 'all' ? registry.ids() : [scope.world];
      for (const w of worlds)
        if (!registry.has(w)) throw new AdminError(`no existe el mundo «${w}»`);
      const why = scope === 'all' ? 'nombre en todos los mundos' : `nombre sólo en ${scope.world}`;
      for (const w of worlds) await repo.admin.setSkin(w, placeId, { name: trimmed }, opts(why));
    },

    /** Textos de un lugar en un mundo. */
    async setPlaceTexts(worldId: string, placeId: string, texts: Record<string, string>) {
      const skins = await repo.content.skins();
      const next = {
        ...skins,
        [worldId]: {
          ...(skins[worldId] ?? {}),
          [placeId]: { ...(skins[worldId]?.[placeId] ?? {}), texts },
        },
      };
      await checkWorld({ skins: next });
      await repo.admin.setSkin(worldId, placeId, { texts }, opts('textos'));
    },

    /** Oculta (o vuelve a mostrar) un lugar sólo en un mundo. */
    async setHiddenInWorld(worldId: string, placeId: string, hidden: boolean) {
      if (!registry.has(worldId)) throw new AdminError(`no existe el mundo «${worldId}»`);
      if (!registry.map.places.some((p) => p.id === placeId)) {
        throw new AdminError(`no existe el lugar «${placeId}»`);
      }
      await repo.admin.setSkin(worldId, placeId, { hidden }, opts(hidden ? 'ocultar' : 'mostrar'));
    },

    // --- Temporadas ---------------------------------------------------------

    /**
     * Mundo activo (la temporada, D-20); null: el por defecto del registro.
     * Vive sólo en el repositorio: /juego lo lee de ahí (`adminWorldId`, T24).
     */
    async setActiveWorld(worldId: string | null) {
      if (worldId !== null && !registry.has(worldId)) {
        throw new AdminError(`no existe el mundo «${worldId}»`);
      }
      await repo.admin.setActiveWorld(worldId, opts('temporada activa'));
    },

    // --- Muestra ------------------------------------------------------------

    /** Vuelve un área (o todo) a los datos de muestra. Queda en la auditoría. */
    async reset(area: ContentArea | 'all') {
      await repo.admin.reset(area, opts('volver a la muestra'));
    },

    // --- Moderación ---------------------------------------------------------

    async removeBottle(id: string, reason: string) {
      if (!reason.trim()) throw new AdminError('hace falta un motivo para retirar una botella');
      await repo.admin.removeBottle(id, opts(reason.trim()));
    },
  };
  return api;
}

export type AdminActions = ReturnType<typeof createAdminActions>;

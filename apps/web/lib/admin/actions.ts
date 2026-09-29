import {
  EVENT_STATES,
  type BoiaEvent,
  type EventState,
  type HomeBlock,
  eventSchema,
} from '@boia/contracts';
import {
  type AdminOptions,
  type BoiaRepository,
  type ContentArea,
  type PlacePatch,
  type SkinPatch,
  mergePlacePatch,
} from '@boia/store';
import type { RenameScope, WorldRegistry } from '@boia/world';
import { worldProblem } from './validate';
import { MAP_POINTS, type MapPointKey, eventIslands } from './world';

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

export type EventInput = Omit<BoiaEvent, 'id' | 'slug' | 'sample'> & {
  id?: string;
  slug?: string;
  sample?: boolean;
};

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
    const b = await repo.content.get('homeBlocks', id);
    if (!b) throw new AdminError(`no existe el bloque «${id}»`);
    return b;
  };

  const api = {
    // --- Eventos -----------------------------------------------------------

    /** Crea o edita un evento. La isla, si la hay, tiene que admitir eventos. */
    async saveEvent(input: EventInput, reason?: string | null): Promise<BoiaEvent> {
      const name = input.name.trim();
      const id = input.id ?? `ev-${slugify(name) || 'evento'}`;
      const slug = input.slug ?? (slugify(name) || id);
      const events = await repo.content.events();
      if (!input.id && events.some((e) => e.id === id)) {
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
      await checkWorld({ events: [...events.filter((e) => e.id !== id), parsed.data] });
      return repo.admin.upsert('events', parsed.data, opts(reason));
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

    // --- Página principal --------------------------------------------------

    /** Sube (-1) o baja (+1) un bloque de la home. */
    async moveBlock(id: string, delta: -1 | 1) {
      const ids = (await repo.content.list('homeBlocks')).map((b) => b.id);
      const i = ids.indexOf(id);
      const j = i + delta;
      if (i < 0) throw new AdminError(`no existe el bloque «${id}»`);
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      await repo.admin.reorder('homeBlocks', ids, opts(`mover ${id}`));
    },

    async setBlockVisible(id: string, visible: boolean) {
      const b = await homeBlock(id);
      await repo.admin.upsert(
        'homeBlocks',
        { ...b, visible },
        opts(visible ? 'mostrar' : 'ocultar'),
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
      await repo.admin.upsert('homeBlocks', next, opts('programar'));
    },

    /** Evento prioritario del bloque de la home (null: el que resuelva la home). */
    async setPriorityEvent(eventId: string | null) {
      const block = (await repo.content.list('homeBlocks')).find(
        (b) => b.type === 'priority_event',
      );
      if (!block || block.type !== 'priority_event') {
        throw new AdminError('la home no tiene bloque de evento prioritario');
      }
      if (eventId && !(await repo.content.get('events', eventId))) {
        throw new AdminError(`no existe el evento «${eventId}»`);
      }
      const next = { ...block };
      if (eventId) next.eventId = eventId;
      else delete next.eventId;
      await repo.admin.upsert('homeBlocks', next, opts('evento prioritario'));
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

import type { Album, Artist, BoiaEvent, Discount, HomeBlock, Photo } from '@boia/contracts';
import type { AchievementDefinition, Cosmetic, EntityArea } from '@boia/store';
import type { Place, SharedMap } from '@boia/world';
import { discountHidingPlaces, eventIslands } from './world';

/**
 * Quién nombra a quién en el contenido del Admin (REQ-ADM-029, REQ-ADM-014),
 * sin E/S: antes de borrar se enseña el impacto (qué se queda apuntando a lo
 * borrado) y antes de publicar se comprueba que ninguna referencia apunte a
 * algo que ya no existe (home, mapa, eventos y logros).
 */

/** Todo lo que se mira, tal como lo resuelve el repositorio (con el borrador si se publica). */
export interface ReferenceData {
  events: readonly BoiaEvent[];
  homeBlocks: readonly HomeBlock[];
  artists: readonly Artist[];
  albums: readonly Album[];
  photos: readonly Photo[];
  discounts: readonly Discount[];
  achievements: readonly AchievementDefinition[];
  cosmetics: readonly Cosmetic[];
  /** Mapa compartido (con los cambios de lugar). */
  map: SharedMap;
  /** Mundos del registro. */
  worldIds: readonly string[];
  /** Lo de este navegador que lo nombra: compras, sellos, códigos encontrados, logros. */
  visitor?: {
    purchaseEventIds: readonly string[];
    foundDiscountIds: readonly string[];
    achievementIds: readonly string[];
    cosmeticIds: readonly string[];
  };
}

/** Una relación: dónde (Página principal, Mapa, Eventos…) y qué. */
export interface Reference {
  where: string;
  what: string;
}

type Named = { id: string } & Partial<{
  name: string;
  title: string;
  code: string;
  label: string;
  alt: string;
  type: string;
}>;

/**
 * Nombre que se enseña de un elemento y que hay que escribir para borrarlo
 * (REQ-ADM-029): su nombre, título o código; si no tiene, su id.
 */
export function itemName(_area: EntityArea | string, item: unknown): string {
  const x = (item ?? {}) as Named;
  return (x.name ?? x.title ?? x.code ?? x.alt ?? x.id ?? '').trim();
}

function placeName(p: Place): string {
  return p.name || p.id;
}

/** Lo que el mapa compartido hace con un id: ticket, panel, premio o logro. */
function mapRefs(map: SharedMap, test: (b: Place['behaviors'][number]) => boolean): Place[] {
  return map.places.filter((p) => p.behaviors.some(test));
}

/**
 * Relaciones de un elemento: qué otros elementos, bloques o lugares lo
 * nombran. Vacío si nadie.
 */
export function referencesTo(area: EntityArea, id: string, data: ReferenceData): Reference[] {
  const out: Reference[] = [];
  const add = (where: string, what: string) => out.push({ where, what });
  switch (area) {
    case 'events': {
      const event = data.events.find((e) => e.id === id);
      for (const b of data.homeBlocks) {
        if (b.type === 'priority_event' && b.eventId === id)
          add('Página principal', 'es el evento prioritario');
        if (b.type === 'upcoming_events' && b.excludeEventIds.includes(id))
          add('Página principal', 'está excluido de «Próximos eventos»');
      }
      if (event?.islandId) {
        const island = data.map.places.find((p) => p.id === event.islandId);
        add('Mapa', `la isla «${island ? placeName(island) : event.islandId}» deja de abrirlo`);
      }
      for (const p of mapRefs(
        data.map,
        (b) =>
          (b.type === 'ticket' && b.params.eventId === id) ||
          (b.type === 'content' && b.params.target === 'event' && b.params.ref === id),
      ))
        add('Mapa', `«${placeName(p)}» lo abre o vende`);
      for (const d of data.discounts.filter((x) => x.eventId === id))
        add('Descuentos', `el código «${d.code}» es de este evento`);
      for (const a of data.albums.filter((x) => x.eventId === id))
        add('Fotos', `el álbum «${a.title}» es de este evento`);
      const bought = data.visitor?.purchaseEventIds.filter((e) => e === id).length ?? 0;
      if (bought) add('Compras', `${bought} compra(s) y su sello en este navegador (se conservan)`);
      break;
    }
    case 'artists':
      for (const e of data.events.filter((x) => x.artistIds.includes(id)))
        add('Eventos', `está en el cartel de «${e.name}»`);
      for (const p of mapRefs(
        data.map,
        (b) => b.type === 'content' && b.params.target === 'artist' && b.params.ref === id,
      ))
        add('Mapa', `«${placeName(p)}» abre su ficha`);
      break;
    case 'albums':
      for (const ph of data.photos.filter((x) => x.albumId === id))
        add('Fotos', `la foto «${ph.alt}» es de este álbum`);
      for (const b of data.homeBlocks)
        if (b.type === 'photos' && b.albumId === id)
          add('Página principal', 'el bloque de fotos lo usa');
      for (const p of mapRefs(
        data.map,
        (b) => b.type === 'content' && b.params.target === 'photos' && b.params.ref === id,
      ))
        add('Mapa', `«${placeName(p)}» abre sus fotos`);
      break;
    case 'photos':
      for (const a of data.albums.filter((x) => x.coverPhotoId === id))
        add('Fotos', `es la portada del álbum «${a.title}»`);
      break;
    case 'discounts': {
      const d = data.discounts.find((x) => x.id === id);
      for (const p of mapRefs(
        data.map,
        (b) => b.type === 'reward' && b.params.kind === 'discount' && b.params.ref === id,
      ))
        add('Mapa', `«${placeName(p)}» entrega este código`);
      if (d?.hiddenAt) {
        const p = data.map.places.find((x) => x.id === d.hiddenAt);
        add('Mapa', `se esconde en «${p ? placeName(p) : d.hiddenAt}»`);
      }
      if (data.visitor?.foundDiscountIds.includes(id))
        add('Visitantes', 'ya lo encontró alguien en este navegador (lo verá como no disponible)');
      break;
    }
    case 'achievements':
      for (const p of mapRefs(
        data.map,
        (b) => b.type === 'reward' && b.params.kind === 'achievement' && b.params.ref === id,
      ))
        add('Mapa', `«${placeName(p)}» lo concede`);
      if (data.visitor?.achievementIds.includes(id))
        add('Visitantes', 'alguien lo tiene en este navegador (lo conserva)');
      break;
    case 'cosmetics':
      for (const a of data.achievements.filter((x) => x.cosmeticKey === id))
        add('Logros', `es el premio de «${a.title}»`);
      if (data.visitor?.cosmeticIds.includes(id))
        add('Visitantes', 'alguien lo tiene en este navegador (lo conserva)');
      break;
    default:
      break;
  }
  return out;
}

/**
 * Referencias rotas: lo que apunta a algo que no existe (borrado o nunca
 * creado) en la home, el mapa, los eventos, los descuentos, las fotos y los
 * logros. Cada una, con su motivo en castellano. Vacío si todo cuadra.
 */
export function danglingReferences(data: ReferenceData): string[] {
  const out: string[] = [];
  const events = new Set(data.events.map((e) => e.id));
  const artists = new Set(data.artists.map((a) => a.id));
  const albums = new Set(data.albums.map((a) => a.id));
  const photos = new Set(data.photos.map((p) => p.id));
  const discounts = new Set(data.discounts.map((d) => d.id));
  const achievements = new Set(data.achievements.map((a) => a.id));
  const cosmetics = new Set(data.cosmetics.map((c) => c.id));
  const places = new Set(data.map.places.map((p) => p.id));
  const islands = new Set(eventIslands(data.map).map((p) => p.id));
  const hiding = new Set(discountHidingPlaces(data.map).map((p) => p.id));
  const worlds = new Set(data.worldIds);

  for (const b of data.homeBlocks) {
    if (b.type === 'priority_event' && b.eventId && !events.has(b.eventId))
      out.push(`Página principal: el evento prioritario «${b.eventId}» no existe`);
    if (b.type === 'photos' && b.albumId && !albums.has(b.albumId))
      out.push(`Página principal: el álbum «${b.albumId}» del bloque de fotos no existe`);
  }
  for (const e of data.events) {
    const missing = e.artistIds.filter((a) => !artists.has(a));
    if (missing.length)
      out.push(`Evento «${e.name}»: no existen los artistas ${missing.join(', ')}`);
    if (e.islandId && !islands.has(e.islandId))
      out.push(`Evento «${e.name}»: la isla «${e.islandId}» no existe o no admite eventos`);
  }
  for (const d of data.discounts) {
    if (d.eventId && !events.has(d.eventId))
      out.push(`Descuento «${d.code}»: el evento «${d.eventId}» no existe`);
    if (d.hiddenAt && !hiding.has(d.hiddenAt))
      out.push(`Descuento «${d.code}»: el escondite «${d.hiddenAt}» no existe`);
  }
  for (const a of data.albums) {
    if (a.eventId && !events.has(a.eventId))
      out.push(`Álbum «${a.title}»: el evento «${a.eventId}» no existe`);
    if (a.islandId && !places.has(a.islandId))
      out.push(`Álbum «${a.title}»: la isla «${a.islandId}» no existe`);
    if (a.coverPhotoId && !photos.has(a.coverPhotoId))
      out.push(`Álbum «${a.title}»: la portada «${a.coverPhotoId}» no existe`);
  }
  for (const p of data.photos) {
    if (!albums.has(p.albumId)) out.push(`Foto «${p.alt}»: el álbum «${p.albumId}» no existe`);
  }
  for (const a of data.achievements) {
    if (a.cosmeticKey && !cosmetics.has(a.cosmeticKey))
      out.push(`Logro «${a.title}»: el premio «${a.cosmeticKey}» no existe`);
    if (a.scope === 'season' && a.seasonId && !worlds.has(a.seasonId))
      out.push(`Logro «${a.title}»: la temporada «${a.seasonId}» no existe`);
  }
  for (const p of data.map.places) {
    for (const b of p.behaviors) {
      if (
        b.type === 'reward' &&
        b.params.kind === 'discount' &&
        b.params.ref &&
        !discounts.has(b.params.ref)
      )
        out.push(`Mapa: «${placeName(p)}» entrega el código «${b.params.ref}», que no existe`);
      if (
        b.type === 'reward' &&
        b.params.kind === 'achievement' &&
        b.params.ref &&
        !achievements.has(b.params.ref)
      )
        out.push(`Mapa: «${placeName(p)}» concede el logro «${b.params.ref}», que no existe`);
      if (b.type === 'ticket' && !events.has(b.params.eventId))
        out.push(`Mapa: «${placeName(p)}» vende el evento «${b.params.eventId}», que no existe`);
      if (b.type === 'content' && b.params.ref) {
        const ref = b.params.ref;
        const broken =
          (b.params.target === 'event' && !events.has(ref)) ||
          (b.params.target === 'artist' && !artists.has(ref)) ||
          (b.params.target === 'photos' && !albums.has(ref) && !places.has(ref));
        if (broken) out.push(`Mapa: «${placeName(p)}» abre «${ref}», que no existe`);
      }
    }
  }
  return out;
}
